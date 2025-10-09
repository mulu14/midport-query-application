/**
 * @fileoverview API endpoints for tenant configuration management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantConfigManager } from '@/lib/TenantConfigManager';
import { NewTenantConfig, TenantSummary } from '@/Entities/TenantConfig';

/**
 * GET /api/tenants - Get all tenant configurations (summaries only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Return detailed configurations (sensitive data included)
      const tenants = await TenantConfigManager.getAllTenants();
      return NextResponse.json(tenants);
    } else {
      // Return summaries only (no sensitive data)
      const summaries = await TenantConfigManager.getTenantSummaries();
      return NextResponse.json(summaries);
    }
  } catch (error) {
    console.error('Error fetching tenant configurations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch tenant configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants - Create new tenant configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['tenantName', 'ionConfig'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields
        },
        { status: 400 }
      );
    }

    // Validate ION configuration fields
    const requiredIonFields = [
      'clientId', 'clientSecret', 'tenantId', 'portalUrl', 
      'serviceAccountAccessKey', 'serviceAccountSecretKey'
    ];
    
    const missingIonFields = requiredIonFields.filter(field => !body.ionConfig[field]);
    
    if (missingIonFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required ION configuration fields',
          missingIonFields
        },
        { status: 400 }
      );
    }

    const newTenantConfig: NewTenantConfig = {
      tenantName: body.tenantName,
      displayName: body.tenantName, // Use tenantName as displayName
      environmentVersion: body.environmentVersion,
      ionConfig: {
        clientId: body.ionConfig.clientId,
        clientSecret: body.ionConfig.clientSecret,
        identityUrl: body.ionConfig.identityUrl || '',
        portalUrl: body.ionConfig.portalUrl,
        tenantId: body.ionConfig.tenantId,
        tokenEndpoint: body.ionConfig.tokenEndpoint || 'token.oauth2',
        authorizationEndpoint: body.ionConfig.authorizationEndpoint || 'authorization.oauth2',
        revokeEndpoint: body.ionConfig.revokeEndpoint || 'revoke_token.oauth2',
        serviceAccountAccessKey: body.ionConfig.serviceAccountAccessKey,
        serviceAccountSecretKey: body.ionConfig.serviceAccountSecretKey,
        scope: body.ionConfig.scope || 'read write',
        version: body.ionConfig.version || '1.0',
        clientName: body.ionConfig.clientName || '',
        dataType: body.ionConfig.dataType || '12',
        lnCompany: body.ionConfig.lnCompany || '',
        lnIdentity: body.ionConfig.lnIdentity || ''
      }
    };

    const createdTenant = await TenantConfigManager.createTenantCredential(newTenantConfig);
    
    return NextResponse.json(createdTenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant configuration:', error);
    
    // Handle duplicate tenant errors
    if (error instanceof Error && (
      error.message.includes('already exist') ||
      error.message.includes('UNIQUE constraint failed')
    )) {
      return NextResponse.json(
        {
          error: 'Duplicate tenant credentials',
          message: error.message
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create tenant configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}