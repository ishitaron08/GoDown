import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { updateVendorSchema } from "@/lib/zod-schemas";
import * as vendorService from "@/modules/vendor/service";
import { z } from "zod";

// GET /api/vendors/[id] — Get vendor by ID
export const GET = withPermission("vendor.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
      }

      const vendor = await vendorService.getVendorById(id, user.tenantId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      return NextResponse.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
    }
  }
);

// PUT /api/vendors/[id] — Update vendor
export const PUT = withPermission("vendor.update")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
      }

      const body = await req.json();
      const data = updateVendorSchema.parse(body);

      const vendor = await vendorService.updateVendor(id, user.tenantId, data);
      return NextResponse.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      const message = error instanceof Error ? error.message : "Failed to update vendor";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

// DELETE /api/vendors/[id] — Delete vendor
export const DELETE = withPermission("vendor.delete")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
      }

      await vendorService.deleteVendor(id, user.tenantId);
      return NextResponse.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete vendor";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
