import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import prisma from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";

// GET /api/users — List all users for the tenant with their roles
export const GET = withPermission("user.manage")(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || "";

      const users = await prisma.user.findMany({
        where: {
          tenantId: user.tenantId,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const result = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        tenantId: u.tenantId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        roles: u.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        })),
      }));

      return NextResponse.json({ users: result });
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/users — Update a user's role
export const PUT = withPermission("user.manage")(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const { userId, roleId } = body;

      if (!userId || !roleId) {
        return NextResponse.json(
          { error: "userId and roleId are required" },
          { status: 400 }
        );
      }

      // Prevent admin from changing their own role
      if (userId === user.id) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 403 }
        );
      }

      // Verify target user belongs to the same tenant
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, tenantId: user.tenantId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found in your organization" },
          { status: 404 }
        );
      }

      // Verify the role belongs to the same tenant
      const role = await prisma.role.findFirst({
        where: { id: roleId, tenantId: user.tenantId },
      });

      if (!role) {
        return NextResponse.json(
          { error: "Role not found in your organization" },
          { status: 404 }
        );
      }

      // ⛔ BLOCK: Admin role cannot be assigned through the portal
      if (role.name === "Admin") {
        return NextResponse.json(
          {
            error:
              "Admin role cannot be assigned through the portal. This can only be done directly in the database for security reasons.",
          },
          { status: 403 }
        );
      }

      // Remove all existing roles for the user
      await prisma.userRole.deleteMany({
        where: { userId },
      });

      // Assign the new role
      await prisma.userRole.create({
        data: { userId, roleId },
      });

      // Invalidate the user's permission cache
      await invalidateCache(`rbac:permissions:${userId}`);

      // Fetch updated user
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: { select: { id: true, name: true, description: true } },
            },
          },
        },
      });

      return NextResponse.json({
        message: "Role updated successfully",
        user: {
          id: updatedUser!.id,
          name: updatedUser!.name,
          email: updatedUser!.email,
          tenantId: updatedUser!.tenantId,
          createdAt: updatedUser!.createdAt,
          updatedAt: updatedUser!.updatedAt,
          roles: updatedUser!.userRoles.map((ur) => ({
            id: ur.role.id,
            name: ur.role.name,
            description: ur.role.description,
          })),
        },
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }
  }
);
