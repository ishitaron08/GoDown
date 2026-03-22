/**
 * AI Security Guard — Protects against prompt injection and malicious requests
 * Prevents system prompt extraction, jailbreak attempts, and data exfiltration
 */

// Keywords that indicate prompt injection or jailbreak attempts
const INJECTION_KEYWORDS = [
  "system prompt",
  "system instruction",
  "initial system message",
  "your instruction",
  "your system",
  "what is your prompt",
  "what are you instructed",
  "ignore previous",
  "forget everything",
  "disregard",
  "override",
  "bypass",
  "circumvent",
  "do not follow",
  "pretend you are",
  "act as if you are not",
  "you are now",
  "you are a different",
  "jailbreak",
  "reveal system",
  "show me the",
  "tell me the",
  "print the",
  "output the",
  "my internal",
  "your internal",
  "your rules",
  "your guidelines",
  "you must",
  "you will",
  "you should",
  "new instructions",
  "update your",
  "change your behavior",
  "role play",
  "roleplay as",
  "imagine you are",
  "pretend",
  "assume the role",
  "take on the role",
];

const SUSPICIOUS_PATTERNS = [
  /(?:system|instruction|prompt|rule|guideline|constraint)/gi,
  /(?:ignore|disregard|forget|override|bypass|circumvent)/gi,
  /(?:tell me|show me|print|output|reveal|expose)/gi,
  /(?:you are|act as|pretend|role.*play|assume)/gi,
];

/**
 * Check if input contains prompt injection attempts
 */
export function detectPromptInjection(input: string): boolean {
  const lower = input.toLowerCase();

  // Check for injection keywords (case-insensitive)
  for (const keyword of INJECTION_KEYWORDS) {
    if (lower.includes(keyword)) {
      return true;
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitize user input — remove potentially harmful content
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let clean = input.replace(/\0/g, "");

  // Remove control characters
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  // Limit length to prevent token explosion attacks
  if (clean.length > 2000) {
    clean = clean.substring(0, 2000);
  }

  return clean.trim();
}

/**
 * Filter AI response to prevent data leakage
 */
export function filterAIResponse(response: string): string {
  if (!response) return "";

  let filtered = response;

  // Remove patterns that might contain sensitive info
  // Remove anything that looks like internal prompts or instructions
  filtered = filtered.replace(/\[system[^\]]*\]/gi, "");
  filtered = filtered.replace(/\(internal[^\)]*\)/gi, "");
  filtered = filtered.replace(/ignore[^\n]*/gi, "");
  filtered = filtered.replace(/disregard[^\n]*/gi, "");

  // Remove multiple consecutive newlines
  filtered = filtered.replace(/\n\s*\n/g, "\n");

  return filtered.trim();
}

/**
 * Detect suspicious response patterns
 */
export function detectSuspiciousResponse(response: string): boolean {
  const lower = response.toLowerCase();

  // Check if response contains system prompt or instructions
  if (lower.includes("system prompt") || lower.includes("system instruction")) {
    return true;
  }

  // Check if response reveals internal logic
  if (lower.includes("instructed to") || lower.includes("told to")) {
    return true;
  }

  // Check for jailbreak success indicators
  if (lower.includes("now i will ignore") || lower.includes("now i can")) {
    return true;
  }

  return false;
}

/**
 * Validate question before sending to AI
 * Returns { valid: boolean, reason: string }
 */
export function validateQuestion(
  question: string
): { valid: boolean; reason?: string } {
  // Check for empty
  if (!question || question.trim().length === 0) {
    return { valid: false, reason: "Question cannot be empty" };
  }

  // Check for prompt injection
  if (detectPromptInjection(question)) {
    return {
      valid: false,
      reason: "Your question contains potentially harmful content. Please ask about inventory operations only.",
    };
  }

  // Check length
  if (question.length > 2000) {
    return { valid: false, reason: "Question is too long (max 2000 characters)" };
  }

  return { valid: true };
}

/**
 * Validate forecast request
 */
export function validateForecastRequest(body: unknown): {
  valid: boolean;
  reason?: string;
} {
  if (typeof body !== "object" || body === null) {
    return { valid: true }; // Default case
  }

  const obj = body as Record<string, unknown>;
  const { warehouseId } = obj;

  // If warehouseId is provided, validate it's a proper MongoDB ID format
  if (warehouseId && typeof warehouseId === "string") {
    if (!/^[0-9a-f]{24}$/i.test(warehouseId)) {
      return { valid: false, reason: "Invalid warehouse ID format" };
    }
  }

  return { valid: true };
}

/**
 * Log suspicious activity for audit trail
 */
export function logSuspiciousActivity(
  userId: string,
  action: string,
  details: string,
  severity: "low" | "medium" | "high"
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${severity.toUpperCase()}] User: ${userId} | Action: ${action} | Details: ${details}`;

  if (severity === "high") {
    console.error("🚨 SECURITY ALERT:", logEntry);
  } else if (severity === "medium") {
    console.warn("⚠️ SUSPICIOUS ACTIVITY:", logEntry);
  } else {
    console.info("ℹ️ AUDIT LOG:", logEntry);
  }
}
