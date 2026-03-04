"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import {
  Warehouse,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Package,
  Calendar,
  Truck,
  Boxes,
  Plus,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Interfaces ─── */
interface StockItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    price: number;
    unit: string;
  } | null;
  quantity: number;
  lastUpdated: string;
  updatedBy?: { name: string } | null;
}

interface InventoryLog {
  _id: string;
  date: string;
  productsUpdated: number;
  updatedBy?: { name: string } | null;
  notes?: string;
}

interface WarehouseData {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  pincode: string;
  coordinates: { lat: number; lng: number };
  manager: { _id: string; name: string; email: string } | null;
  phone?: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  unit: string;
}

interface PartnerData {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vehicles?: { vehicleNumber: string; vehicleType: string; capacity: number; isAvailable: boolean }[];
}

type Tab = "inventory" | "products" | "partners";

const inputCls =
  "w-full px-3 py-2 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";

const tabsList: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "products", label: "Add Products", icon: Package },
  { key: "partners", label: "Delivery Partners", icon: Truck },
];

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable stock map: productId → quantity
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [updateNotes, setUpdateNotes] = useState("");

  // Add new product to stock
  const [addProductId, setAddProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        axios.get(`/api/warehouses/${id}`),
        axios.get("/api/products?limit=500"),
      ]);
      setWarehouse(whRes.data.warehouse);
      setStock(whRes.data.stock);
      setLogs(whRes.data.recentLogs);
      setPartners(whRes.data.partners ?? []);

      const edits: Record<string, number> = {};
      whRes.data.stock.forEach((s: StockItem) => {
        if (s.product) edits[s.product._id] = s.quantity;
      });
      setStockEdits(edits);

      const products = prodRes.data.products ?? prodRes.data ?? [];
      setAllProducts(products.map((p: any) => ({ _id: p._id, name: p.name, sku: p.sku, unit: p.unit })));
    } catch {
      toast.error("Failed to load GoDown");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Products not yet in this warehouse's stock
  const existingProductIds = new Set(stock.map((s) => s.product?._id).filter(Boolean));
  const availableProducts = allProducts.filter((p) => !existingProductIds.has(p._id));

  const handleAddProduct = () => {
    if (!addProductId || !addQuantity) return;
    setStockEdits((prev) => ({ ...prev, [addProductId]: parseInt(addQuantity) || 0 }));
    const prod = allProducts.find((p) => p._id === addProductId);
    if (prod) {
      setStock((prev) => [
        ...prev,
        {
          _id: "new-" + addProductId,
          product: { _id: prod._id, name: prod.name, sku: prod.sku, price: 0, unit: prod.unit },
          quantity: parseInt(addQuantity) || 0,
          lastUpdated: new Date().toISOString(),
          updatedBy: null,
        },
      ]);
    }
    setAddProductId("");
    setAddQuantity("");
    toast.success(`${prod?.name} added — click "Save" to persist`);
  };

  const handleSaveStock = async () => {
    const items = Object.entries(stockEdits).map(([product, quantity]) => ({
      product,
      quantity,
    }));
    if (items.length === 0) {
      toast.warning("No stock to update");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/warehouses/${id}/stock`, {
        items,
        notes: updateNotes || undefined,
      });
      toast.success(`Stock updated — ${items.length} product(s)`);
      setUpdateNotes("");
      fetchData();
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const updatedToday = logs.some((l) => l.date === todayStr);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-5 rounded-sm" />
          <div className="skeleton h-6 w-48 rounded-sm" />
        </div>
        <div className="surface p-6 space-y-4">
          <div className="skeleton h-5 w-32 rounded-sm" />
          <div className="skeleton h-4 w-64 rounded-sm" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-4">
        <Warehouse className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[13px] text-muted-foreground">GoDown not found</p>
        <button onClick={() => router.push("/warehouses")} className="text-[12px] font-medium underline underline-offset-4">
          Back to GoDowns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.push("/warehouses")} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to GoDowns
        </button>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex items-center justify-center bg-secondary shrink-0">
            <Warehouse className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{warehouse.name}</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground">{warehouse.code}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">{warehouse.city} — {warehouse.pincode}</p>
          </div>
          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-semibold">{stock.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Products</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{partners.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Partners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">GoDown Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span>{warehouse.address}</span>
          </div>
          {warehouse.manager && (
            <div className="flex items-center gap-2 text-[13px]">
              <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span>{warehouse.manager.name}</span>
            </div>
          )}
          {warehouse.phone && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span>{warehouse.phone}</span>
            </div>
          )}
          <div className="text-[12px] text-muted-foreground font-mono">
            {warehouse.coordinates.lat.toFixed(4)}, {warehouse.coordinates.lng.toFixed(4)}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-border">
        {tabsList.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              activeTab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground/70"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
            {key === "inventory" && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground ml-1">
                {stock.length}
              </span>
            )}
            {key === "partners" && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground ml-1">
                {partners.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB: Inventory ════════════════ */}
      {activeTab === "inventory" && (
        <>
          {/* Inventory Status Banner */}
          {updatedToday ? (
            <div className="flex items-center gap-3 px-4 py-3 border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
              <p className="text-[13px] text-green-700 dark:text-green-300">
                Inventory was updated today. Auto-routing is using fresh data.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
              <p className="text-[13px] text-yellow-700 dark:text-yellow-300">
                <strong>Inventory not updated today.</strong> Update stock counts for accurate auto-routing.
              </p>
            </div>
          )}

          {/* Stock Management */}
          <div className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Current Stock ({stock.length} products)
              </p>
              <button
                onClick={handleSaveStock}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[12px] font-medium disabled:opacity-50 btn-press"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save Daily Update
              </button>
            </div>

            {stock.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Package className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="text-[12px] text-muted-foreground">No products tracked in this GoDown yet</p>
                <button
                  onClick={() => setActiveTab("products")}
                  className="text-[12px] font-medium underline underline-offset-4 text-foreground"
                >
                  Add products →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Product</th>
                      <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">SKU</th>
                      <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-32">Quantity</th>
                      <th className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => {
                      if (!s.product) return null;
                      const pid = s.product._id;
                      return (
                        <tr key={s._id} className="border-b border-border/50">
                          <td className="py-2.5 font-medium">{s.product.name}</td>
                          <td className="py-2.5 font-mono text-muted-foreground text-[12px]">{s.product.sku}</td>
                          <td className="py-2.5">
                            <div className="relative w-28">
                              <input
                                type="number"
                                min="0"
                                value={stockEdits[pid] ?? s.quantity}
                                onChange={(e) =>
                                  setStockEdits((prev) => ({ ...prev, [pid]: parseInt(e.target.value) || 0 }))
                                }
                                className="w-full px-2 py-1 border border-border bg-white text-[13px] focus:outline-none focus:border-foreground/20"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                {s.product.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-[12px] text-muted-foreground">
                            {new Date(s.lastUpdated).toLocaleDateString()}
                            {s.updatedBy && ` by ${s.updatedBy.name}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">Update Notes (optional)</label>
              <input
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="e.g. Physical count done, adjusted for damaged items"
                className={inputCls}
              />
            </div>
          </div>

          {/* Recent Update Log */}
          {logs.length > 0 && (
            <div className="surface p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
                Update Log (Last 7 Days)
              </p>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium font-mono">{log.date}</span>
                      <span className="text-[12px] text-muted-foreground">
                        — {log.productsUpdated} product{log.productsUpdated !== 1 ? "s" : ""} updated
                        {log.updatedBy && ` by ${log.updatedBy.name}`}
                      </span>
                    </div>
                    {log.notes && (
                      <span className="text-[11px] text-muted-foreground italic">{log.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════ TAB: Add Products ════════════════ */}
      {activeTab === "products" && (
        <div className="surface p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Add Products to this GoDown
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Select from existing products catalog and set initial quantity for this GoDown
              </p>
            </div>
            <Link
              href="/products/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border hover:bg-secondary transition-colors btn-press"
            >
              <Plus className="h-3 w-3" />
              Create New Product
            </Link>
          </div>

          {/* Add product form */}
          <div className="flex items-end gap-3 pb-4 border-b border-border">
            <div className="flex-1">
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">Select Product</label>
              <select value={addProductId} onChange={(e) => setAddProductId(e.target.value)} className={inputCls}>
                <option value="">Choose a product…</option>
                {availableProducts.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">Quantity</label>
              <input type="number" min="0" value={addQuantity} onChange={(e) => setAddQuantity(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <button
              onClick={handleAddProduct}
              disabled={!addProductId || !addQuantity}
              className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 disabled:opacity-40 btn-press"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* Products already in stock */}
          {stock.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
                Products in this GoDown ({stock.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stock.map((s) => {
                  if (!s.product) return null;
                  return (
                    <div key={s._id} className="flex items-center gap-3 p-3 border border-border">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{s.product.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{s.product.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-semibold">{stockEdits[s.product._id] ?? s.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">{s.product.unit}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {availableProducts.length === 0 && stock.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
              <p className="text-[13px] text-green-700 dark:text-green-300">
                All products are already added to this GoDown.
              </p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSaveStock}
            disabled={saving || Object.keys(stockEdits).length === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-foreground text-background text-[12px] font-medium disabled:opacity-50 btn-press"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save All Stock Changes
          </button>
        </div>
      )}

      {/* ════════════════ TAB: Delivery Partners ════════════════ */}
      {activeTab === "partners" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Delivery Partners assigned to this GoDown
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Partners linked to <strong>{warehouse.name}</strong> handle deliveries from this area
              </p>
            </div>
            <Link
              href="/suppliers"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border hover:bg-secondary transition-colors btn-press"
            >
              <Plus className="h-3 w-3" />
              Manage Partners
            </Link>
          </div>

          {partners.length === 0 ? (
            <div className="surface flex flex-col items-center py-10 gap-3">
              <Truck className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-[13px] text-muted-foreground">No delivery partners assigned to this GoDown</p>
              <Link
                href="/suppliers"
                className="text-[12px] font-medium underline underline-offset-4"
              >
                Go to Delivery Partners to assign →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {partners.map((p) => (
                <Link
                  key={p._id}
                  href={`/suppliers/${p._id}`}
                  className="surface p-5 space-y-3 hover-lift group block"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 flex items-center justify-center bg-secondary shrink-0">
                      <Truck className="h-[18px] w-[18px] text-foreground/60" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold tracking-tight truncate">{p.name}</h3>
                      {p.email && (
                        <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0 mt-1" strokeWidth={1.5} />
                  </div>

                  <div className="space-y-1.5">
                    {p.phone && (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        {p.phone}
                      </div>
                    )}
                    {p.address && (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{p.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Vehicles */}
                  {(p.vehicles ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(p.vehicles ?? []).map((v, i) => (
                        <span
                          key={i}
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5",
                            v.isAvailable
                              ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                              : "bg-gray-100 text-muted-foreground dark:bg-gray-800"
                          )}
                        >
                          {v.vehicleNumber} · {v.vehicleType}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
