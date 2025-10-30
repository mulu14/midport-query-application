/**
 * Script to assign superadmin role to existing user
 * Run this with: npx tsx scripts/assign-superadmin-role.ts
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';

const userAuthDbPath = join(process.cwd(), 'user-auth.db');
const mainDbPath = join(process.cwd(), 'midport_query_platform.db');

async function assignSuperadminRole() {
  console.log('🔧 Starting superadmin role assignment...\n');

  // Step 1: Get the user from user-auth.db
  const userAuthDb = new sqlite3.Database(userAuthDbPath);
  
  const user = await new Promise<any>((resolve, reject) => {
    userAuthDb.get(
      'SELECT id, username, tenant FROM users WHERE tenant = ?',
      ['MIDPORT_DEM'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!user) {
    console.log('❌ User not found in user-auth.db for tenant MIDPORT_DEM');
    userAuthDb.close();
    return;
  }

  console.log(`✓ Found user: ID=${user.id}, Tenant=${user.tenant}`);
  userAuthDb.close();

  // Step 2: Open main database and assign role
  const mainDb = new sqlite3.Database(mainDbPath);

  // Check if roles table exists
  const rolesExist = await new Promise<boolean>((resolve) => {
    mainDb.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='roles'",
      (err, row) => {
        resolve(!!row);
      }
    );
  });

  if (!rolesExist) {
    console.log('❌ Roles table does not exist in main database');
    console.log('💡 The database needs to be initialized first. Run any API endpoint to trigger migrations.');
    mainDb.close();
    return;
  }

  // Get superadmin role ID
  const role = await new Promise<any>((resolve, reject) => {
    mainDb.get(
      'SELECT id FROM roles WHERE name = ?',
      ['superadmin'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!role) {
    console.log('❌ Superadmin role not found in roles table');
    mainDb.close();
    return;
  }

  console.log(`✓ Found superadmin role: ID=${role.id}`);

  // Check if user_roles assignment already exists
  const existingAssignment = await new Promise<any>((resolve, reject) => {
    mainDb.get(
      'SELECT id FROM user_roles WHERE user_id = ? AND role_id = ?',
      [user.id, role.id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (existingAssignment) {
    console.log('ℹ️  User already has superadmin role assigned');
    mainDb.close();
    return;
  }

  // Assign superadmin role
  await new Promise<void>((resolve, reject) => {
    mainDb.run(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [user.id, role.id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  console.log('\n✅ Successfully assigned superadmin role!');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Tenant: ${user.tenant}`);
  console.log(`   Role: superadmin\n`);

  mainDb.close();
}

// Run the script
assignSuperadminRole().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
