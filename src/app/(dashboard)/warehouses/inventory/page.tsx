"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  Warehouse,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Search,
  Boxes,
} from "lucide-react";

interface GoDownStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  city: string;
  inventoryUpdatedToday: boolean;
  products: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
  }[];
  totalProducts: number;
  totalUnits: number;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";

export default function GoDownInventoryPage() {
  const [godowns, setGodowns] = useState<GoDownStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all warehouses
      const whRes = await axios.get("/api/warehouses");
      const warehouses = whRes.data?.warehouses ?? whRes.data ?? [];

      // Fetch all warehouse stock
      const stockPromises = warehouses.map((w: any) =>
        axios.get(`/api/warehouses/${w._id}`).then((res) => ({
          warehouseId: w._id,
          warehouseName: w.name,
          warehouseCode: w.code,
          city: w.city,
          inventoryUpdatedToday: w.inventoryUpdatedToday ?? false,
          products: (res.data.stock ?? [])
            .filter((s: any) => s.product)
            .map((s: any) => ({
              productId: s.product._id,
              productName: s.product.name,
              sku: s.product.sku,
              quantity: s.quantity,
              unit: s.product.unit,
            })),
          totalProducts: (res.data.stock ?? []).filter((s: any) => s.product).length,
          totalUnits: (res.data.stock ?? []).reduce((sum: number, s: any) => sum + (s.quantity ?? 0), 0),
        })).catch(() => ({
          warehouseId: w._id,
          warehouseName: w.name,
          warehouseCode: w.code,
          city: w.city,
          inventoryUpdatedToday: false,
          products: [],
          totalProducts: 0,
          totalUnits: 0,
        }))
      );

      const results = await Promise.all(stockPromises);
      setGodowns(results);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = godowns.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.warehouseName.toLowerCase().includes(q) ||
      g.warehouseCode.toLowerCase().includes(q) ||
      g.city.toLowerCase().includes(q) ||
      g.products.some((p) => p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  });

  const totalProducts = filtered.reduce((s, g) => s + g.totalProducts, 0);
  const totalUnits = filtered.reduce((s, g) => s + g.totalUnits, 0);
  const staleCount = filtered.filter((g) => !g.inventoryUpdatedToday).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">GoDown Inventory</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filtered.length} GoDown{filtered.length !== 1 ? "s" : ""} · {totalProducts} products · {totalUnits.toLocaleString()} total units
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GoDown, product, or SKU…"
          className={`${inputCls} pl-9`}
        />
      </div>

      {/* Stale warning */}
      {!loading && staleCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" strokeWidth={1.5} />
          <p className="text-[13px] text-yellow-700 dark:text-yellow-300">
            <strong>{staleCount}</strong> GoDown{staleCount !== 1 ? "s have" : " has"} not updated inventory today.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface p-6 space-y-3">
              <div className="skeleton h-5 w-40 rounded-sm" />
              <div className="skeleton h-4 w-64 rounded-sm" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-4">
          <Boxes className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-[13px] text-muted-foreground">
            {search ? "No GoDowns match your search" : "No GoDowns added yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 stagger">
          {filtered.map((g) => (
            <div key={g.warehouseId} className="surface overflow-hidden">
              {/* GoDown header row */}
              <button
                onClick={() => setExpandedId(expandedId === g.warehouseId ? null : g.warehouseId)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="h-10 w-10 flex items-center justify-center bg-secondary shrink-0">
                  <Warehouse className="h-[18px] w-[18px] text-foreground/60" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-tight">{g.warehouseName}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground">{g.warehouseCode}</span>
                    {g.inventoryUpdatedToday ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" strokeWidth={1.5} />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{g.city}</p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 mr-4">
                  <div className="text-center">
                    <p className="text-[15px] font-semibold">{g.totalProducts}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-semibold">{g.totalUnits.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Units</p>
                  </div>
                </div>

                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expandedId === g.warehouseId ? "rotate-90" : ""}`}
                  strokeWidth={1.5}
                />
              </button>

              {/* Expanded stock list */}
              {expandedId === g.warehouseId && (
                <div className="border-t border-border px-5 pb-5">
                  {g.products.length === 0 ? (
                    <div className="flex items-center gap-2 py-4">
                      <Package className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                      <p className="text-[12px] text-muted-foreground">No products in this GoDown</p>
                    </div>
                  ) : (
                    <table className="w-full text-[13px] mt-3">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Product</th>
                          <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">SKU</th>
                          <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.products.map((p) => (
                          <tr key={p.productId} className="border-b border-border/50">
                            <td className="py-2 font-medium">{p.productName}</td>
                            <td className="py-2 font-mono text-muted-foreground text-[12px]">{p.sku}</td>
                            <td className="py-2 text-right">
                              <span className="font-semibold">{p.quantity.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">{p.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="mt-3">
                    <Link
                      href={`/warehouses/${g.warehouseId}`}
                      className="text-[12px] font-medium underline underline-offset-4 hover:text-foreground text-muted-foreground"
                    >
                      Manage this GoDown →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
