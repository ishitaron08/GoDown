import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { StockMovement } from "@/models/StockMovement";
import { User } from "@/models/User";
import { Category } from "@/models/Category";
import { cacheGet, cacheSet } from "@/lib/redis";
void User; void Category;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = "dashboard:stats";
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    await connectDB();

    const [productStats, orderStats, recentMovements, lowStockProducts] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $lte: ["$quantity", "$minStockLevel"] }, { $gt: ["$quantity", 0] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStock: {
              $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
            },
          },
        },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            value: { $sum: "$totalAmount" },
          },
        },
      ]),

      StockMovement.find()
        .populate("product", "name sku")
        .populate("performedBy", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      Product.find({
        isActive: true,
        $expr: { $lte: ["$quantity", "$minStockLevel"] },
      })
        .populate("category", "name")
        .select("name sku quantity minStockLevel unit")
        .sort({ quantity: 1 })
        .limit(10)
        .lean(),
    ]);

    const stats = {
      products: productStats[0] ?? {
        total: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStock: 0,
        outOfStock: 0,
      },
      orders: orderStats,
      recentMovements,
      lowStockProducts,
    };

    await cacheSet(cacheKey, stats, 60);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
