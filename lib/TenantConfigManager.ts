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
import { DatabaseMigration } from '@/lib/database/DatabaseMigration';

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
  
  // Non-sensitive ION API configuration (plain text)
  identity_url: string | null;
  portal_url: string;
  tenant_id: string;
  token_endpoint: string | null;
  authorization_endpoint: string | null;
  revoke_endpoint: string | null;
  scope: string | null;
  version: string | null;
  client_name: string | null;
  data_type: string | null;
  ln_company: string | null;
  ln_identity: string | null;
  
  // Encrypted sensitive fields (individually encrypted)
  encrypted_client_id: string;
  encrypted_client_secret: string;
  encrypted_service_account_access_key: string;
  encrypted_service_account_secret_key: string;
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
    // Check if migration is needed
    try {
      const needsMigration = await DatabaseMigration.needsMigration();
      if (needsMigration) {
        console.log('Database migration required, running migration...');
        await DatabaseMigration.migrateToIndividualEncryption();
        console.log('Database migration completed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      // Continue with normal initialization as fallback
    }

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
      // Decrypt only the sensitive fields individually
      const decryptedClientId = EncryptionUtil.decrypt(row.encrypted_client_id);
      const decryptedClientSecret = EncryptionUtil.decrypt(row.encrypted_client_secret);
      const decryptedServiceAccountAccessKey = EncryptionUtil.decrypt(row.encrypted_service_account_access_key);
      const decryptedServiceAccountSecretKey = EncryptionUtil.decrypt(row.encrypted_service_account_secret_key);

      // Build ION config with decrypted sensitive fields and plain text non-sensitive fields
      const ionConfig: IONAPIConfig = {
        clientId: decryptedClientId,
        clientSecret: decryptedClientSecret,
        identityUrl: row.identity_url || '',
        portalUrl: row.portal_url || '',
        tenantId: row.tenant_id || '',
        tokenEndpoint: row.token_endpoint || '',
        authorizationEndpoint: row.authorization_endpoint || '',
        revokeEndpoint: row.revoke_endpoint || '',
        serviceAccountAccessKey: decryptedServiceAccountAccessKey,
        serviceAccountSecretKey: decryptedServiceAccountSecretKey,
        scope: row.scope || '',
        version: row.version || '',
        clientName: row.client_name || '',
        dataType: row.data_type || '',
        lnCompany: row.ln_company || undefined,
        lnIdentity: row.ln_identity || undefined
      };

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
      // Encrypt only the sensitive fields individually
      const encryptedClientId = EncryptionUtil.encrypt(config.ionConfig.clientId);
      const encryptedClientSecret = EncryptionUtil.encrypt(config.ionConfig.clientSecret);
      const encryptedServiceAccountAccessKey = EncryptionUtil.encrypt(config.ionConfig.serviceAccountAccessKey);
      const encryptedServiceAccountSecretKey = EncryptionUtil.encrypt(config.ionConfig.serviceAccountSecretKey);

      return {
        id: config.id,
        tenant_name: config.tenantName,
        display_name: config.displayName,
        environment_version: config.environmentVersion || null,
        is_active: config.isActive ? 1 : 0,
        
        // Non-sensitive fields (plain text)
        identity_url: config.ionConfig.identityUrl || null,
        portal_url: config.ionConfig.portalUrl,
        tenant_id: config.ionConfig.tenantId,
        token_endpoint: config.ionConfig.tokenEndpoint || null,
        authorization_endpoint: config.ionConfig.authorizationEndpoint || null,
        revoke_endpoint: config.ionConfig.revokeEndpoint || null,
        scope: config.ionConfig.scope || null,
        version: config.ionConfig.version || null,
        client_name: config.ionConfig.clientName || null,
        data_type: config.ionConfig.dataType || null,
        ln_company: config.ionConfig.lnCompany || null,
        ln_identity: config.ionConfig.lnIdentity || null,
        
        // Encrypted sensitive fields
        encrypted_client_id: encryptedClientId,
        encrypted_client_secret: encryptedClientSecret,
        encrypted_service_account_access_key: encryptedServiceAccountAccessKey,
        encrypted_service_account_secret_key: encryptedServiceAccountSecretKey
      };
    } catch (error) {
      throw new Error(`Failed to encrypt tenant configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if tenant credentials already exist
   */
  static async tenantCredentialsExist(tenantName: string, clientId?: string): Promise<{
    nameExists: boolean;
    clientIdExists: boolean;
    existingTenant?: string;
  }> {
    try {
      const existingByName = await this.getTenantByName(tenantName);
      let clientIdExists = false;
      let existingTenant: string | undefined;

      if (clientId) {
        const allTenants = await this.getAllTenants();
        const duplicateClientId = allTenants.find(tenant => 
          tenant.ionConfig.clientId === clientId
        );
        if (duplicateClientId) {
          clientIdExists = true;
          existingTenant = duplicateClientId.tenantName;
        }
      }

      return {
        nameExists: !!existingByName,
        clientIdExists,
        existingTenant
      };
    } catch (error) {
      console.error('Error checking tenant credentials existence:', error);
      return { nameExists: false, clientIdExists: false };
    }
  }

  /**
   * Create a new tenant credential configuration
   */
  static async createTenantCredential(newTenantCredential: NewTenantConfig): Promise<TenantConfig> {
    // Check for existing tenant with same name
    const existingTenant = await this.getTenantByName(newTenantCredential.tenantName);
    if (existingTenant) {
      throw new Error(`Tenant credentials already exist for '${newTenantCredential.tenantName}'. Use update instead of create.`);
    }

    // Check for existing tenant with same client ID (to prevent duplicate ION configurations)
    const allTenants = await this.getAllTenants();
    const duplicateClientId = allTenants.find(tenant => 
      tenant.ionConfig.clientId === newTenantCredential.ionConfig.clientId
    );
    if (duplicateClientId) {
      throw new Error(`Tenant credentials already exist with this Client ID. Existing tenant: '${duplicateClientId.tenantName}'`);
    }

    const db = await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const id = EncryptionUtil.generateId();
      const now = new Date().toISOString();
      
      const tenantConfig: TenantConfig = {
        id,
        tenantName: newTenantCredential.tenantName,
        displayName: newTenantCredential.displayName,
        environmentVersion: newTenantCredential.environmentVersion,
        isActive: true,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        ionConfig: newTenantCredential.ionConfig
      };

      const rowData = this.tenantConfigToRow(tenantConfig);

      const sql = `
        INSERT INTO tenant_credentials (
          id, tenant_name, display_name, environment_version, is_active,
          identity_url, portal_url, tenant_id, token_endpoint, authorization_endpoint, 
          revoke_endpoint, scope, version, client_name, data_type, ln_company, ln_identity,
          encrypted_client_id, encrypted_client_secret, 
          encrypted_service_account_access_key, encrypted_service_account_secret_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        rowData.id,
        rowData.tenant_name,
        rowData.display_name,
        rowData.environment_version,
        rowData.is_active,
        rowData.identity_url,
        rowData.portal_url,
        rowData.tenant_id,
        rowData.token_endpoint,
        rowData.authorization_endpoint,
        rowData.revoke_endpoint,
        rowData.scope,
        rowData.version,
        rowData.client_name,
        rowData.data_type,
        rowData.ln_company,
        rowData.ln_identity,
        rowData.encrypted_client_id,
        rowData.encrypted_client_secret,
        rowData.encrypted_service_account_access_key,
        rowData.encrypted_service_account_secret_key
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
        SELECT * FROM tenant_credentials 
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
        FROM tenant_credentials tc
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
      const sql = `SELECT * FROM tenant_credentials WHERE id = ?`;

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
      const sql = `SELECT * FROM tenant_credentials WHERE tenant_name = ?`;

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
        UPDATE tenant_credentials 
        SET tenant_name = ?, display_name = ?, environment_version = ?, is_active = ?,
            identity_url = ?, portal_url = ?, tenant_id = ?, token_endpoint = ?, 
            authorization_endpoint = ?, revoke_endpoint = ?, scope = ?, version = ?, 
            client_name = ?, data_type = ?, ln_company = ?, ln_identity = ?,
            encrypted_client_id = ?, encrypted_client_secret = ?, 
            encrypted_service_account_access_key = ?, encrypted_service_account_secret_key = ?
        WHERE id = ?
      `;

      db.run(sql, [
        rowData.tenant_name,
        rowData.display_name,
        rowData.environment_version,
        rowData.is_active,
        rowData.identity_url,
        rowData.portal_url,
        rowData.tenant_id,
        rowData.token_endpoint,
        rowData.authorization_endpoint,
        rowData.revoke_endpoint,
        rowData.scope,
        rowData.version,
        rowData.client_name,
        rowData.data_type,
        rowData.ln_company,
        rowData.ln_identity,
        rowData.encrypted_client_id,
        rowData.encrypted_client_secret,
        rowData.encrypted_service_account_access_key,
        rowData.encrypted_service_account_secret_key,
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
      const sql = `DELETE FROM tenant_credentials WHERE id = ?`;

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
   * Get decrypted lnCompany value for a specific tenant
   * @param tenantId - The tenant ID to retrieve lnCompany for
   * @returns Decrypted lnCompany value or null if not found/error
   */
  static async getTenantLnCompany(tenantId: string): Promise<string | null> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant || !tenant.ionConfig.lnCompany) {
        return null;
      }
      // The ionConfig is already decrypted by getTenantById -> rowToTenantConfig
      return tenant.ionConfig.lnCompany;
    } catch (error) {
      console.error(`Failed to get decrypted lnCompany for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get decrypted lnIdentity value for a specific tenant
   * @param tenantId - The tenant ID to retrieve lnIdentity for
   * @returns Decrypted lnIdentity value or null if not found/error
   */
  static async getTenantLnIdentity(tenantId: string): Promise<string | null> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant || !tenant.ionConfig.lnIdentity) {
        return null;
      }
      // The ionConfig is already decrypted by getTenantById -> rowToTenantConfig
      return tenant.ionConfig.lnIdentity;
    } catch (error) {
      console.error(`Failed to get decrypted lnIdentity for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get both decrypted lnCompany and lnIdentity values for a specific tenant
   * @param tenantId - The tenant ID to retrieve headers for
   * @returns Object containing both decrypted header values
   */
  static async getTenantInforHeaders(tenantId: string): Promise<{ lnCompany: string | null; lnIdentity: string | null }> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        return { lnCompany: null, lnIdentity: null };
      }
      
      // The ionConfig is already decrypted by getTenantById -> rowToTenantConfig
      return {
        lnCompany: tenant.ionConfig.lnCompany || null,
        lnIdentity: tenant.ionConfig.lnIdentity || null
      };
    } catch (error) {
      console.error(`Failed to get decrypted Infor headers for tenant ${tenantId}:`, error);
      return { lnCompany: null, lnIdentity: null };
    }
  }

  /**
   * Update only the lnCompany and lnIdentity values for a tenant
   * The values will be encrypted when stored back to the database
   * @param tenantId - The tenant ID to update
   * @param lnCompany - New lnCompany value (optional)
   * @param lnIdentity - New lnIdentity value (optional)
   * @returns Updated tenant configuration or null if not found
   */
  static async updateTenantInforHeaders(
    tenantId: string, 
    lnCompany?: string, 
    lnIdentity?: string
  ): Promise<TenantConfig | null> {
    try {
      const existing = await this.getTenantById(tenantId);
      if (!existing) {
        return null;
      }

      // Update the ION config with new header values
      // These will be encrypted when tenantConfigToRow is called during update
      const updatedIonConfig: IONAPIConfig = {
        ...existing.ionConfig,
        lnCompany: lnCompany !== undefined ? lnCompany : existing.ionConfig.lnCompany,
        lnIdentity: lnIdentity !== undefined ? lnIdentity : existing.ionConfig.lnIdentity
      };

      // Update the entire tenant configuration - this will re-encrypt everything
      return await this.updateTenant(tenantId, {
        ionConfig: updatedIonConfig
      });
    } catch (error) {
      console.error(`Failed to update Infor headers for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get complete decrypted ION configuration for API requests (including headers)
   * @param tenantId - The tenant ID to get configuration for
   * @returns Object containing decrypted ION config and ready-to-use headers
   */
  static async getTenantApiConfig(tenantId: string): Promise<{
    ionConfig: IONAPIConfig | null;
    headers: Record<string, string>;
  }> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        return { ionConfig: null, headers: {} };
      }

      // Build headers object with decrypted values
      const headers: Record<string, string> = {};
      
      if (tenant.ionConfig.lnCompany) {
        headers['X-Infor-LnCompany'] = tenant.ionConfig.lnCompany;
      }
      
      if (tenant.ionConfig.lnIdentity) {
        headers['X-Infor-LnIdentity'] = tenant.ionConfig.lnIdentity;
      }

      return {
        ionConfig: tenant.ionConfig, // Already decrypted
        headers
      };
    } catch (error) {
      console.error(`Failed to get decrypted API config for tenant ${tenantId}:`, error);
      return { ionConfig: null, headers: {} };
    }
  }

  /**
   * Get all decrypted sensitive values for a tenant (for secure operations only)
   * @param tenantId - The tenant ID to get sensitive data for
   * @returns Object containing all decrypted sensitive fields
   */
  static async getTenantSensitiveData(tenantId: string): Promise<{
    clientSecret: string | null;
    serviceAccountSecretKey: string | null;
    lnCompany: string | null;
    lnIdentity: string | null;
  }> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        return {
          clientSecret: null,
          serviceAccountSecretKey: null,
          lnCompany: null,
          lnIdentity: null
        };
      }

      // All values are already decrypted by getTenantById -> rowToTenantConfig
      return {
        clientSecret: tenant.ionConfig.clientSecret || null,
        serviceAccountSecretKey: tenant.ionConfig.serviceAccountSecretKey || null,
        lnCompany: tenant.ionConfig.lnCompany || null,
        lnIdentity: tenant.ionConfig.lnIdentity || null
      };
    } catch (error) {
      console.error(`Failed to get decrypted sensitive data for tenant ${tenantId}:`, error);
      return {
        clientSecret: null,
        serviceAccountSecretKey: null,
        lnCompany: null,
        lnIdentity: null
      };
    }
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

      const newTenantCredential: NewTenantConfig = {
        tenantName: ionConfig.tenantId,
        displayName: `${ionConfig.tenantId} (Default)`,
        environmentVersion: process.env.ION_ENVIRONMENT_VERSION,
        ionConfig
      };

      return await this.createTenantCredential(newTenantCredential);
    } catch (error) {
      console.error('Failed to initialize default tenant configuration:', error);
      return null;
    }
  }
}