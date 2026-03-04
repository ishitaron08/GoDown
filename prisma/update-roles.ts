import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin:
    "Full system access — Can manage users, roles, vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. This is the highest privilege role with unrestricted access to all features.",
  Manager:
    "Management access — Can view and manage vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. Cannot manage users or roles.",
  Clerk:
    "Basic data entry — Can view all resources and create consumers, orders, and purchase orders. Cannot update or delete vendors, products, or services. Cannot manage users.",
  Viewer:
    "Read-only access — Can view vendors, products, services, consumers, orders, purchase orders, and analytics. Cannot create, update, or delete any data.",
};

async function main() {
  console.log("🔄 Updating role descriptions...\n");

  for (const [roleName, description] of Object.entries(ROLE_DESCRIPTIONS)) {
    const result = await prisma.role.updateMany({
      where: { name: roleName },
      data: { description },
    });
    console.log(`  ✅ ${roleName}: updated ${result.count} role(s)`);
  }

  // Also ensure Viewer role exists for each tenant (it was missing in original seed)
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  const viewerPerms = await prisma.permission.findMany({
    where: {
      action: { in: ["vendor.view", "product.view", "service.view", "consumer.view", "order.view", "po.view", "analytics.view"] },
    },
  });

  for (const tenant of tenants) {
    const existing = await prisma.role.findFirst({
      where: { name: "Viewer", tenantId: tenant.id },
    });

    if (!existing) {
      const viewer = await prisma.role.create({
        data: {
          name: "Viewer",
          description: ROLE_DESCRIPTIONS.Viewer,
          tenantId: tenant.id,
          rolePermissions: {
            create: viewerPerms.map((p) => ({ permissionId: p.id })),
          },
        },
      });
      console.log(`  ➕ Created Viewer role for tenant "${tenant.name}"`);
    }
  }

  // Print summary of all roles
  const allRoles = await prisma.role.findMany({
    include: {
      tenant: { select: { name: true } },
      _count: { select: { userRoles: true, rolePermissions: true } },
    },
    orderBy: [{ tenantId: "asc" }, { name: "asc" }],
  });

  console.log("\n📋 All Roles in Database:\n");
  console.log("─".repeat(100));
  for (const role of allRoles) {
    console.log(`  🏢 ${role.tenant.name} → ${role.name}`);
    console.log(`     ID:          ${role.id}`);
    console.log(`     Description: ${role.description}`);
    console.log(`     Permissions: ${role._count.rolePermissions}`);
    console.log(`     Users:       ${role._count.userRoles}`);
    console.log("─".repeat(100));
  }

  console.log("\n✅ Done!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
