/**
 * Complete Migration: Remove UNIQUE constraint from tenant_name
 * This script properly migrates the table structure
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'midport_query_platform.db');

async function migrate() {
  console.log('🔄 Starting complete migration...');
  
  const db = new sqlite3.Database(DB_PATH);
  
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Check if remote_api_databases_new exists and drop it
      db.run('DROP TABLE IF EXISTS remote_api_databases_new', (err) => {
        if (err) {
          console.error('Error dropping temp table:', err);
          db.close();
          reject(err);
          return;
        }
        
        console.log('🧹 Cleaned up any previous migration attempts');
        
        // Start transaction
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          console.log('📝 Creating new table structure...');
          db.run(`
            CREATE TABLE remote_api_databases_new (
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
            
            console.log('📦 Copying data from old table...');
            db.run(`
              INSERT INTO remote_api_databases_new 
                (id, name, base_url, tenant_name, services, full_url, expand_fields, status, created_at, updated_at)
              SELECT 
                id, 
                name, 
                base_url, 
                tenant_name, 
                services, 
                COALESCE(full_url, ''),
                COALESCE(expand_fields, NULL),
                CASE 
                  WHEN status IN ('active', 'inactive') THEN status
                  ELSE 'active'
                END as status,
                created_at, 
                updated_at
              FROM remote_api_databases
            `, (err) => {
              if (err) {
                console.error('Error copying data:', err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              
              console.log('🗑️  Dropping old table...');
              db.run('DROP TABLE remote_api_databases', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log('✏️  Renaming new table...');
                db.run('ALTER TABLE remote_api_databases_new RENAME TO remote_api_databases', (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    db.close();
                    reject(err);
                    return;
                  }
                  
                  console.log('🔍 Recreating indexes...');
                  db.run('CREATE INDEX IF NOT EXISTS idx_remote_api_databases_tenant ON remote_api_databases(tenant_name)', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      db.close();
                      reject(err);
                      return;
                    }
                    
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        db.close();
                        reject(err);
                        return;
                      }
                      
                      console.log('✅ Migration completed successfully!');
                      console.log('');
                      console.log('You can now create multiple database configurations for the same tenant:');
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
  });
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
