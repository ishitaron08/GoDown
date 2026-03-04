import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { updateOrderStatusSchema } from "@/lib/zod-schemas";
import * as orderService from "@/modules/order/service";
import { z } from "zod";

export const GET = withPermission("order.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

      const order = await orderService.getOrderById(id, user.tenantId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      return NextResponse.json(order);
    } catch (error) {
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
  }
);

export const PUT = withPermission("order.create")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

      const body = await req.json();
      const data = updateOrderStatusSchema.parse(body);

      const order = await orderService.updateOrderStatus(id, user.tenantId, data.status);
      return NextResponse.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Failed to update order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
