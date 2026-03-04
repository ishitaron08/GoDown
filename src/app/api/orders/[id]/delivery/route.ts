import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";
void Product;

export const dynamic = "force-dynamic";

// PATCH — assign delivery partner to an order, or update delivery status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const allowedFields: Record<string, unknown> = {};

    if (body.deliveryPartner) {
      // Validate partner exists
      const partner = await Supplier.findById(body.deliveryPartner);
      if (!partner || !partner.isActive) {
        return NextResponse.json({ error: "Delivery partner not found" }, { status: 400 });
      }
      allowedFields.deliveryPartner = body.deliveryPartner;
      allowedFields.deliveryStatus = "assigned";
    }

    if (body.deliveryVehicle !== undefined) allowedFields.deliveryVehicle = body.deliveryVehicle;
    if (body.deliveryStatus) allowedFields.deliveryStatus = body.deliveryStatus;
    if (body.deliveryAddress !== undefined) allowedFields.deliveryAddress = body.deliveryAddress;
    if (body.deliveryNotes !== undefined) allowedFields.deliveryNotes = body.deliveryNotes;
    if (body.estimatedDelivery !== undefined) allowedFields.estimatedDelivery = body.estimatedDelivery;

    // If marking delivered, set actual delivery time
    if (body.deliveryStatus === "delivered") {
      allowedFields.actualDelivery = new Date();
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const order = await Order.findByIdAndUpdate(
      params.id,
      { $set: allowedFields },
      { new: true }
    )
      .populate("deliveryPartner", "name phone")
      .populate("items.product", "name sku")
      .lean();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
