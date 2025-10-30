import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

// PUT update remote API database by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { auth } = await import('@/app/auth');
    const session = await auth();
    
    // Check if user is logged in
    if (!session?.user?.tenant) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const data = await request.json();
    
    // Get the existing database to check ownership
    const existingDb = await SQLiteManager.getRemoteAPIDatabaseById(id);
    if (!existingDb) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    
    // Check if user has admin or superadmin role
    const userRoles = session.user.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    const isAdmin = userRoles.includes('admin');
    
    // Only admin and superadmin can update databases
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can update databases' },
        { status: 403 }
      );
    }
    
    // Ensure user can only update their own tenant's databases (unless superadmin)
    if (!isSuperAdmin && existingDb.tenantName !== session.user.tenant) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update databases for your own tenant' },
        { status: 403 }
      );
    }

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

    return NextResponse.json(updatedDb);
  } catch (error) {
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
    const { auth } = await import('@/app/auth');
    const session = await auth();
    
    // Check if user is logged in
    if (!session?.user?.tenant) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get the existing database to check ownership
    const existingDb = await SQLiteManager.getRemoteAPIDatabaseById(id);
    if (!existingDb) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }
    
    // Check if user has admin or superadmin role
    const userRoles = session.user.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    const isAdmin = userRoles.includes('admin');
    
    // Only admin and superadmin can delete databases
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete databases' },
        { status: 403 }
      );
    }
    
    // Ensure user can only delete their own tenant's databases (unless superadmin)
    if (!isSuperAdmin && existingDb.tenantName !== session.user.tenant) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete databases for your own tenant' },
        { status: 403 }
      );
    }

    await SQLiteManager.deleteRemoteAPIDatabase(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete remote API database' },
      { status: 500 }
    );
  }
}
