import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createConsumerSchema, paginationSchema } from "@/lib/zod-schemas";
import * as consumerService from "@/modules/consumer/service";
import { z } from "zod";

export const GET = withPermission("consumer.view")(
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

      const segment = searchParams.get("segment") || undefined;

      const result = await consumerService.getConsumers(user.tenantId, pagination, segment);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Failed to fetch consumers" }, { status: 500 });
    }
  }
);

export const POST = withPermission("consumer.create")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createConsumerSchema.parse(body);

      const consumer = await consumerService.createConsumer({
        ...data,
        tenantId: user.tenantId,
      });

      return NextResponse.json(consumer, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to create consumer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
