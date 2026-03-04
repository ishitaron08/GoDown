import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WarehouseStock } from "@/models/WarehouseStock";
import { InventoryLog } from "@/models/InventoryLog";
import { Product } from "@/models/Product";
import { Warehouse } from "@/models/Warehouse";
import { setStockUpdatedFlag, invalidateWarehouseCache, cacheWarehouseStock } from "@/lib/redis-cache";
import { z } from "zod";
// Ensure models are registered for populate
void Product; void Warehouse;

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

const StockUpdateSchema = z.object({
  items: z.array(
    z.object({
      product: z.string(),
      quantity: z.number().min(0),
    })
  ).min(1),
  notes: z.string().optional(),
});

// POST — bulk update stock for a warehouse (daily manager update)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = StockUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const warehouseId = params.id;
    const userId = session.user.id;
    const now = new Date();

    // Upsert each product's stock in this warehouse
    const ops = parsed.data.items.map((item) => ({
      updateOne: {
        filter: { warehouse: warehouseId, product: item.product },
        update: {
          $set: {
            quantity: item.quantity,
            lastUpdated: now,
            updatedBy: userId,
          },
        },
        upsert: true,
      },
    }));

    await WarehouseStock.bulkWrite(ops);

    // Record daily inventory log
    const today = now.toISOString().split("T")[0];
    await InventoryLog.findOneAndUpdate(
      { warehouse: warehouseId, date: today },
      {
        $set: {
          updatedBy: userId,
          productsUpdated: parsed.data.items.length,
          notes: parsed.data.notes,
        },
      },
      { upsert: true, new: true }
    );

    // Set Redis flags: mark updated + bust old cache + pre-warm
    await setStockUpdatedFlag(warehouseId);
    await invalidateWarehouseCache(warehouseId);
    await cacheWarehouseStock(warehouseId);

    return NextResponse.json({
      success: true,
      updated: parsed.data.items.length,
      date: today,
    });
  } catch (error) {
    console.error("[POST /api/warehouses/stock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
