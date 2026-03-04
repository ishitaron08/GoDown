import prisma from "@/lib/prisma";
import { getCache, setCache, invalidateCache } from "@/lib/redis";

const PERMISSION_CACHE_TTL = 300; // 5 minutes
const PERMISSION_CACHE_PREFIX = "rbac:permissions:";

// ============================================================================
// Core RBAC Functions (Dynamic - No Hardcoded Roles)
// ============================================================================

/**
 * Check if a user has a specific permission.
 * Uses Redis caching for performance.
 * 
 * Usage: await hasPermission(userId, "vendor.create")
 * NOT: if(user.role === "admin") ❌
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Check if a user has ANY of the given permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if a user has ALL of the given permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Get all permissions for a user.
 * Traverses: User → UserRole → Role → RolePermission → Permission
 * Results are cached in Redis with 5-minute TTL.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `${PERMISSION_CACHE_PREFIX}${userId}`;

  // Check cache first
  const cached = await getCache<string[]>(cacheKey);
  if (cached) return cached;

  // Query DB: User → UserRole → Role → RolePermission → Permission
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissions = Array.from(
    new Set(
      userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.action)
      )
    )
  );

  // Cache the result
  await setCache(cacheKey, permissions, PERMISSION_CACHE_TTL);

  return permissions;
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, name: true } } },
  });

  return userRoles.map((ur) => ur.role);
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  userId: string,
  roleId: string
): Promise<void> {
  // Check if already assigned
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: { userId, roleId },
    });
  }

  // Invalidate cache
  await invalidateCache(`${PERMISSION_CACHE_PREFIX}${userId}`);
}

/**
 * Remove a role from a user
 */
export async function removeRole(
  userId: string,
  roleId: string
): Promise<void> {
  await prisma.userRole.deleteMany({
    where: { userId, roleId },
  });

  // Invalidate cache
  await invalidateCache(`${PERMISSION_CACHE_PREFIX}${userId}`);
}

/**
 * Get all available permissions in the system
 */
export async function getAllPermissions(): Promise<
  { id: string; action: string; description: string | null }[]
> {
  return prisma.permission.findMany({
    select: { id: true, action: true, description: true },
    orderBy: { action: "asc" },
  });
}

/**
 * Get all roles for a tenant with their permissions
 */
export async function getTenantRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: { select: { userRoles: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a new role with permissions
 */
export async function createRole(
  tenantId: string,
  name: string,
  description: string | null,
  permissionIds: string[]
): Promise<string> {
  const role = await prisma.role.create({
    data: {
      name,
      description,
      tenantId,
      rolePermissions: {
        create: permissionIds.map((permissionId) => ({
          permissionId,
        })),
      },
    },
  });

  return role.id;
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<void> {
  // Delete all existing permissions for this role
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  // Add new permissions
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    })),
  });

  // Invalidate cache for all users with this role
  const userRoles = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  for (const ur of userRoles) {
    await invalidateCache(`${PERMISSION_CACHE_PREFIX}${ur.userId}`);
  }
}
