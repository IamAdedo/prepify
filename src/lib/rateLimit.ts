// Lightweight in-memory sliding-window rate limiter for API routes. Suitable
// for a single-instance deployment; swap for a Redis/Upstash backend if you
// scale horizontally. Keyed by an arbitrary identifier (usually client IP).
interface Bucket {
  hits: number[];
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = store.get(key) || { hits: [] };
  // Drop timestamps outside the window.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const earliest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((earliest + windowMs - now) / 1000));
    store.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (store.size > 5000) {
    Array.from(store.entries()).forEach(([k, b]) => {
      if (b.hits.every((t: number) => t <= cutoff)) store.delete(k);
    });
  }

  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

// Best-effort client IP from common proxy headers.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
