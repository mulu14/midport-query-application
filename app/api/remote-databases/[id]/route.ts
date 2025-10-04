import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// DELETE remote API database by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('🗑️ API: Deleting remote API database from SQLite:', id);

    await SQLiteManager.deleteRemoteAPIDatabase(id);
    console.log('✅ API: Remote API database deleted successfully from SQLite:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API: Error deleting remote API database from SQLite:', error);
    return NextResponse.json(
      { error: 'Failed to delete remote API database' },
      { status: 500 }
    );
  }
}
