/**
 * @fileoverview Debug endpoint to check environment variables
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const requiredEnvVars = [
      'ION_CLIENT_ID',
      'ION_CLIENT_SECRET',
      'ION_PORTAL_URL',
      'ION_TENANT_ID',
      'ION_TOKEN_ENDPOINT',
      'ION_SERVICE_ACCOUNT_ACCESS_KEY',
      'ION_SERVICE_ACCOUNT_SECRET_KEY'
    ];

    const envStatus: Record<string, any> = {};
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      envStatus[envVar] = {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 20)}...` : 'undefined'
      };
    }

    return NextResponse.json({
      message: 'Environment variables status',
      nodeEnv: process.env.NODE_ENV,
      envVars: envStatus,
      allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('ION_')).sort()
    });

  } catch (error) {
    console.error('❌ Debug API: Error checking environment variables:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check environment variables', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}