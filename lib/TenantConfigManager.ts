/**
 * @fileoverview Tenant Configuration Manager for multi-tenant ION API credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import Database from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  TenantConfig, 
  NewTenantConfig, 
  TenantSummary, 
  TenantConfigValidation,
  EncryptedTenantConfig,
  IONAPIConfig
} from '@/Entities/TenantConfig';
import { OAuth2Config, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { EncryptionUtil } from '@/lib/utils/encryption';

/**
 * Database row interface for tenant configurations
 */
interface TenantConfigRow {
  id: string;
  tenant_name: string;
  display_name: string;
  environment_version: string | null;
  is_active: number; // SQLite uses 0/1 for boolean
  created_at: string;
  updated_at: string;
  encrypted_ion_config: string;
}

/**
 * Database row interface for health checks
 */
interface HealthCheckRow {
  id: number;
  tenant_id: string;
  status: string;
  response_time: number | null;
  error_message: string | null;
  checked_at: string;
}

/**
 * Database row interface for OAuth2 tokens
 */
interface TokenRow {
  tenant_id: string;
  access_token: string;
  token_type: string;
  expires_at: number;
  refresh_token: string | null;
  scope: string | null;
  created_at: string;
}

/**
 * Tenant Configuration Manager
 * Handles CRUD operations for tenant-specific ION API configurations
 */
export class TenantConfigManager {
  private static dbPath = path.join(process.cwd(), 'tenant-configs.db');
  private static schemaPath = path.join(process.cwd(), 'lib', 'database', 'tenantSchema.sql');

