import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { WarehouseStock } from "@/models/WarehouseStock";
import { Warehouse } from "@/models/Warehouse";
// Ensure models are registered for populate() refs
void Category;
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GoDownAllocSchema = z.object({
  warehouseId: z.string(),
  quantity: z.number().min(0),
});

const ProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  description: z.string().optional(),
  category: z.string(),
  price: z.number().min(0),
  costPrice: z.number().min(0),
  quantity: z.number().min(0).default(0),
  minStockLevel: z.number().min(0).default(10),
  unit: z.string().default("pcs"),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  godownAllocations: z.array(GoDownAllocSchema).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const status = searchParams.get("status") ?? "";

    const cacheKey = `products:${page}:${limit}:${search}:${category}:${status}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    if (status === "low-stock") {
      filter.$expr = { $lte: ["$quantity", "$minStockLevel"] };
    } else if (status === "out-of-stock") {
      filter.quantity = 0;
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Aggregate stock across all GoDowns for each product
    const productIds = (products as any[]).map((p: any) => p._id);
    const warehouseStocks = await WarehouseStock.find({ product: { $in: productIds } })
      .populate("warehouse", "name code city")
      .lean();

    const stockMap: Record<string, { totalQty: number; godowns: any[] }> = {};
    for (const ws of warehouseStocks as any[]) {
      const pid = ws.product.toString();
      if (!stockMap[pid]) stockMap[pid] = { totalQty: 0, godowns: [] };
      stockMap[pid].totalQty += ws.quantity;
      stockMap[pid].godowns.push({
        _id: ws.warehouse?._id,
        name: ws.warehouse?.name ?? "Unknown",
        code: ws.warehouse?.code ?? "?",
        city: ws.warehouse?.city ?? "",
        quantity: ws.quantity,
      });
    }

    const enriched = (products as any[]).map((p: any) => ({
      ...p,
      // Consolidated: sum across all godowns (fallback to product.quantity for non-godown stock)
      totalStock: stockMap[p._id.toString()]?.totalQty ?? p.quantity,
      godownStock: stockMap[p._id.toString()]?.godowns ?? [],
    }));

    const result = { products: enriched, total, page, totalPages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, result, 120);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const existing = await Product.findOne({ sku: parsed.data.sku });
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { godownAllocations, ...productData } = parsed.data;

    const product = await Product.create({
      ...productData,
      images: body.images ?? [],
      createdBy: session.user.id,
    });

    // Create WarehouseStock entries for each GoDown allocation
    if (godownAllocations && godownAllocations.length > 0) {
      const now = new Date();
      // Ensure we reference valid Warehouse model
      void Warehouse;
      const stockOps = godownAllocations.map((alloc) => ({
        updateOne: {
          filter: { warehouse: alloc.warehouseId, product: product._id },
          update: {
            $set: {
              quantity: alloc.quantity,
              lastUpdated: now,
              updatedBy: session.user.id,
            },
          },
          upsert: true,
        },
      }));
      await WarehouseStock.bulkWrite(stockOps);
    }

    await cacheDel("products:*");

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
