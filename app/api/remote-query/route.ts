/**
 * @fileoverview API route for executing remote API queries with OAuth2 authentication
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { RemoteAPIManager } from '@/lib/RemoteAPIManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';
import type { SOAPRequestConfig, StoredOAuth2Token } from '@/Entities/RemoteAPI';


/**
 * POST endpoint to execute remote API queries with OAuth2 authentication
 * Handles OAuth2 token management and ION API calls server-side
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming request with query configuration
 * @returns {Promise<NextResponse>} JSON response with query results
 * @throws {NextResponse} 400 error if request data is invalid
 * @throws {NextResponse} 500 error if query execution fails
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🚀 API: Executing remote API query server-side with data:', data);

    // Validate required fields
    if (!data.config) {
      return NextResponse.json(
        { error: 'Missing required config object' },
        { status: 400 }
      );
    }

    const config: SOAPRequestConfig = data.config;
    const currentToken: StoredOAuth2Token | null = data.currentToken || null;

    console.log('🔐 API: Loading OAuth2 configuration from environment variables...');
    
    // Load OAuth2 configuration server-side (where environment variables are available)
    const oauth2Config = OAuth2ConfigManager.loadConfigFromEnv();
    console.log('✅ API: OAuth2 configuration loaded successfully');

    // Get or refresh OAuth2 token
    console.log('🎫 API: Getting/refreshing OAuth2 token...');
    const token = await OAuth2ConfigManager.getValidToken(currentToken, oauth2Config);
    
    if (!token || !token.accessToken) {
      console.log('❌ API: No valid access token available');
      return NextResponse.json({
        success: false,
        error: 'No access token available. Please check your OAuth2 credentials and try again.',
        details: 'Unable to obtain valid access token for ION API authentication'
      }, { status: 401 });
    }
    
    console.log('✅ API: OAuth2 token obtained successfully');
    console.log('🎫 API: Token details:', {
      tokenType: token.tokenType,
      accessToken: token.accessToken?.substring(0, 20) + '...',
      expiresAt: new Date(token.expiresAt).toISOString()
    });

    // Execute the remote API query
    console.log('🌐 API: Executing ION API query...');
    const result = await RemoteAPIManager.executeQueryWithToken(config, token);
    console.log('✅ API: ION API query executed successfully');

    return NextResponse.json({
      success: true,
      result: result,
      token: token // Return the token for client to store
    });

  } catch (error) {
    console.error('❌ API: Error executing remote API query:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute remote API query', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
