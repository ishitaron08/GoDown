import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { updateProductSchema } from "@/lib/zod-schemas";
import * as productService from "@/modules/product/service";
import { z } from "zod";

// GET /api/products/[id]
export const GET = withPermission("product.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

      const product = await productService.getProductById(id, user.tenantId);
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

      return NextResponse.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
  }
);

// PUT /api/products/[id]
export const PUT = withPermission("product.update")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

      const body = await req.json();
      const data = updateProductSchema.parse(body);

      const product = await productService.updateProduct(id, user.tenantId, data);
      return NextResponse.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Failed to update product";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

// DELETE /api/products/[id]
export const DELETE = withPermission("product.delete")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

      await productService.deleteProduct(id, user.tenantId);
      return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete product";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
