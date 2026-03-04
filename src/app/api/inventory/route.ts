import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { User } from "@/models/User";
import { z } from "zod";
void User;

export const dynamic = "force-dynamic";

const AdjustSchema = z.object({
  productId: z.string(),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const filter = productId ? { product: productId } : {};
    const movements = await StockMovement.find(filter)
      .populate("product", "name sku unit")
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = AdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const product = await Product.findById(parsed.data.productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const previousQuantity = product.quantity;
    let newQuantity: number;

    if (parsed.data.type === "in") {
      newQuantity = previousQuantity + parsed.data.quantity;
    } else if (parsed.data.type === "out") {
      newQuantity = previousQuantity - parsed.data.quantity;
      if (newQuantity < 0) {
        return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
      }
    } else {
      newQuantity = parsed.data.quantity; // absolute adjustment
    }

    await Promise.all([
      Product.findByIdAndUpdate(parsed.data.productId, { quantity: newQuantity }),
      StockMovement.create({
        product: parsed.data.productId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        previousQuantity,
        newQuantity,
        reference: parsed.data.reference,
        reason: parsed.data.reason,
        performedBy: session.user.id,
      }),
    ]);

    return NextResponse.json({ message: "Stock updated", newQuantity }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
