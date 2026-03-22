/**
 * Centralized permission definitions for the GoDown RBAC system.
 * Permissions follow the pattern: "module:action"
 */

// ───────── All available permissions ─────────
export const ALL_PERMISSIONS = [
  // Dashboard
  "dashboard:view",

  // Products
  "products:view",
  "products:create",
  "products:edit",
  "products:delete",

  // Inventory
  "inventory:view",
  "inventory:create",
  "inventory:edit",

  // Orders
  "orders:view",
  "orders:create",
  "orders:edit",
  "orders:delete",

  // Deliveries (delivery partner dashboard)
  "deliveries:view",
  "deliveries:edit",

  // Suppliers
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",

  // Reports
  "reports:view",
  "reports:export",

  // AI Assistant
  "ai:view",
  "ai:use",

  // User Management
  "users:view",
  "users:create",
  "users:edit",
  "users:delete",

  // Role Management
  "roles:view",
  "roles:create",
  "roles:edit",
  "roles:delete",

  // Settings
  "settings:view",
  "settings:edit",

  // Upload
  "upload:create",

  // Categories
  "categories:view",
  "categories:create",
  "categories:edit",
  "categories:delete",

  // Warehouses (GoDowns)
  "warehouses:view",
  "warehouses:create",
  "warehouses:edit",
  "warehouses:delete",
  "warehouses:stock",   // update stock counts
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// ───────── Group permissions by module for UI ─────────
export interface PermissionGroup {
  module: string;
  label: string;
  permissions: { key: Permission; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: "dashboard",
    label: "Dashboard",
    permissions: [{ key: "dashboard:view", label: "View Dashboard" }],
  },
  {
    module: "products",
    label: "Products",
    permissions: [
      { key: "products:view", label: "View Products" },
      { key: "products:create", label: "Create Products" },
      { key: "products:edit", label: "Edit Products" },
      { key: "products:delete", label: "Delete Products" },
    ],
  },
  {
    module: "inventory",
    label: "Inventory",
    permissions: [
      { key: "inventory:view", label: "View Inventory" },
      { key: "inventory:create", label: "Add Stock Movements" },
      { key: "inventory:edit", label: "Edit Inventory" },
    ],
  },
  {
    module: "orders",
    label: "Orders",
    permissions: [
      { key: "orders:view", label: "View Orders" },
      { key: "orders:create", label: "Create Orders" },
      { key: "orders:edit", label: "Edit Orders" },
      { key: "orders:delete", label: "Delete Orders" },
    ],
  },
  {
    module: "deliveries",
    label: "Deliveries",
    permissions: [
      { key: "deliveries:view", label: "View Deliveries" },
      { key: "deliveries:edit", label: "Update Delivery Status" },
    ],
  },
  {
    module: "suppliers",
    label: "Suppliers",
    permissions: [
      { key: "suppliers:view", label: "View Suppliers" },
      { key: "suppliers:create", label: "Create Suppliers" },
      { key: "suppliers:edit", label: "Edit Suppliers" },
      { key: "suppliers:delete", label: "Delete Suppliers" },
    ],
  },
  {
    module: "categories",
    label: "Categories",
    permissions: [
      { key: "categories:view", label: "View Categories" },
      { key: "categories:create", label: "Create Categories" },
      { key: "categories:edit", label: "Edit Categories" },
      { key: "categories:delete", label: "Delete Categories" },
    ],
  },
  {
    module: "reports",
    label: "Reports",
    permissions: [
      { key: "reports:view", label: "View Reports" },
      { key: "reports:export", label: "Export Reports" },
    ],
  },
  {
    module: "ai",
    label: "AI Assistant",
    permissions: [
      { key: "ai:view", label: "Access AI Page" },
      { key: "ai:use", label: "Use AI Features" },
    ],
  },
  {
    module: "users",
    label: "User Management",
    permissions: [
      { key: "users:view", label: "View Users" },
      { key: "users:create", label: "Create Users" },
      { key: "users:edit", label: "Edit Users (role, status)" },
      { key: "users:delete", label: "Deactivate Users" },
    ],
  },
  {
    module: "roles",
    label: "Role Management",
    permissions: [
      { key: "roles:view", label: "View Roles" },
      { key: "roles:create", label: "Create Roles" },
      { key: "roles:edit", label: "Edit Roles" },
      { key: "roles:delete", label: "Delete Roles" },
    ],
  },
  {
    module: "settings",
    label: "Settings",
    permissions: [
      { key: "settings:view", label: "View Settings" },
      { key: "settings:edit", label: "Edit Settings" },
    ],
  },
  {
    module: "upload",
    label: "File Upload",
    permissions: [{ key: "upload:create", label: "Upload Files" }],
  },
  {
    module: "warehouses",
    label: "Warehouses (GoDowns)",
    permissions: [
      { key: "warehouses:view", label: "View Warehouses" },
      { key: "warehouses:create", label: "Create Warehouses" },
      { key: "warehouses:edit", label: "Edit Warehouses" },
      { key: "warehouses:delete", label: "Delete Warehouses" },
      { key: "warehouses:stock", label: "Update Stock Counts" },
    ],
  },
];

// ───────── Default role templates ─────────
export const DEFAULT_ROLES = {
  admin: {
    name: "Admin",
    slug: "admin",
    description: "Full system access — manage everything including users and roles",
    permissions: [...ALL_PERMISSIONS] as string[],
    isSystem: true,
    isDefault: false,
  },
  manager: {
    name: "Manager",
    slug: "manager",
    description: "Manage products, orders, inventory, suppliers — can manage staff & below",
    permissions: [
      "dashboard:view",
      "products:view",
      "products:create",
      "products:edit",
      "products:delete",
      "inventory:view",
      "inventory:create",
      "inventory:edit",
      "orders:view",
      "orders:create",
      "orders:edit",
      "orders:delete",
      "suppliers:view",
      "suppliers:create",
      "suppliers:edit",
      "suppliers:delete",
      "categories:view",
      "categories:create",
      "categories:edit",
      "categories:delete",
      "reports:view",
      "reports:export",
      "ai:view",
      "ai:use",
      "upload:create",
      "users:view",
      "users:edit",
      "settings:view",
      "warehouses:view",
      "warehouses:create",
      "warehouses:edit",
      "warehouses:delete",
      "warehouses:stock",
    ] as string[],
    isSystem: true,
    isDefault: false,
  },
  staff: {
    name: "Staff",
    slug: "staff",
    description: "Day-to-day operations — view and create, limited editing",
    permissions: [
      "dashboard:view",
      "products:view",
      "products:create",
      "inventory:view",
      "inventory:create",
      "orders:view",
      "orders:create",
      "suppliers:view",
      "categories:view",
      "reports:view",
      "ai:view",
      "upload:create",
      "warehouses:view",
      "warehouses:stock",
    ] as string[],
    isSystem: true,
    isDefault: false,
  },
  customer: {
    name: "Customer",
    slug: "customer",
    description: "External customer — browse product catalog and place/track their own orders",
    permissions: [
      "products:view",
      "orders:view",
      "orders:create",
    ] as string[],
    isSystem: true,
    isDefault: true,  // default for public self-registration
  },
  "delivery-partner": {
    name: "Delivery Partner",
    slug: "delivery-partner",
    description: "Handles deliveries — view assigned orders with addresses, update delivery status",
    permissions: [
      "dashboard:view",
      "deliveries:view",
      "deliveries:edit",
      "suppliers:view",
      "warehouses:view",
    ] as string[],
    isSystem: true,
    isDefault: false,
  },
};

// ───────── Route → Permission mapping ─────────
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  // Pages
  "/dashboard": "dashboard:view",
  "/products": "products:view",
  "/products/new": "products:create",
  "/inventory": "inventory:view",
  "/orders": "orders:view",
  "/deliveries": "deliveries:view",
  "/suppliers": "suppliers:view",
  "/warehouses": "warehouses:view",
  "/reports": "reports:view",
  "/ai": "ai:view",
  "/settings": "settings:view",
  "/settings/roles": "roles:view",

  // API routes — GET
  "/api/products": "products:view",
  "/api/inventory": "inventory:view",
  "/api/orders": "orders:view",
  "/api/suppliers": "suppliers:view",
  "/api/categories": "categories:view",
  "/api/dashboard": "dashboard:view",
  "/api/users": "users:view",
  "/api/roles": "roles:view",
  "/api/ai": "ai:use",
  "/api/upload": "upload:create",
  "/api/warehouses": "warehouses:view",
};

