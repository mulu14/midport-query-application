/**
 * @fileoverview API Gateway Entry Point for External Clients (GET-based)
 * @description Provides external API access to ION APIs using GET requests
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';
import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';
import { UnifiedAPIManager } from '@/lib/UnifiedAPIManager';
import type { APIRequestConfig } from '@/Entities/RemoteAPI';
import type { TenantConfig } from '@/Entities/TenantConfig';
import type { 
  TenantCredentials, 
  APIGatewayResponse 
} from '@/Entities/Gateway';

// ============================================================================
// All interfaces are imported from Entities/Gateway.ts
// This follows the codebase convention of defining all interfaces in Entities/
// ============================================================================

// ============================================================================
// Database Helper
// ============================================================================

/**
 * Retrieves tenant credentials from SQLite database
 * Reuses existing database pattern from lib/TenantConfigManager.ts
 */
function getTenantCredentials(tenantName: string): Promise<TenantCredentials | null> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(process.cwd(), 'midport.db');
    const db = new Database.Database(dbPath, Database.OPEN_READONLY, (err) => {
      if (err) {
        console.error('[API Gateway] Database connection error:', err);
        resolve(null);
        return;
      }
    });

    db.get(
      `SELECT * FROM credentials WHERE tenant_name = ? LIMIT 1`,
      [tenantName],
      (err, row: TenantCredentials | undefined) => {
        db.close();
        
        if (err) {
          console.error('[API Gateway] Database query error:', err);
          resolve(null);
          return;
        }
        
        resolve(row || null);
      }
    );
  });
}


