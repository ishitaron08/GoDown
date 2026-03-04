import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  permissions: string[];
}

// ============================================================================
// Get authenticated user from session
// ============================================================================

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    tenantId: session.user.tenantId,
    permissions: session.user.permissions || [],
  };
}

// ============================================================================
// Auth middleware for route handlers
// ============================================================================

export function withAuth(
  handler: (
    req: NextRequest,
    context: { user: AuthenticatedUser; params?: Record<string, string> }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeContext?: { params?: Record<string, string> }) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return handler(req, { user, params: routeContext?.params });
  };
}
