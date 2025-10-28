/**
 * @fileoverview Authentication Entity Definitions
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

/**
 * User entity interface
 */
export interface User {
  id: number;
  username: string;
  tenant: string;
  createdAt: string;
  lastLogin?: string | null;
}

/**
 * User session data (subset of User, no sensitive data)
 */
export interface UserSession {
  username: string;
  tenant: string;
  lastLogin?: string | null;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  username: string;
  tenant: string;
  lastLogin?: string | null;
}

/**
 * Sign up request payload
 */
export interface SignUpRequest {
  username: string;
  password: string;
  tenant: string;
}

/**
 * Sign up response payload
 */
export interface SignUpResponse {
  username: string;
  tenant: string;
  message: string;
}

/**
 * Authentication error response
 */
export interface AuthErrorResponse {
  message: string;
  errors?: string[];
}

/**
 * Database user record (internal use only)
 */
export interface DatabaseUser {
  id: number;
  username: string;
  password_hash: string;
  tenant: string;
  created_at: string;
  last_login?: string | null;
}

/**
 * Password validation rules
 */
export interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

/**
 * Username validation rules
 */
export interface UsernameValidationRules {
  minLength: number;
  maxLength: number;
  allowedPattern: RegExp;
}

/**
 * Tenant validation rules
 */
export interface TenantValidationRules {
  minLength: number;
  maxLength: number;
  allowedPattern: RegExp;
}

/**
 * Authentication validation configuration
 */
export interface AuthValidationConfig {
  password: PasswordValidationRules;
  username: UsernameValidationRules;
  tenant: TenantValidationRules;
}

/**
 * Default authentication validation configuration
 */
export const DEFAULT_AUTH_VALIDATION: AuthValidationConfig = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false
  },
  username: {
    minLength: 3,
    maxLength: 50,
    allowedPattern: /^[a-zA-Z0-9_]+$/
  },
  tenant: {
    minLength: 3,
    maxLength: 100,
    allowedPattern: /^[a-zA-Z0-9_-]+$/
  }
};

