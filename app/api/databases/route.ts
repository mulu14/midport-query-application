/**
 * @fileoverview API routes for local database management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

/**
 * GET endpoint to fetch all local databases
 * 
 * @description
 * Retrieves all configured local database connections from SQLite storage.
 * Returns database configurations with their associated tables and metadata.
 * 
 * @async
 * @function GET
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {DatabaseData[]} - Array of database configuration objects
 * @returns {string} return[].id - Unique database identifier
 * @returns {string} return[].name - Database display name
 * @returns {string} return[].type - Database type (postgresql, mysql, mongodb, etc.)
 * @returns {string} [return[].connection_string] - Database connection string
 * @returns {string} [return[].api_key] - API authentication key
 * @returns {string} return[].status - Connection status (connected, disconnected, error)
 * @returns {DatabaseTable[]} return[].tables - Array of table metadata
 * @returns {string} return[].created_at - Creation timestamp
 * @returns {string} return[].updated_at - Last update timestamp
 * 
 * @throws {NextResponse} 500 Internal Server Error - Database query failed
 * 
 * @example
 * ```typescript
 * // Response format
 * [
 *   {
 *     "id": "123-abc",
 *     "name": "Production DB",
 *     "type": "postgresql",
 *     "status": "connected",
 *     "tables": [{"name": "users", "record_count": 150}]
 *   }
 * ]
 * ```
 */
export async function GET() {
  try {
    const databases = await SQLiteManager.listDatabases();
    return NextResponse.json(databases);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch databases' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new local database configuration
 * 
 * @description
 * Creates a new local database configuration entry in SQLite storage.
 * If a database with the same name exists, returns the existing configuration.
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming HTTP request
 * 
 * @param {Object} request.body - Request body containing:
 * @param {string} request.body.name - Database display name (must be unique)
 * @param {'postgresql'|'mysql'|'mongodb'|'api'|'local'|'sqlitecloud'} request.body.type - Database type
 * @param {string} [request.body.connection_string] - Database connection string
 * @param {string} [request.body.api_key] - API authentication key
 * @param {DatabaseTable[]} [request.body.tables] - Array of table definitions
 * @param {'connected'|'disconnected'|'error'} [request.body.status='connected'] - Initial status
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {DatabaseData} - Created database configuration object
 * @returns {string} return.id - Generated unique identifier
 * @returns {string} return.name - Database display name
 * @returns {string} return.type - Database type
 * @returns {string} return.status - Connection status
 * @returns {DatabaseTable[]} return.tables - Associated tables
 * @returns {string} return.created_at - Creation timestamp
 * @returns {string} return.updated_at - Last update timestamp
 * 
 * @throws {NextResponse} 500 Internal Server Error - Database creation failed
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "name": "My PostgreSQL DB",
 *   "type": "postgresql",
 *   "connection_string": "postgresql://user:pass@localhost:5432/dbname",
 *   "tables": [{"name": "users", "record_count": 0}]
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const database = await SQLiteManager.createDatabase(data);
    return NextResponse.json(database);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create database' },
      { status: 500 }
    );
  }
}
