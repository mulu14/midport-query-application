/**
 * @fileoverview API endpoints for individual tenant operations
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';
import { TenantConfig } from '@/Entities/TenantConfig';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/tenants/[id] - Get specific tenant configuration
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = params;
    const tenant = await TenantConfigManager.getTenantById(id);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant configuration:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tenant configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenants/[id] - Update tenant configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate that the tenant exists
    const existingTenant = await TenantConfigManager.getTenantById(id);
    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updates: Partial<TenantConfig> = {};

    if (body.tenantName !== undefined) {
      updates.tenantName = body.tenantName;
    }
    if (body.displayName !== undefined) {
      updates.displayName = body.displayName;
    }
    if (body.environmentVersion !== undefined) {
      updates.environmentVersion = body.environmentVersion;
    }
    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }
    if (body.ionConfig !== undefined) {
      updates.ionConfig = {
        ...existingTenant.ionConfig,
        ...body.ionConfig
      };
    }

    const updatedTenant = await TenantConfigManager.updateTenant(id, updates);
    
    if (!updatedTenant) {
      return NextResponse.json(
        { error: 'Failed to update tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error('Error updating tenant configuration:', error);
    
    // Handle duplicate tenant name error
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        {
          error: 'Tenant name already exists',
          message: 'A tenant with this name already exists'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update tenant configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[id] - Delete tenant configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    const deleted = await TenantConfigManager.deleteTenant(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant configuration:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete tenant configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}