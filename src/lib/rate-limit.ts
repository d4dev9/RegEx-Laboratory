export interface RateLimitConfig {

  limit: number;

  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;

  remaining: number;

  resetAt: number;

  retryAfterSeconds: number;
  limit: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, Bucket>;
};

const store: Map<string, Bucket> = (globalStore.__rateLimitStore ??= new Map());

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function hit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);

  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: now + config.windowMs,
      retryAfterSeconds: 0,
      limit: config.limit,
    };
  }

  const existing = store.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + config.windowMs };

  bucket.count += 1;
  store.set(key, bucket);

  const allowed = bucket.count <= config.limit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds,
    limit: config.limit,
  };
}

export function clientIp(request: { headers: Headers }): string {
  const headers = request.headers;

  const configured = process.env.TRUSTED_IP_HEADER;
  if (configured) {
    const value = headers.get(configured);
    if (value) return value.trim();
  }

  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  return "unknown";
}

export const RATE_LIMITS = {

  anonymous: { limit: 60, windowMs: 60_000 },

  authenticated: { limit: 300, windowMs: 60_000 },

  explain: { limit: 30, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

export const EXPENSIVE_PATH = "/api/explain";

export function rateLimitBucket(pathname: string): string {

  const root = pathname.split("/")[1] || "root";
  if (root === "api" && pathname === EXPENSIVE_PATH) return "api:expensive";
  return root;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}