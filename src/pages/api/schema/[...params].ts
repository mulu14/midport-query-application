/**
 * @fileoverview Schema Metadata Extraction API Endpoint
 * Provides DESCRIBE table functionality for remote APIs
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { RemoteAPIManager } from '@/lib/RemoteAPIManager';
import { SchemaExtractor, TableSchema } from '@/lib/utils/SchemaExtractor';
import { TenantConfigManager } from '@/lib/TenantConfigManager';

export interface SchemaResponse {
  success: boolean;
  schema?: TableSchema;
  describeOutput?: string;
  error?: string;
  serviceName?: string;
  timestamp?: string;
}

/**
 * Schema extraction API endpoint
 * GET /api/schema/[tenant]/[service]/describe - Get schema metadata
 * GET /api/schema/[tenant]/[service]/json - Get schema as JSON
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<SchemaResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { params } = req.query;

    if (!Array.isArray(params) || params.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid parameters. Expected: /api/schema/[tenant]/[service]/describe|json'
      });
    }

    const [tenantId, serviceName, format] = params;

    if (!tenantId || !serviceName || !['describe', 'json'].includes(format)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid parameters. Format must be "describe" or "json"'
      });
    }

    console.log('🔍 SCHEMA EXTRACTION REQUEST:', { tenantId, serviceName, format });

    // Load tenant configuration
    const tenantConfigManager = new TenantConfigManager(tenantId);
    const isValidTenant = await tenantConfigManager.validateTenant();

    if (!isValidTenant) {
      return res.status(404).json({ 
        success: false, 
        error: `Tenant "${tenantId}" not found or invalid configuration`
      });
    }

    // Initialize Remote API Manager
    const remoteApiManager = new RemoteAPIManager(tenantId);

    // Fetch a sample response to analyze schema
    // We'll make a minimal query to get the structure
    const sampleQuery = req.query.sample_query as string || 'SELECT TOP 1 * FROM ' + serviceName;
    
    console.log('📡 Making sample query for schema analysis:', sampleQuery);
    
    const result = await remoteApiManager.executeQuery(
      serviceName,
      sampleQuery,
      { 
        maxRecords: 1, // Only need one record to analyze schema
        includeRawResponse: true
      }
    );

    if (!result.success || !result.rawResponse) {
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to fetch sample data for schema analysis'
      });
    }

    // Extract schema metadata with additional context
    const schema = SchemaExtractor.extractSchema(result, serviceName, tenantId, sampleQuery);

    console.log('✅ Schema extracted successfully:', {
      tableName: schema.tableName,
      serviceType: schema.serviceType,
      totalFields: schema.totalFields,
      extractedAt: schema.extractedAt
    });

    const response: SchemaResponse = {
      success: true,
      schema,
      serviceName,
      timestamp: new Date().toISOString()
    };

    if (format === 'describe') {
      response.describeOutput = SchemaExtractor.generateDescribeTable(schema);
      // Set content type to plain text for describe format
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(response.describeOutput);
    } else if (format === 'json') {
      response.schema = schema;
      return res.status(200).json(response);
    }

  } catch (error) {
    console.error('❌ Schema extraction failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during schema extraction'
    });
  }
}

/**
 * Enhanced schema extraction with caching support
 */
export async function extractSchemaWithCache(
  tenantId: string,
  serviceName: string,
  cacheSeconds = 300 // 5 minutes default
): Promise<{ success: boolean; schema?: TableSchema; error?: string }> {
  
  const cacheKey = `schema_${tenantId}_${serviceName}`;
  
  try {
    // TODO: Implement Redis/memory cache here if needed
    // For now, always fetch fresh schema
    
    const remoteApiManager = new RemoteAPIManager(tenantId);
    
    // Use a very lightweight query to get minimal data for schema analysis
    const minimalQuery = `SELECT TOP 1 * FROM ${serviceName}`;
    
    const result = await remoteApiManager.executeQuery(
      serviceName,
      minimalQuery,
      { 
        maxRecords: 1,
        includeRawResponse: true
      }
    );

    if (!result.success || !result.rawResponse) {
      return { 
        success: false, 
        error: result.error || 'Failed to fetch sample data for schema analysis'
      };
    }

    const schema = SchemaExtractor.extractSchema(result, serviceName, tenantId, minimalQuery);
    
    // TODO: Cache the result here if implementing caching
    
    return { success: true, schema };
    
  } catch (error) {
    console.error('❌ Enhanced schema extraction failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during schema extraction'
    };
  }
}