/**
 * @fileoverview Account Lockout Utility
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Tracks failed login attempts and locks accounts temporarily
 * to prevent brute force attacks.
 */

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

// In-memory store for account lockout tracking
const lockoutStore = new Map<string, LockoutEntry>();

/**
 * Account lockout configuration
 */
const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,        // Lock after 5 failed attempts
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes lockout
  attemptWindowMs: 15 * 60 * 1000,   // Reset counter after 15 min of no attempts
};

/**
 * Clean up expired lockout entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore.entries()) {
    // Remove if lockout expired and no recent attempts
    if (
      entry.lockedUntil && 
      entry.lockedUntil < now && 
      (now - entry.lastAttempt) > LOCKOUT_CONFIG.attemptWindowMs
    ) {
      lockoutStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Get account key for lockout tracking
 * @param username - Username
 * @param tenant - Tenant name
 * @returns Unique key for the account
 */
function getAccountKey(username: string, tenant: string): string {
  return `${tenant}:${username}`.toLowerCase();
}

/**
 * Check if an account is currently locked
 * @param username - Username
 * @param tenant - Tenant name
 * @returns Object with lock status and time remaining
 */
export function isAccountLocked(username: string, tenant: string): {
  locked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
} {
  const key = getAccountKey(username, tenant);
  const entry = lockoutStore.get(key);

  if (!entry) {
    return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  const now = Date.now();

  // Check if lockout has expired
  if (entry.lockedUntil && entry.lockedUntil < now) {
    // Lockout expired - reset failed attempts
    lockoutStore.delete(key);
    return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  // Account is locked
  if (entry.lockedUntil) {
    const remainingMs = entry.lockedUntil - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      locked: true,
      remainingSeconds,
      failedAttempts: entry.failedAttempts,
    };
  }

  // Not locked, but has failed attempts
  return {
    locked: false,
    remainingSeconds: 0,
    failedAttempts: entry.failedAttempts,
  };
}

/**
 * Record a failed login attempt
 * @param username - Username
 * @param tenant - Tenant name
 * @returns Updated lockout status
 */
export function recordFailedAttempt(username: string, tenant: string): {
  locked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil: number | null;
} {
  const key = getAccountKey(username, tenant);
  const now = Date.now();
  const entry = lockoutStore.get(key);

  if (!entry) {
    // First failed attempt
    lockoutStore.set(key, {
      failedAttempts: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
    return {
      locked: false,
      failedAttempts: 1,
      remainingAttempts: LOCKOUT_CONFIG.maxFailedAttempts - 1,
      lockedUntil: null,
    };
  }

  // Check if attempts should be reset (outside window)
  if ((now - entry.lastAttempt) > LOCKOUT_CONFIG.attemptWindowMs) {
    lockoutStore.set(key, {
      failedAttempts: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
    return {
      locked: false,
      failedAttempts: 1,
      remainingAttempts: LOCKOUT_CONFIG.maxFailedAttempts - 1,
      lockedUntil: null,
    };
  }

  // Increment failed attempts
  const newFailedAttempts = entry.failedAttempts + 1;

  // Check if should lock account
  if (newFailedAttempts >= LOCKOUT_CONFIG.maxFailedAttempts) {
    const lockedUntil = now + LOCKOUT_CONFIG.lockoutDurationMs;
    lockoutStore.set(key, {
      failedAttempts: newFailedAttempts,
      lockedUntil,
      lastAttempt: now,
    });
    return {
      locked: true,
      failedAttempts: newFailedAttempts,
      remainingAttempts: 0,
      lockedUntil,
    };
  }

  // Update failed attempts
  lockoutStore.set(key, {
    ...entry,
    failedAttempts: newFailedAttempts,
    lastAttempt: now,
  });

  return {
    locked: false,
    failedAttempts: newFailedAttempts,
    remainingAttempts: LOCKOUT_CONFIG.maxFailedAttempts - newFailedAttempts,
    lockedUntil: null,
  };
}

/**
 * Reset failed attempts after successful login
 * @param username - Username
 * @param tenant - Tenant name
 */
export function resetFailedAttempts(username: string, tenant: string): void {
  const key = getAccountKey(username, tenant);
  lockoutStore.delete(key);
}

/**
 * Manually unlock an account (for admin use)
 * @param username - Username
 * @param tenant - Tenant name
 */
export function unlockAccount(username: string, tenant: string): void {
  const key = getAccountKey(username, tenant);
  lockoutStore.delete(key);
}
