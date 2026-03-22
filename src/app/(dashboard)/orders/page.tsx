"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  Check,
  Eye,
  X,
  MapPin,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Order {
  _id: string;
  orderNumber: string;
  type: "inbound" | "outbound";
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount: number;
  items: unknown[];
  supplier?: { name: string };
  createdBy: { name: string };
  createdAt: string;
}

interface OrderDetails extends Order {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPincode?: string;
  deliveryPartner?: { name: string };
  deliveryStatus?: string;
  deliveryNotes?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect delivery partners to deliveries page
  useEffect(() => {
    if (session?.user?.role === "delivery-partner") {
      router.replace("/deliveries");
    }
  }, [session, router]);

  // If delivery partner, don't render the orders page
  if (session?.user?.role === "delivery-partner") {
    return null;
  }

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders", {
        params: { page, limit: 20, type: typeFilter, status: statusFilter },
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

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}`, { status: "processing" });
      toast.success("Order approved!");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to approve order");
    } finally {
      setApprovingId(null);
    }
  };

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
          <h1 className="text-lg font-semibold tracking-tight">Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {total} orders total
          </p>
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
      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className={filterCls}
        >
          <option value="">All Types</option>
          <option value="inbound">Inbound (Purchase)</option>
          <option value="outbound">Outbound (Sale)</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={filterCls}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
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
                    "Type",
                    "Status",
                    "Items",
                    "Supplier",
                    "Amount",
                    "Created By",
                    "Date",
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
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
                          <ClipboardList
                            className="h-5 w-5 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                          No orders found
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
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                          {o.type === "inbound" ? (
                            <ArrowDownCircle
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                          ) : (
                            <ArrowUpCircle
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                          )}
                          {o.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="chip">{o.status}</span>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground tabular-nums">
                        {o.items.length} items
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {o.supplier?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {o.createdBy?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(o._id)}
                            disabled={loadingDetails}
                            className="inline-flex items-center justify-center h-7 w-7 border border-border hover:bg-secondary disabled:opacity-50 transition-colors btn-press"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          {o.status === "pending" && o.type === "outbound" ? (
                            <button
                              onClick={() => handleApprove(o._id)}
                              disabled={approvingId === o._id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-[12px] font-medium rounded transition-colors btn-press"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                              Approve
                            </button>
                          ) : null}
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
                  <h2 className="text-lg font-semibold">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="h-8 w-8 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <p className="text-muted-foreground">Order Number</p>
                        <p className="font-mono font-medium mt-0.5">
                          {selectedOrder.orderNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium mt-0.5 capitalize">
                          {selectedOrder.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium mt-0.5 capitalize">
                          {selectedOrder.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium mt-0.5">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created By</p>
                        <p className="font-medium mt-0.5">
                          {selectedOrder.createdBy?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium mt-0.5">
                          {formatDate(selectedOrder.createdAt)}
                        </p>
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
                                Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
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

                  {/* Customer Info (if outbound) */}
                  {selectedOrder.type === "outbound" && (
                    <div className="space-y-3 border-t border-border pt-6">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Delivery Address
                      </h3>
                      <div className="space-y-2 text-[13px] p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                        {selectedOrder.customerName && (
                          <div>
                            <p className="text-muted-foreground">Name</p>
                            <p className="font-medium mt-0.5">
                              {selectedOrder.customerName}
                            </p>
                          </div>
                        )}
                        {selectedOrder.customerAddress && (
                          <div>
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium mt-0.5">
                              {selectedOrder.customerAddress}
                            </p>
                          </div>
                        )}
                        {selectedOrder.customerPincode && (
                          <div>
                            <p className="text-muted-foreground">Pincode</p>
                            <p className="font-medium mt-0.5">
                              {selectedOrder.customerPincode}
                            </p>
                          </div>
                        )}
                        {selectedOrder.customerAddress && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(
                              selectedOrder.customerAddress
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-blue-600 text-white text-[12px] font-medium rounded hover:bg-blue-700 transition-colors btn-press"
                          >
                            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Get Directions
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Info */}
                  {selectedOrder.deliveryStatus && (
                    <div className="space-y-3 border-t border-border pt-6">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Delivery Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-[13px]">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium mt-0.5 capitalize">
                            {selectedOrder.deliveryStatus}
                          </p>
                        </div>
                        {selectedOrder.deliveryPartner && (
                          <div>
                            <p className="text-muted-foreground">Partner</p>
                            <p className="font-medium mt-0.5">
                              {(selectedOrder.deliveryPartner as any)?.name}
                            </p>
                          </div>
                        )}
                        {selectedOrder.estimatedDelivery && (
                          <div>
                            <p className="text-muted-foreground">Est. Delivery</p>
                            <p className="font-medium mt-0.5">
                              {formatDate(selectedOrder.estimatedDelivery)}
                            </p>
                          </div>
                        )}
                        {selectedOrder.actualDelivery && (
                          <div>
                            <p className="text-muted-foreground">Delivered</p>
                            <p className="font-medium mt-0.5">
                              {formatDate(selectedOrder.actualDelivery)}
                            </p>
                          </div>
                        )}
                      </div>
                      {selectedOrder.deliveryNotes && (
                        <div className="mt-4">
                          <p className="text-muted-foreground text-[12px]">
                            Notes
                          </p>
                          <p className="font-medium mt-0.5 text-[13px]">
                            {selectedOrder.deliveryNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
