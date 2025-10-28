/**
 * @fileoverview Central export file for all entity types and classes
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

// Product entity exports
export { Product } from './Product';
export type { ProductData } from './Product';

// Customer entity exports
export { Customer } from './Customer';
export type { CustomerData } from './Customer';

// Order entity exports
export { Order } from './Order';
export type { OrderData } from './Order';

// Database entity exports
export { Database } from './Database';
export type { DatabaseData } from './Database';
export type { DatabaseTable } from './DatabaseTable';

// Tenant configuration entity exports
export type { 
  TenantConfig, 
  NewTenantConfig, 
  TenantSummary, 
  TenantConfigValidation,
  EncryptedTenantConfig,
  IONAPIConfig 
} from './TenantConfig';

// Authentication entity exports
export type {
  User,
  UserSession,
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
  AuthErrorResponse,
  DatabaseUser,
  PasswordValidationRules,
  UsernameValidationRules,
  TenantValidationRules,
  AuthValidationConfig
} from './Auth';

export { DEFAULT_AUTH_VALIDATION } from './Auth';
