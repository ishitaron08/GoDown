import prisma from "@/lib/prisma";
import { OrderType, OrderStatus, Prisma } from "@prisma/client";
import { emitToTenant } from "@/lib/socket";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface OrderItemInput {
  productId?: string | null;
  serviceId?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  consumerId: string;
  type: OrderType;
  items: OrderItemInput[];
  tenantId: string;
}

// ============================================================================
// Order Service
// ============================================================================

export async function createOrder(input: CreateOrderInput) {
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.$transaction(async (tx) => {
    // 1. Create the order
    const order = await tx.order.create({
      data: {
        consumerId: input.consumerId,
        type: input.type,
        totalAmount,
        tenantId: input.tenantId,
        orderItems: {
          create: input.items.map((item) => ({
            productId: item.productId,
            serviceId: item.serviceId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        orderItems: true,
        consumer: { select: { id: true, name: true } },
      },
    });

    // 2. Deduct stock for product orders
    if (input.type === "PRODUCT") {
      for (const item of input.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) throw new Error(`Product ${item.productId} not found`);
          if (product.stockQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } },
          });

          // 3. Create sales history entry for AI training
          await tx.salesHistory.create({
            data: {
              productId: item.productId,
              quantitySold: item.quantity,
              revenue: item.quantity * item.unitPrice,
              date: new Date(),
              tenantId: input.tenantId,
            },
          });
        }
      }
    }

    return order;
  });

  // 4. Emit WebSocket event
  emitToTenant(input.tenantId, "order.created", {
    orderId: order.id,
    consumerId: order.consumerId,
    totalAmount: order.totalAmount,
    type: order.type,
    tenantId: input.tenantId,
  });

  // 5. Emit inventory updates for each product
  if (input.type === "PRODUCT") {
    for (const item of input.items) {
      if (item.productId) {
        const updated = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (updated) {
          emitToTenant(input.tenantId, "inventory.updated", {
            productId: updated.id,
            productName: updated.name,
            oldQuantity: updated.stockQuantity + item.quantity,
            newQuantity: updated.stockQuantity,
            tenantId: input.tenantId,
          });
        }
      }
    }
  }

  await invalidateCache(`orders:${input.tenantId}:*`);
  await invalidateCache(`analytics:${input.tenantId}:*`);
  return order;
}

export async function getOrders(
  tenantId: string,
  pagination: PaginationInput,
  type?: OrderType,
  status?: OrderStatus
) {
  const { page, limit, search, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = { tenantId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.consumer = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: {
        consumer: { select: { id: true, name: true, email: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            service: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOrderById(id: string, tenantId: string) {
  return prisma.order.findFirst({
    where: { id, tenantId },
    include: {
      consumer: true,
      orderItems: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function updateOrderStatus(
  id: string,
  tenantId: string,
  status: OrderStatus
) {
  const order = await prisma.order.findFirst({
    where: { id, tenantId },
  });

  if (!order) throw new Error("Order not found");

  return prisma.order.update({
    where: { id },
    data: { status },
  });
}
