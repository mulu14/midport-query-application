/**
 * @fileoverview SQLite query execution API endpoint
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

/**
 * POST endpoint to execute SQL queries against local SQLite database
 * Supports both SELECT queries (read operations) and DML queries (INSERT, UPDATE, DELETE)
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - HTTP request containing SQL query
 * @param {Object} request.body - Request body
 * @param {string} request.body.query - SQL query string to execute
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {boolean} success - Whether query execution succeeded
 * @returns {Array} data - Query results (for SELECT) or execution status
 * 
 * @throws {NextResponse} 400 - Bad request if query is missing or invalid
 * @throws {NextResponse} 500 - Internal server error if query execution fails
 * 
 * @description
 * - SELECT queries: Returns array of matching records
 * - DML queries: Returns success confirmation
 * - Automatically detects query type and routes to appropriate SQLite method
 * 
 * @example
 * ```http
 * POST /api/sqlite/query
 * Content-Type: application/json
 * 
 * {
 *   "query": "SELECT * FROM customers WHERE status = 'active' LIMIT 10"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {"id": 1, "name": "John Doe", "email": "john@example.com"},
 *     {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
 *   ]
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    // Validate query parameter
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 });
    }

    // Determine query type (SELECT vs other operations)
    const queryUpper = query.trim().toUpperCase();

    if (queryUpper.startsWith('SELECT')) {
      // Execute SELECT query using apiGet method
      const results = await SQLiteManager['apiGet'](query);
      return NextResponse.json({
        success: true,
        data: results
      });
    } else {
      // Execute DML operations (INSERT, UPDATE, DELETE) using apiPost method
      await SQLiteManager['apiPost'](query);
      return NextResponse.json({
        success: true,
        data: [{ message: 'Query executed successfully', operation: 'completed' }]
      });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
