import { z } from "zod";

// ============================================================================
// VENDOR SCHEMAS
// ============================================================================

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  documents: z.any().optional().nullable(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  documents: z.any().optional().nullable(),
});

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(50),
  description: z.string().max(1000).optional().nullable(),
  costPrice: z.number().positive("Cost price must be positive"),
  sellingPrice: z.number().positive("Selling price must be positive"),
  stockQuantity: z.number().int().min(0).default(0),
  reorderThreshold: z.number().int().min(0).default(10),
  vendorId: z.string().min(1, "Vendor is required"),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  costPrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  reorderThreshold: z.number().int().min(0).optional(),
  vendorId: z.string().optional(),
});

// ============================================================================
// SERVICE SCHEMAS
// ============================================================================

export const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional().nullable(),
  pricingModel: z.enum(["FIXED", "HOURLY", "SUBSCRIPTION"]).default("FIXED"),
  basePrice: z.number().positive("Price must be positive"),
  vendorId: z.string().min(1, "Vendor is required"),
  availabilityStatus: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  pricingModel: z.enum(["FIXED", "HOURLY", "SUBSCRIPTION"]).optional(),
  basePrice: z.number().positive().optional(),
  vendorId: z.string().optional(),
  availabilityStatus: z.boolean().optional(),
});

// ============================================================================
// CONSUMER SCHEMAS
// ============================================================================

export const createConsumerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const updateConsumerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  segment: z.string().max(100).optional().nullable(),
});

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const orderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
});

export const createOrderSchema = z.object({
  consumerId: z.string().min(1, "Consumer is required"),
  type: z.enum(["PRODUCT", "SERVICE"]),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// ============================================================================
// PURCHASE ORDER SCHEMAS
// ============================================================================

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required"),
});

export const approvePurchaseOrderSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(1000).optional().nullable(),
});

// ============================================================================
// AI SCHEMAS
// ============================================================================

export const predictRestockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

// ============================================================================
// UPLOAD SCHEMAS
// ============================================================================

export const uploadRequestSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255),
  contentType: z
    .string()
    .refine(
      (val) => ["application/pdf", "image/png", "image/jpeg"].includes(val),
      { message: "Only PDF, PNG, and JPG files are allowed" }
    ),
  fileSize: z
    .number()
    .max(5 * 1024 * 1024, "File size must be less than 5MB")
    .optional(),
});

// ============================================================================
// QUERY SCHEMAS (shared pagination/filter)
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
