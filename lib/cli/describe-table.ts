#!/usr/bin/env ts-node

/**
 * @fileoverview CLI utility for describing table schemas
 * Usage: ts-node describe-table.ts [tenant] [service]
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { RemoteAPIManager } from '../RemoteAPIManager';
import { SchemaExtractor } from '../utils/SchemaExtractor';
import { TenantConfigManager } from '../TenantConfigManager';

interface CliOptions {
  tenant: string;
  service: string;
  format: 'table' | 'json' | 'csv';
  output?: string;
  query?: string;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  
  const options: CliOptions = {
    tenant: '',
    service: '',
    format: 'table',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-f':
      case '--format':
        options.format = args[++i] as 'table' | 'json' | 'csv';
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-q':
      case '--query':
        options.query = args[++i];
        break;
      default:
        if (!options.tenant) {
          options.tenant = arg;
        } else if (!options.service) {
          options.service = arg;
        }
        break;
    }
  }

  return options;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
🗂️  Midport Table Schema Descriptor

Usage: 
  ts-node describe-table.ts [tenant] [service] [options]

Arguments:
  tenant      Tenant identifier
  service     Service/table name to describe

Options:
  -f, --format   Output format: table, json, csv (default: table)
  -o, --output   Output file path (optional)
  -q, --query    Custom sample query (optional)
  -h, --help     Show this help message

Examples:
  # Describe a table in table format
  ts-node describe-table.ts contoso ItemMaster

  # Get schema as JSON
  ts-node describe-table.ts contoso ItemMaster --format json

  # Save to file
  ts-node describe-table.ts contoso ItemMaster --output schema.txt

  # Use custom query for schema analysis
  ts-node describe-table.ts contoso ItemMaster --query "SELECT * FROM ItemMaster WHERE ItemNumber LIKE 'A%'"

Supported Formats:
  table  - SQL-like DESCRIBE table output
  json   - JSON schema metadata
  csv    - Field definitions in CSV format
  `);
}

/**
 * Format schema as CSV
 */
function formatAsCSV(schema: any): string {
  const lines = ['Field,Type,Nullable,Key,MaxLength,Description'];
  
  schema.fields.forEach((field: any) => {
    const row = [
      field.fieldName,
      field.dataType,
      field.isNullable ? 'YES' : 'NO',
      field.isPrimaryKey ? 'PRI' : '',
      field.maxLength || '',
      field.description || ''
    ].map(val => `"${val}"`).join(',');
    
    lines.push(row);
  });

  return lines.join('\n');
}

/**
 * Write output to file or console
 */
function writeOutput(content: string, filePath?: string): void {
  if (filePath) {
    const fs = require('fs');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Schema written to: ${filePath}`);
  } else {
    console.log(content);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.tenant || !options.service) {
    console.error('❌ Error: Both tenant and service name are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    console.log(`🔍 Analyzing schema for ${options.tenant}/${options.service}...`);

    // Validate tenant
    const tenantConfigManager = new TenantConfigManager(options.tenant);
    const isValidTenant = await tenantConfigManager.validateTenant();

    if (!isValidTenant) {
      console.error(`❌ Error: Tenant "${options.tenant}" not found or invalid`);
      process.exit(1);
    }

    // Initialize API manager
    const apiManager = new RemoteAPIManager(options.tenant);

    // Prepare sample query
    const sampleQuery = options.query || `SELECT TOP 1 * FROM ${options.service}`;
    
    console.log(`📡 Executing sample query: ${sampleQuery}`);

    // Execute query to get sample data
    const result = await apiManager.executeQuery(
      options.service,
      sampleQuery,
      {
        maxRecords: 1,
        includeRawResponse: true
      }
    );

    if (!result.success || !result.rawResponse) {
      console.error(`❌ Error: ${result.error || 'Failed to fetch sample data'}`);
      process.exit(1);
    }

    // Extract schema with additional context
    const schema = SchemaExtractor.extractSchema(result, options.service, options.tenant, sampleQuery);

    console.log(`✅ Schema extracted: ${schema.totalFields} fields found`);

    // Format output based on requested format
    let output: string;

    switch (options.format) {
      case 'json':
        output = SchemaExtractor.exportSchemaJSON(schema);
        break;
      case 'csv':
        output = formatAsCSV(schema);
        break;
      case 'table':
      default:
        output = SchemaExtractor.generateDescribeTable(schema);
        break;
    }

    // Write output
    writeOutput(output, options.output);

    // Additional metadata
    if (!options.output && options.format === 'table') {
      console.log(`\n📊 Schema Summary:`);
      console.log(`   Service: ${schema.tableName}`);
      console.log(`   Type: ${schema.serviceType}`);
      console.log(`   Fields: ${schema.totalFields}`);
      if (schema.namespace) {
        console.log(`   Namespace: ${schema.namespace}`);
      }
      if (schema.odataEntitySet) {
        console.log(`   OData Entity: ${schema.odataEntitySet}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as describeTable, parseArgs, formatAsCSV };