import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateProductDescription, askInventoryAI, OpenAIQuotaError } from "@/lib/openai";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Warehouse } from "@/models/Warehouse";
import { WarehouseStock } from "@/models/WarehouseStock";
import { Order } from "@/models/Order";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import {
  validateQuestion,
  sanitizeInput,
  filterAIResponse,
  detectSuspiciousResponse,
  logSuspiciousActivity,
} from "@/lib/ai-security";
// Ensure models are registered
void Category; void Warehouse; void WarehouseStock; void Order; void User;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 🔒 Permission Check: Only Admin/Manager roles can access AI
  const userRole = session.user?.role;
  if (!["admin", "manager"].includes(userRole)) {
    return NextResponse.json(
      { error: "AI features are restricted to Admin & Manager roles only" },
      { status: 403 }
    );
  }

  // Rate limit: 20 requests per minute per user
  const rl = await rateLimit(`ai:${session.user?.email}`, 20, 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many AI requests. Please wait.", resetIn: rl.resetIn },
      { status: 429 }
    );
  }

  try {
    const { action, payload } = await req.json();

    if (action === "describe-product") {
      const { name, category, imageUrl } = payload;
      if (!name && !category && !imageUrl) {
        return NextResponse.json({ error: "name, category, or imageUrl required" }, { status: 400 });
      }
      const description = await generateProductDescription(name, category, imageUrl);
      return NextResponse.json({ description });
    }

    if (action === "ask") {
      const { question } = payload;
      if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

      // 🔒 Security: Validate and sanitize input
      const validation = validateQuestion(question);
      if (!validation.valid) {
        logSuspiciousActivity(session.user?.email || "unknown", "ai-ask", validation.reason || "invalid question", "low");
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }

      const sanitizedQuestion = sanitizeInput(question);

      await connectDB();

      // Gather rich context in parallel
      const [productStats, topProducts, categories, godowns, godownStock, orderStats] = await Promise.all([
        // Overall product stats
        Product.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalItems: { $sum: "$quantity" },
              totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
              lowStock: { $sum: { $cond: [{ $lte: ["$quantity", "$minStockLevel"] }, 1, 0] } },
              outOfStock: { $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] } },
            },
          },
        ]),
        // Top 10 products
        Product.find({ isActive: true })
          .populate("category", "name")
          .sort({ quantity: -1 })
          .limit(10)
          .select("name sku quantity minStockLevel unit")
          .lean(),
        // Categories
        Category.find().select("name").lean(),
        // GoDowns
        Warehouse.find({ isActive: true })
          .select("name code city")
          .lean() as Promise<any[]>,
        // Per-GoDown stock summary
        WarehouseStock.aggregate([
          {
            $group: {
              _id: "$warehouse",
              productCount: { $sum: 1 },
              totalUnits: { $sum: "$quantity" },
            },
          },
        ]),
        // Order stats
        Order.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      // Build per-GoDown summary
      const godownStockMap: Record<string, { productCount: number; totalUnits: number }> = {};
      for (const gs of godownStock) {
        godownStockMap[gs._id?.toString()] = { productCount: gs.productCount, totalUnits: gs.totalUnits };
      }
      const godownSummary = (godowns as any[]).map((g: any) => {
        const s = godownStockMap[g._id?.toString()] ?? { productCount: 0, totalUnits: 0 };
        return `${g.name} (${g.code}, ${g.city}): ${s.productCount} products, ${s.totalUnits} units`;
      }).join(" | ");

      // Build product list (without pricing info)
      const productList = (topProducts as any[]).map((p: any) => {
        const status = p.quantity === 0 ? "OUT OF STOCK" : p.quantity <= p.minStockLevel ? "LOW STOCK" : "OK";
        return `${p.name} [${p.sku}]: qty=${p.quantity}${p.unit}, min=${p.minStockLevel} [${status}]`;
      }).join(" | ");

      // Build order summary
      const orderSummary = orderStats.map((o: any) => `${o._id}: ${o.count}`).join(", ") || "No orders yet";

      const s = productStats[0];
      const context = s
        ? `INVENTORY SYSTEM: GoDown (warehouse management).\n` +
          `PRODUCTS: ${s.totalProducts} total, ${s.totalItems} total units, ${s.lowStock} low-stock alerts, ${s.outOfStock} out-of-stock.\n` +
          `CATEGORIES: ${(categories as any[]).map((c: any) => c.name).join(", ") || "none"}.\n` +
          `GODOWNS: ${godowns.length} active | ${godownSummary || "none"}.\n` +
          `TOP PRODUCTS: ${productList}.\n` +
          `ORDERS: ${orderSummary}.`
        : "No inventory data available yet. The system is empty.";

      const answer = await askInventoryAI(sanitizedQuestion, context);

      // 🔒 Security: Filter response to prevent data leakage
      const filtered = filterAIResponse(answer);

      // 🔒 Security: Detect if response contains suspicious patterns
      if (detectSuspiciousResponse(filtered)) {
        logSuspiciousActivity(
          session.user?.email || "unknown",
          "ai-ask-suspicious-response",
          `Question: ${sanitizedQuestion.substring(0, 100)}...`,
          "high"
        );
        // Return generic response instead of suspicious one
        return NextResponse.json({
          answer:
            "I can only help with inventory-related questions. Please ask about stock levels, products, or warehouse status.",
        });
      }

      return NextResponse.json({ answer: filtered });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/ai]", error);

    // 🔒 Security: Don't expose internal error details to client
    if (error instanceof OpenAIQuotaError) {
      logSuspiciousActivity(session.user?.email || "unknown", "ai-quota-exceeded", error.message, "medium");
      return NextResponse.json(
        { error: error.message, code: "quota_exceeded" },
        { status: 402 }
      );
    }

    // Log the error but return generic message to client
    if (error instanceof Error) {
      logSuspiciousActivity(session.user?.email || "unknown", "ai-error", error.message, "low");
    }

    return NextResponse.json(
      { error: "Unable to process your request. Please try again." },
      { status: 500 }
    );
  }
}
