import prisma from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";

const ANALYTICS_CACHE_TTL = 900; // 15 minutes

// ============================================================================
// Analytics Service
// ============================================================================

/**
 * Vendor Performance: revenue per vendor
 */
export async function getVendorPerformance(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:vendor-performance`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const vendors = await prisma.vendor.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      status: true,
      products: {
        select: {
          orderItems: {
            select: {
              quantity: true,
              unitPrice: true,
            },
          },
        },
      },
      services: {
        select: {
          orderItems: {
            select: {
              quantity: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  });

  const result = vendors.map((vendor) => {
    const productRevenue = vendor.products.reduce(
      (sum, product) =>
        sum +
        product.orderItems.reduce(
          (itemSum, item) => itemSum + item.quantity * item.unitPrice,
          0
        ),
      0
    );

    const serviceRevenue = vendor.services.reduce(
      (sum, service) =>
        sum +
        service.orderItems.reduce(
          (itemSum, item) => itemSum + item.quantity * item.unitPrice,
          0
        ),
      0
    );

    return {
      id: vendor.id,
      name: vendor.name,
      status: vendor.status,
      productRevenue,
      serviceRevenue,
      totalRevenue: productRevenue + serviceRevenue,
    };
  });

  result.sort((a, b) => b.totalRevenue - a.totalRevenue);

  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}

/**
 * Product vs Service Revenue comparison
 */
export async function getRevenueByType(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:revenue-by-type`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const result = await prisma.order.groupBy({
    by: ["type"],
    where: { tenantId },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  const formatted = result.map((r) => ({
    type: r.type,
    revenue: r._sum.totalAmount || 0,
    count: r._count.id,
  }));

  await setCache(cacheKey, formatted, ANALYTICS_CACHE_TTL);
  return formatted;
}

/**
 * Weekly sales trend (last 12 weeks)
 */
export async function getWeeklySalesTrend(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:weekly-sales`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: twelveWeeksAgo },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by week
  const weeklyData: Record<
    string,
    { week: string; revenue: number; orders: number }
  > = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split("T")[0];

    if (!weeklyData[key]) {
      weeklyData[key] = { week: key, revenue: 0, orders: 0 };
    }
    weeklyData[key].revenue += order.totalAmount;
    weeklyData[key].orders += 1;
  });

  const result = Object.values(weeklyData).sort(
    (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
  );

  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}

/**
 * Consumer growth chart (monthly)
 */
export async function getConsumerGrowth(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:consumer-growth`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const consumers = await prisma.consumer.findMany({
    where: {
      tenantId,
      createdAt: { gte: sixMonthsAgo },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by month
  const monthlyData: Record<
    string,
    { month: string; count: number }
  > = {};

  consumers.forEach((consumer) => {
    const date = new Date(consumer.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[key]) {
      monthlyData[key] = { month: key, count: 0 };
    }
    monthlyData[key].count += 1;
  });

  const result = Object.values(monthlyData).sort(
    (a, b) => a.month.localeCompare(b.month)
  );

  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}

/**
 * Margin analysis per product
 */
export async function getMarginAnalysis(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:margin-analysis`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const products = await prisma.product.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      sku: true,
      costPrice: true,
      sellingPrice: true,
      orderItems: {
        select: { quantity: true, unitPrice: true },
      },
    },
  });

  const result = products.map((product) => {
    const totalSold = product.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalRevenue = product.orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalCost = totalSold * product.costPrice;
    const margin = totalRevenue - totalCost;
    const marginPercent =
      totalRevenue > 0 ? ((margin / totalRevenue) * 100).toFixed(2) : "0.00";

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      totalSold,
      totalRevenue,
      totalCost,
      margin,
      marginPercent: parseFloat(marginPercent),
    };
  });

  result.sort((a, b) => b.margin - a.margin);

  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}

/**
 * Dashboard summary
 */
export async function getDashboardSummary(tenantId: string) {
  const cacheKey = `analytics:${tenantId}:dashboard-summary`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [
    totalVendors,
    activeVendors,
    totalProducts,
    totalServices,
    totalConsumers,
    totalOrders,
    totalRevenue,
    lowStockProducts,
    pendingPOs,
  ] = await Promise.all([
    prisma.vendor.count({ where: { tenantId } }),
    prisma.vendor.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.service.count({ where: { tenantId } }),
    prisma.consumer.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.order.aggregate({
      where: { tenantId },
      _sum: { totalAmount: true },
    }),
    prisma.product.count({
      where: {
        tenantId,
        stockQuantity: { lte: 10 }, // rough low-stock check
      },
    }),
    prisma.purchaseOrder.count({ where: { tenantId, status: "PENDING" } }),
  ]);

  const result = {
    totalVendors,
    activeVendors,
    totalProducts,
    totalServices,
    totalConsumers,
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    lowStockProducts,
    pendingPOs,
  };

  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}
