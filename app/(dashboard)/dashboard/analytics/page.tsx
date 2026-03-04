"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain } from "lucide-react";
import {

  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#84cc16",
];

interface AIPrediction {
  productName: string;
  currentStock: number;
  recommendedOrder: number;
  urgency: string;
  reasoning: string;
  predictedDemand: number;
  confidenceScore: number;
}

export default function AnalyticsPage() {
  const [vendorPerf, setVendorPerf] = useState<Record<string, unknown>[]>([]);
  const [revenueByType, setRevenueByType] = useState<Record<string, unknown>[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<Record<string, unknown>[]>([]);
  const [consumerGrowth, setConsumerGrowth] = useState<Record<string, unknown>[]>([]);
  const [marginAnalysis, setMarginAnalysis] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // AI prediction state
  const [aiLoading, setAiLoading] = useState(false);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    async function fetchAll() {
      try {
        const types = [
          "vendor-performance",
          "revenue-by-type",
          "weekly-trend",
          "consumer-growth",
          "margin-analysis",
        ];
        const results = await Promise.all(
          types.map((type) =>
            fetch(`/api/analytics?type=${type}`)
              .then((r) => r.json())
              .catch(() => ({ data: [] }))
          )
        );

        setVendorPerf(results[0].data || []);
        setRevenueByType(results[1].data || []);
        setWeeklyTrend(results[2].data || []);
        setConsumerGrowth(results[3].data || []);
        setMarginAnalysis(results[4].data || []);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const runAIPrediction = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/predict-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysToAnalyze: 30, topN: 10 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Prediction failed");
      }

      const data = await res.json();
      setPredictions(data.data?.predictions || []);
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : "Failed to get predictions");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Business intelligence and AI insights
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Business intelligence and AI insights
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="ai">AI Predictions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Sales Trend</CardTitle>
                <CardDescription>
                  Revenue and volume over recent weeks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {weeklyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="totalRevenue"
                          stroke="#2563eb"
                          fill="#2563eb20"
                          name="Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="totalQuantity"
                          stroke="#16a34a"
                          fill="#16a34a20"
                          name="Quantity"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Type</CardTitle>
                <CardDescription>Product vs Service revenue</CardDescription>
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
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consumer Growth</CardTitle>
                <CardDescription>New consumer registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {consumerGrowth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consumerGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#9333ea" name="New Consumers" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margin Analysis</CardTitle>
                <CardDescription>
                  Cost vs Revenue for top products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {marginAnalysis.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marginAnalysis} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          fontSize={11}
                          width={120}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          fill="#2563eb"
                          name="Revenue"
                        />
                        <Bar dataKey="cost" fill="#dc2626" name="Cost" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance</CardTitle>
              <CardDescription>
                Order volume and revenue per vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {vendorPerf.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendorPerf}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="totalOrders"
                        fill="#2563eb"
                        name="Orders"
                      />
                      <Bar
                        dataKey="totalRevenue"
                        fill="#16a34a"
                        name="Revenue"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No vendor data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Margin Analysis</CardTitle>
              <CardDescription>
                Profitability comparison across products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {marginAnalysis.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marginAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="margin"
                        fill="#16a34a"
                        name="Margin %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No product data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Inventory Restocking Prediction
              </CardTitle>
              <CardDescription>
                Powered by OpenAI GPT-4o — Analyzes sales history, current stock
                levels, and trends to recommend optimal restocking quantities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runAIPrediction}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                {aiLoading ? "Analyzing..." : "Run Prediction"}
              </Button>

              {aiError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {aiError}
                </div>
              )}

              {predictions.length > 0 && (
                <div className="space-y-3">
                  {predictions.map((pred, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">
                              {pred.productName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {pred.reasoning}
                            </p>
                          </div>
                          <Badge
                            variant={
                              pred.urgency === "HIGH"
                                ? "destructive"
                                : pred.urgency === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                          >
                            {pred.urgency}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Current Stock
                            </span>
                            <p className="font-medium">{pred.currentStock}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Predicted Demand
                            </span>
                            <p className="font-medium">
                              {pred.predictedDemand}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Recommended Order
                            </span>
                            <p className="font-medium text-primary">
                              {pred.recommendedOrder}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Confidence
                            </span>
                            <p className="font-medium">
                              {(pred.confidenceScore * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
