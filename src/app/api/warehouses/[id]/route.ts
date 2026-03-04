import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Warehouse } from "@/models/Warehouse";
import { WarehouseStock } from "@/models/WarehouseStock";
import { InventoryLog } from "@/models/InventoryLog";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { z } from "zod";
void Product; void User;

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

// GET — single warehouse with its stock + assigned delivery partners
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const warehouse = await Warehouse.findById(params.id)
      .populate("manager", "name email")
      .lean();
    if (!warehouse) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [stock, logs, partners] = await Promise.all([
      WarehouseStock.find({ warehouse: params.id })
        .populate("product", "name sku price unit images")
        .populate("updatedBy", "name")
        .sort({ "product.name": 1 })
        .lean(),
      InventoryLog.find({
        warehouse: params.id,
        createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
      })
        .populate("updatedBy", "name")
        .sort({ date: -1 })
        .lean(),
      Supplier.find({ assignedWarehouse: params.id, isActive: true })
        .select("name email phone address vehicles")
        .lean(),
    ]);

    return NextResponse.json({ warehouse, stock, recentLogs: logs, partners });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update warehouse details
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const warehouse = await Warehouse.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    ).populate("manager", "name email");

    if (!warehouse) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(warehouse);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    await Warehouse.findByIdAndUpdate(params.id, { isActive: false });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
