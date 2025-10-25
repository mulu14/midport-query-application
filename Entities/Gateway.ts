/**
 * @fileoverview API Gateway interfaces and types
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { APIType } from './RemoteAPI';

/**
 * Tenant credentials from SQLite database
 * Maps to the 'credentials' table schema in midport.db
 * @interface TenantCredentials
 */
export interface TenantCredentials {
  /** Unique identifier */
  id: number;
  /** Tenant name (must be unique) */
  tenant_name: string;
  /** Base URL for the API */
  base_url: string;
  /** OAuth2 client ID */
  client_id: string;
  /** OAuth2 client secret (encrypted in database) */
  client_secret: string;
  /** Username for authentication */
  username: string;
  /** Password for authentication (encrypted in database) */
  password: string;
  /** OAuth2 token endpoint URL */
  token_url: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Standardized API Gateway response structure
 * @interface APIGatewayResponse
 */
export interface APIGatewayResponse {
  /** Whether the request was successful */
  success: boolean;
  /** ISO timestamp of the response */
  timestamp: string;
  /** Tenant name that processed the request */
  tenant: string;
  /** Type of API used (soap or rest) */
  apiType: APIType;
  /** Response data from the API */
  data?: any;
  /** Metadata about the request execution */
  metadata?: APIGatewayMetadata;
  /** Error information if request failed */
  error?: APIGatewayError;
}

/**
 * Metadata about API Gateway request execution
 * @interface APIGatewayMetadata
 */
export interface APIGatewayMetadata {
  /** Number of records returned */
  recordCount?: number;
  /** Total execution time in milliseconds */
  executionTimeMs: number;
  /** Table/service name queried */
  table?: string;
  /** Action performed (for SOAP APIs) */
  action?: string;
  /** OData service name (for REST APIs) */
  service?: string;
  /** Entity name (for REST APIs) */
  entity?: string;
}

/**
 * Error information from API Gateway
 * @interface APIGatewayError
 */
export interface APIGatewayError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details (only in development) */
  details?: any;
}
