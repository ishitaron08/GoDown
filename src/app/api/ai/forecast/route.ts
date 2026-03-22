import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { WarehouseStock } from "@/models/WarehouseStock";
import { Warehouse } from "@/models/Warehouse";
import { openai, OpenAIQuotaError } from "@/lib/openai";
import { validateForecastRequest, logSuspiciousActivity } from "@/lib/ai-security";

// Same free model list for fallback — system-compatible models first
const FREE_MODELS = [
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
];
import { cacheGet, cacheSet } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/forecast
 *
 * AI-powered demand forecasting. Analyses last 30 days of orders and
 * asks GPT to predict next 7-day demand per product.
 *
 * Body: { warehouseId?: string }  — omit for global forecast
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 🔒 Permission Check: Only Admin/Manager roles can access forecasting
  const userRole = session.user?.role;
  if (!["admin", "manager"].includes(userRole)) {
    return NextResponse.json(
      { error: "Demand forecasting is restricted to Admin & Manager roles only" },
      { status: 403 }
    );
  }

  try {
    // Rate limit: 5 req/min
    const rl = await rateLimit(`forecast:${session.user.id}`, 5, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limited — try again in a minute" },
        { status: 429 }
      );
    }

    const { warehouseId } = await req.json().catch(() => ({}));

    // 🔒 Security: Validate request parameters
    const validation = validateForecastRequest({ warehouseId });
    if (!validation.valid) {
      logSuspiciousActivity(
        session.user?.email || "unknown",
        "forecast-invalid-request",
        validation.reason || "invalid parameters",
        "low"
      );
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // Check cache first (6 hour TTL)
    const cacheKey = `forecast:${warehouseId ?? "all"}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    await connectDB();

    // 1. Gather last 30 days of outbound orders
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matchStage: Record<string, unknown> = {
      type: "outbound",
      createdAt: { $gte: thirtyDaysAgo },
    };
    if (warehouseId) matchStage.warehouse = warehouseId;

    const orderAgg = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalOrdered: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 30 },
    ]);

    if (orderAgg.length === 0) {
      const result = {
        forecast: [],
        message: "No order history found for the last 30 days. Place some orders first.",
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(result);
    }

    // 2. Enrich with product names + current stock
    const productIds = orderAgg.map((a) => a._id);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("name sku quantity unit")
      .lean() as any[];
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    // Get warehouse stock if specific warehouse
    let stockMap = new Map<string, number>();
    if (warehouseId) {
      const stocks = await WarehouseStock.find({
        warehouse: warehouseId,
        product: { $in: productIds },
      }).lean() as any[];
      stockMap = new Map(stocks.map((s: any) => [s.product.toString(), s.quantity]));
    }

    // 3. Build context for GPT
    const lines = orderAgg.map((a) => {
      const prod = productMap.get(a._id.toString());
      const currentStock = warehouseId
        ? stockMap.get(a._id.toString()) ?? 0
        : prod?.quantity ?? 0;
      return `Product: ${prod?.name ?? "Unknown"} (${prod?.sku ?? "?"}), Unit: ${prod?.unit ?? "pcs"}, Ordered last 30 days: ${a.totalOrdered} (${a.orderCount} orders), Current stock: ${currentStock}`;
    });

    const prompt = `You are a supply-chain demand forecaster for a warehouse management system called GoDown.

Given the following product order history for the last 30 days:

${lines.join("\n")}

Predict the demand for the next 7 days for EACH product. Return ONLY valid JSON — no markdown, no explanation. Use this format:

[
  {
    "productName": "...",
    "sku": "...",
    "currentStock": <number>,
    "last30DaysOrdered": <number>,
    "predictedNext7Days": <number>,
    "suggestedRestock": <number>,
    "riskLevel": "low" | "medium" | "high"
  }
]

Risk levels:
- "high": predicted demand > current stock (will run out)
- "medium": predicted demand > 70% of current stock
- "low": current stock comfortably covers predicted demand

suggestedRestock = max(0, predictedNext7Days * 2 - currentStock) — enough for 2 weeks buffer.`;

    // Try models with fallback on rate-limit or provider error
    let raw = "[]";
    for (const model of FREE_MODELS) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.3,
        });
        raw = completion.choices[0]?.message?.content ?? "[]";
        break; // success — stop trying
      } catch (err: any) {
        const status = err?.status;
        const msg = String(err?.message ?? "").toLowerCase();
        if (status === 429 || status === 502 || status === 503 || (status === 400 && msg.includes("provider"))) {
          console.warn(`[Forecast] ${model} failed (${status}), trying next...`);
          continue;
        }
        throw err;
      }
    }

    // Try to parse the JSON from GPT's response
    let forecast: any[] = [];
    try {
      // Strip potential markdown code fences
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      forecast = JSON.parse(cleaned);
    } catch {
      // 🔒 Security: Don't expose raw AI response on parse error
      console.error("Failed to parse forecast JSON");
      forecast = [];
    }

    const result = {
      forecast,
      warehouseId: warehouseId ?? null,
      period: "Next 7 days",
      basedOn: "Last 30 days of orders",
      generatedAt: new Date().toISOString(),
    };

    // Cache for 6 hours
    await cacheSet(cacheKey, result, 6 * 3600);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[AI Forecast]", err);

    // 🔒 Security: Don't expose internal error details to client
    if (err instanceof OpenAIQuotaError) {
      logSuspiciousActivity(session.user?.email || "unknown", "forecast-quota-exceeded", err.message, "medium");
      return NextResponse.json(
        { error: err.message, code: "quota_exceeded" },
        { status: 402 }
      );
    }

    // Log but return generic message
    logSuspiciousActivity(session.user?.email || "unknown", "forecast-error", String(err?.message || "unknown"), "low");
    return NextResponse.json(
      { error: "Unable to generate forecast. Please try again." },
      { status: 500 }
    );
  }
}
