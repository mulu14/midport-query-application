import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// GET single database
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const database = await SQLiteManager.findDatabaseById(params.id);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(database);
  } catch (error) {
    console.error('Error fetching database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database' },
      { status: 500 }
    );
  }
}

// PUT update database
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const database = await SQLiteManager.updateDatabase(params.id, data);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(database);
  } catch (error) {
    console.error('Error updating database:', error);
    return NextResponse.json(
      { error: 'Failed to update database' },
      { status: 500 }
    );
  }
}

// DELETE database
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await SQLiteManager.deleteDatabase(params.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting database:', error);
    return NextResponse.json(
      { error: 'Failed to delete database' },
      { status: 500 }
    );
  }
}
