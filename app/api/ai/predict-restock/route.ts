import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { predictRestockSchema } from "@/lib/zod-schemas";
import { predictRestocking, type SalesDataPoint, type ProductContext } from "@/lib/ai";
import prisma from "@/lib/prisma";
import { z } from "zod";

// POST /api/ai/predict-restock
export const POST = withPermission("ai.predict", {
  rateLimit: { maxRequests: 10, windowSeconds: 60 },
})(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const { productId } = predictRestockSchema.parse(body);

      // 1. Fetch product details
      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: user.tenantId },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      // 2. Fetch sales history (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const salesHistory = await prisma.salesHistory.findMany({
        where: {
          productId,
          tenantId: user.tenantId,
          date: { gte: ninetyDaysAgo },
        },
        orderBy: { date: "desc" },
      });

      // 3. Format data for AI
      const salesData: SalesDataPoint[] = salesHistory.map((sh) => ({
        date: sh.date.toISOString().split("T")[0],
        quantitySold: sh.quantitySold,
        revenue: sh.revenue,
      }));

      const productContext: ProductContext = {
        productName: product.name,
        sku: product.sku,
        currentStock: product.stockQuantity,
        reorderThreshold: product.reorderThreshold,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
      };

      // 4. Get AI prediction
      const prediction = await predictRestocking(productContext, salesData);

      // 5. Store prediction in DB
      const stored = await prisma.aiPrediction.create({
        data: {
          productId,
          daysUntilStockout: prediction.daysUntilStockout,
          recommendedQuantity: prediction.recommendedQuantity,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          tenantId: user.tenantId,
        },
      });

      return NextResponse.json({
        prediction,
        id: stored.id,
        productName: product.name,
        currentStock: product.stockQuantity,
        dataPoints: salesData.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      console.error("AI prediction error:", error);
      const message = error instanceof Error ? error.message : "AI prediction failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
