import prisma from "@/lib/prisma";
import { PricingModel, Prisma } from "@prisma/client";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  pricingModel?: PricingModel;
  basePrice: number;
  vendorId: string;
  availabilityStatus?: boolean;
  tenantId: string;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  pricingModel?: PricingModel;
  basePrice?: number;
  vendorId?: string;
  availabilityStatus?: boolean;
}

// ============================================================================
// Service Service (service layer for the Service entity)
// ============================================================================

export async function createService(input: CreateServiceInput) {
  const service = await prisma.service.create({
    data: {
      name: input.name,
      description: input.description,
      pricingModel: input.pricingModel || "FIXED",
      basePrice: input.basePrice,
      vendorId: input.vendorId,
      availabilityStatus: input.availabilityStatus ?? true,
      tenantId: input.tenantId,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });

  await invalidateCache(`services:${input.tenantId}:*`);
  return service;
}

export async function getServices(
  tenantId: string,
  pagination: PaginationInput,
  vendorId?: string,
  pricingModel?: PricingModel
) {
  const { page, limit, search, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.ServiceWhereInput = { tenantId };
  if (vendorId) where.vendorId = vendorId;
  if (pricingModel) where.pricingModel = pricingModel;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: { vendor: { select: { id: true, name: true } } },
    }),
    prisma.service.count({ where }),
  ]);

  return {
    data: services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getServiceById(id: string, tenantId: string) {
  return prisma.service.findFirst({
    where: { id, tenantId },
    include: { vendor: { select: { id: true, name: true } } },
  });
}

export async function updateService(
  id: string,
  tenantId: string,
  input: UpdateServiceInput
) {
  const existing = await prisma.service.findFirst({
    where: { id, tenantId },
  });

  if (!existing) throw new Error("Service not found");

  const service = await prisma.service.update({
    where: { id },
    data: input,
    include: { vendor: { select: { id: true, name: true } } },
  });

  await invalidateCache(`services:${tenantId}:*`);
  return service;
}

export async function deleteService(id: string, tenantId: string) {
  const service = await prisma.service.findFirst({
    where: { id, tenantId },
  });

  if (!service) throw new Error("Service not found");

  await prisma.service.delete({ where: { id } });
  await invalidateCache(`services:${tenantId}:*`);
  return service;
}
