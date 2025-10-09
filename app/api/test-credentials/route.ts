/**
 * @fileoverview API endpoint to test credential validation
 * @author Mulugeta Forsido  
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextResponse } from 'next/server';
import { CredentialValidator } from '@/lib/utils/credentialValidator';

/**
 * GET /api/test-credentials - Test credential validation
 */
export async function GET(): Promise<NextResponse> {
  try {
    console.log('🚀 Starting Credential Validation Test...');
    
    // Run quick validation on first tenant
    const isValid = await CredentialValidator.quickValidation();
    
    if (isValid) {
      return NextResponse.json({
        success: true,
        message: 'All credential values match between database and environment!',
        status: 'PASS'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some credential values do not match!',
        status: 'FAIL',
        suggestions: [
          'Environment variables may have changed',
          'Database encryption/decryption issues',
          'Migration problems'
        ]
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Validation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}