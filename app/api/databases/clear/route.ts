/**
 * @fileoverview Database initialization API endpoint
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

/**
 * POST endpoint to clear all databases and reinitialize with default data
 * Used for development and testing purposes to reset the database state
 * 
 * @async
 * @function POST
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {Array} databases - Array of newly created database objects
 * @returns {string} databases[].id - Database ID
 * @returns {string} databases[].name - Database display name
 * @returns {string} databases[].type - Database type ('local')
 * @returns {string} databases[].status - Connection status
 * @returns {Array} databases[].tables - Array of table objects
 * 
 * @throws {NextResponse} 500 - Internal server error if initialization fails
 * 
 * @description
 * ⚠️ **Destructive Operation**: This endpoint will permanently delete all existing database configurations.
 * It then creates two default databases:
 * - Production Database (with sample tables: Products, Customers, Orders)
 * - Development Database (with sample tables: Products, Customers, Orders)
 * 
 * @example
 * ```http
 * POST /api/databases/clear
 * 
 * Response:
 * [
 *   {
 *     "id": "123-abc",
 *     "name": "Production Database",
 *     "type": "local",
 *     "status": "connected",
 *     "tables": [
 *       {"name": "Products", "record_count": 5},
 *       {"name": "Customers", "record_count": 3},
 *       {"name": "Orders", "record_count": 7}
 *     ]
 *   },
 *   {
 *     "id": "456-def",
 *     "name": "Development Database",
 *     "type": "local",
 *     "status": "connected",
 *     "tables": [...]
 *   }
 * ]
 * ```
 */
export async function POST() {
  try {
    // Clear all existing database configurations
    await SQLiteManager.clearAllDatabases();

    // Create Production Database with sample data
    const prodDb = await SQLiteManager.createDatabase({
      name: 'Production Database',
      type: 'local',
      status: 'connected',
      tables: [
        { name: 'Products', record_count: 5 },
        { name: 'Customers', record_count: 3 },
        { name: 'Orders', record_count: 7 }
      ]
    });

    // Create Development Database with sample data
    const devDb = await SQLiteManager.createDatabase({
      name: 'Development Database',
      type: 'local',
      status: 'connected',
      tables: [
        { name: 'Products', record_count: 5 },
        { name: 'Customers', record_count: 3 },
        { name: 'Orders', record_count: 7 }
      ]
    });

    const databases = await SQLiteManager.listDatabases();
    return NextResponse.json(databases);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initialize databases' },
      { status: 500 }
    );
  }
}
