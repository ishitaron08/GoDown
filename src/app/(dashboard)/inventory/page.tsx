"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Sliders, Loader2, Warehouse } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Movement {
  _id: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  reference?: string;
  createdAt: string;
  product: { name: string; sku: string; unit: string };
  performedBy: { name: string };
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";
const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";

export default function InventoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    type: "in" as "in" | "out" | "adjustment",
    quantity: 1,
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        axios.get("/api/inventory"),
        axios.get("/api/products", { params: { limit: 200 } }),
      ]);
      setMovements(movRes.data);
      setProducts(prodRes.data.products);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjust = async () => {
    if (!form.productId) {
      toast.warning("Select a product");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/inventory", form);
      toast.success("Stock updated");
      setShowAdjust(false);
      setForm({ productId: "", type: "in", quantity: 1, reason: "" });
      fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to update stock";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Inventory</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track stock movements
          </p>
        </div>
        <button
          onClick={() => setShowAdjust(!showAdjust)}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Sliders className="h-3.5 w-3.5" strokeWidth={1.5} />
          Adjust Stock
        </button>
      </div>

      {/* Adjustment Panel */}
      {showAdjust && (
        <div className="surface p-6 space-y-5 animate-slide-down">
          <h2 className="text-[13px] font-semibold tracking-tight">
            Stock Adjustment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Product *</label>
              <select
                value={form.productId}
                onChange={(e) =>
                  setForm({ ...form, productId: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) — {p.quantity} {p.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type *</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "in" | "out" | "adjustment",
                  })
                }
                className={inputCls}
              >
                <option value="in">Stock IN</option>
                <option value="out">Stock OUT</option>
                <option value="adjustment">Adjustment (absolute)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: parseInt(e.target.value) || 1 })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Manual count, return"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdjust}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-[13px] font-medium disabled:opacity-50 transition-colors btn-press"
            >
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Apply
            </button>
            <button
              onClick={() => setShowAdjust(false)}
              className="px-5 py-2.5 border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary transition-colors btn-press"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-28 rounded-sm" />
                <div className="skeleton h-4 w-14 rounded-sm" />
                <div className="skeleton h-4 w-10 rounded-sm" />
                <div className="skeleton h-4 w-10 rounded-sm" />
                <div className="skeleton h-4 w-10 rounded-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  {["Product", "Type", "Qty", "Previous", "New", "Reason", "By", "Date"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
                          <Warehouse
                            className="h-5 w-5 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                          No stock movements recorded
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr
                      key={m._id}
                      className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium">{m.product?.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {m.product?.sku}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="chip">
                          {m.type === "in" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : m.type === "out" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : null}
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium tabular-nums">
                        {m.quantity}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground tabular-nums">
                        {m.previousQuantity}
                      </td>
                      <td className="px-6 py-3 font-medium tabular-nums">
                        {m.newQuantity}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {m.reason ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {m.performedBy?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
