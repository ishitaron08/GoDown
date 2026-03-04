/**
 * Secure Role Assignment Script
 * ─────────────────────────────
 * Use this to assign roles directly in the database.
 * Admin role can ONLY be assigned this way (never via portal).
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/assign-role.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── CONFIGURE HERE ──────────────────────────────────────────
const TARGET_EMAIL = "ishitaron08@gmail.com"; // The user to update
const TARGET_ROLE  = "Admin";                 // Role to assign: Admin | Manager | Clerk | Viewer
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔐 Secure Role Assignment\n");
  console.log(`  Target user : ${TARGET_EMAIL}`);
  console.log(`  Target role : ${TARGET_ROLE}\n`);

  // 1. Find the user
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: {
      tenant: true,
      userRoles: { include: { role: true } },
    },
  });

  if (!user) {
    console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  console.log(`  Found user  : ${user.name || "N/A"} (ID: ${user.id})`);
  console.log(`  Tenant      : ${user.tenant.name}`);
  const currentRoles = user.userRoles.map((ur) => ur.role.name).join(", ") || "None";
  console.log(`  Current role: ${currentRoles}\n`);

  // 2. Find the role in the same tenant
  const role = await prisma.role.findFirst({
    where: { name: TARGET_ROLE, tenantId: user.tenantId },
  });

  if (!role) {
    // If Admin role doesn't exist for this tenant, create it with all permissions
    console.log(`  ⚠️  Role "${TARGET_ROLE}" not found for tenant. Creating it...\n`);

    const allPermissions = await prisma.permission.findMany();

    const newRole = await prisma.role.create({
      data: {
        name: TARGET_ROLE,
        description:
          "Full system access — Can manage users, roles, vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. This is the highest privilege role with unrestricted access to all features.",
        tenantId: user.tenantId,
        rolePermissions: {
          create: allPermissions.map((p) => ({ permissionId: p.id })),
        },
      },
    });

    console.log(`  ✅ Created role "${TARGET_ROLE}" (ID: ${newRole.id})`);

    // Remove existing roles and assign new one
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: newRole.id } });
  } else {
    // Remove existing roles and assign the new one
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  // 3. Verify
  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      userRoles: {
        include: {
          role: {
            include: { _count: { select: { rolePermissions: true } } },
          },
        },
      },
    },
  });

  const newRoleName = updated?.userRoles[0]?.role.name || "None";
  const permCount   = updated?.userRoles[0]?.role._count.rolePermissions || 0;

  console.log("─".repeat(50));
  console.log(`  ✅ Role assigned successfully!\n`);
  console.log(`  User   : ${user.email}`);
  console.log(`  Role   : ${newRoleName}`);
  console.log(`  Perms  : ${permCount} permissions`);
  console.log("─".repeat(50));
  console.log("\n  ⚠️  Log out and log back in for the new role to take effect.\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Error:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
