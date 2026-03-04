import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Warehouse } from "@/models/Warehouse";
import { WarehouseStock } from "@/models/WarehouseStock";
import { InventoryLog } from "@/models/InventoryLog";
import { User } from "@/models/User";
import { z } from "zod";
void User;

export const dynamic = "force-dynamic";

// GET — list all warehouses with stock freshness info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const warehouses = await Warehouse.find({ isActive: true })
      .populate("manager", "name email")
      .sort({ name: 1 })
      .lean();

    // Get today's date and check which warehouses updated inventory today
    const today = new Date().toISOString().split("T")[0];
    const todayLogs = await InventoryLog.find({ date: today }).lean() as any[];
    const updatedToday = new Set(todayLogs.map((l: any) => l.warehouse.toString()));

    const result = (warehouses as any[]).map((w) => ({
      ...w,
      inventoryUpdatedToday: updatedToday.has(w._id.toString()),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const CreateWarehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  address: z.string().min(1),
  city: z.string().min(1),
  pincode: z.string().min(5).max(10),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  manager: z.string().min(1),
  phone: z.string().optional(),
});

// POST — create a new warehouse (GoDown)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const warehouse = await Warehouse.create(parsed.data);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Warehouse code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
