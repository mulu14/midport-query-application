/**
 * @fileoverview TypeScript interfaces and types for Remote API functionality
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

/**
 * Represents a table within a remote API database
 * @interface RemoteAPITable
 */
export interface RemoteAPITable {
  /** The display name of the table */
  name: string;
  /** The API endpoint path for this table */
  endpoint: string;
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
  /** Array of tables available in this tenant */
  tables: RemoteAPITable[];
  /** Current connection status of the tenant */
  status: 'connected' | 'disconnected' | 'error';
  /** Full URL from the database configuration */
  fullUrl?: string;
}

/**
 * Configuration object for SOAP API requests
 * @interface SOAPRequestConfig
 */
export interface SOAPRequestConfig {
  /** The tenant name for the API request */
  tenant: string;
  /** The table endpoint for the API request */
  table: string;
  /** The SOAP action to perform (Read, Create, Update, Delete) */
  action: string;
  /** Optional parameters for the SOAP request */
  parameters?: Record<string, any>;
  /** Original SQL query for reference during conversion */
  sqlQuery?: string;
  /** Full URL from the database configuration */
  fullUrl?: string;
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
  /** The SOAP action that was performed */
  action: string;
  /** HTTP status code from the response */
  status: number;
  /** HTTP status text from the response */
  statusText: string;
  /** Additional notes about the execution */
  note: string;
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
