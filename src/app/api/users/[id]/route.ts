import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { requirePermission } from "@/lib/require-permission";
import { getRoleLevel, canManageRole, getAssignableRoleSlugs } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// PATCH — update user role or isActive (requires users:edit + hierarchy check)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("users:edit");
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const actorRole = auth.session.user.role;

    await connectDB();

    // Fetch the target user to check their current role
    const targetUser = await User.findById(params.id).select("role").lean() as { role?: string } | null;
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = targetUser.role ?? "customer";

    // Hierarchy check: actor must outrank target user
    if (!canManageRole(actorRole, targetRole)) {
      return NextResponse.json(
        { error: "You cannot manage users at the same or higher level than you" },
        { status: 403 }
      );
    }

    // Only allow updating role and isActive
    const allowedFields: Record<string, unknown> = {};

    if (body.role) {
      // Validate role exists
      const roleDoc = await Role.findOne({ slug: body.role });
      if (!roleDoc) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Hierarchy check: actor can only assign roles below their own level
      const assignable = getAssignableRoleSlugs(actorRole);
      if (!assignable.includes(body.role)) {
        return NextResponse.json(
          { error: `You can only assign: ${assignable.join(", ")}` },
          { status: 403 }
        );
      }

      allowedFields.role = body.role;
    }

    if (typeof body.isActive === "boolean") {
      allowedFields.isActive = body.isActive;
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Prevent demoting yourself
    if (params.id === auth.session.user.id && allowedFields.role && allowedFields.role !== auth.session.user.role) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    // Prevent deactivating yourself
    if (params.id === auth.session.user.id && allowedFields.isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate yourself" }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      { $set: allowedFields },
      { new: true }
    ).select("-password");

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — deactivate user (requires users:delete + hierarchy check)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("users:delete");
    if (!auth.authorized) return auth.response;

    if (params.id === auth.session.user.id) {
      return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
    }

    await connectDB();

    // Hierarchy check
    const targetUser = await User.findById(params.id).select("role").lean() as { role?: string } | null;
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canManageRole(auth.session.user.role, targetUser.role ?? "customer")) {
      return NextResponse.json(
        { error: "You cannot deactivate users at the same or higher level than you" },
        { status: 403 }
      );
    }

    await User.findByIdAndUpdate(params.id, { isActive: false });
    return NextResponse.json({ message: "User deactivated" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
