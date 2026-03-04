import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createServiceSchema, paginationSchema } from "@/lib/zod-schemas";
import * as serviceService from "@/modules/service/service";
import { z } from "zod";
import { PricingModel } from "@prisma/client";

// GET /api/services
export const GET = withPermission("service.view")(
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
      const pricingModel = searchParams.get("pricingModel") as PricingModel | undefined;

      const result = await serviceService.getServices(
        user.tenantId,
        pagination,
        vendorId,
        pricingModel
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error fetching services:", error);
      return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }
  }
);

// POST /api/services
export const POST = withPermission("service.manage")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createServiceSchema.parse(body);

      const service = await serviceService.createService({
        ...data,
        tenantId: user.tenantId,
      });

      return NextResponse.json(service, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to create service";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
