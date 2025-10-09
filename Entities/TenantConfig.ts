/**
 * @fileoverview Tenant Configuration interfaces for multi-tenant ION API credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

/**
 * Complete tenant configuration with ION API credentials
 * @interface TenantConfig
 */
export interface TenantConfig {
  /** Unique identifier for the tenant */
  id: string;
  /** Tenant name (e.g., "MIDPORT_DEM", "CUSTOMER_ABC") */
  tenantName: string;
  /** Display name for the tenant */
  displayName: string;
  /** Environment version */
  environmentVersion?: string;
  /** Whether this tenant is currently active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** ION API configuration for this tenant */
  ionConfig: IONAPIConfig;
}

/**
 * ION API specific configuration for a tenant
 * @interface IONAPIConfig
 */
export interface IONAPIConfig {
  /** OAuth2 Client Credentials */
  clientId: string;
  /** OAuth2 Client Secret (encrypted in database) */
  clientSecret: string;
  /** ION Identity URL */
  identityUrl: string;
  /** Portal URL */
  portalUrl: string;
  /** Tenant ID */
  tenantId: string;
  
  /** OAuth2 Endpoints */
  tokenEndpoint: string;
  authorizationEndpoint: string;
  revokeEndpoint: string;
  
  /** Service Account Keys */
  serviceAccountAccessKey: string;
  /** Service Account Secret Key (encrypted in database) */
  serviceAccountSecretKey: string;
  
  /** Configuration */
  scope: string;
  version: string;
  
  /** Client metadata */
  clientName: string;
  dataType: string;
  
  /** Additional HTTP Headers for API requests */
  /** X-Infor-LnCompany header value */
  lnCompany?: string;
  /** X-Infor-LnIdentity header value */
  lnIdentity?: string;
}

/**
 * Data structure for creating a new tenant configuration
 * @interface NewTenantConfig
 */
export interface NewTenantConfig {
  /** Tenant name (must be unique) */
  tenantName: string;
  /** Display name for the tenant */
  displayName: string;
  /** Environment version */
  environmentVersion?: string;
  /** ION API configuration */
  ionConfig: IONAPIConfig;
}

/**
 * Minimal tenant information for selection UI
 * @interface TenantSummary
 */
export interface TenantSummary {
  /** Unique identifier */
  id: string;
  /** Tenant name */
  tenantName: string;
  /** Display name */
  displayName: string;
  /** Whether this tenant is active */
  isActive: boolean;
  /** Connection status */
  status: 'connected' | 'disconnected' | 'error' | 'testing';
}

/**
 * Validation result for tenant configuration
 * @interface TenantConfigValidation
 */
export interface TenantConfigValidation {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Connection test result */
  connectionTest?: {
    success: boolean;
    message: string;
    responseTime?: number;
  };
}

/**
 * Encrypted credential data for database storage
 * @interface EncryptedTenantConfig
 */
export interface EncryptedTenantConfig extends Omit<TenantConfig, 'ionConfig'> {
  /** Encrypted ION configuration as JSON string */
  encryptedIonConfig: string;
}