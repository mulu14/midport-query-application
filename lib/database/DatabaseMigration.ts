/**
 * @fileoverview Database Migration Utility for Tenant Credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import Database from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { EncryptionUtil } from '@/lib/utils/encryption';

export class DatabaseMigration {
  private static dbPath = path.join(process.cwd(), 'tenant-configs.db');
  private static backupPath = path.join(process.cwd(), 'tenant-configs-backup.db');

  /**
   * Run migration from old JSON blob structure to individual encrypted fields
   */
  static async migrateToIndividualEncryption(): Promise<void> {
    console.log('Starting database migration...');

    // 1. Create backup of existing database
    await this.createBackup();

    // 2. Get existing data
    const existingData = await this.getExistingData();
    console.log(`Found ${existingData.length} existing tenant records`);

    // 3. Create new table structure
    await this.createNewTableStructure();

    // 4. Migrate data
    await this.migrateData(existingData);

    // 5. Replace old table with new table
    await this.replaceOldTable();

    console.log('Migration completed successfully!');
  }

  /**
   * Create backup of existing database
   */
  private static async createBackup(): Promise<void> {
    try {
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, this.backupPath);
        console.log(`Backup created: ${this.backupPath}`);
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Get existing data from old table structure
   */
  private static async getExistingData(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const sql = `SELECT * FROM tenant_configs ORDER BY created_at`;
        
        db.all(sql, [], (err, rows: any[]) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      });
    });
  }

  /**
   * Create new table structure with individual encrypted fields
   */
  private static async createNewTableStructure(): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const createTableSql = `
          CREATE TABLE IF NOT EXISTS tenant_credentials (
            id TEXT PRIMARY KEY NOT NULL,
            tenant_name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            environment_version TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            -- Non-sensitive ION API configuration (plain text)
            identity_url TEXT,
            portal_url TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            token_endpoint TEXT,
            authorization_endpoint TEXT,
            revoke_endpoint TEXT,
            scope TEXT,
            version TEXT,
            client_name TEXT,
            data_type TEXT,
            ln_company TEXT,
            ln_identity TEXT,
            
            -- Encrypted sensitive fields (individually encrypted)
            encrypted_client_id TEXT NOT NULL,
            encrypted_client_secret TEXT NOT NULL,
            encrypted_service_account_access_key TEXT NOT NULL,
            encrypted_service_account_secret_key TEXT NOT NULL
          )
        `;

        db.exec(createTableSql, (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          // Create indexes
          const indexesSql = `
            CREATE INDEX IF NOT EXISTS idx_tenant_credentials_tenant_name ON tenant_credentials(tenant_name);
            CREATE INDEX IF NOT EXISTS idx_tenant_credentials_is_active ON tenant_credentials(is_active);
            CREATE INDEX IF NOT EXISTS idx_tenant_credentials_created_at ON tenant_credentials(created_at);
            CREATE INDEX IF NOT EXISTS idx_tenant_credentials_tenant_id ON tenant_credentials(tenant_id);
          `;

          db.exec(indexesSql, (err) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
    });
  }

  /**
   * Migrate data from old structure to new structure
   */
  private static async migrateData(existingData: any[]): Promise<void> {
    if (existingData.length === 0) {
      console.log('No data to migrate');
      return;
    }

    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const insertSql = `
          INSERT INTO tenant_credentials (
            id, tenant_name, display_name, environment_version, is_active,
            created_at, updated_at,
            identity_url, portal_url, tenant_id, token_endpoint, authorization_endpoint, 
            revoke_endpoint, scope, version, client_name, data_type, ln_company, ln_identity,
            encrypted_client_id, encrypted_client_secret, 
            encrypted_service_account_access_key, encrypted_service_account_secret_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let completed = 0;
        let hasError = false;

        existingData.forEach((row) => {
          try {
            // Decrypt the old JSON blob
            const decryptedConfig = EncryptionUtil.decrypt(row.encrypted_ion_config);
            const ionConfig = JSON.parse(decryptedConfig);

            // Encrypt individual sensitive fields
            const encryptedClientId = EncryptionUtil.encrypt(ionConfig.clientId || '');
            const encryptedClientSecret = EncryptionUtil.encrypt(ionConfig.clientSecret || '');
            const encryptedServiceAccountAccessKey = EncryptionUtil.encrypt(ionConfig.serviceAccountAccessKey || '');
            const encryptedServiceAccountSecretKey = EncryptionUtil.encrypt(ionConfig.serviceAccountSecretKey || '');

            // Insert into new table structure
            db.run(insertSql, [
              row.id,
              row.tenant_name,
              row.display_name,
              row.environment_version,
              row.is_active,
              row.created_at,
              row.updated_at,
              ionConfig.identityUrl || null,
              ionConfig.portalUrl || '',
              ionConfig.tenantId || '',
              ionConfig.tokenEndpoint || null,
              ionConfig.authorizationEndpoint || null,
              ionConfig.revokeEndpoint || null,
              ionConfig.scope || null,
              ionConfig.version || null,
              ionConfig.clientName || null,
              ionConfig.dataType || null,
              ionConfig.lnCompany || null,
              ionConfig.lnIdentity || null,
              encryptedClientId,
              encryptedClientSecret,
              encryptedServiceAccountAccessKey,
              encryptedServiceAccountSecretKey
            ], function(err) {
              if (err && !hasError) {
                hasError = true;
                db.close();
                reject(err);
                return;
              }

              completed++;
              if (completed === existingData.length && !hasError) {
                db.close();
                console.log(`Successfully migrated ${completed} records`);
                resolve();
              }
            });
          } catch (error) {
            if (!hasError) {
              hasError = true;
              db.close();
              reject(error);
            }
          }
        });
      });
    });
  }

  /**
   * Replace old table with new table
   */
  private static async replaceOldTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Drop old table and rename new table
        const migrationSql = `
          DROP TABLE IF EXISTS tenant_configs;
          
          -- Update health checks table to reference new table
          UPDATE tenant_health_checks SET tenant_id = tenant_id WHERE 1=1;
          
          -- Update oauth tokens table to reference new table  
          UPDATE tenant_oauth_tokens SET tenant_id = tenant_id WHERE 1=1;
          
          -- Create trigger for new table
          CREATE TRIGGER IF NOT EXISTS update_tenant_credentials_timestamp 
              AFTER UPDATE ON tenant_credentials
          BEGIN
              UPDATE tenant_credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
        `;

        db.exec(migrationSql, (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Check if migration is needed
   */
  static async needsMigration(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const db = new Database.Database(this.dbPath, (err) => {
        if (err) {
          // Database doesn't exist, no migration needed
          resolve(false);
          return;
        }

        // Check if old table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_configs'", (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        });
      });
    });
  }
}