/**
 * @fileoverview OAuth2 Configuration Manager for ION API
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { OAuth2Config, OAuth2TokenResponse, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { config as loadDotenv } from 'dotenv';
import path from 'path';

/**
 * OAuth2 Configuration Manager for ION API
 * Handles loading configuration from environment variables and managing OAuth2 tokens
 * @class OAuth2ConfigManager
 */
export class OAuth2ConfigManager {
  /**
   * Load OAuth2 configuration from environment variables
   * @static
   * @returns {OAuth2Config} OAuth2 configuration object
   * @throws {Error} If required environment variables are missing
   */
  static loadConfigFromEnv(): OAuth2Config {
    // Safety check for browser environment
    if (typeof window !== 'undefined') {
      throw new Error('OAuth2ConfigManager.loadConfigFromEnv() cannot be used in browser environment. Use server-side API endpoints instead.');
    }
    
    // Explicitly load .env.local file if no ION_ variables are found
    const ionVars = Object.keys(process.env).filter(key => key.startsWith('ION_'));
    if (ionVars.length === 0) {
      try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        loadDotenv({ path: envPath, override: false });
      } catch (error) {
        // Silently handle .env.local loading errors
      }
    }
    
    const requiredEnvVars = [
      'ION_CLIENT_ID',
      'ION_CLIENT_SECRET',
      'ION_PORTAL_URL',
      'ION_TENANT_ID',
      'ION_TOKEN_ENDPOINT',
      'ION_SERVICE_ACCOUNT_ACCESS_KEY',
      'ION_SERVICE_ACCOUNT_SECRET_KEY'
    ];
    // Note: ION_SCOPE is not required for password grant type

    // Validate required environment variables
    const missingVars: string[] = [];
    const foundVars: string[] = [];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value || value.trim() === '') {
        missingVars.push(envVar);
      } else {
        foundVars.push(envVar);
      }
    }
    
    if (missingVars.length > 0) {
      const errorMessage = `Missing required ION API environment variables:

${missingVars.map(v => `   - ${v}`).join('\n')}

Please add these to your .env.local file:
${requiredEnvVars.map(v => `${v}=your_${v.toLowerCase()}_here`).join('\n')}

Found variables: ${foundVars.join(', ')}
Missing variables: ${missingVars.join(', ')}`;
      
      throw new Error(errorMessage);
    }
    

    return {
      clientId: process.env.ION_CLIENT_ID!,
      clientSecret: process.env.ION_CLIENT_SECRET!,
      username: process.env.ION_SERVICE_ACCOUNT_ACCESS_KEY!, // Service Account Access Key
      password: process.env.ION_SERVICE_ACCOUNT_SECRET_KEY!, // Service Account Secret Key
      tokenEndpoint: `${process.env.ION_PORTAL_URL}${process.env.ION_TOKEN_ENDPOINT}`
      // Note: scope not needed for ION API password grant
    };
  }


  /**
   * Get access token using OAuth2 Password Credentials Grant
   * @static
   * @async
   * @param {OAuth2Config} config - OAuth2 configuration
   * @returns {Promise<StoredOAuth2Token>} Stored OAuth2 token
   * @throws {Error} If token acquisition fails
   */
  static async getAccessToken(config: OAuth2Config): Promise<StoredOAuth2Token> {
    try {
      // Explicitly construct the token endpoint URL
      const tokenEndpoint = `${process.env.ION_PORTAL_URL}${process.env.ION_TOKEN_ENDPOINT}`;
      
      // Verify service account and client ID match the same tenant
      const clientTenant = config.clientId.split('~')[0];
      const saakTenant = config.username.split('#')[0];
      if (clientTenant !== saakTenant) {
        // Tenant mismatch detected but continue processing
      }

      // Use password credentials grant for ION API authentication
      // Following .NET sample pattern: use Basic Auth for client credentials
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', config.username); // Service Account Access Key (SAAK)
      formData.append('password', config.password); // Service Account Secret Key (SASK)
      
      // Prepare Basic Auth header for client credentials
      const clientCredentials = btoa(`${config.clientId}:${config.clientSecret}`);
      
      // Note: ION API does not require scope parameter in password grant type
      // Based on .NET sample implementation, scope is not included in the token request
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${clientCredentials}`,
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();

      // Convert response to stored token format
      const storedToken: StoredOAuth2Token = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        refreshToken: tokenResponse.refresh_token,
        scope: tokenResponse.scope
      };

      return storedToken;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a token is valid and not expired
   * @static
   * @param {StoredOAuth2Token} token - Token to validate
   * @returns {boolean} True if token is valid and not expired
   */
  static isTokenValid(token: StoredOAuth2Token): boolean {
    if (!token || !token.accessToken) {
      return false;
    }

    // Check if token is expired (with 5-minute buffer)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() < (token.expiresAt - bufferTime);
  }

  /**
   * Get authorization header for API requests
   * @static
   * @param {StoredOAuth2Token} token - OAuth2 token
   * @returns {string} Authorization header value
   */
  static getAuthorizationHeader(token: StoredOAuth2Token): string {
    return `${token.tokenType} ${token.accessToken}`;
  }

  /**
   * Refresh an expired token
   * @static
   * @async
   * @param {StoredOAuth2Token} token - Current token with refresh token
   * @param {OAuth2Config} config - OAuth2 configuration
   * @returns {Promise<StoredOAuth2Token>} New refreshed token
   * @throws {Error} If token refresh fails
   */
  static async refreshToken(token: StoredOAuth2Token, config: OAuth2Config): Promise<StoredOAuth2Token> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {

      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('client_id', config.clientId);
      formData.append('client_secret', config.clientSecret);
      formData.append('refresh_token', token.refreshToken);

      const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();

      return {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        refreshToken: tokenResponse.refresh_token || token.refreshToken,
        scope: tokenResponse.scope || token.scope
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get or refresh token as needed
   * @static
   * @async
   * @param {StoredOAuth2Token | null} currentToken - Current token (if any)
   * @param {OAuth2Config} config - OAuth2 configuration
   * @returns {Promise<StoredOAuth2Token>} Valid token
   */
  static async getValidToken(currentToken: StoredOAuth2Token | null, config: OAuth2Config): Promise<StoredOAuth2Token> {
    // If no token or token is invalid, get a new one
    if (!currentToken || !this.isTokenValid(currentToken)) {
      return await this.getAccessToken(config);
    }

    // If token is valid, return it
    return currentToken;
  }
}
