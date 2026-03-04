/**
 * Redis-based Rate Limiter
 *
 * Uses INCR + EXPIRE sliding-window pattern.
 */

import { getRedis } from "./redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Check / increment rate limit for a given identifier.
 *
 * @param identifier  Unique key — typically `userId` or IP address
 * @param limit       Max requests allowed in the window
 * @param windowSec   Window duration in seconds (default 60)
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSec = 60
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;

  try {
    const redis = getRedis();
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    const ttl = await redis.ttl(key);

    if (current > limit) {
      return { success: false, remaining: 0, resetIn: ttl > 0 ? ttl : windowSec };
    }

    return { success: true, remaining: limit - current, resetIn: ttl > 0 ? ttl : windowSec };
  } catch {
    // If Redis is down, allow the request (fail open)
    return { success: true, remaining: limit, resetIn: windowSec };
  }
}
