import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { requirePermission } from "@/lib/require-permission";
import { getRoleLevel, getAssignableRoleSlugs } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET — list users (requires users:view); only returns users the actor can manage
export async function GET() {
  try {
    const auth = await requirePermission("users:view");
    if (!auth.authorized) return auth.response;

    await connectDB();
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Attach role info
    const roles = await Role.find().lean();
    const roleMap = Object.fromEntries(roles.map((r) => [r.slug, r]));

    const actorRole = auth.session.user.role;
    const actorLevel = getRoleLevel(actorRole);
    const assignable = getAssignableRoleSlugs(actorRole);

    // Build full role details list for the dropdown (no roles:view needed)
    const assignableRoleDetails = assignable
      .map((slug) => {
        const r = roleMap[slug];
        return r ? { slug: r.slug, name: r.name } : { slug, name: slug };
      });

    const enriched = users.map((u) => ({
      ...u,
      roleInfo: roleMap[u.role] ?? null,
      // Tell the frontend whether this user's role can be changed by the actor
      canEdit: getRoleLevel(u.role) > actorLevel,
      // Roles the actor is allowed to assign (used by the dropdown)
      assignableRoles: assignable,
      assignableRoleDetails,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
