/**
 * Quick Fix: Add missing expand_fields column to remote_api_databases
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'midport_query_platform.db');

async function fix() {
  console.log('🔧 Adding missing expand_fields column...');
  
  const db = new sqlite3.Database(DB_PATH);
  
  return new Promise<void>((resolve, reject) => {
    db.run('ALTER TABLE remote_api_databases ADD COLUMN expand_fields TEXT', (err) => {
      if (err) {
        // Column might already exist
        console.log('ℹ️  Column might already exist or error:', err.message);
      } else {
        console.log('✅ expand_fields column added successfully!');
      }
      db.close();
      resolve();
    });
  });
}

fix().catch(console.error);