  /**
   * Initialize the database and create tables if they don't exist
   */
  private static async initializeDatabase(): Promise<Database.Database> {
    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Read and execute schema
        try {
          const schema = fs.readFileSync(this.schemaPath, 'utf8');
          db.exec(schema, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(db);
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Convert database row to TenantConfig object
   */
  private static rowToTenantConfig(row: TenantConfigRow): TenantConfig {
    try {
      const decryptedConfig = EncryptionUtil.decrypt(row.encrypted_ion_config);
      const ionConfig: IONAPIConfig = JSON.parse(decryptedConfig);

      return {
        id: row.id,
        tenantName: row.tenant_name,
        displayName: row.display_name,
        environmentVersion: row.environment_version || undefined,
        isActive: row.is_active === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        ionConfig
      };
    } catch (error) {
      throw new Error(`Failed to decrypt tenant configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert TenantConfig to database row data
   */
  private static tenantConfigToRow(config: TenantConfig): Omit<TenantConfigRow, 'created_at' | 'updated_at'> {
    try {
      const encryptedConfig = EncryptionUtil.encrypt(JSON.stringify(config.ionConfig));

      return {
        id: config.id,
        tenant_name: config.tenantName,
        display_name: config.displayName,
        environment_version: config.environmentVersion || null,
        is_active: config.isActive ? 1 : 0,
        encrypted_ion_config: encryptedConfig
      };
    } catch (error) {
      throw new Error(`Failed to encrypt tenant configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new tenant configuration
   */
  static async createTenant(newTenant: NewTenantConfig): Promise<TenantConfig> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const id = EncryptionUtil.generateId();
      const now = new Date().toISOString();
      
      const tenantConfig: TenantConfig = {
        id,
        tenantName: newTenant.tenantName,
        displayName: newTenant.displayName,
        environmentVersion: newTenant.environmentVersion,
        isActive: true,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        ionConfig: newTenant.ionConfig
      };

      const rowData = this.tenantConfigToRow(tenantConfig);

      const sql = `
        INSERT INTO tenant_configs (
          id, tenant_name, display_name, environment_version, 
          is_active, encrypted_ion_config
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        rowData.id,
        rowData.tenant_name,
        rowData.display_name,
        rowData.environment_version,
        rowData.is_active,
        rowData.encrypted_ion_config
      ], function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve(tenantConfig);
      });
    });
  }

  /**
   * Get all tenant configurations
   */
  static async getAllTenants(): Promise<TenantConfig[]> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM tenant_configs 
        ORDER BY created_at DESC
      `;

      db.all(sql, [], (err, rows: TenantConfigRow[]) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }

        try {
          const tenants = rows.map(row => this.rowToTenantConfig(row));
          resolve(tenants);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Get tenant summaries (without sensitive data)
   */
  static async getTenantSummaries(): Promise<TenantSummary[]> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          tc.id, 
          tc.tenant_name, 
          tc.display_name, 
          tc.is_active,
          thc.status
        FROM tenant_configs tc
        LEFT JOIN (
          SELECT DISTINCT tenant_id, status,
                 ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY checked_at DESC) as rn
          FROM tenant_health_checks
        ) thc ON tc.id = thc.tenant_id AND thc.rn = 1
        ORDER BY tc.created_at DESC
      `;

      db.all(sql, [], (err, rows: any[]) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }

        const summaries: TenantSummary[] = rows.map(row => ({
          id: row.id,
          tenantName: row.tenant_name,
          displayName: row.display_name,
          isActive: row.is_active === 1,
          status: row.status || 'disconnected'
        }));

        resolve(summaries);
      });
    });
  }

  /**
   * Get tenant configuration by ID
   */
  static async getTenantById(id: string): Promise<TenantConfig | null> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tenant_configs WHERE id = ?`;

      db.get(sql, [id], (err, row: TenantConfigRow | undefined) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const tenant = this.rowToTenantConfig(row);
          resolve(tenant);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Get tenant configuration by tenant name
   */
  static async getTenantByName(tenantName: string): Promise<TenantConfig | null> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tenant_configs WHERE tenant_name = ?`;

      db.get(sql, [tenantName], (err, row: TenantConfigRow | undefined) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const tenant = this.rowToTenantConfig(row);
          resolve(tenant);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Update tenant configuration
   */
  static async updateTenant(id: string, updates: Partial<TenantConfig>): Promise<TenantConfig | null> {
    const existing = await this.getTenantById(id);
    if (!existing) {
      return null;
    }

    const updated: TenantConfig = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updatedAt: new Date()
    };

    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const rowData = this.tenantConfigToRow(updated);

      const sql = `
        UPDATE tenant_configs 
        SET tenant_name = ?, display_name = ?, environment_version = ?, 
            is_active = ?, encrypted_ion_config = ?
        WHERE id = ?
      `;

      db.run(sql, [
        rowData.tenant_name,
        rowData.display_name,
        rowData.environment_version,
        rowData.is_active,
        rowData.encrypted_ion_config,
        id
      ], function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve(updated);
      });
    });
  }

  /**
   * Delete tenant configuration
   */
  static async deleteTenant(id: string): Promise<boolean> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM tenant_configs WHERE id = ?`;

      db.run(sql, [id], function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }

  /**
   * Convert IONAPIConfig to OAuth2Config for compatibility with existing OAuth2ConfigManager
   */
  static ionConfigToOAuth2Config(ionConfig: IONAPIConfig): OAuth2Config {
    return {
      clientId: ionConfig.clientId,
      clientSecret: ionConfig.clientSecret,
      username: ionConfig.serviceAccountAccessKey,
      password: ionConfig.serviceAccountSecretKey,
      tokenEndpoint: `${ionConfig.portalUrl}${ionConfig.tokenEndpoint}`,
      scope: ionConfig.scope
    };
  }

  /**
   * Record health check result for a tenant
   */
  static async recordHealthCheck(tenantId: string, status: string, responseTime?: number, errorMessage?: string): Promise<void> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO tenant_health_checks (tenant_id, status, response_time, error_message)
        VALUES (?, ?, ?, ?)
      `;

      db.run(sql, [tenantId, status, responseTime || null, errorMessage || null], function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Cache OAuth2 token for a tenant
   */
  static async cacheToken(tenantId: string, token: StoredOAuth2Token): Promise<void> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO tenant_oauth_tokens 
        (tenant_id, access_token, token_type, expires_at, refresh_token, scope)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        tenantId,
        token.accessToken,
        token.tokenType,
        token.expiresAt,
        token.refreshToken || null,
        token.scope || null
      ], function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Get cached OAuth2 token for a tenant
   */
  static async getCachedToken(tenantId: string): Promise<StoredOAuth2Token | null> {
    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tenant_oauth_tokens WHERE tenant_id = ?`;

      db.get(sql, [tenantId], (err, row: TokenRow | undefined) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        const token: StoredOAuth2Token = {
          accessToken: row.access_token,
          tokenType: row.token_type,
          expiresAt: row.expires_at,
          refreshToken: row.refresh_token || undefined,
          scope: row.scope || undefined
        };

        resolve(token);
      });
    });
  }

  /**
   * Initialize with current .env.local configuration as default tenant
   */
  static async initializeWithCurrentEnvConfig(): Promise<TenantConfig | null> {
    try {
      // Check if any tenants already exist
      const existingTenants = await this.getTenantSummaries();
      if (existingTenants.length > 0) {
        return null; // Already initialized
      }

      // Load current environment variables
      const ionConfig: IONAPIConfig = {
        clientId: process.env.ION_CLIENT_ID || '',
        clientSecret: process.env.ION_CLIENT_SECRET || '',
        identityUrl: process.env.ION_IDENTITY_URL || '',
        portalUrl: process.env.ION_PORTAL_URL || '',
        tenantId: process.env.ION_TENANT_ID || '',
        tokenEndpoint: process.env.ION_TOKEN_ENDPOINT || '',
        authorizationEndpoint: process.env.ION_AUTHORIZATION_ENDPOINT || '',
        revokeEndpoint: process.env.ION_REVOKE_ENDPOINT || '',
        serviceAccountAccessKey: process.env.ION_SERVICE_ACCOUNT_ACCESS_KEY || '',
        serviceAccountSecretKey: process.env.ION_SERVICE_ACCOUNT_SECRET_KEY || '',
        scope: process.env.ION_SCOPE || '',
        version: process.env.ION_VERSION || '',
        clientName: process.env.ION_CLIENT_NAME || '',
        dataType: process.env.ION_DATA_TYPE || ''
      };

      // Only initialize if we have required values
      if (!ionConfig.clientId || !ionConfig.clientSecret || !ionConfig.tenantId) {
        return null;
      }

      const newTenant: NewTenantConfig = {
        tenantName: ionConfig.tenantId,
        displayName: `${ionConfig.tenantId} (Default)`,
        environmentVersion: process.env.ION_ENVIRONMENT_VERSION,
        ionConfig
      };

      return await this.createTenant(newTenant);
    } catch (error) {
      console.error('Failed to initialize default tenant configuration:', error);
      return null;
    }
  }
}