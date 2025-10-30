/**
 * @fileoverview Rate Limiting Utility
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Implements in-memory rate limiting to prevent brute force attacks
 * on authentication endpoints.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiter configuration
 */
const RATE_LIMIT_CONFIG = {
  // Allow 5 attempts per 15 minutes
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address or username)
 * @returns Object with success status and remaining attempts
 */
export function checkRateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or expired entry
  if (!entry || entry.resetTime < now) {
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      success: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime,
    };
  }

  // Existing entry - check if limit exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: RATE_LIMIT_CONFIG.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier
 * Used after successful authentication
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get time remaining until rate limit reset
 * @param identifier - Unique identifier
 * @returns Seconds until reset, or 0 if not rate limited
 */
export function getRateLimitResetTime(identifier: string): number {
  const entry = rateLimitStore.get(identifier);
  if (!entry) return 0;

  const now = Date.now();
  const remaining = Math.max(0, entry.resetTime - now);
  return Math.ceil(remaining / 1000); // Convert to seconds
}
