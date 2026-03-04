/**
 * Auto-Assign Engine
 *
 * Given a customer order:
 * 1. Finds the nearest warehouse (GoDown) that has ALL ordered items in stock
 * 2. If none has all items → finds the nearest warehouse with max coverage, then
 *    falls back to next closest warehouse for remaining items (split-fulfil)
 * 3. Finds the nearest available delivery partner to the chosen warehouse
 * 4. Assigns an available vehicle from that partner
 *
 * Distance is computed via Haversine formula from coordinates.
 */

import { Warehouse, IWarehouse } from "@/models/Warehouse";
import { WarehouseStock } from "@/models/WarehouseStock";
import { Supplier } from "@/models/Supplier";
import { connectDB } from "@/lib/db";
import {
  getWarehouseStockCached,
  isStockUpdatedToday,
  isPartnerOnline,
} from "@/lib/redis-cache";

// ── Haversine distance (km) ──
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Types ──
export interface OrderItemReq {
  product: string;  // product _id
  quantity: number;
}

export interface AssignResult {
  warehouse: {
    _id: string;
    name: string;
    code: string;
    distance: number;          // km from customer
  };
  fallbackWarehouse?: {
    _id: string;
    name: string;
    code: string;
    distance: number;
    reason: string;
  };
  deliveryPartner?: {
    _id: string;
    name: string;
    distance: number;          // km from warehouse
    vehicle?: {
      vehicleNumber: string;
      vehicleType: string;
      capacity?: number;
    };
  };
  itemsAvailable: string[];    // product IDs available at primary warehouse
  itemsRedirected: string[];   // product IDs that needed fallback warehouse
  allFulfilled: boolean;
}

/**
 * Find the best warehouse + delivery partner for a customer order
 */
export async function autoAssignOrder(
  customerLat: number,
  customerLng: number,
  items: OrderItemReq[]
): Promise<AssignResult | null> {
  await connectDB();

  // 1. Get all active warehouses
  const warehouses = await Warehouse.find({ isActive: true }).lean() as unknown as (IWarehouse & { _id: any })[];
  if (warehouses.length === 0) return null;

  // 2. Sort warehouses by distance to customer
  const warehousesWithDist = warehouses.map((w) => ({
    ...w,
    distance: haversineKm(customerLat, customerLng, w.coordinates.lat, w.coordinates.lng),
  })).sort((a, b) => a.distance - b.distance);

  // 3. For each warehouse (nearest first), check stock availability
  //    Skip warehouses that haven't updated stock today (stale data enforcement)
  const productIds = items.map((i) => i.product);
  const quantityMap = new Map(items.map((i) => [i.product, i.quantity]));

  let primaryWarehouse = null;
  let itemsAvailable: string[] = [];
  let itemsMissing: string[] = [];

  for (const wh of warehousesWithDist) {
    // Stock freshness enforcement — skip stale warehouses
    const fresh = await isStockUpdatedToday(wh._id.toString());
    if (!fresh) continue;

    // Use Redis-cached stock for faster lookups
    const stocks = await getWarehouseStockCached(wh._id.toString()) as any[];

    const stockMap = new Map(stocks.map((s: any) => [s.product.toString(), s.quantity]));

    const available: string[] = [];
    const missing: string[] = [];

    for (const pid of productIds) {
      const required = quantityMap.get(pid) ?? 0;
      const inStock = stockMap.get(pid) ?? 0;
      if (inStock >= required) {
        available.push(pid);
      } else {
        missing.push(pid);
      }
    }

    // All items available → perfect match
    if (missing.length === 0) {
      primaryWarehouse = wh;
      itemsAvailable = available;
      itemsMissing = [];
      break;
    }

    // First warehouse with some items — remember as best partial match
    if (!primaryWarehouse || available.length > itemsAvailable.length) {
      primaryWarehouse = wh;
      itemsAvailable = available;
      itemsMissing = missing;
    }
  }

  if (!primaryWarehouse) return null;

  // 4. If items are missing, find fallback warehouse for remaining items
  let fallbackWarehouse = null;
  const itemsRedirected: string[] = [];

  if (itemsMissing.length > 0) {
    for (const wh of warehousesWithDist) {
      if (wh._id.toString() === primaryWarehouse._id.toString()) continue;

      // Use Redis-cached stock for fallback too
      const stocks = await getWarehouseStockCached(wh._id.toString()) as any[];

      const stockMap = new Map(stocks.map((s: any) => [s.product.toString(), s.quantity]));

      const canFulfil = itemsMissing.filter((pid) => {
        const required = quantityMap.get(pid) ?? 0;
        return (stockMap.get(pid) ?? 0) >= required;
      });

      if (canFulfil.length > 0) {
        fallbackWarehouse = {
          _id: wh._id.toString(),
          name: wh.name,
          code: wh.code,
          distance: wh.distance,
          reason: `${canFulfil.length} item(s) not available at nearest GoDown`,
        };
        itemsRedirected.push(...canFulfil);
        break;
      }
    }
  }

  // 5. Find nearest ONLINE delivery partner to the primary warehouse
  const partners = await Supplier.find({ isActive: true }).lean() as any[];
  let bestPartner = null;
  let bestVehicle = null;
  let bestPartnerDist = Infinity;

  const whCoords = primaryWarehouse.coordinates;

  for (const p of partners) {
    if (!p.coordinates?.lat || !p.coordinates?.lng) continue;

    // Only assign to online partners (Redis check)
    const online = await isPartnerOnline(p._id.toString());
    if (!online) continue;

    const dist = haversineKm(whCoords.lat, whCoords.lng, p.coordinates.lat, p.coordinates.lng);

    if (dist < bestPartnerDist) {
      // Check if partner has an available vehicle
      const availableVehicle = p.vehicles?.find((v: any) => v.isAvailable);
      if (availableVehicle) {
        bestPartner = p;
        bestVehicle = availableVehicle;
        bestPartnerDist = dist;
      }
    }
  }

  // Fallback: if no online partner found, try any partner with available vehicle
  if (!bestPartner) {
    for (const p of partners) {
      if (!p.coordinates?.lat || !p.coordinates?.lng) continue;
      const dist = haversineKm(whCoords.lat, whCoords.lng, p.coordinates.lat, p.coordinates.lng);
      if (dist < bestPartnerDist) {
        const availableVehicle = p.vehicles?.find((v: any) => v.isAvailable);
        if (availableVehicle) {
          bestPartner = p;
          bestVehicle = availableVehicle;
          bestPartnerDist = dist;
        }
      }
    }
  }

  return {
    warehouse: {
      _id: primaryWarehouse._id.toString(),
      name: primaryWarehouse.name,
      code: primaryWarehouse.code,
      distance: Math.round(primaryWarehouse.distance * 10) / 10,
    },
    fallbackWarehouse: fallbackWarehouse
      ? { ...fallbackWarehouse, distance: Math.round(fallbackWarehouse.distance * 10) / 10 }
      : undefined,
    deliveryPartner: bestPartner
      ? {
          _id: bestPartner._id.toString(),
          name: bestPartner.name,
          distance: Math.round(bestPartnerDist * 10) / 10,
          vehicle: bestVehicle
            ? {
                vehicleNumber: bestVehicle.vehicleNumber,
                vehicleType: bestVehicle.vehicleType,
                capacity: bestVehicle.capacity,
              }
            : undefined,
        }
      : undefined,
    itemsAvailable,
    itemsRedirected,
    allFulfilled: itemsMissing.length === 0 || itemsRedirected.length === itemsMissing.length,
  };
}
