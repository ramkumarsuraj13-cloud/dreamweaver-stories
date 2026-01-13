const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

type RateLimitResult = { ok: true; retryAfter: 0 } | { ok: false; retryAfter: number };

const memoryStore = globalThis as unknown as {
  __rateLimit?: Map<string, { count: number; resetAt: number }>;
};

const inMemory = memoryStore.__rateLimit ??= new Map();

async function checkUpstashLimit(key: string): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      commands: [
        ["INCR", key],
        ["PTTL", key],
        ["PEXPIRE", key, RATE_LIMIT_WINDOW_MS],
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const incrResult = data?.[0]?.result;
  const ttlResult = data?.[1]?.result;

  if (typeof incrResult !== "number") {
    return null;
  }

  if (incrResult > RATE_LIMIT_MAX) {
    const retryAfterMs = typeof ttlResult === "number" && ttlResult > 0 ? ttlResult : RATE_LIMIT_WINDOW_MS;
    return { ok: false, retryAfter: Math.ceil(retryAfterMs / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

function checkInMemoryLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = inMemory.get(key);

  if (!entry || entry.resetAt <= now) {
    inMemory.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

export async function checkRateLimit(ip: string, scope: string): Promise<RateLimitResult> {
  const key = `rate:${scope}:${ip}`;

  try {
    const upstashResult = await checkUpstashLimit(key);
    if (upstashResult) {
      return upstashResult;
    }
  } catch {
    // Fall back to in-memory limiter when Upstash is unavailable.
  }

  return checkInMemoryLimit(key);
}
