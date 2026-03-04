/**
 * Redis Cache Layer
 *
 * Provides caching, stock-update flags, partner-online status,
 * and order-status pub/sub helpers on top of the base Redis client.
 */

import { getRedis, cacheGet, cacheSet, cacheDel } from "./redis";
import { connectDB } from "./db";
import { WarehouseStock } from "@/models/WarehouseStock";
import { Warehouse } from "@/models/Warehouse";
import { Product } from "@/models/Product";
// Ensure Product model is registered before any populate() calls
void Product;

// ── Warehouse Stock Caching ──

const STOCK_TTL = 600; // 10 min

export async function cacheWarehouseStock(warehouseId: string): Promise<void> {
  await connectDB();
  const stocks = await WarehouseStock.find({ warehouse: warehouseId })
    .populate("product", "name sku unit")
    .lean();
  await cacheSet(`wh:stock:${warehouseId}`, stocks, STOCK_TTL);
}

export async function getWarehouseStockCached(warehouseId: string): Promise<any[]> {
  const cached = await cacheGet<any[]>(`wh:stock:${warehouseId}`);
  if (cached) return cached;

  await connectDB();
  const stocks = await WarehouseStock.find({ warehouse: warehouseId }).lean();
  await cacheSet(`wh:stock:${warehouseId}`, stocks, STOCK_TTL);
  return stocks;
}

export async function invalidateWarehouseCache(warehouseId: string): Promise<void> {
  await cacheDel(`wh:stock:${warehouseId}`);
}

// ── Daily Stock-Update Enforcement ──

function todayKey(warehouseId: string): string {
  const d = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `wh:updated:${warehouseId}:${d}`;
}

/** Seconds until midnight (UTC) — used as TTL so flags auto-expire. */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(Math.ceil((midnight.getTime() - now.getTime()) / 1000), 60);
}

export async function setStockUpdatedFlag(warehouseId: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(todayKey(warehouseId), secondsUntilMidnight(), "1");
  } catch {
    // best-effort
  }
}

export async function isStockUpdatedToday(warehouseId: string): Promise<boolean> {
  try {
    const val = await getRedis().get(todayKey(warehouseId));
    return val === "1";
  } catch {
    return true; // if Redis is down, don't block routing
  }
}

export async function getStaleWarehouses(): Promise<
  { _id: string; name: string; code: string; manager?: any }[]
> {
  await connectDB();
  const warehouses = (await Warehouse.find({ isActive: true })
    .populate("manager", "name email")
    .lean()) as any[];

  const stale: typeof warehouses = [];
  for (const w of warehouses) {
    const updated = await isStockUpdatedToday(w._id.toString());
    if (!updated) stale.push(w);
  }
  return stale;
}

// ── Delivery-Partner Online/Offline ──

export async function setPartnerOnline(
  partnerId: string,
  ttlHours = 8
): Promise<void> {
  try {
    await getRedis().setex(
      `partner:online:${partnerId}`,
      ttlHours * 3600,
      "1"
    );
  } catch {
    // best-effort
  }
}

export async function setPartnerOffline(partnerId: string): Promise<void> {
  try {
    await getRedis().del(`partner:online:${partnerId}`);
  } catch {
    // best-effort
  }
}

export async function isPartnerOnline(partnerId: string): Promise<boolean> {
  try {
    const val = await getRedis().get(`partner:online:${partnerId}`);
    return val === "1";
  } catch {
    return true; // if Redis down, don't block
  }
}

export async function getPartnersOnlineStatus(
  partnerIds: string[]
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const id of partnerIds) pipeline.get(`partner:online:${id}`);
    const replies = await pipeline.exec();
    partnerIds.forEach((id, i) => {
      result[id] = replies?.[i]?.[1] === "1";
    });
  } catch {
    partnerIds.forEach((id) => (result[id] = false));
  }
  return result;
}

// ── Order Status (for SSE) ──

export async function setOrderStatus(
  orderId: string,
  data: { status?: string; deliveryStatus?: string }
): Promise<void> {
  try {
    await getRedis().setex(
      `order:status:${orderId}`,
      3600 * 24, // 24hr
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
    );
  } catch {
    // best-effort
  }
}

export async function getOrderStatus(
  orderId: string
): Promise<{ status?: string; deliveryStatus?: string; updatedAt?: string } | null> {
  return cacheGet(`order:status:${orderId}`);
}

// ── Notifications (simple Redis list) ──

export async function pushNotification(
  userId: string,
  message: string
): Promise<void> {
  try {
    const redis = getRedis();
    const entry = JSON.stringify({ message, time: new Date().toISOString() });
    await redis.lpush(`notif:${userId}`, entry);
    await redis.ltrim(`notif:${userId}`, 0, 49); // keep last 50
    await redis.expire(`notif:${userId}`, 86400 * 7); // 7 days
  } catch {
    // best-effort
  }
}

export async function getNotifications(
  userId: string,
  limit = 20
): Promise<{ message: string; time: string }[]> {
  try {
    const raw = await getRedis().lrange(`notif:${userId}`, 0, limit - 1);
    return raw.map((r) => JSON.parse(r));
  } catch {
    return [];
  }
}
