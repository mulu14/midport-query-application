/**
 * @fileoverview TypeScript interfaces and types for Remote API functionality
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

/**
 * API types supported by the platform
 */
export type APIType = 'soap' | 'rest';

/**
 * Represents a table within a remote API database
 * @interface RemoteAPITable
 */
export interface RemoteAPITable {
  /** The display name of the table */
  name: string;
  /** The API endpoint path for this table */
  endpoint: string;
  /** API type (SOAP or REST) */
  apiType: APIType;
  /** OData service name for REST APIs (e.g., 'tsapi.socServiceOrders') */
  oDataService?: string;
  /** Entity name for REST APIs (e.g., 'Orders') */
  entityName?: string;
}

/**
 * OAuth2 authentication configuration for ION APIs
 * @interface OAuth2Config
 */
export interface OAuth2Config {
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** Username for resource owner grant */
  username: string;
  /** Password for resource owner grant */
  password: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Scope for the OAuth2 request */
  scope?: string;
}

/**
 * OAuth2 token response from ION API
 * @interface OAuth2TokenResponse
 */
export interface OAuth2TokenResponse {
  /** Access token for API authentication */
  access_token: string;
  /** Token type (usually "Bearer") */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string;
  /** Scope granted by the token */
  scope?: string;
}

/**
 * Stored OAuth2 token with metadata
 * @interface StoredOAuth2Token
 */
export interface StoredOAuth2Token {
  /** The access token */
  accessToken: string;
  /** Token type */
  tokenType: string;
  /** Expiration timestamp */
  expiresAt: number;
  /** Refresh token if available */
  refreshToken?: string;
  /** Scope of the token */
  scope?: string;
}

/**
 * Represents a tenant (database) in the remote API system
 * @interface RemoteAPITenant
 */
export interface RemoteAPITenant {
  /** Unique identifier for the tenant */
  id: string;
  /** Display name of the tenant (e.g., "MIDPORT_DEM") */
  name: string;
  /** Tenant name (unique identifier, e.g., "MIDPORT_DEM") */
  tenantName?: string;
  /** Array of tables available in this tenant */
  tables: RemoteAPITable[];
  /** Current connection status of the tenant */
  status: 'connected' | 'disconnected' | 'error';
  /** Full URL from the database configuration */
  fullUrl?: string;
  /** OAuth2 authentication configuration */
  oauth2Config?: OAuth2Config;
  /** Current OAuth2 token (stored securely) */
  oauth2Token?: StoredOAuth2Token;
  /** Expand fields for OData REST APIs */
  expandFields?: string[];
}

/**
 * Configuration object for API requests (SOAP and REST)
 * @interface APIRequestConfig
 */
export interface APIRequestConfig {
  /** The tenant name for the API request */
  tenant: string;
  /** The table/service endpoint for the API request */
  table: string;
  /** The API type (SOAP or REST) */
  apiType: APIType;
  /** The action to perform (List, Create, Update, Delete for SOAP; GET, POST, PUT, DELETE for REST) */
  action: string;
  /** Optional parameters for the request */
  parameters?: Record<string, any>;
  /** Original SQL query for reference during conversion */
  sqlQuery?: string;
  /** Full URL from the database configuration */
  fullUrl?: string;
  /** Company code for ION API activation header (SOAP only) */
  company?: string;
  /** OData service name for REST APIs */
  oDataService?: string;
  /** Entity name for REST APIs */
  entityName?: string;
  /** Expand fields for OData REST APIs (used to retrieve nested data) */
  expandFields?: string[];
}

/**
 * Legacy SOAP-only configuration (for backward compatibility)
 * @interface SOAPRequestConfig
 * @deprecated Use APIRequestConfig instead
 */
export interface SOAPRequestConfig extends APIRequestConfig {
  apiType: 'soap';
}

/**
 * Result object returned from remote API query execution
 * @interface RemoteAPIQueryResult
 */
export interface RemoteAPIQueryResult {
  /** Whether the query execution was successful */
  success: boolean;
  /** The URL that was called */
  url: string;
  /** The action that was performed */
  action: string;
  /** HTTP status code from the response */
  status: number;
  /** HTTP status text from the response */
  statusText: string;
  /** Parsed structured data from ION API response */
  data?: {
    success: boolean;
    serviceType: string;
    recordCount: number;
    records: any[];
    summary: string;
    error?: boolean;
    message?: string;
    type?: string;
  };
  /** Raw SOAP XML response */
  rawResponse?: string;
  /** Additional notes about the execution */
  note: string;
  /** Extracted table schema with metadata */
  schema?: import('../lib/utils/SchemaExtractor').TableSchema;
  /** Array of records for backward compatibility */
  records?: any[];
}

/**
 * Data structure for creating a new remote API tenant
 * @interface NewRemoteAPITenant
 */
export interface NewRemoteAPITenant {
  /** Unique identifier for the tenant */
  id: string;
  /** Base URL for the API (e.g., "https://api.example.com") */
  base_url: string;
  /** Tenant name (must be unique) */
  tenant_name: string;
  /** Services path (e.g., "LN/c4ws/services") */
  services: string;
  /** Array of table names */
  tables: string[];
  /** Current status of the tenant */
  status: 'active' | 'inactive';
  /** Display name for the tenant */
  name: string;
  /** OAuth2 authentication configuration */
  oauth2Config?: OAuth2Config;
}

/**
 * Complete database object with all metadata
 * @interface RemoteAPIDatabase
 */
export interface RemoteAPIDatabase {
  /** Unique identifier (UUID or auto-increment from SQLite) */
  id: string;
  /** Normalized base URL in camelCase */
  baseUrl: string;
  /** Tenant name (must be unique) */
  tenantName: string;
  /** Service identifier(s) */
  services: string;
  /** One-to-many relationship with tables */
  tables: RemoteAPITable[];
  /** Complete API URL */
  fullUrl: string;
  /** Current status (default "active") */
  status: 'active' | 'inactive';
  /** Creation timestamp (auto-generated) */
  createdAt: Date;
  /** Last update timestamp (auto-updated) */
  updatedAt: Date;
}
