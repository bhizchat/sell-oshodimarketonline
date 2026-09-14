import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Distributed (Upstash Redis) rate limiting for the auth endpoints that
// are otherwise brute-forceable/enumerable: login and password-reset
// requests. Sliding-window counters keyed by IP AND by email/identifier,
// so a single limiter can't be bypassed by attacking from many IPs
// against one account, or attacking many accounts from one IP.
//
// Requires UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (from an
// Upstash Redis database) to be set. If they're missing (e.g. in local
// dev without Upstash configured), we fail OPEN with a console warning
// rather than crashing every login attempt — but this must never happen
// in production, so double-check these env vars are set in Vercel.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  console.warn(
    '[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are not set — auth rate limiting is DISABLED. Set these env vars before deploying to production.'
  );
}

// 5 login attempts per IP per minute, 8 per email per 15 minutes.
export const loginIpLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'ratelimit:login:ip' })
  : null;
export const loginEmailLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, '15 m'), prefix: 'ratelimit:login:email' })
  : null;

// 5 password-reset requests per IP per hour, 3 per email per 15 minutes.
export const resetPasswordIpLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'ratelimit:reset:ip' })
  : null;
export const resetPasswordEmailLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '15 m'), prefix: 'ratelimit:reset:email' })
  : null;

// Best-effort client IP extraction: Vercel (and most reverse proxies) set
// x-forwarded-for as "client, proxy1, proxy2" — the first entry is the
// original client. Falls back to a constant so unit-of-work still groups
// requests together locally instead of throwing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// Checks both the IP and per-identifier (email) limiters; returns the
// shorter of the two `reset` windows if either is exceeded, so callers can
// return a Retry-After header. Returns null when the request is allowed.
export async function checkRateLimit(
  ipLimiter: Ratelimit | null,
  identifierLimiter: Ratelimit | null,
  ip: string,
  identifier: string
): Promise<{ limited: true; retryAfterSeconds: number } | { limited: false }> {
  if (!ipLimiter || !identifierLimiter) {
    // Fails open when Upstash isn't configured (see warning above) —
    // never block real users just because env vars are missing locally.
    return { limited: false };
  }

  const [ipResult, identifierResult] = await Promise.all([
    ipLimiter.limit(ip),
    identifierLimiter.limit(identifier.toLowerCase()),
  ]);

  const blocked = !ipResult.success || !identifierResult.success;
  if (!blocked) return { limited: false };

  const soonestReset = Math.min(
    !ipResult.success ? ipResult.reset : Infinity,
    !identifierResult.success ? identifierResult.reset : Infinity
  );
  const retryAfterSeconds = Math.max(1, Math.ceil((soonestReset - Date.now()) / 1000));
  return { limited: true, retryAfterSeconds };
}
