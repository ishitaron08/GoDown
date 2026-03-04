import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Warehouse } from "@/models/Warehouse";
import { Supplier } from "@/models/Supplier";
void Product; void Warehouse; void Supplier;

export const dynamic = "force-dynamic";
type Params = { params: { orderNumber: string } };

/**
 * GET /api/orders/track/:orderNumber — PUBLIC endpoint (no auth)
 *
 * Returns limited order info for the customer tracking page.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const order = await Order.findOne({ orderNumber: params.orderNumber })
      .populate("items.product", "name sku unit")
      .populate("warehouse", "name code city")
      .populate("deliveryPartner", "name phone vehicles")
      .lean() as any;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return only safe, non-sensitive fields
    const safe = {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      items: (order.items ?? []).map((i: any) => ({
        name: i.product?.name ?? "Unknown",
        sku: i.product?.sku,
        quantity: i.quantity,
        unit: i.product?.unit,
      })),
      warehouse: order.warehouse
        ? { name: order.warehouse.name, code: order.warehouse.code, city: order.warehouse.city }
        : null,
      deliveryPartner: order.deliveryPartner
        ? {
            name: order.deliveryPartner.name,
            vehicle: order.deliveryVehicle ?? null,
          }
        : null,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      createdAt: order.createdAt,
    };

    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
