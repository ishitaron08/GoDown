import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Supplier } from "@/models/Supplier";
import { cacheDel } from "@/lib/redis";
import { requirePermission } from "@/lib/require-permission";
// Ensure models are registered for populate() refs
void Category; void Supplier;

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const product = await Product.findById(params.id)
      .populate("category", "name slug")
      .populate("supplier", "name email phone")
      .lean();
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("products:edit");
    if (!auth.authorized) return auth.response;

    await connectDB();
    const body = await req.json();

    const product = await Product.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate("category", "name slug");

    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await cacheDel(`products:*`);

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("products:delete");
    if (!auth.authorized) return auth.response;

    await connectDB();
    await Product.findByIdAndUpdate(params.id, { isActive: false });
    await cacheDel("products:*");

    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
