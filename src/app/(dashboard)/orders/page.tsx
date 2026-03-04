"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  Eye,
  CheckCircle2,
  XCircle,
  PackageCheck,
  X,
  User,
  Phone,
  MapPin,
  Package,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItem {
  product: { _id: string; name: string; sku: string; unit: string; price: number } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  type: "inbound" | "outbound";
  status: "pending" | "processing" | "completed" | "cancelled";
  deliveryStatus?: string;
  totalAmount: number;
  items: OrderItem[];
  supplier?: { name: string };
  createdBy: { name: string };
  createdAt: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPincode?: string;
  warehouse?: { name: string; city: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  processing: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

type Transition = { label: string; next: string; icon: React.ElementType; color: string };
const STATUS_TRANSITIONS: Record<string, Transition[]> = {
  pending: [
    { label: "Approve", next: "processing", icon: CheckCircle2, color: "text-emerald-600 hover:bg-emerald-50" },
    { label: "Cancel", next: "cancelled", icon: XCircle, color: "text-red-500 hover:bg-red-50" },
  ],
  processing: [
    { label: "Complete", next: "completed", icon: PackageCheck, color: "text-emerald-600 hover:bg-emerald-50" },
    { label: "Cancel", next: "cancelled", icon: XCircle, color: "text-red-500 hover:bg-red-50" },
  ],
  completed: [],
  cancelled: [
    { label: "Re-open", next: "pending", icon: PlayCircle, color: "text-blue-600 hover:bg-blue-50" },
  ],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders", {
        params: { page, limit: 20, type: typeFilter || undefined, status: statusFilter || undefined },
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    setSelectedOrder(orders.find((o) => o._id === orderId) ?? null);
    try {
      const res = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}`, { status });
      toast.success(`Order marked as ${status}`);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: status as Order["status"] } : o))
      );
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: status as Order["status"] } : prev);
      }
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filterCls =
    "px-3 py-2 border border-border bg-white text-[13px] focus:outline-none focus:border-foreground/20 transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{total} orders total</p>
        </div>
        <a
          href="/orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          New Order
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className={filterCls}
        >
          <option value="">All Types</option>
          <option value="inbound">Inbound (Purchase)</option>
          <option value="outbound">Outbound (Sale)</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={filterCls}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex gap-1.5 items-center">
          {["pending", "processing", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1); }}
              className={`px-2.5 py-1 text-[11px] font-medium capitalize border transition-colors rounded-full ${
                statusFilter === s ? statusColors[s] : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-24 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
                <div className="skeleton h-4 w-20 rounded-sm" />
                <div className="skeleton h-4 w-14 rounded-sm" />
                <div className="skeleton h-4 w-20 rounded-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  {["Order #", "Type", "Status", "Customer / Supplier", "Items", "Amount", "Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`${h === "Amount" ? "text-right" : "text-left"} px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
                          <ClipboardList className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <p className="text-[13px] text-muted-foreground">No orders found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const transitions = STATUS_TRANSITIONS[o.status] ?? [];
                    const isUpdating = updatingId === o._id;
                    return (
                      <tr key={o._id} className="border-t border-black/[0.03] hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-[11px] font-medium whitespace-nowrap">{o.orderNumber}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground whitespace-nowrap">
                            {o.type === "inbound" ? (
                              <ArrowDownCircle className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.5} />
                            ) : (
                              <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.5} />
                            )}
                            {o.type === "inbound" ? "Purchase" : "Sale"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${statusColors[o.status]}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground max-w-[140px] truncate">
                          {o.customerName ?? o.supplier?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground tabular-nums">{o.items.length}</td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums whitespace-nowrap">
                          {formatCurrency(o.totalAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDetail(o._id)}
                              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
                            ) : (
                              transitions.map((t) => {
                                const Icon = t.icon;
                                return (
                                  <button
                                    key={t.next}
                                    onClick={() => updateStatus(o._id, t.next)}
                                    className={`p-1.5 rounded transition-colors ${t.color}`}
                                    title={t.label}
                                  >
                                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <p className="text-muted-foreground tabular-nums">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary disabled:opacity-30 transition-colors btn-press"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary disabled:opacity-30 transition-colors btn-press"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">{selectedOrder.orderNumber}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {selectedOrder.type === "inbound" ? "Purchase Order" : "Sales Order"} · {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-secondary rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex-1 p-6 space-y-6">
                {/* Status + Action Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className={`inline-block px-3 py-1 text-[12px] font-medium rounded-full capitalize ${statusColors[selectedOrder.status]}`}>
                    {selectedOrder.status}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {(STATUS_TRANSITIONS[selectedOrder.status] ?? []).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.next}
                          onClick={() => updateStatus(selectedOrder._id, t.next)}
                          disabled={updatingId === selectedOrder._id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-current/20 rounded transition-colors disabled:opacity-50 ${t.color}`}
                        >
                          {updatingId === selectedOrder._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Details */}
                {selectedOrder.type === "outbound" && (selectedOrder.customerName || selectedOrder.customerPhone || selectedOrder.customerAddress) && (
                  <div className="border border-border p-4 space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer Details</h3>
                    {selectedOrder.customerName && (
                      <div className="flex items-center gap-2 text-[13px]">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        {selectedOrder.customerName}
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div className="flex items-center gap-2 text-[13px]">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        {selectedOrder.customerPhone}
                      </div>
                    )}
                    {selectedOrder.customerAddress && (
                      <div className="flex items-start gap-2 text-[13px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span>{selectedOrder.customerAddress}{selectedOrder.customerPincode && ` — ${selectedOrder.customerPincode}`}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Supplier */}
                {selectedOrder.type === "inbound" && selectedOrder.supplier && (
                  <div className="border border-border p-4 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</h3>
                    <p className="text-[13px]">{selectedOrder.supplier.name}</p>
                  </div>
                )}

                {/* Warehouse */}
                {selectedOrder.warehouse && (
                  <div className="border border-border p-4 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</h3>
                    <p className="text-[13px]">{selectedOrder.warehouse.name}{selectedOrder.warehouse.city && ` · ${selectedOrder.warehouse.city}`}</p>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <div className="border border-border divide-y divide-border">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3">
                        <div className="h-8 w-8 bg-secondary flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{item.product?.name ?? "Deleted Product"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            SKU: {item.product?.sku ?? "—"} · Qty: {item.quantity} {item.product?.unit ?? ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-medium">{formatCurrency(item.totalPrice)}</p>
                          <p className="text-[11px] text-muted-foreground">@{formatCurrency(item.unitPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center border-t border-border pt-4">
                  <span className="text-[13px] font-medium">Total Amount</span>
                  <span className="text-[16px] font-semibold">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="border border-border p-4 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="text-[12px] text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p>Created by: {selectedOrder.createdBy?.name ?? "—"}</p>
                  <p>Created: {formatDate(selectedOrder.createdAt)}</p>
                  {selectedOrder.deliveryStatus && (
                    <p>Delivery status: <span className="capitalize">{selectedOrder.deliveryStatus}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
