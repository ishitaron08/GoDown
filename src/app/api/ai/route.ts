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
// Ensure models are registered
void Category; void Warehouse; void WarehouseStock; void Order; void User;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 20 requests per minute per user
    const rl = await rateLimit(`ai:${session.user?.email}`, 20, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many AI requests. Please wait.", resetIn: rl.resetIn },
        { status: 429 }
      );
    }

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
          .select("name sku quantity minStockLevel unit price costPrice")
          .lean(),
        // Categories
        Category.find().select("name").lean(),
        // GoDowns
        Warehouse.find({ isActive: true })
          .populate("manager", "name")
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

      // Build product list
      const productList = (topProducts as any[]).map((p: any) => {
        const status = p.quantity === 0 ? "OUT OF STOCK" : p.quantity <= p.minStockLevel ? "LOW STOCK" : "OK";
        return `${p.name} [${p.sku}]: qty=${p.quantity}${p.unit}, min=${p.minStockLevel}, price=₹${p.price} [${status}]`;
      }).join(" | ");

      // Build order summary
      const orderSummary = orderStats.map((o: any) => `${o._id}: ${o.count}`).join(", ") || "No orders yet";

      const s = productStats[0];
      const context = s
        ? `INVENTORY SYSTEM: GoDown (warehouse management).\n` +
          `PRODUCTS: ${s.totalProducts} total, ${s.totalItems} total units, ₹${Math.round(s.totalValue).toLocaleString("en-IN")} inventory value, ${s.lowStock} low-stock alerts, ${s.outOfStock} out-of-stock.\n` +
          `CATEGORIES: ${(categories as any[]).map((c: any) => c.name).join(", ") || "none"}.\n` +
          `GODOWNS: ${godowns.length} active | ${godownSummary || "none"}.\n` +
          `TOP PRODUCTS: ${productList}.\n` +
          `ORDERS: ${orderSummary}.`
        : "No inventory data available yet. The system is empty.";

      const answer = await askInventoryAI(question, context);
      return NextResponse.json({ answer });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/ai]", error);
    if (error instanceof OpenAIQuotaError) {
      return NextResponse.json(
        { error: error.message, code: "quota_exceeded" },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
