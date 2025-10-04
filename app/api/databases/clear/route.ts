import { NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// POST clear all databases (for initialization)
export async function POST() {
  try {
    console.log('🧹 API: Clearing all databases...');
    await SQLiteManager.clearAllDatabases();

    // Initialize with default databases
    console.log('🚀 API: Initializing with default databases...');

    // Create Production Database
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

    // Create Development Database
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
    console.log('✅ API: Initialized databases:', databases.length);
    return NextResponse.json(databases);
  } catch (error) {
    console.error('❌ API: Error initializing databases:', error);
    return NextResponse.json(
      { error: 'Failed to initialize databases' },
      { status: 500 }
    );
  }
}
