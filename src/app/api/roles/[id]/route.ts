import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { requirePermission } from "@/lib/require-permission";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface RoleItem {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isDefault: boolean;
}

type Params = { params: { id: string } };

// GET — get a single role
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("roles:view");
    if (!auth.authorized) return auth.response;

    await connectDB();
    const role = await Role.findById(params.id).lean() as (RoleItem & { _id: string }) | null;
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Count users with this role
    const userCount = await User.countDocuments({ role: role.slug });

    return NextResponse.json({ ...role, userCount });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update a role
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("roles:edit");
    if (!auth.authorized) return auth.response;

    await connectDB();

    const role = await Role.findById(params.id);
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const body = await req.json();

    // System roles: only permissions and description can be updated
    if (role.isSystem) {
      if (body.name || body.slug) {
        return NextResponse.json(
          { error: "Cannot rename system roles" },
          { status: 400 }
        );
      }
      // Admin role cannot have permissions removed
      if (role.slug === "admin") {
        return NextResponse.json(
          { error: "Cannot modify admin role permissions" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.isDefault !== undefined) {
      update.isDefault = body.isDefault;
      // If setting as default, unset others
      if (body.isDefault) {
        await Role.updateMany(
          { _id: { $ne: role._id }, isDefault: true },
          { isDefault: false }
        );
      }
    }
    if (body.permissions !== undefined) {
      update.permissions = (body.permissions as string[]).filter((p: string) =>
        (ALL_PERMISSIONS as readonly string[]).includes(p)
      );
    }

    // Update slug only for non-system roles
    if (body.slug !== undefined && !role.isSystem) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(body.slug)) {
        return NextResponse.json(
          { error: "Slug must be lowercase alphanumeric with hyphens only" },
          { status: 400 }
        );
      }
      const dup = await Role.findOne({ slug: body.slug, _id: { $ne: role._id } });
      if (dup) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 409 }
        );
      }
      // Update users with old slug to new slug
      await User.updateMany({ role: role.slug }, { role: body.slug });
      update.slug = body.slug;
    }

    const updated = await Role.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    ).lean();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete a role (non-system only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("roles:delete");
    if (!auth.authorized) return auth.response;

    await connectDB();

    const role = await Role.findById(params.id);
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      );
    }

    // Move users with this role to the default role
    const defaultRole = await Role.findOne({ isDefault: true });
    const fallbackSlug = defaultRole?.slug ?? "staff";
    await User.updateMany({ role: role.slug }, { role: fallbackSlug });

    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: `Role deleted. Users moved to "${fallbackSlug}" role.`,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
