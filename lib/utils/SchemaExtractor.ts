/**
 * @fileoverview Schema Metadata Extractor for SOAP and REST API responses
 * Extract table structure, field names, and field types without data
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { RemoteAPIQueryResult } from '@/Entities/RemoteAPI';

/**
 * Field schema information
 */
export interface FieldSchema {
  fieldName: string;
  dataType: string;
  isNullable: boolean;
  maxLength?: number;
  isPrimaryKey?: boolean;
  description?: string;
}

/**
 * Response metadata information
 */
export interface ResponseMetadata {
  requestUrl?: string;
  requestMethod?: string;
  responseTime?: number;
  responseSize?: number;
  contentType?: string;
  statusCode?: number;
  cacheInfo?: string;
  lastModified?: string;
  etag?: string;
  recordCount?: number;
  totalAvailable?: number;
  queryUsed?: string;
}

/**
 * Table schema metadata
 */
export interface TableSchema {
  tableName: string;
  serviceType: 'SOAP' | 'REST' | 'OData';
  fields: FieldSchema[];
  totalFields: number;
  namespace?: string;
  odataEntitySet?: string;
  apiVersion?: string;
  metadata?: ResponseMetadata;
  extractedAt?: string;
  tenantId?: string;
}

/**
 * Schema Metadata Extractor
 */
export class SchemaExtractor {

  /**
   * Extract schema metadata from API response
   */
  static extractSchema(result: RemoteAPIQueryResult, serviceName: string, tenantId?: string, queryUsed?: string): TableSchema {
    console.log('🗂️ EXTRACTING SCHEMA METADATA for:', serviceName);

    const startTime = Date.now();
    let schema: TableSchema;

    if (result.rawResponse?.includes('<?xml') || result.rawResponse?.includes('<soap:')) {
      schema = this.extractSOAPSchema(result, serviceName);
    } else if (result.rawResponse?.startsWith('{')) {
      schema = this.extractRESTSchema(result, serviceName);
    } else {
      schema = this.createEmptySchema(serviceName, 'UNKNOWN');
    }

    // Add metadata information
    const responseSize = result.rawResponse ? new Blob([result.rawResponse]).size : 0;
    schema.metadata = {
      responseTime: Date.now() - startTime,
      responseSize,
      contentType: schema.serviceType === 'SOAP' ? 'application/soap+xml' : 'application/json',
      recordCount: result.records?.length || 0,
      queryUsed: queryUsed || 'Not specified'
    };
    
    schema.extractedAt = new Date().toISOString();
    schema.tenantId = tenantId;

    return schema;
  }

