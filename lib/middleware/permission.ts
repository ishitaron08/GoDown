import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, AuthenticatedUser } from "@/lib/middleware/auth";
import { hasPermission } from "@/lib/rbac";
import { incrementRateLimit } from "@/lib/redis";

// ============================================================================
// Permission Middleware
// Dynamic RBAC check — NEVER uses if(user.role === "admin")
// ============================================================================

/**
 * Wrap a route handler with permission checking.
 * 
 * Usage:
 *   export const POST = withPermission("vendor.create")(async (req, { user }) => {
 *     // user is guaranteed to have vendor.create permission
 *   });
 */
export function withPermission(
  requiredPermission: string,
  options?: { rateLimit?: { maxRequests: number; windowSeconds: number } }
) {
  return (
    handler: (
      req: NextRequest,
      context: { user: AuthenticatedUser; params?: Record<string, string> }
    ) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, routeContext?: { params?: Record<string, string> }) => {
      // 1. Check authentication
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // 2. Rate limiting (if configured)
      if (options?.rateLimit) {
        const rateLimitKey = `ratelimit:${user.id}:${requiredPermission}`;
        const { allowed, remaining, resetAt } = await incrementRateLimit(
          rateLimitKey,
          options.rateLimit.windowSeconds,
          options.rateLimit.maxRequests
        );

        if (!allowed) {
          return NextResponse.json(
            { error: "Rate limit exceeded. Try again later." },
            {
              status: 429,
              headers: {
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": resetAt.toString(),
              },
            }
          );
        }
      }

      // 3. Dynamic permission check — queries DB/cache, NOT hardcoded roles
      const permitted = await hasPermission(user.id, requiredPermission);
      if (!permitted) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            required: requiredPermission,
          },
          { status: 403 }
        );
      }

      // 4. Call the actual handler
      return handler(req, { user, params: routeContext?.params });
    };
  };
}

/**
 * Wrap a route handler that requires ANY of the given permissions
 */
export function withAnyPermission(requiredPermissions: string[]) {
  return (
    handler: (
      req: NextRequest,
      context: { user: AuthenticatedUser; params?: Record<string, string> }
    ) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, routeContext?: { params?: Record<string, string> }) => {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const { hasAnyPermission } = await import("@/lib/rbac");
      const permitted = await hasAnyPermission(user.id, requiredPermissions);
      if (!permitted) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            required: requiredPermissions,
          },
          { status: 403 }
        );
      }

      return handler(req, { user, params: routeContext?.params });
    };
  };
}
