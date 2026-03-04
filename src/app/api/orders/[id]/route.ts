import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { setOrderStatus } from "@/lib/redis-cache";
void Product; void Warehouse; void User;

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

/**
 * GET /api/orders/:id — single order with full population
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const order = await Order.findById(params.id)
      .populate("items.product", "name sku unit price")
      .populate("supplier", "name")
      .populate("warehouse", "name code city")
      .populate("sourceWarehouse", "name code city")
      .populate("deliveryPartner", "name phone vehicles")
      .populate("createdBy", "name")
      .lean();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/:id — update order/delivery status
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Fields that can be updated
    const allowed = [
      "status", "deliveryStatus", "deliveryPartner", "deliveryVehicle",
      "deliveryNotes", "estimatedDelivery", "notes",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (order as any)[key] = body[key];
      }
    }

    // If completed or delivered, set timestamps
    if (body.status === "completed" && !order.processedAt) {
      order.processedAt = new Date();
    }
    if (body.deliveryStatus === "delivered" && !order.actualDelivery) {
      order.actualDelivery = new Date();

      // Release the vehicle
      if (order.deliveryPartner && order.deliveryVehicle) {
        await Supplier.updateOne(
          { _id: order.deliveryPartner, "vehicles.vehicleNumber": order.deliveryVehicle },
          { $set: { "vehicles.$.isAvailable": true } }
        );
      }
    }

    await order.save();

    // Push to Redis so SSE picks it up
    await setOrderStatus(params.id, {
      status: order.status,
      deliveryStatus: order.deliveryStatus,
    });

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