  /**
   * Extract schema from SOAP XML response
   */
  private static extractSOAPSchema(result: RemoteAPIQueryResult, serviceName: string): TableSchema {
    console.log('🧼 Extracting SOAP Schema for:', serviceName);
    
    const schema: TableSchema = {
      tableName: serviceName,
      serviceType: 'SOAP',
      fields: [],
      totalFields: 0,
      namespace: undefined
    };

    try {
      if (!result.rawResponse) return schema;

      // Extract namespace
      const namespaceMatch = result.rawResponse.match(/xmlns:vrt="([^"]*)"/) || 
                           result.rawResponse.match(/xmlns="([^"]*businessinterface[^"]*)"/) ||
                           result.rawResponse.match(/xmlns[^=]*="([^"]*infor[^"]*)"/) ;
      if (namespaceMatch) {
        schema.namespace = namespaceMatch[1];
      }

      // Look for service-specific elements to understand structure
      const servicePattern = new RegExp(`<${serviceName}[^>]*>([\\s\\S]*?)<\\/${serviceName}>`, 'g');
      let serviceMatch = servicePattern.exec(result.rawResponse);

      if (!serviceMatch) {
        // Try to find any repeating element pattern
        const genericPattern = /<(\w+)>[\s\S]*?<\/\1>/g;
        const elements = new Set<string>();
        let match;
        
        while ((match = genericPattern.exec(result.rawResponse)) !== null) {
          if (!['soap', 'Envelope', 'Header', 'Body', 'DataArea', 'ControlArea'].includes(match[1])) {
            elements.add(match[1]);
          }
        }

        if (elements.size > 0) {
          const firstElement = Array.from(elements)[0];
          const elementPattern = new RegExp(`<${firstElement}[^>]*>([\\s\\S]*?)<\\/${firstElement}>`, 'g');
          serviceMatch = elementPattern.exec(result.rawResponse);
        }
      }

      if (serviceMatch) {
        const serviceContent = serviceMatch[1];
        
        // Extract field patterns - look for element declarations
        const fieldPattern = /<(\w+)[^>]*>([^<]*|<[^>]*\/>)<\/\1>/g;
        const fieldMap = new Map<string, Set<string>>();
        let fieldMatch;

        while ((fieldMatch = fieldPattern.exec(serviceContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldContent = fieldMatch[2];

          if (!fieldMap.has(fieldName)) {
            fieldMap.set(fieldName, new Set());
          }

          // Analyze field content to determine type
          if (fieldContent === '' || fieldContent.includes('xsi:nil')) {
            fieldMap.get(fieldName)?.add('nullable');
          } else if (fieldContent.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            fieldMap.get(fieldName)?.add('datetime');
          } else if (fieldContent.match(/^\d{4}-\d{2}-\d{2}$/)) {
            fieldMap.get(fieldName)?.add('date');
          } else if (fieldContent.match(/^[\d.-]+$/)) {
            fieldMap.get(fieldName)?.add('numeric');
          } else if (fieldContent === 'true' || fieldContent === 'false') {
            fieldMap.get(fieldName)?.add('boolean');
          } else {
            fieldMap.get(fieldName)?.add('string');
          }
        }

        // Convert to FieldSchema array
        for (const [fieldName, types] of fieldMap) {
          const typeArray = Array.from(types);
          const isNullable = typeArray.includes('nullable');
          const dataType = typeArray.find(t => t !== 'nullable') || 'string';

          schema.fields.push({
            fieldName,
            dataType,
            isNullable,
            isPrimaryKey: fieldName.toLowerCase().includes('id') && fieldName.toLowerCase() !== 'id'
          });
        }
      }

      schema.totalFields = schema.fields.length;

      console.log('📋 SOAP SCHEMA EXTRACTED:', {
        tableName: schema.tableName,
        totalFields: schema.totalFields,
        fieldNames: schema.fields.map(f => f.fieldName),
        namespace: schema.namespace
      });

      return schema;

    } catch (error) {
      console.error('❌ SOAP Schema extraction failed:', error);
      return schema;
    }
  }

  /**
   * Extract schema from REST/OData JSON response while preserving natural data structure
   */
  private static extractRESTSchema(result: RemoteAPIQueryResult, serviceName: string): TableSchema {
    console.log('🌐 Extracting REST/OData Schema for:', serviceName);

    const schema: TableSchema = {
      tableName: serviceName,
      serviceType: 'REST',
      fields: [],
      totalFields: 0
    };

    try {
      if (!result.rawResponse) return schema;

      const jsonData = JSON.parse(result.rawResponse);

      // Extract OData context information
      if (jsonData['@odata.context']) {
        schema.odataEntitySet = jsonData['@odata.context'];
        // Try to extract service version or API info from context
        const contextMatch = jsonData['@odata.context'].match(/([^/]+)\/\$metadata#(.+)/);
        if (contextMatch) {
          schema.apiVersion = contextMatch[1];
          schema.tableName = contextMatch[2].replace(/\([^)]*\)/, ''); // Remove OData filters
        }
      }

      // Look for metadata URL or try to infer from $metadata
      if (jsonData['@odata.context'] && jsonData['@odata.context'].includes('$metadata')) {
        const metadataUrl = jsonData['@odata.context'].split('#')[0];
        console.log('🔗 OData Metadata URL available:', metadataUrl);
      }

      let sampleRecords: any[] = [];

      // Get sample data to infer schema
      if (Array.isArray(jsonData.value)) {
        sampleRecords = jsonData.value.slice(0, 5); // Take first 5 records for analysis
      } else if (jsonData && typeof jsonData === 'object' && !jsonData.error && !jsonData['@odata.context']) {
        sampleRecords = [jsonData];
      }

      if (sampleRecords.length > 0) {
        const fieldMap = new Map<string, Set<string>>();

        // Analyze sample records to infer field types (preserving natural structure)
        sampleRecords.forEach(record => {
          this.analyzeObjectFields(record, fieldMap);
        });

        // Convert to FieldSchema array
        for (const [fieldName, types] of fieldMap) {
          if (fieldName.endsWith('_maxLength')) continue; // Skip max length tracking fields
          
          const typeArray = Array.from(types);
          const isNullable = typeArray.includes('nullable');
          const dataType = typeArray.find(t => t !== 'nullable') || 'string';
          const maxLengthSet = fieldMap.get(fieldName + '_maxLength');
          const maxLength = maxLengthSet ? Number(Array.from(maxLengthSet)[0]) : undefined;

          schema.fields.push({
            fieldName,
            dataType,
            isNullable,
            maxLength: maxLength && maxLength > 0 ? maxLength : undefined,
            isPrimaryKey: fieldName.toLowerCase() === 'id' || 
                         fieldName.toLowerCase().endsWith('id') ||
                         fieldName.toLowerCase().includes('key')
          });
        }
      }

      // Keep fields in their natural order as they appear in the response
      // No sorting to preserve the original response structure

      schema.totalFields = schema.fields.length;

      console.log('📋 REST/OData SCHEMA EXTRACTED:', {
        tableName: schema.tableName,
        totalFields: schema.totalFields,
        primitiveFields: schema.fields.filter(f => !['object', 'array'].includes(f.dataType)).length,
        complexFields: schema.fields.filter(f => ['object', 'array'].includes(f.dataType)).length,
        odataEntitySet: schema.odataEntitySet,
        sampleRecordCount: sampleRecords.length,
        fieldNames: schema.fields.map(f => `${f.fieldName} (${f.dataType})`).slice(0, 10),
        complexFieldsFound: schema.fields.filter(f => ['object', 'array'].includes(f.dataType)).map(f => f.fieldName)
      });

      return schema;

    } catch (error) {
      console.error('❌ REST Schema extraction failed:', error);
      return schema;
    }
  }

  /**
   * Analyze object fields recursively to extract complete schema structure
   * @private
   * @static
   * @param obj - The object to analyze
   * @param fieldMap - Map to store field type information
   * @param pathPrefix - Current path prefix for nested fields
   * @param maxDepth - Maximum recursion depth to prevent infinite loops
   * @param currentDepth - Current recursion depth
   */
  private static analyzeObjectFields(
    obj: any, 
    fieldMap: Map<string, Set<string>>, 
    pathPrefix: string = '', 
    maxDepth: number = 10, 
    currentDepth: number = 0
  ): void {
    // Prevent infinite recursion
    if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
      return;
    }

    Object.keys(obj).forEach(fieldName => {
      // Skip metadata fields that start with @ symbol
      if (fieldName.startsWith('@')) return;

      const fullFieldName = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;
      const value = obj[fieldName];
      
      // Initialize field in map if not exists
      if (!fieldMap.has(fullFieldName)) {
        fieldMap.set(fullFieldName, new Set());
      }
      
      // Analyze value type and add to field map
      this.analyzeValueType(value, fullFieldName, fieldMap, pathPrefix, maxDepth, currentDepth);
    });
  }

