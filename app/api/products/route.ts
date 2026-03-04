import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createProductSchema, paginationSchema } from "@/lib/zod-schemas";
import * as productService from "@/modules/product/service";
import { z } from "zod";

// GET /api/products
export const GET = withPermission("product.view")(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = paginationSchema.parse({
        page: searchParams.get("page") || 1,
        limit: searchParams.get("limit") || 20,
        search: searchParams.get("search") || undefined,
        sortBy: searchParams.get("sortBy") || undefined,
        sortOrder: searchParams.get("sortOrder") || "desc",
      });

      const vendorId = searchParams.get("vendorId") || undefined;
      const lowStock = searchParams.get("lowStock") === "true";

      const result = await productService.getProducts(
        user.tenantId,
        pagination,
        vendorId,
        lowStock
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
  }
);

// POST /api/products
export const POST = withPermission("product.create")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createProductSchema.parse(body);

      const product = await productService.createProduct({
        ...data,
        tenantId: user.tenantId,
      });

      return NextResponse.json(product, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to create product";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
