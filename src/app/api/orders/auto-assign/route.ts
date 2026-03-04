import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Supplier } from "@/models/Supplier";
import { autoAssignOrder } from "@/lib/auto-assign";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AutoAssignSchema = z.object({
  // Customer info
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerAddress: z.string().min(1),
  customerPincode: z.string().optional(),
  customerCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  // Order items
  items: z.array(z.object({
    product: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
  })).min(1),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
});

/**
 * POST /api/orders/auto-assign
 *
 * Creates an outbound order and automatically:
 * 1. Finds nearest warehouse with stock
 * 2. Falls back to another warehouse if needed
 * 3. Assigns nearest delivery partner + vehicle
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 10 requests per minute per user
    const rl = await rateLimit(`auto-assign:${session.user?.email}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", resetIn: rl.resetIn },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = AutoAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const { customerCoordinates, items } = parsed.data;

    // Run the auto-assign engine
    const result = await autoAssignOrder(
      customerCoordinates.lat,
      customerCoordinates.lng,
      items.map((i) => ({ product: i.product, quantity: i.quantity }))
    );

    if (!result) {
      return NextResponse.json(
        { error: "No warehouse available to fulfil this order" },
        { status: 404 }
      );
    }

    // Create the order
    const orderNumber = `SO-${Date.now()}`;
    const orderData: Record<string, any> = {
      orderNumber,
      type: "outbound",
      status: "processing",
      items: parsed.data.items,
      totalAmount: parsed.data.totalAmount,
      notes: parsed.data.notes,
      createdBy: session.user.id,
      // Customer
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerAddress: parsed.data.customerAddress,
      customerPincode: parsed.data.customerPincode,
      customerCoordinates: parsed.data.customerCoordinates,
      deliveryAddress: parsed.data.customerAddress,
      // Warehouse
      warehouse: result.warehouse._id,
      autoAssigned: true,
    };

    // If fallback warehouse was used
    if (result.fallbackWarehouse) {
      orderData.sourceWarehouse = result.fallbackWarehouse._id;
    }

    // If delivery partner found
    if (result.deliveryPartner) {
      orderData.deliveryPartner = result.deliveryPartner._id;
      orderData.deliveryStatus = "assigned";
      if (result.deliveryPartner.vehicle) {
        orderData.deliveryVehicle = result.deliveryPartner.vehicle.vehicleNumber;

        // Mark vehicle as unavailable
        await Supplier.updateOne(
          { _id: result.deliveryPartner._id, "vehicles.vehicleNumber": result.deliveryPartner.vehicle.vehicleNumber },
          { $set: { "vehicles.$.isAvailable": false } }
        );
      }
    }

    const order = await Order.create(orderData);

    return NextResponse.json({
      order,
      assignment: result,
    }, { status: 201 });
  } catch (err) {
    console.error("Auto-assign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