  /**
   * Analyze individual value type and handle recursion for complex types
   * @private
   * @static
   */
  private static analyzeValueType(
    value: any, 
    fullFieldName: string, 
    fieldMap: Map<string, Set<string>>, 
    pathPrefix: string, 
    maxDepth: number, 
    currentDepth: number
  ): void {
    if (value === null || value === undefined) {
      fieldMap.get(fullFieldName)?.add('nullable');
    } else if (typeof value === 'boolean') {
      fieldMap.get(fullFieldName)?.add('boolean');
    } else if (typeof value === 'number') {
      fieldMap.get(fullFieldName)?.add(Number.isInteger(value) ? 'integer' : 'decimal');
    } else if (typeof value === 'string') {
      this.analyzeStringValue(value, fullFieldName, fieldMap);
    } else if (Array.isArray(value)) {
      this.analyzeArrayValue(value, fullFieldName, fieldMap, maxDepth, currentDepth);
    } else if (typeof value === 'object' && value !== null) {
      this.analyzeObjectValue(value, fullFieldName, fieldMap, maxDepth, currentDepth);
    }
  }

  /**
   * Analyze string value to determine specific type (date, numeric, etc.)
   * @private
   * @static
   */
  private static analyzeStringValue(value: string, fullFieldName: string, fieldMap: Map<string, Set<string>>): void {
    // Check for ISO datetime pattern
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      fieldMap.get(fullFieldName)?.add('datetime');
    }
    // Check for date pattern
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      fieldMap.get(fullFieldName)?.add('date');
    }
    // Check for numeric string
    else if (/^[\d.-]+$/.test(value) && !isNaN(Number(value))) {
      fieldMap.get(fullFieldName)?.add('numeric');
    }
    // Default to string
    else {
      fieldMap.get(fullFieldName)?.add('string');
      
      // Track max length for strings
      const maxLengthKey = fullFieldName + '_maxLength';
      const currentMax = fieldMap.get(maxLengthKey) || new Set(['0']);
      const currentMaxValue = Math.max(Number(Array.from(currentMax)[0] || '0'), value.length);
      currentMax.clear();
      currentMax.add(String(currentMaxValue));
      fieldMap.set(maxLengthKey, currentMax);
    }
  }

  /**
   * Analyze array value and its items
   * @private
   * @static
   */
  private static analyzeArrayValue(
    value: any[], 
    fullFieldName: string, 
    fieldMap: Map<string, Set<string>>, 
    maxDepth: number, 
    currentDepth: number
  ): void {
    fieldMap.get(fullFieldName)?.add('array');
    
    // Analyze array items if not empty
    if (value.length > 0 && currentDepth < maxDepth) {
      // Sample a few items from the array to understand structure
      const sampleSize = Math.min(value.length, 3);
      const sampleItems = value.slice(0, sampleSize);
      
      // Just analyze the first item to understand the structure
      const firstItem = sampleItems[0];
      if (firstItem !== null && firstItem !== undefined) {
        if (typeof firstItem === 'object' && !Array.isArray(firstItem)) {
          // For object items, analyze their structure using the array field name as prefix
          this.analyzeObjectFields(firstItem, fieldMap, fullFieldName, maxDepth, currentDepth + 1);
        } else {
          // For primitive array items, the array itself describes the type
          // No need to create additional entries
        }
      }
    }
  }

  /**
   * Analyze object value and its properties
   * @private
   * @static
   */
  private static analyzeObjectValue(
    value: any, 
    fullFieldName: string, 
    fieldMap: Map<string, Set<string>>, 
    maxDepth: number, 
    currentDepth: number
  ): void {
    fieldMap.get(fullFieldName)?.add('object');
    
    // Recursively analyze nested object properties
    if (currentDepth < maxDepth) {
      this.analyzeObjectFields(value, fieldMap, fullFieldName, maxDepth, currentDepth + 1);
    }
  }

  /**
   * Create empty schema template
   */
  private static createEmptySchema(serviceName: string, serviceType: 'SOAP' | 'REST' | 'UNKNOWN'): TableSchema {
    return {
      tableName: serviceName,
      serviceType: serviceType as any,
      fields: [],
      totalFields: 0
    };
  }

  /**
   * Generate SQL-like DESCRIBE output with collapsible metadata
   */
  static generateDescribeTable(schema: TableSchema, showMetadata = true): string {
    const lines: string[] = [];
    
    // Metadata section (collapsible)
    if (showMetadata && schema.metadata) {
      lines.push(`\n📋 METADATA (${schema.tableName})`);
      lines.push('┌─────────────────────────┬─────────────────────────────────────────────────────┐');
      lines.push('│ Property                │ Value                                                   │');
      lines.push('├─────────────────────────┼─────────────────────────────────────────────────────┤');
      
      if (schema.tenantId) {
        lines.push(`│ Tenant ID               │ ${schema.tenantId.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.extractedAt) {
        lines.push(`│ Extracted At            │ ${schema.extractedAt.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.metadata.queryUsed) {
        const query = schema.metadata.queryUsed.length > 50 ? 
          schema.metadata.queryUsed.substring(0, 50) + '...' : schema.metadata.queryUsed;
        lines.push(`│ Query Used              │ ${query.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.metadata.responseTime !== undefined) {
        lines.push(`│ Response Time           │ ${(schema.metadata.responseTime + 'ms').padEnd(55).substring(0, 55)} │`);
      }
      if (schema.metadata.responseSize !== undefined) {
        const sizeStr = schema.metadata.responseSize < 1024 ? 
          `${schema.metadata.responseSize} bytes` :
          `${(schema.metadata.responseSize / 1024).toFixed(2)} KB`;
        lines.push(`│ Response Size           │ ${sizeStr.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.metadata.recordCount !== undefined) {
        lines.push(`│ Sample Records          │ ${(schema.metadata.recordCount.toString()).padEnd(55).substring(0, 55)} │`);
      }
      if (schema.metadata.contentType) {
        lines.push(`│ Content Type            │ ${schema.metadata.contentType.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.namespace) {
        const ns = schema.namespace.length > 50 ? schema.namespace.substring(0, 50) + '...' : schema.namespace;
        lines.push(`│ Namespace               │ ${ns.padEnd(55).substring(0, 55)} │`);
      }
      if (schema.odataEntitySet) {
        const entity = schema.odataEntitySet.length > 50 ? schema.odataEntitySet.substring(0, 50) + '...' : schema.odataEntitySet;
        lines.push(`│ OData Entity Set        │ ${entity.padEnd(55).substring(0, 55)} │`);
      }
      
      lines.push('└─────────────────────────┴─────────────────────────────────────────────────────┘');
      lines.push('');
    }
    
    // Schema table section
    lines.push(`📊 DESCRIBE ${schema.tableName} (${schema.serviceType})`);
    lines.push('┌─────────────────────────┬──────────────┬──────────┬─────────────┬─────────────┐');
    lines.push('│ Field                   │ Type         │ Null     │ Key         │ Max Length  │');
    lines.push('├─────────────────────────┼──────────────┼──────────┼─────────────┼─────────────┤');

    if (schema.fields.length === 0) {
      lines.push('│ No fields detected      │              │          │             │             │');
    } else {
      schema.fields.forEach(field => {
        const fieldName = field.fieldName.padEnd(23).substring(0, 23);
        const dataType = field.dataType.padEnd(12).substring(0, 12);
        const nullable = (field.isNullable ? 'YES' : 'NO').padEnd(8);
        const key = (field.isPrimaryKey ? 'PRI' : '').padEnd(11);
        const maxLen = (field.maxLength?.toString() || '').padEnd(11);
        
        lines.push(`│ ${fieldName} │ ${dataType} │ ${nullable} │ ${key} │ ${maxLen} │`);
      });
    }

    lines.push('└─────────────────────────┴──────────────┴──────────┴─────────────┴─────────────┘');
    lines.push(`Total Fields: ${schema.totalFields}`);

    return lines.join('\n');
  }

  /**
   * Generate collapsible metadata section for web display
   */
  static generateMetadataHTML(schema: TableSchema): string {
    if (!schema.metadata) return '';

    const metadata = schema.metadata;
    let html = '<details class="schema-metadata">';
    html += '<summary><strong>🔍 Request & Response Metadata</strong> (click to expand)</summary>';
    html += '<div class="metadata-content">';
    
    if (schema.tenantId) {
      html += `<p><strong>Tenant:</strong> ${schema.tenantId}</p>`;
    }
    if (schema.extractedAt) {
      html += `<p><strong>Extracted:</strong> ${new Date(schema.extractedAt).toLocaleString()}</p>`;
    }
    if (metadata.queryUsed) {
      html += `<p><strong>Query:</strong> <code>${metadata.queryUsed}</code></p>`;
    }
    if (metadata.responseTime !== undefined) {
      html += `<p><strong>Response Time:</strong> ${metadata.responseTime}ms</p>`;
    }
    if (metadata.responseSize !== undefined) {
      const sizeStr = metadata.responseSize < 1024 ? 
        `${metadata.responseSize} bytes` :
        `${(metadata.responseSize / 1024).toFixed(2)} KB`;
      html += `<p><strong>Response Size:</strong> ${sizeStr}</p>`;
    }
    if (metadata.recordCount !== undefined) {
      html += `<p><strong>Sample Records:</strong> ${metadata.recordCount}</p>`;
    }
    if (metadata.contentType) {
      html += `<p><strong>Content Type:</strong> ${metadata.contentType}</p>`;
    }
    if (schema.namespace) {
      html += `<p><strong>Namespace:</strong> <code>${schema.namespace}</code></p>`;
    }
    if (schema.odataEntitySet) {
      html += `<p><strong>OData Entity:</strong> <code>${schema.odataEntitySet}</code></p>`;
    }

    html += '</div></details>';
    return html;
  }

  /**
   * Export schema as JSON
   */
  static exportSchemaJSON(schema: TableSchema): string {
    return JSON.stringify(schema, null, 2);
  }
}