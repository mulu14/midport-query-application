import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// GET expand fields for a specific table by name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableName: string }> }
) {
  try {
    const { id: databaseId, tableName } = await params;
    const decodedTableName = decodeURIComponent(tableName);

    // First get the database to find the table ID
    const database = await SQLiteManager.getRemoteAPIDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Find the table to get its ID
    const table = database.tables.find((t: any) => t.name === decodedTableName);
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const expandFields = await SQLiteManager.getTableExpandFields(table.id);

    return NextResponse.json(expandFields);
  } catch (error) {
    console.error('❌ API: Error getting table expand fields:', error);
    return NextResponse.json(
      { error: 'Failed to get expand fields' },
      { status: 500 }
    );
  }
}

// PUT update expand fields for a specific table by name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableName: string }> }
) {
  try {
    const { id: databaseId, tableName } = await params;
    const decodedTableName = decodeURIComponent(tableName);
    const requestBody = await request.json();
    const { expandFields } = requestBody;

    // First get the database to find the table ID
    const database = await SQLiteManager.getRemoteAPIDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Find the table to get its ID
    const table = database.tables.find((t: any) => t.name === decodedTableName);
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    await SQLiteManager.updateTableExpandFields(table.id, expandFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API: Error updating table expand fields:', error);
    return NextResponse.json(
      { error: 'Failed to update expand fields' },
      { status: 500 }
    );
  }
}

// POST add expand fields to a specific table by name
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableName: string }> }
) {
  try {
    const { id: databaseId, tableName } = await params;
    const decodedTableName = decodeURIComponent(tableName);
    const { expandFields } = await request.json();

    // First get the database to find the table ID
    const database = await SQLiteManager.getRemoteAPIDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Find the table to get its ID
    const table = database.tables.find((t: any) => t.name === decodedTableName);
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    await SQLiteManager.addExpandFieldsToTable(table.id, expandFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API: Error adding table expand fields:', error);
    return NextResponse.json(
      { error: 'Failed to add expand fields' },
      { status: 500 }
    );
  }
}