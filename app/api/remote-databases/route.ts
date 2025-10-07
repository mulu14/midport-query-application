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
 * Retrieves all configured remote API databases from SQLite
 * @async
 * @function GET
 * @returns {Promise<NextResponse>} JSON response with databases array
 * @throws {NextResponse} 500 error if database fetch fails
 */
export async function GET() {
  try {
    console.log('🔍 API: Fetching remote API databases from SQLite...');
    const databases = await SQLiteManager.getRemoteAPIDatabases();
    console.log('📋 API: Returning remote API databases from SQLite:', databases.length);
    return NextResponse.json(databases);
  } catch (error) {
    console.error('❌ API: Error fetching remote API databases from SQLite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remote API databases' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new remote API database
 * Creates a new remote API database configuration in SQLite
 * Tests database connection before saving configuration
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming request with database configuration
 * @returns {Promise<NextResponse>} JSON response with creation result
 * @throws {NextResponse} 400 error if request data is invalid
 * @throws {NextResponse} 500 error if database creation fails
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('📊 API: Creating remote API database in SQLite with data:', data);
    console.log('📊 API: Data keys:', Object.keys(data));
    console.log('📊 API: Data values:', data);

    // Test database connection first
    console.log('🔍 API: Testing database connection...');
    try {
      const testDatabases = await SQLiteManager.getRemoteAPIDatabases();
      console.log('✅ API: Database connection test successful, found', testDatabases.length, 'databases');
    } catch (testError) {
      console.error('❌ API: Database connection test failed:', testError);
      throw testError;
    }

    const database = await SQLiteManager.createRemoteAPIDatabase(data);
    console.log('✅ API: Remote API database created successfully in SQLite:', database);

    return NextResponse.json(database);
  } catch (error) {
    console.error('❌ API: Error creating remote API database in SQLite:', error);
    console.error('❌ API: Error details:', error instanceof Error ? error.message : String(error));
    console.error('❌ API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to create remote API database', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

