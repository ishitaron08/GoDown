import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { updateServiceSchema } from "@/lib/zod-schemas";
import * as serviceService from "@/modules/service/service";
import { z } from "zod";

export const GET = withPermission("service.view")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

      const service = await serviceService.getServiceById(id, user.tenantId);
      if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

      return NextResponse.json(service);
    } catch {
      return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
    }
  }
);

export const PUT = withPermission("service.manage")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

      const body = await req.json();
      const data = updateServiceSchema.parse(body);

      const service = await serviceService.updateService(id, user.tenantId, data);
      return NextResponse.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Failed to update service";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

export const DELETE = withPermission("service.manage")(
  async (req: NextRequest, { user, params }) => {
    try {
      const id = params?.id;
      if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

      await serviceService.deleteService(id, user.tenantId);
      return NextResponse.json({ message: "Service deleted successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete service";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
