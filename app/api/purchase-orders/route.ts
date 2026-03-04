import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createPurchaseOrderSchema, paginationSchema } from "@/lib/zod-schemas";
import * as poService from "@/modules/purchase-order/service";
import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";

export const GET = withPermission("po.view")(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = paginationSchema.parse({
        page: searchParams.get("page") || 1,
        limit: searchParams.get("limit") || 20,
        sortBy: searchParams.get("sortBy") || undefined,
        sortOrder: searchParams.get("sortOrder") || "desc",
      });

      const status = searchParams.get("status") as PurchaseOrderStatus | undefined;

      const result = await poService.getPurchaseOrders(user.tenantId, pagination, status || undefined);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
    }
  }
);

export const POST = withPermission("po.create")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createPurchaseOrderSchema.parse(body);

      const po = await poService.createPurchaseOrder({
        ...data,
        createdById: user.id,
        tenantId: user.tenantId,
      });

      return NextResponse.json(po, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to create purchase order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
