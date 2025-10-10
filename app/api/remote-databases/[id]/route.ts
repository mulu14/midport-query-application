import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// PUT update remote API database by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    console.log('🔄 API: Updating remote API database in SQLite:', id, data);

    // Build full URL from base URL, tenant, and services
    const fullUrl = `${data.baseUrl.replace(/\/$/, '')}/${data.tenantName}/${data.services}`;

    // Update the database using SQLiteManager
    const updatedDb = await SQLiteManager.updateRemoteAPIDatabase(id, {
      name: data.name,
      fullUrl: fullUrl,
      baseUrl: data.baseUrl,
      tenantName: data.tenantName,
      services: data.services,
      tables: data.tables,
      expandFields: data.expandFields,
      status: data.status
    });

    console.log('✅ API: Remote API database updated successfully in SQLite:', id);

    return NextResponse.json(updatedDb);
  } catch (error) {
    console.error('❌ API: Error updating remote API database in SQLite:', error);
    return NextResponse.json(
      { error: 'Failed to update remote API database' },
      { status: 500 }
    );
  }
}

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
