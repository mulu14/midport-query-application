/**
 * @fileoverview API routes for local database management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

/**
 * GET endpoint to fetch all local databases
 * Retrieves all configured local databases from SQLite
 * @async
 * @function GET
 * @returns {Promise<NextResponse>} JSON response with databases array
 * @throws {NextResponse} 500 error if database fetch fails
 */
export async function GET() {
  try {
    console.log('🔍 API: Fetching databases from SQLite...');
    const databases = await SQLiteManager.listDatabases();
    console.log('📋 API: Returning databases from SQLite:', databases.length);
    return NextResponse.json(databases);
  } catch (error) {
    console.error('❌ API: Error fetching databases from SQLite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch databases' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new local database
 * Creates a new local database configuration in SQLite
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming request with database configuration
 * @returns {Promise<NextResponse>} JSON response with created database
 * @throws {NextResponse} 500 error if database creation fails
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('📊 API: Creating database in SQLite with data:', data);

    const database = await SQLiteManager.createDatabase(data);
    console.log('✅ API: Database created successfully in SQLite:', database);

    return NextResponse.json(database);
  } catch (error) {
    console.error('❌ API: Error creating database in SQLite:', error);
    return NextResponse.json(
      { error: 'Failed to create database' },
      { status: 500 }
    );
  }
}
