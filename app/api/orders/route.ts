import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createOrderSchema, paginationSchema } from "@/lib/zod-schemas";
import * as orderService from "@/modules/order/service";
import { z } from "zod";
import { OrderType, OrderStatus } from "@prisma/client";

export const GET = withPermission("order.view")(
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

      const type = searchParams.get("type") as OrderType | undefined;
      const status = searchParams.get("status") as OrderStatus | undefined;

      const result = await orderService.getOrders(user.tenantId, pagination, type || undefined, status || undefined);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
  }
);

export const POST = withPermission("order.create")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createOrderSchema.parse(body);

      const order = await orderService.createOrder({
        ...data,
        tenantId: user.tenantId,
      });

      return NextResponse.json(order, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to create order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
