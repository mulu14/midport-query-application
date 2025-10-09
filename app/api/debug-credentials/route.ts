/**
 * @fileoverview Debug API endpoint for credential comparison
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextResponse } from 'next/server';
import { CredentialDebugger } from '@/lib/utils/debugCredentials';

/**
 * GET /api/debug-credentials - Debug credential comparison issues
 */
export async function GET(): Promise<NextResponse> {
  try {
    console.log('🔍 Starting Credential Debug...');
    
    // Run debug on first tenant
    await CredentialDebugger.quickDebug();
    
    return NextResponse.json({
      success: true,
      message: 'Debug completed. Check console for detailed analysis.'
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}