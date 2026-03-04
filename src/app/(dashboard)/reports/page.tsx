"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface Stats {
  products: {
    total: number;
    totalQuantity: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
  };
  orders: { _id: string; count: number; value: number }[];
  lowStockProducts: {
    _id: string;
    name: string;
    quantity: number;
    minStockLevel: number;
    unit: string;
  }[];
}

const PIE_COLORS = ["hsl(0 0% 12%)", "hsl(0 0% 50%)", "hsl(160 84% 39%)"];
const tooltipStyle = {
  background: "hsl(0 0% 3.9%)",
  border: "none",
  borderRadius: 0,
  color: "white",
  fontSize: 12,
  padding: "8px 12px",
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/dashboard").then((r) => {
      setStats(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="skeleton h-6 w-24 rounded-sm" />
          <div className="skeleton h-3 w-48 rounded-sm mt-2" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface p-5">
              <div className="skeleton h-3 w-20 rounded-sm mb-2" />
              <div className="skeleton h-7 w-16 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="surface p-6">
            <div className="skeleton h-5 w-36 rounded-sm mb-6" />
            <div className="skeleton h-56 w-full rounded-sm" />
          </div>
          <div className="surface p-6">
            <div className="skeleton h-5 w-28 rounded-sm mb-6" />
            <div className="skeleton h-56 w-full rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
          <BarChart3 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Failed to load reports.
        </p>
      </div>
    );

  const orderChartData = stats.orders.map((o) => ({
    status: o._id,
    orders: o.count,
    value: o.value,
  }));

  const stockBreakdown = [
    {
      name: "Healthy",
      value:
        stats.products.total -
        stats.products.lowStock -
        stats.products.outOfStock,
    },
    { name: "Low Stock", value: stats.products.lowStock },
    { name: "Out of Stock", value: stats.products.outOfStock },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Inventory &amp; order analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        {[
          { label: "Total Products", value: stats.products.total },
          { label: "Units in Stock", value: stats.products.totalQuantity },
          { label: "Low Stock", value: stats.products.lowStock },
          { label: "Out of Stock", value: stats.products.outOfStock },
        ].map(({ label, value }) => (
          <div key={label} className="surface p-5 hover-lift">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight mt-1.5 tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Inventory Value */}
      <div className="surface p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Total Inventory Value
        </p>
        <p className="text-3xl font-semibold tracking-tight mt-2 tabular-nums">
          {formatCurrency(stats.products.totalValue)}
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="surface p-6">
          <h2 className="text-[13px] font-semibold tracking-tight mb-6">
            Order Status Distribution
          </h2>
          {orderChartData.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-16">
              No order data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={orderChartData}>
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
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(0 0% 45%)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) =>
                    name === "value"
                      ? formatCurrency(value as number)
                      : value
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="hsl(0 0% 12%)"
                  radius={0}
                  maxBarSize={40}
                  name="Orders"
                />
                <Bar
                  yAxisId="right"
                  dataKey="value"
                  fill="hsl(160 84% 39%)"
                  radius={0}
                  maxBarSize={40}
                  name="Value"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="surface p-6">
          <h2 className="text-[13px] font-semibold tracking-tight mb-6">
            Stock Health
          </h2>
          {stockBreakdown.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-16">
              No stock data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stockBreakdown}
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  stroke="white"
                  strokeWidth={2}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stockBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconSize={8}
                  iconType="square"
                />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Restock Table */}
      {stats.lowStockProducts.length > 0 && (
        <div className="surface overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <h2 className="text-[13px] font-semibold tracking-tight">
              Products Requiring Restock
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  {["Product", "Current", "Minimum", "Deficit"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{p.name}</td>
                    <td className="px-6 py-3 tabular-nums">
                      <span
                        className={
                          p.quantity === 0
                            ? "font-semibold text-neon"
                            : "font-medium"
                        }
                      >
                        {p.quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground tabular-nums">
                      {p.minStockLevel} {p.unit}
                    </td>
                    <td className="px-6 py-3 font-medium tabular-nums">
                      {p.minStockLevel - p.quantity} {p.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
