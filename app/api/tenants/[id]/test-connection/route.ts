/**
 * @fileoverview API endpoint for tenant connection testing
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/tenants/[id]/test-connection - Test tenant ION API connection
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = params;
  const startTime = Date.now();

  try {
    // Record testing status
    await TenantConfigManager.recordHealthCheck(id, 'testing');

    // Get tenant configuration
    const tenant = await TenantConfigManager.getTenantById(id);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (!tenant.isActive) {
      await TenantConfigManager.recordHealthCheck(
        id,
        'error',
        Date.now() - startTime,
        'Tenant is not active'
      );
      
      return NextResponse.json(
        {
          success: false,
          message: 'Tenant is not active',
          responseTime: Date.now() - startTime
        },
        { status: 400 }
      );
    }

    // Test OAuth2 token acquisition
    try {
      const token = await OAuth2ConfigManager.getValidTokenForTenant(id);
      const responseTime = Date.now() - startTime;

      // Record successful connection
      await TenantConfigManager.recordHealthCheck(id, 'connected', responseTime);

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        responseTime,
        tokenInfo: {
          tokenType: token.tokenType,
          expiresAt: new Date(token.expiresAt).toISOString(),
          hasRefreshToken: !!token.refreshToken,
          scope: token.scope
        }
      });
    } catch (tokenError) {
      const responseTime = Date.now() - startTime;
      const errorMessage = tokenError instanceof Error ? tokenError.message : 'Token acquisition failed';

      // Record connection error
      await TenantConfigManager.recordHealthCheck(id, 'error', responseTime, errorMessage);

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          responseTime,
          error: 'Authentication failed'
        },
        { status: 401 }
      );
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Record general error
    try {
      await TenantConfigManager.recordHealthCheck(id, 'error', responseTime, errorMessage);
    } catch (logError) {
      console.error('Failed to record health check:', logError);
    }

    console.error('Error testing tenant connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        responseTime,
        error: 'Connection test failed'
      },
      { status: 500 }
    );
  }
}