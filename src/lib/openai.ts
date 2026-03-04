import OpenAI from "openai";

// ── OpenRouter configuration ──
// Uses OpenRouter (openrouter.ai) as the AI gateway.
// Free-tier models are used to avoid billing limits.
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Free models on OpenRouter (no cost, generous rate limits)
// Ordered by preference — models that support system role first.
const FREE_TEXT_MODELS = [
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
];
const FREE_VISION_MODELS = [
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

// Models that do NOT support the 'system' role (must merge into user content)
const NO_SYSTEM_ROLE = new Set([
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3n-e4b-it:free",
  "google/gemma-3n-e2b-it:free",
]);

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: OPENROUTER_BASE_URL,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "GoDown Inventory",
  },
});

/**
 * Custom error class for OpenAI quota / auth issues.
 */
export class OpenAIQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIQuotaError";
  }
}

/** Returns true if this error is retryable (rate-limit or provider rejection). */
function isRetryable(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    const code = (err as any).code ?? (err as any).error?.code ?? "";
    const msg = String(err.message).toLowerCase();
    return (
      err.status === 429 ||
      err.status === 502 ||
      err.status === 503 ||
      code === "rate_limit_exceeded" ||
      code === "insufficient_quota" ||
      // Provider-level 400 errors (e.g. model doesn't support system role)
      (err.status === 400 && msg.includes("provider returned error"))
    );
  }
  return false;
}

/** Check if an error is a quota / billing issue and throw a specific error. */
function handleOpenAIError(err: unknown): never {
  if (err instanceof OpenAI.APIError) {
    const code = (err as any).code ?? (err as any).error?.code ?? "";
    const status = err.status;
    if (
      status === 429 ||
      code === "insufficient_quota" ||
      code === "rate_limit_exceeded" ||
      String(err.message).includes("quota")
    ) {
      throw new OpenAIQuotaError(
        "AI API rate limit reached on all free models. Please try again in a minute."
      );
    }
    if (status === 401 || code === "invalid_api_key") {
      throw new OpenAIQuotaError("Invalid API key. Please update OPENAI_API_KEY in .env.local with a valid OpenRouter key.");
    }
  }
  throw err;
}

/**
 * Transform messages for models that don't support the system role.
 * Merges system content into the first user message.
 */
function adaptMessages(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  if (!NO_SYSTEM_ROLE.has(model)) return messages;

  // Collect system text and merge into first user message
  const systemParts: string[] = [];
  const rest: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const m of messages) {
    if (m.role === "system" && typeof m.content === "string") {
      systemParts.push(m.content);
    } else {
      rest.push(m);
    }
  }
  if (systemParts.length === 0) return messages;

  const prefix = systemParts.join("\n\n");
  // Prepend to first user message
  const adapted = rest.map((m, i) => {
    if (i === 0 && m.role === "user") {
      if (typeof m.content === "string") {
        return { ...m, content: `${prefix}\n\n${m.content}` };
      }
      // For multipart (vision) messages, prepend text part
      if (Array.isArray(m.content)) {
        return {
          ...m,
          content: [{ type: "text" as const, text: prefix }, ...m.content],
        };
      }
    }
    return m;
  });
  return adapted;
}

/**
 * Try a chat completion across multiple model fallbacks.
 * If a model is rate-limited or the provider rejects it, try the next one.
 */
async function chatWithFallback(
  models: string[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  opts: { max_tokens?: number; temperature?: number } = {}
): Promise<string> {
  let lastError: unknown;
  for (const model of models) {
    try {
      const adapted = adaptMessages(model, messages);
      const completion = await openai.chat.completions.create({
        model,
        messages: adapted,
        max_tokens: opts.max_tokens ?? 150,
        temperature: opts.temperature ?? 0.7,
      });
      return completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      lastError = err;
      if (isRetryable(err)) {
        console.warn(`[AI] Model ${model} failed (retryable), trying next...`);
        continue;
      }
      throw err; // non-retryable error, stop
    }
  }
  // All models exhausted
  handleOpenAIError(lastError);
}

/**
 * Generate a fallback template description when AI is unavailable.
 */
function fallbackDescription(name?: string, category?: string): string {
  if (name && category) {
    return `${name} — a quality product in the ${category} category. Contact us for detailed specifications and bulk pricing.`;
  }
  if (name) {
    return `${name} — a quality warehouse product. Contact us for detailed specifications and availability.`;
  }
  return "Product description will be updated soon.";
}

/**
 * Generate a product description.
 * Supports optional image URL for vision-based description.
 * Automatically falls back across multiple free models if rate-limited.
 */
export async function generateProductDescription(
  productName?: string,
  category?: string,
  imageUrl?: string
): Promise<string> {
  try {
    // If we have an image, use vision-capable models
    if (imageUrl) {
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl, detail: "low" },
      });

      let textPrompt = "Look at this product image and write a clear, professional product description in 2-3 sentences for a warehouse inventory system.";
      if (productName) textPrompt += ` The product name is "${productName}".`;
      if (category) textPrompt += ` It belongs to the "${category}" category.`;
      textPrompt += " Focus on key features, material, and use-case.";

      userContent.push({ type: "text", text: textPrompt });

      const result = await chatWithFallback(
        FREE_VISION_MODELS,
        [
          {
            role: "system",
            content:
              "You are a warehouse inventory assistant. Write concise, professional product descriptions. Focus on specifications, materials, and practical use. 2-3 sentences max.",
          },
          { role: "user", content: userContent },
        ],
        { max_tokens: 200, temperature: 0.7 }
      );
      return result || fallbackDescription(productName, category);
    }

    // Text-only
    const result = await chatWithFallback(
      FREE_TEXT_MODELS,
      [
        {
          role: "system",
          content:
            "You are a warehouse inventory assistant. Write a concise, professional product description in 2-3 sentences.",
        },
        {
          role: "user",
          content: `Write a description for: "${productName}" in category "${category}"`,
        },
      ],
      { max_tokens: 120, temperature: 0.7 }
    );
    return result || fallbackDescription(productName, category);
  } catch (err) {
    handleOpenAIError(err);
  }
}

/**
 * Smart inventory insight — ask anything about stock.
 * Automatically falls back across multiple free models if rate-limited.
 */
export async function askInventoryAI(question: string, context: string): Promise<string> {
  try {
    const result = await chatWithFallback(
      FREE_TEXT_MODELS,
      [
        {
          role: "system",
          content: `You are an intelligent inventory assistant for GoDown — a multi-warehouse inventory management system used in India.
You have access to live inventory data shown below. Answer questions clearly and helpfully.
Use Indian Rupee (₹) for prices. Be specific — mention product names, GoDown names, quantities when relevant.
If stock is low or out, proactively suggest restocking. Format numbers with commas for readability.
Keep answers concise (3-6 sentences max) but complete. If asked for a list, use bullet points.

LIVE DATA:
${context}`,
        },
        { role: "user", content: question },
      ],
      { max_tokens: 450, temperature: 0.4 }
    );
    return result || "No response.";
  } catch (err) {
    handleOpenAIError(err);
  }
}
