/**
 * @fileoverview Debug Utility for Credential Comparison
 * @author Mulugeta Forsido
 * @company Midport Scandinavia  
 * @date October 2025
 */

import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { config as loadDotenv } from 'dotenv';
import path from 'path';

/**
 * Debug credential comparison issues
 */
export class CredentialDebugger {
  
  /**
   * Debug specific field comparison
   */
  static async debugField(tenantId: string, fieldName: string): Promise<void> {
    try {
      // Load environment variables using same pattern as OAuth2ConfigManager
      const ionVars = Object.keys(process.env).filter(key => key.startsWith('ION_'));
      console.log(`🔧 Found ${ionVars.length} ION_ variables before loading .env.local:`, ionVars.slice(0, 3));
      
      if (ionVars.length === 0) {
        try {
          const envPath = path.resolve(process.cwd(), '.env.local');
          console.log(`🔧 Loading .env.local from: ${envPath}`);
          const result = loadDotenv({ path: envPath, override: false });
          console.log(`🔧 Dotenv result:`, result?.parsed ? Object.keys(result.parsed).length : 'no parsed object');
          
          // Check again after loading
          const ionVarsAfter = Object.keys(process.env).filter(key => key.startsWith('ION_'));
          console.log(`🔧 Found ${ionVarsAfter.length} ION_ variables after loading .env.local:`, ionVarsAfter.slice(0, 3));
        } catch (error) {
          console.warn('Failed to load .env.local:', error);
        }
      }

      // Get env value and strip quotes if present
      const getEnvValue = (key: string): string => {
        const value = process.env[key] || '';
        console.log(`🔧 Raw env value for ${key}:`, JSON.stringify(value));
        // Remove surrounding quotes if present
        const cleaned = value.replace(/^["'](.*)["']$/, '$1');
        console.log(`🔧 Cleaned env value for ${key}:`, JSON.stringify(cleaned));
        return cleaned;
      };
      
      // Map fieldName to correct environment variable name
      const envVarMap: Record<string, string> = {
        'clientId': 'ION_CLIENT_ID',
        'clientSecret': 'ION_CLIENT_SECRET',
        'serviceAccountAccessKey': 'ION_SERVICE_ACCOUNT_ACCESS_KEY',
        'serviceAccountSecretKey': 'ION_SERVICE_ACCOUNT_SECRET_KEY',
        'identityUrl': 'ION_IDENTITY_URL',
        'portalUrl': 'ION_PORTAL_URL',
        'tenantId': 'ION_TENANT_ID',
        'tokenEndpoint': 'ION_TOKEN_ENDPOINT',
        'authorizationEndpoint': 'ION_AUTHORIZATION_ENDPOINT',
        'revokeEndpoint': 'ION_REVOKE_ENDPOINT',
        'scope': 'ION_SCOPE',
        'version': 'ION_VERSION',
        'clientName': 'ION_CLIENT_NAME',
        'dataType': 'ION_DATA_TYPE'
      };
      
      const envVarName = envVarMap[fieldName] || `ION_${fieldName.toUpperCase()}`;
      const envValue = getEnvValue(envVarName);
      
      // Get database value
      const tenant = await TenantConfigManager.getTenantById(tenantId);
      if (!tenant) {
        console.log(`❌ Tenant ${tenantId} not found`);
        return;
      }
      
      const dbValue = tenant.ionConfig[fieldName as keyof typeof tenant.ionConfig] || '';
      
      console.log(`\n🔍 DEBUGGING FIELD: ${fieldName}`);
      console.log('=' .repeat(50));
      
      // String comparison
      console.log(`Strings match: ${envValue === dbValue ? '✅' : '❌'}`);
      
      // Length comparison
      console.log(`ENV length: ${envValue.length}`);
      console.log(`DB length: ${String(dbValue).length}`);
      
      // Character-by-character analysis
      console.log('\n📝 Character Analysis:');
      const maxLen = Math.max(envValue.length, String(dbValue).length);
      
      let firstDiff = -1;
      for (let i = 0; i < maxLen; i++) {
        const envChar = envValue[i] || '∅';
        const dbChar = String(dbValue)[i] || '∅';
        
        if (envChar !== dbChar && firstDiff === -1) {
          firstDiff = i;
        }
        
        if (i < 10 || i >= maxLen - 10 || (firstDiff !== -1 && i >= firstDiff - 2 && i <= firstDiff + 2)) {
          const match = envChar === dbChar ? '✅' : '❌';
          console.log(`  Pos ${i.toString().padStart(3)}: ENV='${envChar}' (${envChar.charCodeAt(0) || 0}) | DB='${dbChar}' (${dbChar.charCodeAt(0) || 0}) ${match}`);
        } else if (i === 10 && maxLen > 20) {
          console.log('  ... (middle characters)');
        }
      }
      
      if (firstDiff !== -1) {
        console.log(`\n❌ First difference at position: ${firstDiff}`);
      }
      
      // Whitespace check
      console.log('\n🔲 Whitespace Analysis:');
      console.log(`ENV starts with space: ${envValue.startsWith(' ')}`);
      console.log(`ENV ends with space: ${envValue.endsWith(' ')}`);
      console.log(`DB starts with space: ${String(dbValue).startsWith(' ')}`);
      console.log(`DB ends with space: ${String(dbValue).endsWith(' ')}`);
      
      // Special characters
      console.log('\n🔣 Special Characters:');
      console.log(`ENV contains \\n: ${envValue.includes('\\n')}`);
      console.log(`ENV contains \\r: ${envValue.includes('\\r')}`);
      console.log(`ENV contains \\t: ${envValue.includes('\\t')}`);
      console.log(`DB contains \\n: ${String(dbValue).includes('\\n')}`);
      console.log(`DB contains \\r: ${String(dbValue).includes('\\r')}`);
      console.log(`DB contains \\t: ${String(dbValue).includes('\\t')}`);
      
      // Hex dump of first/last 20 chars
      console.log('\n🔢 Hex Dump (first 20 chars):');
      const envHex = Array.from(envValue.slice(0, 20)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
      const dbHex = Array.from(String(dbValue).slice(0, 20)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
      console.log(`ENV: ${envHex}`);
      console.log(`DB:  ${dbHex}`);
      
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }
  
  /**
   * Debug client ID specifically
   */
  static async debugClientId(tenantId: string): Promise<void> {
    await this.debugField(tenantId, 'clientId');
  }
  
  /**
   * Debug client secret specifically  
   */
  static async debugClientSecret(tenantId: string): Promise<void> {
    await this.debugField(tenantId, 'clientSecret');
  }
  
  /**
   * Quick debug - find first tenant and debug client ID
   */
  static async quickDebug(): Promise<void> {
    try {
      const summaries = await TenantConfigManager.getTenantSummaries();
      if (summaries.length === 0) {
        console.log('❌ No tenants found');
        return;
      }
      
      console.log(`🔍 Debugging first tenant: ${summaries[0].id}`);
      await this.debugClientId(summaries[0].id);
      
    } catch (error) {
      console.error('Quick debug failed:', error);
    }
  }
}