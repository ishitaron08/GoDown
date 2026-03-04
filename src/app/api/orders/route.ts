import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { z } from "zod";
void Supplier; void Product; void User;

export const dynamic = "force-dynamic";

const OrderItemSchema = z.object({
  product: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const CreateOrderSchema = z.object({
  type: z.enum(["inbound", "outbound"]),
  supplier: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("supplier", "name")
        .populate("items.product", "name sku unit")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const prefix = parsed.data.type === "inbound" ? "PO" : "SO";
    const orderNumber = `${prefix}-${Date.now()}`;

    const order = await Order.create({
      ...parsed.data,
      orderNumber,
      createdBy: session.user.id,
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
