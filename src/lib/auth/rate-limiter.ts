import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window record store
const requestStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Determines if rate limiting should be enforced for this request.
 * In test environments, bypassed unless x-test-rate-limit is provided or ENABLE_TEST_RATE_LIMIT=true.
 */
export function isRateLimitEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'test') {
    return (
      request.headers.get('x-test-rate-limit') === 'true' ||
      process.env.ENABLE_TEST_RATE_LIMIT === 'true'
    );
  }
  return true;
}

/**
 * Sanitizes an IP address string to prevent header injection or spoofed characters.
 */
function sanitizeIp(ip: string): string {
  const first = ip.split(',')[0].trim();
  const cleaned = first.replace(/[^a-fA-F0-9:.]/g, '');
  return cleaned.length > 0 && cleaned.length <= 45 ? cleaned : '127.0.0.1';
}

/**
 * Extracts a client identifier from incoming request headers or fallback.
 * Optionally combines with a normalized account identifier (e.g. email) for compound keys.
 */
export function getClientIdentifier(
  request: NextRequest,
  prefix = 'auth',
  accountIdentifier?: string
): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const rawIp = forwarded || realIp || '127.0.0.1';
  const ip = sanitizeIp(rawIp);

  if (accountIdentifier && accountIdentifier.trim()) {
    const normalizedAccount = accountIdentifier.trim().toLowerCase().slice(0, 100);
    return `${prefix}:${ip}:${normalizedAccount}`;
  }

  return `${prefix}:${ip}`;
}

/**
 * Evaluates whether a client request is within the allowable rate limit window.
 *
 * @param key Unique client identifier (e.g., prefix + IP)
 * @param maxAttempts Maximum permitted requests within the window (default: 5)
 * @param windowMs Time window in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const record = requestStore.get(key) || { timestamps: [] };

  // Filter out timestamps outside the active window
  const activeTimestamps = record.timestamps.filter((t) => t > cutoff);

  if (activeTimestamps.length >= maxAttempts) {
    const oldest = activeTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record this attempt
  activeTimestamps.push(now);
  requestStore.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: maxAttempts - activeTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets rate limit records (primarily for isolated test environments).
 */
export function resetRateLimits(): void {
  requestStore.clear();
}
