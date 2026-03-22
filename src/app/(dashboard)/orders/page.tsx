"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function OrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect delivery partners away from admin orders view
  useEffect(() => {
    if (session?.user?.role === "delivery-partner") {
      router.push("/deliveries");
    } else if (session?.user?.role === "customer") {
      router.push("/catalog/orders");
    }
  }, [session, router]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    </div>
  );
}
