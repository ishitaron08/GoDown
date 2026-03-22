"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  CheckCircle,
  AlertCircle,
  Truck,
  Check,
  Package,
  Navigation,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Order {
  _id: string;
  orderNumber: string;
  type: "inbound" | "outbound";
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount: number;
  items: unknown[];
  warehouse?: { name: string; code: string };
  createdBy: { name: string };
  createdAt: string;
  customerName?: string;
  customerAddress?: string;
  customerPincode?: string;
  deliveryStatus?: string;
  estimatedDelivery?: string;
}

interface OrderDetails extends Order {
  deliveryPartner?: { name: string };
  deliveryNotes?: string;
  actualDelivery?: string;
}

const DELIVERY_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  assigned: { bg: "bg-blue-50", text: "text-blue-700" },
  picked_up: { bg: "bg-yellow-50", text: "text-yellow-700" },
  in_transit: { bg: "bg-purple-50", text: "text-purple-700" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

export default function DeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders", {
        params: { page, limit: 20, status: statusFilter },
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const handleViewDetails = async (orderId: string) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load order details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateDeliveryStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}`, { deliveryStatus: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchOrders();
      if (selectedOrder?._id === orderId) {
        const res = await axios.get(`/api/orders/${orderId}`);
        setSelectedOrder(res.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterCls =
    "px-3 py-2 border border-border bg-white text-[13px] focus:outline-none focus:border-foreground/20 transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">My Deliveries</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {total} deliveries assigned
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={filterCls}
        >
          <option value="">All Statuses</option>
          <option value="">Assigned</option>
          <option value="">Picked Up</option>
          <option value="">In Transit</option>
          <option value="">Delivered</option>
        </select>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-24 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
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
                  {[
                    "Order #",
                    "Customer",
                    "Items",
                    "Amount",
                    "Delivery Status",
                    "Est. Delivery",
                    "Address",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`${
                        h === "Amount" ? "text-right" : "text-left"
                      } px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground`}
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
                          <Truck
                            className="h-5 w-5 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                          No deliveries assigned
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o._id}
                      className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-mono text-[11px] font-medium">
                        {o.orderNumber}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {o.customerName || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground tabular-nums">
                        {o.items.length} items
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`chip ${
                            DELIVERY_STATUS_COLORS[o.deliveryStatus || "assigned"]?.bg ||
                            "bg-gray-50"
                          } ${
                            DELIVERY_STATUS_COLORS[o.deliveryStatus || "assigned"]?.text ||
                            "text-gray-700"
                          }`}
                        >
                          {o.deliveryStatus || "assigned"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {o.estimatedDelivery ? formatDate(o.estimatedDelivery) : "—"}
                      </td>
                      <td className="px-6 py-3.5 line-clamp-1 text-muted-foreground">
                        {o.customerAddress || "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex gap-2">
                          {(() => {
                            const status = o.deliveryStatus || "assigned";
                            if (status === "assigned") {
                              return (
                                <button
                                  onClick={() => updateDeliveryStatus(o._id, "picked_up")}
                                  disabled={updatingStatus === o._id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 text-[11px] font-medium rounded transition-colors btn-press"
                                  title="Mark as picked up"
                                >
                                  <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Pickup
                                </button>
                              );
                            }
                            if (status === "picked_up") {
                              return (
                                <button
                                  onClick={() => updateDeliveryStatus(o._id, "in_transit")}
                                  disabled={updatingStatus === o._id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 text-[11px] font-medium rounded transition-colors btn-press"
                                  title="Mark as in transit"
                                >
                                  <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Transit
                                </button>
                              );
                            }
                            if (status === "in_transit") {
                              return (
                                <button
                                  onClick={() => updateDeliveryStatus(o._id, "delivered")}
                                  disabled={updatingStatus === o._id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-[11px] font-medium rounded transition-colors btn-press"
                                  title="Mark as delivered"
                                >
                                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Deliver
                                </button>
                              );
                            }
                            if (status === "delivered") {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded">
                                  <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Done
                                </div>
                              );
                            }
                            return (
                              <button
                                onClick={() => handleViewDetails(o._id)}
                                className="inline-flex items-center justify-center h-7 w-7 border border-border hover:bg-secondary transition-colors btn-press"
                                title="View details"
                              >
                                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <p className="text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </p>
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

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {loadingDetails ? (
              <div className="p-8 space-y-4">
                <div className="skeleton h-4 w-32 rounded-sm" />
                <div className="skeleton h-4 w-full rounded-sm" />
                <div className="skeleton h-4 w-full rounded-sm" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h2 className="text-lg font-semibold">Delivery Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Order Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <p className="text-muted-foreground">Order Number</p>
                        <p className="font-mono font-medium mt-0.5">
                          {selectedOrder.orderNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium mt-0.5">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Address - Prominent */}
                  <div className="space-y-3 border rounded-lg p-4 bg-blue-50/50">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                          Delivery Address
                        </h3>
                        <p className="text-[13px] text-foreground mt-1">
                          {selectedOrder.customerName}
                        </p>
                        <p className="text-[13px] text-foreground">{selectedOrder.customerAddress}</p>
                        <p className="text-[13px] text-muted-foreground">
                          Pincode: {selectedOrder.customerPincode}
                        </p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(
                            selectedOrder.customerAddress || ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Get Directions
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3 border-t border-border pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Order Items
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.items && (selectedOrder.items as any[]).length > 0 ? (
                        (selectedOrder.items as any[]).map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[13px] p-3 bg-secondary/30 rounded"
                          >
                            <div>
                              <p className="font-medium">
                                {typeof item.product === "string"
                                  ? item.product
                                  : item.product?.name || "Product"}
                              </p>
                              <p className="text-muted-foreground text-[12px]">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="font-medium tabular-nums">
                              {formatCurrency(item.totalPrice)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[13px] text-muted-foreground">No items</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Status & Actions */}
                  <div className="space-y-3 border-t border-border pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Delivery Status
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {["assigned", "picked_up", "in_transit", "delivered"].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateDeliveryStatus(selectedOrder._id, status)}
                          disabled={updatingStatus === selectedOrder._id}
                          className={`px-3 py-2 rounded text-[12px] font-medium transition-colors ${
                            selectedOrder.deliveryStatus === status
                              ? "bg-emerald-600 text-white"
                              : "border border-border hover:bg-secondary disabled:opacity-50"
                          }`}
                        >
                          {status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    {selectedOrder.deliveryStatus === "delivered" && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-emerald-50 rounded">
                        <CheckCircle className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                        <span className="text-[12px] font-medium text-emerald-700">
                          Delivered on {formatDate(selectedOrder.actualDelivery || "")}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliveryStatus === "failed" && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 rounded">
                        <AlertCircle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
                        <span className="text-[12px] font-medium text-red-700">
                          {selectedOrder.deliveryNotes || "Delivery failed"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3 border-t border-border pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Timeline
                    </h3>
                    <div className="space-y-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Delivery:</span>
                        <span className="font-medium">
                          {selectedOrder.estimatedDelivery
                            ? formatDate(selectedOrder.estimatedDelivery)
                            : "—"}
                        </span>
                      </div>
                      {selectedOrder.actualDelivery && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivered:</span>
                          <span className="font-medium text-emerald-700">
                            {formatDate(selectedOrder.actualDelivery)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
