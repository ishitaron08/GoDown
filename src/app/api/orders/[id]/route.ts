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
import { autoAssignOrder } from "@/lib/auto-assign";
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
 * When approving (pending → processing), auto-assigns delivery partner
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

    // ── Auto-assign delivery on approval (pending → processing) ──
    let autoAssignResult = null;
    if (
      body.status === "processing" &&
      order.type === "outbound" &&
      !order.deliveryPartner
    ) {
      // Try to auto-assign if customer has coordinates
      if (order.customerCoordinates?.lat && order.customerCoordinates?.lng) {
        try {
          const result = await autoAssignOrder(
            order.customerCoordinates.lat,
            order.customerCoordinates.lng,
            order.items.map((i: any) => ({ product: i.product.toString(), quantity: i.quantity }))
          );
          if (result) {
            autoAssignResult = result;
            if (result.warehouse) {
              order.warehouse = result.warehouse._id;
            }
            if (result.deliveryPartner) {
              order.deliveryPartner = result.deliveryPartner._id as any;
              order.deliveryStatus = "assigned";
              order.autoAssigned = true;
              if (result.deliveryPartner.vehicle) {
                order.deliveryVehicle = result.deliveryPartner.vehicle.vehicleNumber;
                // Mark vehicle as unavailable
                await Supplier.updateOne(
                  { _id: result.deliveryPartner._id, "vehicles.vehicleNumber": result.deliveryPartner.vehicle.vehicleNumber },
                  { $set: { "vehicles.$.isAvailable": false } }
                );
              }
            }
            order.deliveryAddress = order.customerAddress;
          }
        } catch (err) {
          console.error("Auto-assign on approve failed:", err);
          // Non-blocking — order still gets approved even if auto-assign fails
        }
      } else {
        // No coordinates — try geocoding the address for auto-assign
        // For now, just assign to nearest delivery partner without geo
        try {
          const partners = await Supplier.find({ isActive: true }).lean() as any[];
          for (const p of partners) {
            const availableVehicle = p.vehicles?.find((v: any) => v.isAvailable);
            if (availableVehicle) {
              order.deliveryPartner = p._id;
              order.deliveryStatus = "assigned";
              order.deliveryVehicle = availableVehicle.vehicleNumber;
              order.autoAssigned = true;
              order.deliveryAddress = order.customerAddress;
              await Supplier.updateOne(
                { _id: p._id, "vehicles.vehicleNumber": availableVehicle.vehicleNumber },
                { $set: { "vehicles.$.isAvailable": false } }
              );
              break;
            }
          }
        } catch (err) {
          console.error("Fallback partner assign failed:", err);
        }
      }
    }

    await order.save();

    // Push to Redis so SSE picks it up
    await setOrderStatus(params.id, {
      status: order.status,
      deliveryStatus: order.deliveryStatus,
    });

    // Populate for response
    const populated = await Order.findById(params.id)
      .populate("items.product", "name sku unit price")
      .populate("supplier", "name")
      .populate("warehouse", "name code city")
      .populate("deliveryPartner", "name phone vehicles")
      .populate("createdBy", "name")
      .lean();

    return NextResponse.json({ ...populated, autoAssignResult });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
