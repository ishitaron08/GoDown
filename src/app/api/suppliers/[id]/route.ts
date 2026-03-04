import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Warehouse } from "@/models/Warehouse";
void Product; void User; void Warehouse;

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET — single delivery partner with vehicles + assigned deliveries
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const partner = await Supplier.findById(params.id)
    .populate("assignedWarehouse", "name code city")
    .lean() as Record<string, any> | null;

    if (!partner) {
      console.warn(`[GET /api/suppliers/${params.id}] Not found in DB`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (partner.isActive === false) {
      console.warn(`[GET /api/suppliers/${params.id}] isActive=false`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ensure vehicles is always an array (older docs in MongoDB may not have the field)
    if (!Array.isArray(partner.vehicles)) {
      partner.vehicles = [];
    }

    // Get all orders assigned to this delivery partner
    const deliveries = await Order.find({ deliveryPartner: params.id })
      .populate("items.product", "name sku")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ partner, deliveries });
  } catch (err: any) {
    console.error(`[GET /api/suppliers/${params.id}] Error:`, err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update delivery partner details (incl. vehicles)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    // Use find + assign + save so Mongoose casts subdocuments (vehicles) through
    // the schema properly — findByIdAndUpdate with $set bypasses subdoc casting
    const partner = await Supplier.findById(params.id);
    if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Apply every field from body onto the Mongoose document
    Object.keys(body).forEach((key) => {
      (partner as any)[key] = body[key];
    });

    await partner.save();
    return NextResponse.json(partner.toObject());
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
