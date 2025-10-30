/**
 * @fileoverview API routes for remote database management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';
import { RemoteAPIManager } from '@/lib/RemoteAPIManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';
import type { SOAPRequestConfig, StoredOAuth2Token } from '@/Entities/RemoteAPI';

/**
 * GET endpoint to fetch all remote API databases
 * Retrieves all configured remote API databases from SQLite with their associated tables
 * 
 * @async
 * @function GET
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {Object[]} databases - Array of database objects
 * @returns {string} databases[].id - Database ID
 * @returns {string} databases[].name - Display name
 * @returns {string} databases[].fullUrl - Complete API URL
 * @returns {string} databases[].tenantName - Tenant identifier
 * @returns {Object[]} databases[].tables - Array of table objects
 * @returns {string} databases[].status - Connection status
 * @returns {Date} databases[].createdAt - Creation timestamp
 * 
 * @throws {NextResponse} 500 - Internal server error if database fetch fails
 * 
 * @example
 * ```http
 * GET /api/remote-databases
 * 
 * Response:
 * [
 *   {
 *     "id": "1",
 *     "name": "MIDPORT_DEM",
 *     "fullUrl": "https://api.example.com/tenant/services",
 *     "tenantName": "MIDPORT_DEM",
 *     "tables": [{"name": "ServiceCall_v2", "endpoint": "ServiceCall_v2"}],
 *     "status": "active"
 *   }
 * ]
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { auth } = await import('@/app/auth');
    const session = await auth();
    
    // Get all databases
    const databases = await SQLiteManager.getRemoteAPIDatabases();
    
    // Filter by user's tenant if logged in
    if (session?.user?.tenant) {
      const userRoles = session.user.roles || [];
      const isSuperAdmin = userRoles.includes('superadmin');
      
      // Superadmin can see all tenants
      if (isSuperAdmin) {
        return NextResponse.json(databases);
      }
      
      // All other users (including admin) can only see their own tenant
      const userTenant = session.user.tenant;
      const filteredDatabases = databases.filter((db: any) => db.tenantName === userTenant);
      return NextResponse.json(filteredDatabases);
    }
    
    // If no session, return empty array (no databases visible)
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch remote API databases' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new remote API database
 * Creates a new remote API database configuration in SQLite with validation
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - HTTP request containing database configuration
 * @param {Object} request.body - Request body with database data
 * @param {string} request.body.name - Display name for the database
 * @param {string} request.body.tenantName - Unique tenant identifier
 * @param {string} request.body.baseUrl - Base API URL
 * @param {string} request.body.services - Services path
 * @param {string[]} request.body.tables - Array of table/service names
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {string} id - Generated database ID
 * @returns {string} name - Database display name
 * @returns {string} tenantName - Tenant identifier
 * @returns {string} fullUrl - Complete constructed API URL
 * @returns {Object[]} tables - Array of created table objects
 * @returns {boolean} isExisting - Whether database already existed
 * @returns {string} message - Success message
 * 
 * @throws {NextResponse} 400 - Bad request if required fields are missing
 * @throws {NextResponse} 500 - Internal server error if database creation fails
 * 
 * @example
 * ```http
 * POST /api/remote-databases
 * Content-Type: application/json
 * 
 * {
 *   "name": "MIDPORT Production",
 *   "tenantName": "MIDPORT_PROD",
 *   "baseUrl": "https://api.example.com",
 *   "services": "LN/c4ws/services",
 *   "tables": ["ServiceCall_v2", "Customer_v1"]
 * }
 * 
 * Response:
 * {
 *   "id": "2",
 *   "name": "MIDPORT Production",
 *   "tenantName": "MIDPORT_PROD",
 *   "fullUrl": "https://api.example.com/MIDPORT_PROD/LN/c4ws/services",
 *   "tables": [...],
 *   "isExisting": false,
 *   "message": "Database created successfully"
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const { auth } = await import('@/app/auth');
    const session = await auth();
    
    // Check if user is logged in
    if (!session?.user?.tenant) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to create databases' },
        { status: 401 }
      );
    }
    
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.tenantName || !data.baseUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tenantName, baseUrl' },
        { status: 400 }
      );
    }
    
    // Check if user has admin or superadmin role
    const userRoles = session.user.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    const isAdmin = userRoles.includes('admin');
    
    // Only admin and superadmin can create databases
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can create databases' },
        { status: 403 }
      );
    }
    
    // Ensure user can only create databases for their own tenant (unless superadmin)
    if (!isSuperAdmin && data.tenantName !== session.user.tenant) {
      return NextResponse.json(
        { error: 'Forbidden: You can only create databases for your own tenant' },
        { status: 403 }
      );
    }

    const database = await SQLiteManager.createRemoteAPIDatabase(data);
    return NextResponse.json(database);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create remote API database', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

