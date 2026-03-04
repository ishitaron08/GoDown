import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { emitToTenant } from "@/lib/socket";
import { invalidateCache } from "@/lib/redis";
import { PaginationInput } from "@/lib/zod-schemas";

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQuantity?: number;
  reorderThreshold?: number;
  vendorId: string;
  tenantId: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  costPrice?: number;
  sellingPrice?: number;
  stockQuantity?: number;
  reorderThreshold?: number;
  vendorId?: string;
}

// ============================================================================
// Product Service
// ============================================================================

export async function createProduct(input: CreateProductInput) {
  // Check SKU uniqueness
  const existing = await prisma.product.findUnique({
    where: { sku: input.sku },
  });

  if (existing) {
    throw new Error(`Product with SKU "${input.sku}" already exists`);
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      description: input.description,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      stockQuantity: input.stockQuantity ?? 0,
      reorderThreshold: input.reorderThreshold ?? 10,
      vendorId: input.vendorId,
      tenantId: input.tenantId,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });

  await invalidateCache(`products:${input.tenantId}:*`);
  return product;
}

export async function getProducts(
  tenantId: string,
  pagination: PaginationInput,
  vendorId?: string,
  lowStock?: boolean
) {
  const { page, limit, search, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { tenantId };
  if (vendorId) where.vendorId = vendorId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (lowStock) {
    where.stockQuantity = { lte: prisma.product.fields?.reorderThreshold };
    // Use raw filter for comparing fields
    where.AND = [
      {
        stockQuantity: { lte: 0 }, // Will be overridden with raw query below
      },
    ];
    // For simplicity: low stock means stock <= threshold (we'll use a simpler check)
    delete where.AND;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || "createdAt"]: sortOrder },
      include: {
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Post-filter for low stock if needed
  const filteredProducts = lowStock
    ? products.filter((p) => p.stockQuantity <= p.reorderThreshold)
    : products;

  return {
    data: filteredProducts,
    pagination: {
      page,
      limit,
      total: lowStock ? filteredProducts.length : total,
      totalPages: Math.ceil(
        (lowStock ? filteredProducts.length : total) / limit
      ),
    },
  };
}

export async function getProductById(id: string, tenantId: string) {
  return prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      vendor: { select: { id: true, name: true } },
      salesHistory: {
        take: 30,
        orderBy: { date: "desc" },
      },
      aiPredictions: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateProduct(
  id: string,
  tenantId: string,
  input: UpdateProductInput
) {
  const oldProduct = await prisma.product.findFirst({
    where: { id, tenantId },
  });

  if (!oldProduct) throw new Error("Product not found");

  const product = await prisma.product.update({
    where: { id },
    data: input,
    include: { vendor: { select: { id: true, name: true } } },
  });

  // Emit WebSocket event if stock changed
  if (
    input.stockQuantity !== undefined &&
    input.stockQuantity !== oldProduct.stockQuantity
  ) {
    emitToTenant(tenantId, "inventory.updated", {
      productId: product.id,
      productName: product.name,
      oldQuantity: oldProduct.stockQuantity,
      newQuantity: product.stockQuantity,
      tenantId,
    });
  }

  await invalidateCache(`products:${tenantId}:*`);
  return product;
}

export async function deleteProduct(id: string, tenantId: string) {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
  });

  if (!product) throw new Error("Product not found");

  await prisma.product.delete({ where: { id } });
  await invalidateCache(`products:${tenantId}:*`);
  return product;
}

/**
 * Get products with low stock (below reorder threshold)
 */
export async function getLowStockProducts(tenantId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { vendor: { select: { id: true, name: true } } },
  });

  return products.filter((p) => p.stockQuantity <= p.reorderThreshold);
}
