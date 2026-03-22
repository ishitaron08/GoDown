"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Truck,
  AlertCircle,
  MapPin,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItem {
  product: { name: string; sku: string; unit: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  deliveryStatus: string;
  totalAmount: number;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPincode?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
}

export default function DeliveriesPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Only delivery partners can access this page
  useEffect(() => {
    if (session && session.user?.role !== "delivery-partner") {
      router.push("/orders");
    }
  }, [session, router]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders", {
        params: { page, limit: 20 },
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}`, {
        deliveryStatus: newStatus,
      });
      toast.success(`Delivery status updated to ${newStatus}`);
      fetchOrders();
      setShowDetails(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-50 text-blue-700";
      case "picked_up":
        return "bg-indigo-50 text-indigo-700";
      case "in_transit":
        return "bg-amber-50 text-amber-700";
      case "delivered":
        return "bg-green-50 text-green-700";
      case "failed":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const transitions: Record<string, string> = {
      assigned: "picked_up",
      picked_up: "in_transit",
      in_transit: "delivered",
    };
    return transitions[currentStatus];
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-semibold text-foreground">My Deliveries</h1>
            <p className="text-sm text-muted-foreground">Orders assigned to your warehouse</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total orders</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground opacity-50" strokeWidth={1} />
            <p className="text-muted-foreground">No deliveries found</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Delivery Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Est. Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3.5 text-sm font-mono text-foreground">{order.orderNumber}</td>
                      <td className="px-6 py-3.5 text-sm text-foreground">{order.customerName || "-"}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-medium text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                          {order.deliveryStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">
                        {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : "-"}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetails(true);
                            }}
                            className="inline-flex items-center justify-center h-7 w-7 border border-border rounded hover:bg-muted transition-colors"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          {getNextStatus(order.deliveryStatus) && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  order._id,
                                  getNextStatus(order.deliveryStatus)
                                )
                              }
                              disabled={updatingId === order._id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-[12px] font-medium rounded transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                              Update
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • {total} total orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center h-8 w-8 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delivery Details</h2>
                <p className="text-sm text-muted-foreground">{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Order Number</p>
                  <p className="font-mono text-foreground mt-1">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Amount</p>
                  <p className="font-semibold text-foreground mt-1">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.deliveryStatus)}`}>
                      {selectedOrder.deliveryStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Delivery</p>
                  <p className="text-foreground mt-1">
                    {selectedOrder.estimatedDelivery
                      ? formatDate(selectedOrder.estimatedDelivery)
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Delivery Address - Prominent */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-blue-900 text-sm mb-2">📍 Delivery Address</h3>
                    <p className="text-blue-900 font-medium">{selectedOrder.customerName}</p>
                    <p className="text-blue-800 text-sm">{selectedOrder.customerAddress}</p>
                    <p className="text-blue-700 text-sm">{selectedOrder.customerPincode}</p>
                    <p className="text-blue-700 text-sm mt-2">📞 {selectedOrder.customerPhone}</p>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(
                        selectedOrder.customerAddress || ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      <MapPin className="h-4 w-4" strokeWidth={2} />
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Order Items</h3>
                <div className="space-y-2 border border-border rounded-lg overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.product.sku} • {item.quantity} {item.product.unit}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-semibold text-foreground text-sm">
                          {formatCurrency(item.totalPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)}/unit
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Close
                </button>
                {getNextStatus(selectedOrder.deliveryStatus) && (
                  <button
                    onClick={() => {
                      handleStatusUpdate(
                        selectedOrder._id,
                        getNextStatus(selectedOrder.deliveryStatus)
                      );
                    }}
                    disabled={updatingId === selectedOrder._id}
                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" strokeWidth={2} />
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
