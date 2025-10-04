import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    await SQLiteManager.initialize();

    // Determine query type (SELECT vs other operations)
    const queryUpper = query.trim().toUpperCase();

    if (queryUpper.startsWith('SELECT')) {
      // Execute SELECT query
      const results = await SQLiteManager['apiGet'](query);
      return NextResponse.json({
        success: true,
        data: results
      });
    } else {
      // Execute other operations (INSERT, UPDATE, DELETE)
      await SQLiteManager['apiPost'](query);
      return NextResponse.json({
        success: true,
        data: [{ message: 'Query executed successfully', operation: 'completed' }]
      });
    }

  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
