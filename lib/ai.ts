import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// AI Response Schemas (Zod Validation for AI outputs)
// ============================================================================

export const RestockPredictionSchema = z.object({
  daysUntilStockout: z.number().int().min(0),
  recommendedQuantity: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
});

export type RestockPrediction = z.infer<typeof RestockPredictionSchema>;

// ============================================================================
// Inventory Restocking Prediction
// ============================================================================

export interface SalesDataPoint {
  date: string;
  quantitySold: number;
  revenue: number;
}

export interface ProductContext {
  productName: string;
  sku: string;
  currentStock: number;
  reorderThreshold: number;
  costPrice: number;
  sellingPrice: number;
}

/**
 * Calculate moving averages from sales history
 */
function calculateMovingAverages(salesData: SalesDataPoint[]): {
  sevenDay: number;
  thirtyDay: number;
  dailyAverage: number;
} {
  const sorted = [...salesData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const last7 = sorted.slice(0, 7);
  const last30 = sorted.slice(0, 30);

  const sevenDay =
    last7.length > 0
      ? last7.reduce((sum, d) => sum + d.quantitySold, 0) / last7.length
      : 0;

  const thirtyDay =
    last30.length > 0
      ? last30.reduce((sum, d) => sum + d.quantitySold, 0) / last30.length
      : 0;

  const dailyAverage =
    salesData.length > 0
      ? salesData.reduce((sum, d) => sum + d.quantitySold, 0) / salesData.length
      : 0;

  return { sevenDay, thirtyDay, dailyAverage };
}

/**
 * Sanitize data to prevent prompt injection
 */
function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[<>{}[\]]/g, "")
    .replace(/\n/g, " ")
    .slice(0, 200);
}

/**
 * Predict inventory restocking needs using OpenAI GPT-4o
 */
export async function predictRestocking(
  product: ProductContext,
  salesData: SalesDataPoint[]
): Promise<RestockPrediction> {
  const movingAverages = calculateMovingAverages(salesData);

  const systemPrompt = `You are an inventory management AI assistant. You analyze sales data and predict restocking needs. You MUST respond with valid JSON only. Do not include any text outside of the JSON object. The JSON must have these exact keys: daysUntilStockout (integer >= 0), recommendedQuantity (integer >= 0), confidence (float 0-1), reasoning (string, max 500 chars).`;

  const userPrompt = `Analyze this product's inventory:

Product: ${sanitizeForPrompt(product.productName)}
SKU: ${sanitizeForPrompt(product.sku)}
Current Stock: ${product.currentStock} units
Reorder Threshold: ${product.reorderThreshold} units
Cost Price: $${product.costPrice}
Selling Price: $${product.sellingPrice}

Sales Data (last ${salesData.length} days):
- 7-day moving average: ${movingAverages.sevenDay.toFixed(2)} units/day
- 30-day moving average: ${movingAverages.thirtyDay.toFixed(2)} units/day
- Overall daily average: ${movingAverages.dailyAverage.toFixed(2)} units/day
- Total data points: ${salesData.length}

Recent daily sales (last 7 days): ${salesData
    .slice(0, 7)
    .map((d) => `${d.date}: ${d.quantitySold}`)
    .join(", ")}

Predict: How many days until stockout? What quantity should be reordered? How confident are you?`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  // Parse and validate the response with Zod
  const parsed = JSON.parse(content);
  const validated = RestockPredictionSchema.parse(parsed);

  return validated;
}

export default openai;
