import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Permission-based middleware.
 * Maps route prefixes to the permission required to access them.
 * The user's permissions are stored in the JWT token.
 */
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  // Pages
  "/dashboard": "dashboard:view",
  "/products": "products:view",
  "/inventory": "inventory:view",
  "/orders": "orders:view",
  "/suppliers": "suppliers:view",
  "/warehouses": "warehouses:view",
  "/reports": "reports:view",
  "/ai": "ai:view",
  "/settings/roles": "roles:view",
  "/settings": "settings:view",
  "/catalog": "products:view",

  // API routes
  "/api/products": "products:view",
  "/api/inventory": "inventory:view",
  "/api/orders": "orders:view",
  "/api/suppliers": "suppliers:view",
  "/api/categories": "categories:view",
  "/api/warehouses": "warehouses:view",
  "/api/dashboard": "dashboard:view",
  "/api/users": "users:view",
  "/api/roles": "roles:view",
  "/api/ai": "ai:use",
  "/api/upload": "upload:create",
};

function getRequiredPermission(pathname: string): string | null {
  // Check longest prefix first to match specific routes before general ones
  const sorted = Object.keys(ROUTE_PERMISSION_MAP).sort(
    (a, b) => b.length - a.length
  );
  for (const prefix of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return ROUTE_PERMISSION_MAP[prefix];
    }
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const permissions: string[] =
      (req.nextauth.token?.permissions as string[]) ?? [];

    const required = getRequiredPermission(pathname);

    if (required && !permissions.includes(required)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: `Forbidden — requires "${required}" permission` },
          { status: 403 }
        );
      }
      // Redirect to dashboard if they have that permission, otherwise to the
      // first route they CAN access, to avoid redirect loops.
      const canAccessDashboard = permissions.includes("dashboard:view");
      const canAccessCatalog = permissions.includes("products:view");
      if (canAccessDashboard && pathname !== "/dashboard") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // If they can access the catalog (e.g. customer role), redirect there
      if (canAccessCatalog && pathname !== "/catalog") {
        return NextResponse.redirect(new URL("/catalog", req.url));
      }
      // If they don't have any usable permissions (e.g. roles not yet seeded),
      // let them through to avoid an auth/login ↔ dashboard redirect loop.
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/orders/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/ai/:path*",
    "/catalog/:path*",
    "/api/products/:path*",
    "/api/inventory/:path*",
    "/api/orders/:path*",
    "/api/suppliers/:path*",
    "/api/categories/:path*",
    "/api/reports/:path*",
    "/api/upload/:path*",
    "/api/ai/:path*",
    "/api/users/:path*",
    "/api/roles/:path*",
    "/api/warehouses/:path*",
    "/api/dashboard/:path*",
    "/api/partners/:path*",
  ],
};
