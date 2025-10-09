/**
 * @fileoverview Credential Validation Utility
 * Tests and compares actual values from database vs environment variables
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { IONAPIConfig } from '@/Entities/TenantConfig';
import { config as loadDotenv } from 'dotenv';
import path from 'path';

interface ValidationResult {
  field: string;
  envValue: string;
  dbValue: string;
  matches: boolean;
}

interface ComparisonReport {
  tenantId: string;
  totalFields: number;
  matchingFields: number;
  mismatchedFields: number;
  allMatching: boolean;
  results: ValidationResult[];
  errors: string[];
}

/**
 * Credential Validation Utility Class
 */
export class CredentialValidator {
  
  /**
   * Compare actual values from database with environment variables
   */
  static async validateCredentialValues(tenantId: string): Promise<ComparisonReport> {
    const report: ComparisonReport = {
      tenantId,
      totalFields: 0,
      matchingFields: 0,
      mismatchedFields: 0,
      allMatching: false,
      results: [],
      errors: []
    };

    try {
      // Load environment variables using same pattern as OAuth2ConfigManager
      const ionVars = Object.keys(process.env).filter(key => key.startsWith('ION_'));
      if (ionVars.length === 0) {
        try {
          const envPath = path.resolve(process.cwd(), '.env.local');
          loadDotenv({ path: envPath, override: false });
        } catch (error) {
          console.warn('Failed to load .env.local:', error);
        }
      }

      // Get values from environment and strip quotes if present
      const getEnvValue = (key: string): string => {
        const value = process.env[key] || '';
        // Remove surrounding quotes if present
        return value.replace(/^["'](.*)["']$/, '$1');
      };

      const envConfig: IONAPIConfig = {
        clientId: getEnvValue('ION_CLIENT_ID'),
        clientSecret: getEnvValue('ION_CLIENT_SECRET'),
        identityUrl: getEnvValue('ION_IDENTITY_URL'),
        portalUrl: getEnvValue('ION_PORTAL_URL'),
        tenantId: getEnvValue('ION_TENANT_ID'),
        tokenEndpoint: getEnvValue('ION_TOKEN_ENDPOINT'),
        authorizationEndpoint: getEnvValue('ION_AUTHORIZATION_ENDPOINT'),
        revokeEndpoint: getEnvValue('ION_REVOKE_ENDPOINT'),
        serviceAccountAccessKey: getEnvValue('ION_SERVICE_ACCOUNT_ACCESS_KEY'),
        serviceAccountSecretKey: getEnvValue('ION_SERVICE_ACCOUNT_SECRET_KEY'),
        scope: getEnvValue('ION_SCOPE'),
        version: getEnvValue('ION_VERSION'),
        clientName: getEnvValue('ION_CLIENT_NAME'),
        dataType: getEnvValue('ION_DATA_TYPE'),
        lnCompany: getEnvValue('ION_X_INFOR_LNCOMPANY'),
        lnIdentity: getEnvValue('ION_X_INFOR_LNIDENTITY')
      };

      // Get decrypted values from database
      const tenant = await TenantConfigManager.getTenantById(tenantId);
      
      if (!tenant) {
        report.errors.push(`Tenant with ID ${tenantId} not found in database`);
        return report;
      }

      const dbConfig = tenant.ionConfig;

      // Define fields to compare
      const fieldsToCompare: (keyof IONAPIConfig)[] = [
        'clientId',
        'clientSecret', 
        'identityUrl',
        'portalUrl',
        'tenantId',
        'tokenEndpoint',
        'authorizationEndpoint',
        'revokeEndpoint',
        'serviceAccountAccessKey',
        'serviceAccountSecretKey',
        'scope',
        'version',
        'clientName',
        'dataType',
        'lnCompany',
        'lnIdentity'
      ];

      // Compare each field
      for (const field of fieldsToCompare) {
        const envValue = String(envConfig[field] || '');
        const dbValue = String(dbConfig[field] || '');
        const matches = envValue === dbValue;

        report.results.push({
          field,
          envValue: this.maskSensitiveValue(field, envValue),
          dbValue: this.maskSensitiveValue(field, dbValue),
          matches
        });

        report.totalFields++;
        if (matches) {
          report.matchingFields++;
        } else {
          report.mismatchedFields++;
        }
      }

      report.allMatching = report.mismatchedFields === 0;

    } catch (error) {
      report.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
  }

  /**
   * Mask sensitive field values for display (show only first/last few chars)
   */
  private static maskSensitiveValue(field: string, value: string): string {
    const sensitiveFields = ['clientId', 'clientSecret', 'serviceAccountAccessKey', 'serviceAccountSecretKey'];
    
    if (!sensitiveFields.includes(field) || value.length <= 8) {
      return value;
    }

    // Show first 4 and last 4 characters with asterisks in between
    return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
  }

  /**
   * Print validation report to console
   */
  static printValidationReport(report: ComparisonReport): void {
    console.log('\n=== CREDENTIAL VALIDATION REPORT ===');
    console.log(`Tenant ID: ${report.tenantId}`);
    console.log(`Total Fields: ${report.totalFields}`);
    console.log(`Matching Fields: ${report.matchingFields}`);
    console.log(`Mismatched Fields: ${report.mismatchedFields}`);
    console.log(`All Matching: ${report.allMatching ? '✅ YES' : '❌ NO'}\n`);

    if (report.errors.length > 0) {
      console.log('❌ ERRORS:');
      report.errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    }

    console.log('📋 FIELD COMPARISON:');
    console.log('Field                          | Env Value              | DB Value               | Match');
    console.log('-------------------------------|------------------------|------------------------|-------');
    
    report.results.forEach(result => {
      const status = result.matches ? '✅' : '❌';
      const envVal = result.envValue.padEnd(22);
      const dbVal = result.dbValue.padEnd(22);
      const field = result.field.padEnd(30);
      console.log(`${field} | ${envVal} | ${dbVal} | ${status}`);
    });

    if (!report.allMatching) {
      console.log('\n❌ MISMATCHED FIELDS:');
      report.results
        .filter(r => !r.matches)
        .forEach(r => {
          console.log(`   ${r.field}: ENV='${r.envValue}' != DB='${r.dbValue}'`);
        });
    }

    console.log('\n================================\n');
  }

  /**
   * Test all tenants in the database
   */
  static async validateAllTenants(): Promise<ComparisonReport[]> {
    try {
      const summaries = await TenantConfigManager.getTenantSummaries();
      const reports: ComparisonReport[] = [];

      console.log(`\n🔍 Validating ${summaries.length} tenant(s)...\n`);

      for (const summary of summaries) {
        const report = await this.validateCredentialValues(summary.id);
        reports.push(report);
        this.printValidationReport(report);
      }

      return reports;
    } catch (error) {
      console.error('Failed to validate all tenants:', error);
      return [];
    }
  }

  /**
   * Quick validation - just check if env and first tenant match
   */
  static async quickValidation(): Promise<boolean> {
    try {
      const summaries = await TenantConfigManager.getTenantSummaries();
      
      if (summaries.length === 0) {
        console.log('❌ No tenants found in database');
        return false;
      }

      const report = await this.validateCredentialValues(summaries[0].id);
      this.printValidationReport(report);
      
      return report.allMatching;
    } catch (error) {
      console.error('Quick validation failed:', error);
      return false;
    }
  }
}