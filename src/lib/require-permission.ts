import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

/**
 * requirePermission — call at the top of any API handler.
 * Returns the session if authorized, or a NextResponse error.
 */
export async function requirePermission(
  ...required: Permission[]
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const perms: string[] = session.user.permissions ?? [];

  // Check if user has at least one of the required permissions
  const hasAccess = required.length === 0 || required.some((p) => perms.includes(p));

  if (!hasAccess) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: `Forbidden — requires: ${required.join(" or ")}` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true as const, session };
}
