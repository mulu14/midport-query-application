/**
 * Migration Script: Remove UNIQUE constraint from tenant_name
 * 
 * This script migrates the remote_api_databases table to remove the UNIQUE constraint
 * on tenant_name, allowing multiple database configurations for the same tenant.
 * 
 * SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to:
 * 1. Create a new table without the constraint
 * 2. Copy data from old table
 * 3. Drop old table
 * 4. Rename new table
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'midport_query_platform.db');

async function migrate() {
  console.log('🔄 Starting migration: Remove UNIQUE constraint from tenant_name...');
  
  const db = new sqlite3.Database(DB_PATH);
  
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Start transaction
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 1. Create new table without UNIQUE constraint
        console.log('📝 Creating new table structure...');
        db.run(`
          CREATE TABLE IF NOT EXISTS remote_api_databases_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL,
            tenant_name TEXT NOT NULL,
            services TEXT NOT NULL,
            full_url TEXT,
            expand_fields TEXT,
            status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            reject(err);
            return;
          }
          
          // 2. Copy data from old table to new table (normalize status values)
          console.log('📦 Copying existing data...');
          db.run(`
            INSERT INTO remote_api_databases_new 
              (id, name, base_url, tenant_name, services, full_url, expand_fields, status, created_at, updated_at)
            SELECT 
              id, name, base_url, tenant_name, services, full_url, expand_fields,
              CASE 
                WHEN status IN ('active', 'inactive') THEN status
                ELSE 'active'
              END as status, 
              created_at, updated_at
            FROM remote_api_databases
          `, (err) => {
            if (err) {
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }
            
            // 3. Drop old table
            console.log('🗑️  Dropping old table...');
            db.run('DROP TABLE remote_api_databases', (err) => {
              if (err) {
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              
              // 4. Rename new table
              console.log('✏️  Renaming new table...');
              db.run('ALTER TABLE remote_api_databases_new RENAME TO remote_api_databases', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  db.close();
                  reject(err);
                  return;
                }
                
                // 5. Recreate index
                console.log('🔍 Recreating index...');
                db.run('CREATE INDEX IF NOT EXISTS idx_remote_api_databases_tenant ON remote_api_databases(tenant_name)', (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    db.close();
                    reject(err);
                    return;
                  }
                  
                  // Commit transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      db.close();
                      reject(err);
                      return;
                    }
                    
                    console.log('✅ Migration completed successfully!');
                    console.log('');
                    console.log('You can now create multiple database configurations for the same tenant.');
                    console.log('Example:');
                    console.log('  - "MIDPORT_DEM - Orders" with tenant "MIDPORT_DEM"');
                    console.log('  - "MIDPORT_DEM - Services" with tenant "MIDPORT_DEM"');
                    console.log('  - "MIDPORT_DEM - Employees" with tenant "MIDPORT_DEM"');
                    
                    db.close();
                    resolve();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run migration
migrate().catch(console.error);