// ───────── Role hierarchy (lower = more authority) ─────────
export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 0,
  manager: 1,
  staff: 2,
  "delivery-partner": 3,
  customer: 4,
};

/** Get role level; unknown roles get level 99 (lowest authority). */
export function getRoleLevel(slug: string): number {
  return ROLE_HIERARCHY[slug] ?? 99;
}

/** Can the actor (by role slug) manage / edit a target user with the given role? */
export function canManageRole(actorRole: string, targetRole: string): boolean {
  return getRoleLevel(actorRole) < getRoleLevel(targetRole);
}

/** Roles the actor is allowed to assign (all roles strictly below them). */
export function getAssignableRoleSlugs(actorRole: string): string[] {
  const actorLevel = getRoleLevel(actorRole);
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level > actorLevel)
    .map(([slug]) => slug);
}

// ───────── Helper to check if a permission set includes a required permission ─────────
export function hasPermission(
  userPermissions: string[] | undefined,
  required: Permission | Permission[]
): boolean {
  if (!userPermissions) return false;
  // Admin with all permissions
  if (userPermissions.includes("*")) return true;

  if (Array.isArray(required)) {
    return required.some((p) => userPermissions.includes(p));
  }
  return userPermissions.includes(required);
}

// ───────── Extract module from a route ─────────
export function getRoutePermission(pathname: string): Permission | null {
  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];

  // Check prefix match (for dynamic routes like /products/[id])
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const candidate = "/" + segments.join("/");
    if (ROUTE_PERMISSIONS[candidate]) return ROUTE_PERMISSIONS[candidate];
    segments.pop();
  }

  return null;
}
