import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface CreateConsumerInput {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  tenantId: string;
}

export interface UpdateConsumerInput {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  segment?: string | null;
}

// ============================================================================
// Consumer Service
// ============================================================================

export async function createConsumer(input: CreateConsumerInput) {
  // Check for duplicate email within tenant
  const existing = await prisma.consumer.findFirst({
    where: { email: input.email, tenantId: input.tenantId },
  });

  if (existing) {
    throw new Error("Consumer with this email already exists for this tenant");
  }

  const consumer = await prisma.consumer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      tenantId: input.tenantId,
    },
  });

  await invalidateCache(`consumers:${input.tenantId}:*`);
  return consumer;
}

export async function getConsumers(
  tenantId: string,
  pagination: PaginationInput,
  segment?: string
) {
  const { page, limit, search, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.ConsumerWhereInput = { tenantId };
  if (segment) where.segment = segment;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [consumers, total] = await Promise.all([
    prisma.consumer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: {
        _count: { select: { orders: true } },
      },
    }),
    prisma.consumer.count({ where }),
  ]);

  return {
    data: consumers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getConsumerById(id: string, tenantId: string) {
  return prisma.consumer.findFirst({
    where: { id, tenantId },
    include: {
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { orderItems: true },
      },
      _count: { select: { orders: true } },
    },
  });
}

export async function updateConsumer(
  id: string,
  tenantId: string,
  input: UpdateConsumerInput
) {
  const existing = await prisma.consumer.findFirst({
    where: { id, tenantId },
  });

  if (!existing) throw new Error("Consumer not found");

  const consumer = await prisma.consumer.update({
    where: { id },
    data: input,
  });

  await invalidateCache(`consumers:${tenantId}:*`);
  return consumer;
}

export async function deleteConsumer(id: string, tenantId: string) {
  const consumer = await prisma.consumer.findFirst({
    where: { id, tenantId },
  });

  if (!consumer) throw new Error("Consumer not found");

  await prisma.consumer.delete({ where: { id } });
  await invalidateCache(`consumers:${tenantId}:*`);
  return consumer;
}

/**
 * Get unique consumer segments for a tenant
 */
export async function getConsumerSegments(tenantId: string): Promise<string[]> {
  const segments = await prisma.consumer.findMany({
    where: { tenantId, segment: { not: null } },
    select: { segment: true },
    distinct: ["segment"],
  });

  return segments
    .map((s) => s.segment)
    .filter((s): s is string => s !== null);
}
