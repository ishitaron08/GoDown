import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import prisma from "@/lib/prisma";

// GET /api/roles — List all roles for the tenant with permissions and user counts
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const roles = await prisma.role.findMany({
      where: { tenantId: user.tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, action: true, description: true },
            },
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
    }));

    return NextResponse.json({ roles: result });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
});
