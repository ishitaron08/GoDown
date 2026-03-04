import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { createVendorSchema, paginationSchema } from "@/lib/zod-schemas";
import * as vendorService from "@/modules/vendor/service";
import { z } from "zod";

// GET /api/vendors — List vendors
export const GET = withPermission("vendor.view")(
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

      const status = searchParams.get("status") as "ACTIVE" | "SUSPENDED" | undefined;

      const result = await vendorService.getVendors(
        user.tenantId,
        pagination,
        status || undefined
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return NextResponse.json(
        { error: "Failed to fetch vendors" },
        { status: 500 }
      );
    }
  }
);

// POST /api/vendors — Create vendor
export const POST = withPermission("vendor.create")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = createVendorSchema.parse(body);

      const vendor = await vendorService.createVendor({
        ...data,
        tenantId: user.tenantId,
      });

      return NextResponse.json(vendor, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error creating vendor:", error);
      return NextResponse.json(
        { error: "Failed to create vendor" },
        { status: 500 }
      );
    }
  }
);
