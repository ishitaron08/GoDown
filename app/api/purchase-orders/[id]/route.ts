import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { approvePurchaseOrderSchema } from "@/lib/zod-schemas";
import * as poService from "@/modules/purchase-order/service";
import { z } from "zod";

export const GET = withPermission("po.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "PO ID required" }, { status: 400 });

      const po = await poService.getPurchaseOrderById(id, user.tenantId);
      if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

      return NextResponse.json(po);
    } catch {
      return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 });
    }
  }
);

// PUT /api/purchase-orders/[id] — Approve/Reject
export const PUT = withPermission("po.approve")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "PO ID required" }, { status: 400 });

      const body = await req.json();
      const data = approvePurchaseOrderSchema.parse(body);

      const po = await poService.approvePurchaseOrder(
        id,
        user.tenantId,
        user.id,
        data.action,
        data.notes
      );

      return NextResponse.json(po);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Failed to process purchase order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