/**
 * GET /api/gateway - API Gateway Entry Point
 * 
 * @description
 * External clients use GET requests to fetch data from ION APIs.
 * 
 * ============================================
 * SOAP API Examples (uses "List" action)
 * ============================================
 * 
 * Basic SOAP query:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap
 * 
 * SOAP with filters:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&Status=Open&Priority=High&limit=10
 * 
 * SOAP with custom action:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Customer_v1&apiType=soap&action=Read&CustomerID=12345
 * 
 * ============================================
 * REST/OData API Examples (no action needed)
 * ============================================
 * 
 * Basic REST query:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders
 * 
 * REST with filters:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&Country=Mexico&Status=Open
 * 
 * REST with expand (get related data):
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&expand=SoldToBPRef,LineRefs,ShipToBPRef
 * 
 * REST with select (specific fields):
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&select=OrderNumber,OrderDate,Country&limit=20
 * 
 * REST with orderby:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&orderby=OrderDate desc
 * 
 * REST with comparison operators:
 * GET /api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&OrderDate_gt=2024-01-01&Amount_le=10000
 * 
 * @param {string} tenant - Tenant ID or name (required)
 * @param {string} table - Table/Service name (required)
 * @param {string} apiType - 'soap' or 'rest' (optional, defaults to 'rest')
 * @param {string} service - OData service name (required for REST, e.g., 'tdapi.slsSalesOrder')
 * @param {string} entity - Entity name (required for REST, e.g., 'Orders')
 * @param {string} action - SOAP action (optional for SOAP, defaults to 'List'. Not used for REST)
 * @param {string} expand - Comma-separated expand fields for REST (optional)
 * @param {string} select - Comma-separated select fields for REST (optional)
 * @param {string} orderby - Order by clause for REST (optional)
 * @param {number} limit - Result limit (optional, defaults to 15)
 * @param {number} offset - Result offset for pagination (optional)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Extract required parameters
    const tenant = searchParams.get('tenant');
    const table = searchParams.get('table');
    // Default to 'rest' if apiType is not provided
    const apiType = searchParams.get('apiType') || searchParams.get('type') || 'rest';
    
    // Extract REST-specific parameters
    const oDataService = searchParams.get('service');
    const entityName = searchParams.get('entity');
    
    // Extract optional parameters
    const actionParam = searchParams.get('action');
    const expand = searchParams.get('expand');
    const select = searchParams.get('select');
    const orderby = searchParams.get('orderby');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // === PHASE 1: INPUT VALIDATION ===
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: tenant',
          hint: 'Example: ?tenant=MIDPORT_DEM',
        },
        { status: 400 }
      );
    }

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: table',
          hint: 'SOAP example: &table=ServiceCall_v2 | REST example: &table=Orders',
        },
        { status: 400 }
      );
    }

    if (!apiType || (apiType !== 'soap' && apiType !== 'rest')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing apiType parameter',
          hint: 'apiType must be either "soap" or "rest". Example: &apiType=rest',
        },
        { status: 400 }
      );
    }

    // Validate REST-specific requirements
    if (apiType === 'rest' && (!oDataService || !entityName)) {
      return NextResponse.json(
        {
          success: false,
          error: 'REST queries require "service" and "entity" parameters',
          hint: 'Example: &service=tdapi.slsSalesOrder&entity=Orders',
        },
        { status: 400 }
      );
    }

    // === PHASE 2: DETERMINE ACTION BASED ON API TYPE ===
    let action: string;
    
    if (apiType === 'soap') {
      // SOAP: Use action parameter or default to "List"
      action = actionParam || 'List';
    } else {
      // REST: No action needed (it's just a GET operation)
      // We use "List" internally for consistency but REST doesn't use it in the API call
      action = 'List';
    }

    // === PHASE 3: EXTRACT FILTER PARAMETERS ===
    const reservedParams = ['tenant', 'table', 'apiType', 'service', 'entity', 'action', 'expand', 'select', 'orderby', 'limit', 'offset'];
    const parameters: Record<string, any> = {};

    searchParams.forEach((value, key) => {
      if (!reservedParams.includes(key)) {
        // Handle operator suffixes (e.g., OrderDate_gt for "greater than")
        if (key.endsWith('_gt') || key.endsWith('_lt') || key.endsWith('_ge') || key.endsWith('_le') || key.endsWith('_ne')) {
          const operator = key.slice(-3);
          const fieldName = key.slice(0, -3);
          parameters[fieldName] = value;
          parameters[`${fieldName}_operator`] = operator.substring(1); // Remove underscore (gt, lt, etc.)
        } else {
          parameters[key] = value;
        }
      }
    });

    // Add REST-specific parameters
    if (apiType === 'rest') {
      if (expand) {
        parameters.expand = expand.split(',').map(f => f.trim());
      }
      if (select) {
        parameters.select = select.split(',').map(f => f.trim());
      }
      if (orderby) {
        parameters.orderby = orderby.split(',').map(f => f.trim());
      }
    }
    
    // Add common parameters
    if (limit) {
      parameters.limit = parseInt(limit);
    }
    if (offset) {
      parameters.offset = parseInt(offset);
    }

    // === PHASE 4: TENANT RESOLUTION (Direct Database Access) ===
    console.log(`[API Gateway] Resolving tenant from database: ${tenant}`);
    
    const credentials = await getTenantCredentials(tenant);

    if (!credentials) {
      return NextResponse.json(
        {
          success: false,
          error: `Tenant not found: ${tenant}`,
          hint: 'Check available tenants: GET /api/tenants',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    console.log(`[API Gateway] Tenant resolved: ${credentials.tenant_name}`);

    // Get tenant config for additional metadata if needed
    let tenantConfig = await TenantConfigManager.getTenantByName(credentials.tenant_name);
    if (!tenantConfig) {
      console.warn(`[API Gateway] Tenant config not found in TenantConfigManager, using database credentials only`);
    }

    // === PHASE 5: AUTHENTICATION ===
    console.log(`[API Gateway] Obtaining OAuth2 token`);
    
    const token = await OAuth2ConfigManager.getValidTokenForTenant(tenantConfig.id);

    if (!token || !token.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to obtain OAuth2 token',
        },
        { status: 401 }
      );
    }

    console.log(`[API Gateway] OAuth2 token obtained`);

    // === PHASE 6: REQUEST EXECUTION ===
    console.log(`[API Gateway] Executing ${apiType.toUpperCase()} query: ${table}${apiType === 'soap' ? ` (action: ${action})` : ''}`);
    
    const apiConfig: APIRequestConfig = {
      tenant: tenantConfig.tenantName,
      table: table,
      action: action,
      apiType: apiType as 'soap' | 'rest',
      parameters: parameters,
      oDataService: oDataService || undefined,
      entityName: entityName || undefined,
      company: tenantConfig.ionConfig.lnCompany,
      sqlQuery: apiType === 'soap' ? `${action} ${table}` : `GET ${table}`,
    };

    const result = await UnifiedAPIManager.executeQueryWithOAuth2(
      apiConfig,
      '',
      '',
      token
    );

    // === PHASE 7: RESPONSE FORMATTING ===
    const executionTime = Date.now() - startTime;

    console.log(`[API Gateway] Query completed in ${executionTime}ms`);

    const response: APIGatewayResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      tenant: credentials.tenant_name,
      apiType: apiType as APIType,
      data: result.data,
      metadata: {
        recordCount: Array.isArray(result.data) 
          ? result.data.length 
          : (result.data?.value?.length || result.data?.recordCount || 0),
        executionTimeMs: executionTime,
        table: table,
        action: apiType === 'soap' ? action : undefined,
        service: oDataService || undefined,
        entity: entityName || undefined,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error(`[API Gateway] Error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime,
    });

    const response: APIGatewayResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      tenant: 'unknown',
      apiType: 'rest' as APIType,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      metadata: {
        executionTimeMs: executionTime,
      },
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// ============================================================================
// Health Check Endpoint
// ============================================================================

/**
 * HEAD /api/gateway
 * 
 * Health check endpoint for API Gateway
 * Returns gateway status and version information
 */
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'X-Gateway-Status': 'healthy',
      'X-Gateway-Version': '1.0.0',
      'X-Powered-By': 'Midport API Gateway',
    },
  });
}
