import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/models/Role";
import { requirePermission } from "@/lib/require-permission";
import { ALL_PERMISSIONS, DEFAULT_ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET — list all roles (seeds defaults if collection is empty)
export async function GET() {
  try {
    const auth = await requirePermission("roles:view");
    if (!auth.authorized) return auth.response;

    await connectDB();
    let roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();

    // Auto-seed default roles if collection is empty
    if (roles.length === 0) {
      const defaults = Object.values(DEFAULT_ROLES);
      await Role.insertMany(defaults);
      roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();
    }

    return NextResponse.json(roles);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new role
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("roles:create");
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { name, slug, description, permissions, isDefault } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase alphanumeric with hyphens only" },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPerms = (permissions ?? []).filter((p: string) =>
      (ALL_PERMISSIONS as readonly string[]).includes(p)
    );

    await connectDB();

    // Check for duplicate slug
    const existing = await Role.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: "A role with this slug already exists" },
        { status: 409 }
      );
    }

    const role = await Role.create({
      name,
      slug,
      description: description ?? "",
      permissions: validPerms,
      isSystem: false,
      isDefault: isDefault ?? false,
    });

    return NextResponse.json(role, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
