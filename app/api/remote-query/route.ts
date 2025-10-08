/**
 * @fileoverview API route for executing remote API queries with OAuth2 authentication
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedAPIManager } from '@/lib/UnifiedAPIManager';
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';
import type { APIRequestConfig, StoredOAuth2Token } from '@/Entities/RemoteAPI';


/**
 * POST endpoint to execute remote API queries with OAuth2 authentication
 * 
 * @description
 * Handles OAuth2 token management and ION API calls server-side. This endpoint:
 * - Validates request configuration
 * - Manages OAuth2 token lifecycle (refresh if needed)
 * - Routes requests to appropriate SOAP or REST API managers
 * - Returns structured API responses with updated tokens
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming HTTP request
 * 
 * @param {Object} request.body - Request body containing:
 * @param {APIRequestConfig} request.body.config - API request configuration
 * @param {string} request.body.config.tenant - ION API tenant name
 * @param {string} request.body.config.table - Table/service name to query
 * @param {'soap'|'rest'} request.body.config.apiType - API type to use
 * @param {string} request.body.config.action - API action (List, Create, Update, Delete)
 * @param {Object} [request.body.config.parameters] - Query parameters
 * @param {string} [request.body.config.oDataService] - OData service name (REST only)
 * @param {string} [request.body.config.entityName] - OData entity name (REST only)
 * @param {StoredOAuth2Token|null} [request.body.currentToken] - Current OAuth2 token
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 * @returns {boolean} success - Whether the operation succeeded
 * @returns {Object} [result] - Query result data (if successful)
 * @returns {StoredOAuth2Token} [token] - Updated OAuth2 token
 * @returns {string} [error] - Error message (if failed)
 * @returns {string} [details] - Error details (if failed)
 * 
 * @throws {NextResponse} 400 Bad Request - Missing or invalid configuration
 * @throws {NextResponse} 401 Unauthorized - OAuth2 authentication failed
 * @throws {NextResponse} 500 Internal Server Error - Query execution failed
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "config": {
 *     "tenant": "MIDPORT_DEM",
 *     "table": "ServiceCall_v2",
 *     "apiType": "soap",
 *     "action": "List",
 *     "parameters": { "limit": 10 }
 *   },
 *   "currentToken": { "accessToken": "...", "expiresAt": 1234567890 }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.config) {
      return NextResponse.json(
        { error: 'Missing required config object' },
        { status: 400 }
      );
    }

    const config: APIRequestConfig = data.config;
    const currentToken: StoredOAuth2Token | null = data.currentToken || null;

    // Load OAuth2 configuration server-side (where environment variables are available)
    const oauth2Config = OAuth2ConfigManager.loadConfigFromEnv();

    // Get or refresh OAuth2 token
    const token = await OAuth2ConfigManager.getValidToken(currentToken, oauth2Config);
    
    if (!token || !token.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token available. Please check your OAuth2 credentials and try again.',
        details: 'Unable to obtain valid access token for ION API authentication'
      }, { status: 401 });
    }

    // Execute the remote API query using UnifiedAPIManager
    const result = await UnifiedAPIManager.executeQueryWithOAuth2(config, '', '', token);

    return NextResponse.json({
      success: true,
      result: result,
      token: token // Return the token for client to store
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to execute remote API query', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
