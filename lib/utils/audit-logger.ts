/**
 * @fileoverview Audit Logging Utility
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Logs authentication events for security monitoring and compliance.
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Audit event types
 */
export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SIGNUP_SUCCESS = 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE = 'SIGNUP_FAILURE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * Audit log entry interface
 */
interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  username: string;
  tenant: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Get audit log directory path
 */
function getAuditLogDir(): string {
  return join(process.cwd(), 'logs', 'audit');
}

/**
 * Get audit log file path for current date
 */
function getAuditLogFile(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return join(getAuditLogDir(), `audit-${date}.log`);
}

/**
 * Ensure audit log directory exists
 */
function ensureLogDirectoryExists(): void {
  const logDir = getAuditLogDir();
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Format audit log entry as JSON string
 */
function formatLogEntry(entry: AuditLogEntry): string {
  return JSON.stringify(entry) + '\n';
}

/**
 * Log an audit event
 * @param eventType - Type of event
 * @param username - Username involved
 * @param tenant - Tenant name
 * @param options - Additional options (ipAddress, userAgent, message, metadata)
 */
export function logAuditEvent(
  eventType: AuditEventType,
  username: string,
  tenant: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    message?: string;
    metadata?: Record<string, any>;
  } = {}
): void {
  try {
    ensureLogDirectoryExists();

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      username,
      tenant,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: eventType.includes('SUCCESS'),
      message: options.message,
      metadata: options.metadata,
    };

    const logFile = getAuditLogFile();
    const logLine = formatLogEntry(entry);

    // Append to log file
    appendFileSync(logFile, logLine, 'utf8');

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${eventType} - ${tenant}:${username}`);
    }
  } catch (error) {
    // Don't throw errors from logging - just log to console
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Log successful login
 */
export function logLoginSuccess(
  username: string,
  tenant: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent(AuditEventType.LOGIN_SUCCESS, username, tenant, {
    ipAddress,
    userAgent,
    message: 'User logged in successfully',
  });
}

/**
 * Log failed login attempt
 */
export function logLoginFailure(
  username: string,
  tenant: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent(AuditEventType.LOGIN_FAILURE, username, tenant, {
    ipAddress,
    userAgent,
    message: `Login failed: ${reason}`,
  });
}

/**
 * Log user logout
 */
export function logLogout(
  username: string,
  tenant: string,
  ipAddress?: string
): void {
  logAuditEvent(AuditEventType.LOGOUT, username, tenant, {
    ipAddress,
    message: 'User logged out',
  });
}

/**
 * Log successful signup
 */
export function logSignupSuccess(
  username: string,
  tenant: string,
  ipAddress?: string
): void {
  logAuditEvent(AuditEventType.SIGNUP_SUCCESS, username, tenant, {
    ipAddress,
    message: 'New account created',
  });
}

/**
 * Log failed signup
 */
export function logSignupFailure(
  username: string,
  tenant: string,
  reason: string,
  ipAddress?: string
): void {
  logAuditEvent(AuditEventType.SIGNUP_FAILURE, username, tenant, {
    ipAddress,
    message: `Signup failed: ${reason}`,
  });
}

/**
 * Log account lockout
 */
export function logAccountLocked(
  username: string,
  tenant: string,
  failedAttempts: number,
  ipAddress?: string
): void {
  logAuditEvent(AuditEventType.ACCOUNT_LOCKED, username, tenant, {
    ipAddress,
    message: `Account locked after ${failedAttempts} failed attempts`,
    metadata: { failedAttempts },
  });
}

/**
 * Log rate limiting event
 */
export function logRateLimited(
  identifier: string,
  ipAddress?: string
): void {
  logAuditEvent(AuditEventType.RATE_LIMITED, identifier, 'system', {
    ipAddress,
    message: 'Request rate limited',
  });
}
