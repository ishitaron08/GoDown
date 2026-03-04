import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

// ─── All permissions used by the API routes ──────────────────
const ALL_PERMISSIONS = [
  // Vendors
  { action: "vendor.view", description: "View vendors" },
  { action: "vendor.create", description: "Create vendors" },
  { action: "vendor.update", description: "Update vendors" },
  { action: "vendor.delete", description: "Delete vendors" },
  // Products
  { action: "product.view", description: "View products" },
  { action: "product.create", description: "Create products" },
  { action: "product.update", description: "Update products" },
  { action: "product.delete", description: "Delete products" },
  // Services
  { action: "service.view", description: "View services" },
  { action: "service.manage", description: "Create/update/delete services" },
  // Consumers
  { action: "consumer.view", description: "View consumers" },
  { action: "consumer.create", description: "Create consumers" },
  { action: "consumer.update", description: "Update/delete consumers" },
  // Orders
  { action: "order.view", description: "View orders" },
  { action: "order.create", description: "Create orders" },
  // Purchase Orders
  { action: "po.view", description: "View purchase orders" },
  { action: "po.create", description: "Create purchase orders" },
  { action: "po.approve", description: "Approve/reject purchase orders" },
  // Analytics & AI
  { action: "analytics.view", description: "View analytics" },
  { action: "ai.predict", description: "Run AI predictions" },
  // Files
  { action: "file.upload", description: "Upload/download files" },
  // User management
  { action: "user.manage", description: "Manage users and roles" },
];

// ─── Role templates ──────────────────────────────────────────
const ROLE_TEMPLATES: Record<string, { description: string; permissions: string[] }> = {
  Admin: {
    description: "Full system access — Can manage users, roles, vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. This is the highest privilege role with unrestricted access to all features.",
    permissions: ALL_PERMISSIONS.map((p) => p.action),
  },
  Manager: {
    description: "Management access — Can view and manage vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. Cannot manage users or roles.",
    permissions: ALL_PERMISSIONS.map((p) => p.action).filter(
      (a) => a !== "user.manage"
    ),
  },
  Clerk: {
    description: "Basic data entry — Can view all resources and create consumers, orders, and purchase orders. Cannot update or delete vendors, products, or services. Cannot manage users.",
    permissions: [
      "vendor.view",
      "product.view",
      "service.view",
      "consumer.view",
      "consumer.create",
      "order.view",
      "order.create",
      "po.view",
      "po.create",
      "analytics.view",
      "file.upload",
    ],
  },
  Viewer: {
    description: "Read-only access — Can view vendors, products, services, consumers, orders, purchase orders, and analytics. Cannot create, update, or delete any data.",
    permissions: [
      "vendor.view",
      "product.view",
      "service.view",
      "consumer.view",
      "order.view",
      "po.view",
      "analytics.view",
    ],
  },
};

/**
 * Bootstrap a new tenant with permissions and default roles.
 * Returns the created role IDs keyed by role name.
 */
async function bootstrapTenant(
  tenantId: string
): Promise<Record<string, string>> {
  // 1. Ensure all permissions exist (shared across tenants)
  const permissionRecords = await Promise.all(
    ALL_PERMISSIONS.map(async (p) => {
      let existing = await prisma.permission.findUnique({
        where: { action: p.action },
      });
      if (!existing) {
        existing = await prisma.permission.create({
          data: { action: p.action, description: p.description },
        });
      }
      return existing;
    })
  );

  const permMap = new Map(permissionRecords.map((p) => [p.action, p.id]));

  // 2. Create roles for this tenant
  const roleIds: Record<string, string> = {};

  for (const [roleName, template] of Object.entries(ROLE_TEMPLATES)) {
    // Check if role already exists for this tenant
    let role = await prisma.role.findFirst({
      where: { name: roleName, tenantId },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: template.description,
          tenantId,
          rolePermissions: {
            create: template.permissions
              .map((action) => permMap.get(action))
              .filter((id): id is string => !!id)
              .map((permissionId) => ({ permissionId })),
          },
        },
      });
    }

    roleIds[roleName] = role.id;
  }

  return roleIds;
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  tenantName: z.string().min(1, "Organization name is required").optional(),
  tenantId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Get or create tenant
    let tenantId = data.tenantId;
    let isNewTenant = false;

    if (!tenantId) {
      const orgName = data.tenantName || "Default Organization";
      const subdomain =
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "default";

      let tenant = await prisma.tenant.findFirst({
        where: { subdomain },
      });

      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: { name: orgName, subdomain },
        });
        isNewTenant = true;
      }
      tenantId = tenant.id;
    }

    // Bootstrap roles & permissions for the tenant (idempotent)
    const roleIds = await bootstrapTenant(tenantId);

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // Assign role: Admin for the first user (new tenant creator), Viewer otherwise
    const assignedRole = isNewTenant ? "Admin" : "Viewer";
    const roleId = roleIds[assignedRole];

    if (roleId) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId },
      });
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
        role: assignedRole,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
