import prisma from "@/lib/prisma";
import { PurchaseOrderStatus, Prisma } from "@prisma/client";
import { emitToTenant } from "@/lib/socket";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderInput {
  vendorId: string;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
  createdById: string;
  tenantId: string;
}

// ============================================================================
// Purchase Order Service (SAP-Inspired Approval Workflow)
// ============================================================================

/**
 * WORKFLOW:
 * 1. Create PO → status = PENDING
 * 2. Admin/Manager with po.approve reviews → APPROVED or REJECTED
 * 3. On APPROVED → inventory (stock) updates automatically
 * 4. FULFILLED → marked as complete after goods received
 *
 * Separation of Duties: approver must be different from creator
 */

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const po = await prisma.purchaseOrder.create({
    data: {
      vendorId: input.vendorId,
      totalAmount,
      notes: input.notes,
      createdById: input.createdById,
      tenantId: input.tenantId,
      status: "PENDING",
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
      vendor: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await invalidateCache(`purchase-orders:${input.tenantId}:*`);
  return po;
}

export async function getPurchaseOrders(
  tenantId: string,
  pagination: PaginationInput,
  status?: PurchaseOrderStatus
) {
  const { page, limit, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseOrderWhereInput = { tenantId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: {
        vendor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    }),
    prisma.purchaseOrder.count({ where }),
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

export async function getPurchaseOrderById(id: string, tenantId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      vendor: true,
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, stockQuantity: true } },
        },
      },
    },
  });
}

/**
 * Approve or reject a purchase order.
 * On APPROVED: automatically updates product stock quantities.
 * Separation of Duties: approver must differ from creator.
 */
export async function approvePurchaseOrder(
  id: string,
  tenantId: string,
  approvedById: string,
  action: "APPROVED" | "REJECTED",
  notes?: string | null
) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: { items: true, vendor: true },
  });

  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "PENDING") {
    throw new Error(`Cannot ${action.toLowerCase()} a ${po.status} purchase order`);
  }

  // Separation of duties: approver must be different from creator
  if (po.createdById === approvedById) {
    throw new Error(
      "Separation of duties: the creator cannot approve their own purchase order"
    );
  }

  const updatedPO = await prisma.$transaction(async (tx) => {
    // Update PO status
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: action,
        approvedById,
        notes: notes ? `${po.notes || ""}\n[${action}]: ${notes}` : po.notes,
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        vendor: { select: { id: true, name: true } },
      },
    });

    // On APPROVED: update inventory
    if (action === "APPROVED") {
      for (const item of po.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    return updated;
  });

  // Emit WebSocket events
  emitToTenant(tenantId, "po.status.changed", {
    purchaseOrderId: po.id,
    oldStatus: po.status,
    newStatus: action,
    vendorName: po.vendor.name,
    tenantId,
  });

  // Emit inventory updates on approval
  if (action === "APPROVED") {
    for (const item of po.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (product) {
        emitToTenant(tenantId, "inventory.updated", {
          productId: product.id,
          productName: product.name,
          oldQuantity: product.stockQuantity - item.quantity,
          newQuantity: product.stockQuantity,
          tenantId,
        });
      }
    }
  }

  await invalidateCache(`purchase-orders:${tenantId}:*`);
  await invalidateCache(`products:${tenantId}:*`);
  return updatedPO;
}

/**
 * Mark a purchase order as fulfilled
 */
export async function fulfillPurchaseOrder(id: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
  });

  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "APPROVED") {
    throw new Error("Only approved purchase orders can be fulfilled");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "FULFILLED" },
  });

  await invalidateCache(`purchase-orders:${tenantId}:*`);
  return updated;
}
