import prisma from "@/lib/prisma";
import { VendorStatus, Prisma } from "@prisma/client";
import { emitToTenant } from "@/lib/socket";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface CreateVendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  documents?: unknown;
  tenantId: string;
}

export interface UpdateVendorInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: VendorStatus;
  documents?: unknown;
}

// ============================================================================
// Vendor Service
// ============================================================================

export async function createVendor(input: CreateVendorInput) {
  const vendor = await prisma.vendor.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      documents: input.documents as Prisma.InputJsonValue ?? undefined,
      tenantId: input.tenantId,
    },
  });

  await invalidateCache(`vendors:${input.tenantId}:*`);
  return vendor;
}

export async function getVendors(
  tenantId: string,
  pagination: PaginationInput,
  status?: VendorStatus
) {
  const { page, limit, search, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.VendorWhereInput = { tenantId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: {
        _count: {
          select: { products: true, services: true, purchaseOrders: true },
        },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getVendorById(id: string, tenantId: string) {
  return prisma.vendor.findFirst({
    where: { id, tenantId },
    include: {
      products: { take: 10, orderBy: { createdAt: "desc" } },
      services: { take: 10, orderBy: { createdAt: "desc" } },
      _count: {
        select: { products: true, services: true, purchaseOrders: true },
      },
    },
  });
}

export async function updateVendor(
  id: string,
  tenantId: string,
  input: UpdateVendorInput
) {
  // Get old vendor for WebSocket event
  const oldVendor = await prisma.vendor.findFirst({
    where: { id, tenantId },
  });

  if (!oldVendor) throw new Error("Vendor not found");

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...input,
      documents: input.documents as Prisma.InputJsonValue ?? undefined,
    },
  });

  // Emit WebSocket event if status changed
  if (input.status && input.status !== oldVendor.status) {
    emitToTenant(tenantId, "vendor.status.changed", {
      vendorId: vendor.id,
      vendorName: vendor.name,
      oldStatus: oldVendor.status,
      newStatus: vendor.status,
      tenantId,
    });
  }

  await invalidateCache(`vendors:${tenantId}:*`);
  return vendor;
}

export async function deleteVendor(id: string, tenantId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id, tenantId },
  });

  if (!vendor) throw new Error("Vendor not found");

  await prisma.vendor.delete({ where: { id } });
  await invalidateCache(`vendors:${tenantId}:*`);
  return vendor;
}
