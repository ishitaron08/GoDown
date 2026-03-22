"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  Truck,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardStats {
  products: {
    total: number;
    totalQuantity: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
  };
  orders: { _id: string; count: number; value: number }[];
  recentMovements: {
    _id: string;
    type: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    createdAt: string;
    product: { name: string; sku: string; unit: string };
    performedBy: { name: string };
  }[];
  lowStockProducts: {
    _id: string;
    name: string;
    sku: string;
    quantity: number;
    minStockLevel: number;
    unit: string;
  }[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="surface p-4 md:p-6 hover-lift">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {title}
          </p>
          <p className="text-xl md:text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] md:text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center bg-secondary shrink-0">
          <Icon className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] text-foreground/60" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="surface p-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-20 rounded-sm" />
        <div className="skeleton h-7 w-28 rounded-sm" />
        <div className="skeleton h-3 w-24 rounded-sm" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<{
    ordersProcessing: number;
    ordersInTransit: number;
    partnersOnline: number;
    partnersTotal: number;
    staleWarehouses: number;
    todayRevenue: number;
  } | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    axios.get("/api/dashboard").then((r) => {
      setStats(r.data);
      setLoading(false);
    });
  }, []);

  // Live pulse SSE
  useEffect(() => {
    const es = new EventSource("/api/dashboard/live");
    eventSourceRef.current = es;
    es.onopen = () => setLiveConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "pulse") {
          setLive(data);
          setLiveConnected(true);
        }
      } catch {}
    };
    es.onerror = () => setLiveConnected(false);
    return () => { es.close(); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <div className="skeleton h-6 w-32 rounded-sm" />
          <div className="skeleton h-3 w-48 rounded-sm mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 surface p-6">
            <div className="skeleton h-5 w-32 rounded-sm mb-6" />
            <div className="skeleton h-48 w-full rounded-sm" />
          </div>
          <div className="surface p-6">
            <div className="skeleton h-5 w-28 rounded-sm mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-24 rounded-sm" />
                  <div className="skeleton h-4 w-12 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
          <Warehouse className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );

  const orderChartData = stats.orders.map((o) => ({
    status: o._id,
    count: o.count,
    value: o.value,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-base md:text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
          Real-time warehouse overview
        </p>
      </div>

      {/* Live Pulse */}
      {live && (
        <div className="surface p-3 md:p-4 border-l-2 border-emerald-500">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            {liveConnected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Live Pulse
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className="flex items-center gap-2 p-2 md:p-2.5 bg-secondary/50">
              <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base md:text-[18px] font-semibold tabular-nums leading-none">{live.ordersProcessing + live.ordersInTransit}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 md:p-2.5 bg-secondary/50">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base md:text-[18px] font-semibold tabular-nums leading-none">{live.partnersOnline}<span className="text-[9px] md:text-[11px] font-normal text-muted-foreground">/{live.partnersTotal}</span></p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 md:p-2.5 bg-secondary/50">
              <Warehouse className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base md:text-[18px] font-semibold tabular-nums leading-none">{live.staleWarehouses}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5">Stale</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 md:p-2.5 bg-secondary/50">
              <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base md:text-[18px] font-semibold tabular-nums leading-none">{formatCurrency(live.todayRevenue)}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5">Revenue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-4 stagger">
        <StatCard
          title="Total Products"
          value={formatNumber(stats.products.total)}
          subtitle={`${formatNumber(stats.products.totalQuantity)} units in stock`}
          icon={Package}
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(stats.products.totalValue)}
          subtitle="Cost price basis"
          icon={TrendingUp}
        />
        <StatCard
          title="Low Stock"
          value={formatNumber(stats.products.lowStock)}
          subtitle="Below minimum level"
          icon={AlertTriangle}
        />
        <StatCard
          title="Out of Stock"
          value={formatNumber(stats.products.outOfStock)}
          subtitle="Needs replenishment"
          icon={Warehouse}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 surface p-3 md:p-6">
          <h2 className="text-[13px] font-semibold tracking-tight mb-6">
            Orders by Status
          </h2>
          {orderChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[13px] text-muted-foreground">
              No order data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart
                data={orderChartData}
                margin={{ top: 4, right: 4, bottom: 0, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="none"
                  stroke="hsl(0 0% 93%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  axisLine={{ stroke: "hsl(0 0% 90%)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 3.9%)",
                    border: "none",
                    borderRadius: 0,
                    color: "white",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  cursor={{ fill: "hsl(0 0% 96%)" }}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(0 0% 12%)"
                  radius={0}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low Stock */}
        <div className="surface p-3 md:p-6">
          <h2 className="text-[13px] font-semibold tracking-tight mb-6">
            Low Stock Alerts
          </h2>
          {stats.lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="h-10 w-10 flex items-center justify-center bg-secondary">
                <Package className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-[12px] text-muted-foreground">
                All stock levels healthy
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.lowStockProducts.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate max-w-[140px]">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {p.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[13px] font-semibold ${
                        p.quantity === 0 ? "text-neon" : "text-foreground"
                      }`}
                    >
                      {p.quantity}
                      <span className="text-muted-foreground font-normal ml-0.5 text-[11px]">
                        {p.unit}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      min: {p.minStockLevel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Movements */}
      <div className="surface overflow-hidden">
        <div className="px-3 md:px-6 py-3 md:py-4 border-b border-black/[0.06]">
          <h2 className="text-[13px] font-semibold tracking-tight">
            Recent Stock Movements
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left px-3 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Product
                </th>
                <th className="text-left px-3 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Type
                </th>
                <th className="text-left px-3 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Qty
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  By
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 md:py-12 text-muted-foreground text-[13px]"
                  >
                    No movements recorded
                  </td>
                </tr>
              ) : (
                stats.recentMovements.map((m) => (
                  <tr
                    key={m._id}
                    className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-3 md:px-6 py-2 md:py-3 font-medium text-[12px] md:text-[13px]">
                      {m.product?.name ?? "—"}
                    </td>
                    <td className="px-3 md:px-6 py-2 md:py-3">
                      <span className="chip">
                        {m.type === "in" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : m.type === "out" ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : null}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-2 md:py-3 font-medium tabular-nums text-[12px] md:text-[13px]">
                      {m.quantity}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-muted-foreground text-[13px]">
                      {m.performedBy?.name ?? "—"}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-muted-foreground text-[13px]">
                      {formatDate(m.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
