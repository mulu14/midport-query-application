#!/usr/bin/env node

/**
 * @fileoverview Database initialization script for tenant configurations
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

const path = require('path');
const { config } = require('dotenv');

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

// Import the TenantConfigManager
const { TenantConfigManager } = require('../lib/TenantConfigManager');

/**
 * Initialize the tenant database with current environment configuration
 */
async function initializeTenantDatabase() {
  console.log('🔧 Initializing tenant configuration database...\n');

  try {
    // Initialize with current .env.local configuration
    const defaultTenant = await TenantConfigManager.initializeWithCurrentEnvConfig();
    
    if (defaultTenant) {
      console.log('✅ Successfully created default tenant configuration:');
      console.log(`   - ID: ${defaultTenant.id}`);
      console.log(`   - Tenant Name: ${defaultTenant.tenantName}`);
      console.log(`   - Display Name: ${defaultTenant.displayName}`);
      console.log(`   - Environment Version: ${defaultTenant.environmentVersion || 'Not specified'}`);
      console.log(`   - Status: ${defaultTenant.isActive ? 'Active' : 'Inactive'}`);
      console.log('');
    } else {
      console.log('ℹ️  No default tenant created (database already initialized or missing required environment variables)');
      console.log('');
    }

    // Get all tenant summaries
    const tenants = await TenantConfigManager.getTenantSummaries();
    console.log(`📊 Current tenant configurations: ${tenants.length}`);
    
    if (tenants.length > 0) {
      console.log('\nExisting tenants:');
      tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.displayName} (${tenant.tenantName})`);
        console.log(`      - ID: ${tenant.id}`);
        console.log(`      - Active: ${tenant.isActive ? 'Yes' : 'No'}`);
        console.log(`      - Status: ${tenant.status}`);
        console.log('');
      });
    }

    console.log('🎉 Tenant database initialization completed!');
    console.log('\nNext steps:');
    console.log('1. Add TENANT_ENCRYPTION_KEY to your .env.local file for production');
    console.log('2. Use the tenant management API endpoints to add more tenants');
    console.log('3. Update your application to select tenants dynamically');

  } catch (error) {
    console.error('❌ Error initializing tenant database:', error);
    process.exit(1);
  }
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const requiredVars = [
    'ION_CLIENT_ID',
    'ION_CLIENT_SECRET',
    'ION_TENANT_ID',
    'ION_PORTAL_URL',
    'ION_TOKEN_ENDPOINT'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  Warning: Some required environment variables are missing:');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('\nThe default tenant may not be created without these variables.');
    console.warn('You can still initialize the database and add tenants later via the API.\n');
  } else {
    console.log('✅ All required environment variables found\n');
  }
}

// Run the initialization
if (require.main === module) {
  console.log('🚀 Tenant Database Initialization\n');
  validateEnvironment();
  initializeTenantDatabase();
}

module.exports = { initializeTenantDatabase, validateEnvironment };