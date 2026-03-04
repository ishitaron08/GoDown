"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ClipboardList, Loader2, Package, ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { product: { name: string; images?: { url: string }[] }; quantity: number; price: number }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-indigo-50 text-indigo-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await axios.get("/api/orders", { params });
      const list = res.data?.orders ?? res.data ?? [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Track and manage your orders
          </p>
        </div>
        <Link
          href="/catalog"
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Package className="h-3.5 w-3.5" />
          Browse Products
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number..."
          className="w-full pl-10 pr-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" strokeWidth={1} />
          <p className="text-[14px] font-medium text-muted-foreground">No orders yet</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">
            Start by browsing products in our catalog
          </p>
          <Link
            href="/catalog"
            className="mt-4 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="surface p-5 flex items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[14px] font-semibold">{order.orderNumber}</p>
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 ${statusColors[order.status] ?? "bg-secondary text-muted-foreground"}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[16px] font-semibold">
                  ₹{order.totalAmount?.toLocaleString("en-IN") ?? "0"}
                </p>
              </div>
              <Link
                href={`/catalog/orders/${order._id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border border-border hover:bg-secondary transition-colors shrink-0"
              >
                View
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
