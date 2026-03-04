import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import * as analyticsService from "@/modules/analytics/service";

export const GET = withPermission("analytics.view")(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type");

      let data;
      switch (type) {
        case "vendor-performance":
          data = await analyticsService.getVendorPerformance(user.tenantId);
          break;
        case "revenue-by-type":
          data = await analyticsService.getRevenueByType(user.tenantId);
          break;
        case "weekly-sales":
          data = await analyticsService.getWeeklySalesTrend(user.tenantId);
          break;
        case "consumer-growth":
          data = await analyticsService.getConsumerGrowth(user.tenantId);
          break;
        case "margin-analysis":
          data = await analyticsService.getMarginAnalysis(user.tenantId);
          break;
        case "dashboard-summary":
          data = await analyticsService.getDashboardSummary(user.tenantId);
          break;
        default:
          // Return all analytics data
          const [
            vendorPerformance,
            revenueByType,
            weeklySales,
            consumerGrowth,
            marginAnalysis,
            summary,
          ] = await Promise.all([
            analyticsService.getVendorPerformance(user.tenantId),
            analyticsService.getRevenueByType(user.tenantId),
            analyticsService.getWeeklySalesTrend(user.tenantId),
            analyticsService.getConsumerGrowth(user.tenantId),
            analyticsService.getMarginAnalysis(user.tenantId),
            analyticsService.getDashboardSummary(user.tenantId),
          ]);

          data = {
            vendorPerformance,
            revenueByType,
            weeklySales,
            consumerGrowth,
            marginAnalysis,
            summary,
          };
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error("Analytics error:", error);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }
  }
);
