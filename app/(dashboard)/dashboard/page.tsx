"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  Users,
  ShoppingCart,

  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,

  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardSummary {
  totalVendors: number;
  activeVendors: number;
  totalProducts: number;
  lowStockProducts: number;
  totalConsumers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  pendingPOs: number;
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#9333ea", "#0891b2"];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<Record<string, unknown>[]>([]);
  const [revenueByType, setRevenueByType] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, trendRes, revenueRes] = await Promise.all([
          fetch("/api/analytics?type=summary"),
          fetch("/api/analytics?type=weekly-trend"),
          fetch("/api/analytics?type=revenue-by-type"),
        ]);

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.data);
        }
        if (trendRes.ok) {
          const data = await trendRes.json();
          setWeeklyTrend(data.data || []);
        }
        if (revenueRes.ok) {
          const data = await revenueRes.json();
          setRevenueByType(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business metrics</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Products",
      value: summary?.totalProducts ?? 0,
      icon: Package,
      description: `${summary?.lowStockProducts ?? 0} low stock`,
      alert: (summary?.lowStockProducts ?? 0) > 0,
    },
    {
      title: "Active Vendors",
      value: summary?.activeVendors ?? 0,
      icon: Truck,
      description: `${summary?.totalVendors ?? 0} total vendors`,
      alert: false,
    },
    {
      title: "Consumers",
      value: summary?.totalConsumers ?? 0,
      icon: Users,
      description: "Registered consumers",
      alert: false,
    },
    {
      title: "Total Orders",
      value: summary?.totalOrders ?? 0,
      icon: ShoppingCart,
      description: `${summary?.pendingOrders ?? 0} pending`,
      alert: (summary?.pendingOrders ?? 0) > 5,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.alert && (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Low stock alert */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue
            </CardTitle>
            <CardDescription>Total revenue across all orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${(summary?.totalRevenue ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Products below minimum stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {summary?.lowStockProducts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              items need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending POs
            </CardTitle>
            <CardDescription>Purchase orders awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary?.pendingPOs ?? 0}
            </div>
            <Badge variant={summary?.pendingPOs ? "warning" : "success"} className="mt-1">
              {summary?.pendingPOs ? "Action Required" : "All Clear"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales Trend</CardTitle>
            <CardDescription>Sales volume over the past weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="totalQuantity"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Quantity"
                    />
                    <Line
                      type="monotone"
                      dataKey="totalRevenue"
                      stroke="#16a34a"
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No sales data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Type</CardTitle>
            <CardDescription>Product vs Service revenue split</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                      nameKey="type"
                    >
                      {revenueByType.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No revenue data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
