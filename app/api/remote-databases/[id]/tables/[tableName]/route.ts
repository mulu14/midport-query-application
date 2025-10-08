/**
 * @fileoverview API endpoints for managing individual tables within remote databases
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

/**
 * PUT endpoint to update a table/service name within a remote database
 * Updates the table name while preserving all other properties
 * 
 * @async
 * @function PUT
 * @param {NextRequest} request - HTTP request containing table update data
 * @param {Object} request.body - Request body with update data
 * @param {string} request.body.name - New table name
 * @param {string} [request.body.apiType] - API type (soap/rest) for validation
 * @param {Object} params - Route parameters
 * @param {string} params.id - Database/tenant ID
 * @param {string} params.tableName - Current table name to update
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {boolean} success - Whether the update succeeded
 * @returns {string} [message] - Success message
 * @returns {string} [error] - Error message if operation failed
 * 
 * @throws {NextResponse} 400 - Bad request if required fields are missing
 * @throws {NextResponse} 404 - Not found if table doesn't exist
 * @throws {NextResponse} 500 - Internal server error if update fails
 * 
 * @example
 * ```http
 * PUT /api/remote-databases/1/tables/ServiceCall_v2
 * Content-Type: application/json
 * 
 * {
 *   "name": "ServiceCall_v3",
 *   "apiType": "soap"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Table updated successfully"
 * }
 * ```
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    console.log('PUT handler started');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body parsed:', requestBody);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { name, apiType } = requestBody;
    console.log('Extracted name:', name, 'apiType:', apiType);
    
    if (!name?.trim()) {
      console.log('Name validation failed');
      return NextResponse.json(
        { error: 'New table name is required' },
        { status: 400 }
      );
    }
    
    // Parse params
    let resolvedParams;
    try {
      resolvedParams = await params;
      console.log('Params resolved:', resolvedParams);
    } catch (paramsError) {
      console.error('Params parsing error:', paramsError);
      return NextResponse.json(
        { error: 'Invalid route parameters' },
        { status: 400 }
      );
    }
    
    const { id: tenantId, tableName: currentTableName } = resolvedParams;
    const decodedTableName = decodeURIComponent(currentTableName);
    console.log('Tenant ID:', tenantId, 'Current table name:', decodedTableName);
    
    // Get the current database with all tables to check if the table exists
    let database;
    try {
      database = await SQLiteManager.getRemoteAPIDatabaseById(tenantId);
      console.log('Database retrieved:', database ? 'found' : 'not found');
    } catch (dbError) {
      console.error('Database retrieval error:', dbError);
      return NextResponse.json(
        { error: 'Failed to retrieve database', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
    
    if (!database) {
      console.log('Database not found for tenant ID:', tenantId);
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    
    // Check if the table exists in the current database
    console.log('Available tables:', database.tables?.map((t: any) => t.name));
    const currentTable = database.tables.find((table: any) => table.name === decodedTableName);
    if (!currentTable) {
      console.log('Table not found:', decodedTableName);
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }
    
    // Check if new name already exists (if different from current)
    if (name !== decodedTableName) {
      const duplicateTable = database.tables.find((table: any) => table.name === name);
      if (duplicateTable) {
        console.log('Duplicate table name found:', name);
        return NextResponse.json(
          { error: 'A table with this name already exists in this tenant' },
          { status: 400 }
        );
      }
    }
    
    // Update the table name using the new public method
    try {
      console.log('Attempting to update table:', tenantId, decodedTableName, '->', name);
      await SQLiteManager.updateRemoteAPITable(tenantId, decodedTableName, name);
      console.log('Table update successful');
    } catch (updateError) {
      console.error('Table update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update table in database', details: updateError instanceof Error ? updateError.message : String(updateError) },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table updated successfully'
    });
    
  } catch (error) {
    console.error('PUT handler general error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update table', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove a table/service from a remote database
 * Permanently deletes the table record from the database
 * 
 * @async
 * @function DELETE
 * @param {NextRequest} request - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.id - Database/tenant ID
 * @param {string} params.tableName - Name of table to delete
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {boolean} success - Whether the deletion succeeded
 * @returns {string} [message] - Success message
 * @returns {string} [error] - Error message if operation failed
 * 
 * @throws {NextResponse} 404 - Not found if table doesn't exist
 * @throws {NextResponse} 500 - Internal server error if deletion fails
 * 
 * @example
 * ```http
 * DELETE /api/remote-databases/1/tables/ServiceCall_v2
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Table deleted successfully"
 * }
 * ```
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: tenantId, tableName: currentTableName } = await params;
    const decodedTableName = decodeURIComponent(currentTableName);
    
    // Get the current database to check if the table exists
    const database = await SQLiteManager.getRemoteAPIDatabaseById(tenantId);
    
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    
    // Check if the table exists in the current database
    const tableExists = database.tables.some((table: any) => table.name === decodedTableName);
    if (!tableExists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }
    
    // Delete the table using the new public method
    await SQLiteManager.deleteRemoteAPITable(tenantId, decodedTableName);
    
    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to delete table', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
