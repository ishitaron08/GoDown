import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { updateConsumerSchema } from "@/lib/zod-schemas";
import * as consumerService from "@/modules/consumer/service";
import { z } from "zod";

export const GET = withPermission("consumer.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Consumer ID required" }, { status: 400 });

      const consumer = await consumerService.getConsumerById(id, user.tenantId);
      if (!consumer) return NextResponse.json({ error: "Consumer not found" }, { status: 404 });

      return NextResponse.json(consumer);
    } catch {
      return NextResponse.json({ error: "Failed to fetch consumer" }, { status: 500 });
    }
  }
);

export const PUT = withPermission("consumer.update")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Consumer ID required" }, { status: 400 });

      const body = await req.json();
      const data = updateConsumerSchema.parse(body);

      const consumer = await consumerService.updateConsumer(id, user.tenantId, data);
      return NextResponse.json(consumer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Failed to update consumer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

export const DELETE = withPermission("consumer.update")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Consumer ID required" }, { status: 400 });

      await consumerService.deleteConsumer(id, user.tenantId);
      return NextResponse.json({ message: "Consumer deleted successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete consumer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
