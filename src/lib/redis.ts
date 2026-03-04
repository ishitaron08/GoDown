import Redis from "ioredis";

// Persist the client across Next.js hot-reloads (same pattern as Mongoose).
// Without this, every file re-evaluation in dev creates a NEW connection,
// quickly exhausting the free-tier "max clients" limit.
declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    username: process.env.REDIS_USERNAME ?? "default",
    password: process.env.REDIS_PASSWORD!,
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    // Back off on reconnect: 200ms → 400ms → 600ms, give up after 3 attempts.
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying; caching degrades gracefully
      return Math.min(times * 200, 600);
    },
  });

  client.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
    // On hard disconnects, clear the global so the next request gets a fresh client.
    if (
      err.message.includes("ECONNRESET") ||
      err.message.includes("max number of clients") ||
      err.message.includes("ENOTFOUND")
    ) {
      try { client.disconnect(); } catch { /* ignore */ }
      global.redisClient = undefined;
    }
  });

  return client;
}

export function getRedis(): Redis {
  if (!global.redisClient) {
    global.redisClient = createRedisClient();
  }
  return global.redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await getRedis().get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // silently fail — cache is best-effort
  }
}

/**
 * Delete one or more cache keys.
 * Supports glob patterns (e.g. "products:*") using SCAN + DEL.
 * For a literal key (no wildcards), uses plain DEL.
 */
export async function cacheDel(pattern: string): Promise<void> {
  try {
    const redis = getRedis();

    if (pattern.includes("*") || pattern.includes("?") || pattern.includes("[")) {
      // Pattern-based: scan for matching keys, then bulk-delete
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    } else {
      // Exact key
      await redis.del(pattern);
    }
  } catch {
    // silently fail — cache is best-effort
  }
}
