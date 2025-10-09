/**
 * @fileoverview Unified API Manager for both SOAP and REST API interactions
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { APIRequestConfig, RemoteAPIQueryResult, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { RemoteAPIManager } from './RemoteAPIManager';
import { RestAPIManager } from './RestAPIManager';
import { OAuth2ConfigManager } from './OAuth2ConfigManager';
import { ResponseParser } from './ResponseParser';

/**
 * Unified API Manager that routes requests to appropriate SOAP or REST managers
 * Provides a single interface for both SOAP and REST API interactions
 * Supports hundreds of different OData services (tdapi.*, tsapi.*, hrapi.*, finapi.*, etc.)
 * @class UnifiedAPIManager
 */
export class UnifiedAPIManager {

  /**
   * Executes a query against either SOAP or REST API based on configuration
   * @static
   * @async
   * @param {APIRequestConfig} config - Configuration for the API request
   * @param {string} username - Username for OAuth2 authentication (legacy parameter)
   * @param {string} password - Password for OAuth2 authentication (legacy parameter)
   * @param {StoredOAuth2Token | null} [currentToken] - Current token (if any)
   * @returns {Promise<RemoteAPIQueryResult>} Result of the API call
   * @throws {Error} If the API request fails
   */
  static async executeQueryWithOAuth2(
    config: APIRequestConfig,
    username: string,
    password: string,
    currentToken?: StoredOAuth2Token | null
  ): Promise<RemoteAPIQueryResult> {
    // Safety check for browser environment
    if (typeof window !== 'undefined') {
      throw new Error('UnifiedAPIManager cannot be used in browser environment. Use /api/remote-query endpoint instead.');
    }
    
    try {
      // Load OAuth2 configuration from database (with fallback to environment variables)
      const oauth2Config = await OAuth2ConfigManager.loadConfig();

      // Get or refresh token as needed
      const token = await OAuth2ConfigManager.getValidToken(currentToken ?? null, oauth2Config);

      // Route to appropriate API manager based on type
      let rawResult: RemoteAPIQueryResult;
      
      if (config.apiType === 'rest') {
        rawResult = await RestAPIManager.executeQuery(config, token);
      } else {
        // Convert to legacy SOAP config for backward compatibility
        const soapConfig = {
          ...config,
          apiType: 'soap' as const
        };
        rawResult = await RemoteAPIManager.executeQueryWithToken(soapConfig, token);
      }

      // Parse the response using unified parser with limit
      const limit = config.parameters?.limit || 15; // Default to 15 if not specified
      const parsedResult = ResponseParser.parseUnifiedResponse(rawResult, limit);
      
      return parsedResult;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Builds the appropriate URL based on API type
   * @static
   * @param {APIRequestConfig} config - API configuration
   * @returns {string} Complete API URL
   */
  static buildAPIUrl(config: APIRequestConfig): string {
    if (config.apiType === 'rest') {
      return RestAPIManager.buildIONODataUrl(
        config.tenant,
        config.oDataService || '',
        config.entityName || config.table
      );
    } else {
      return RemoteAPIManager.buildIONAPIUrl(config.tenant, config.table);
    }
  }

  /**
   * Validates API configuration based on type
   * @static
   * @param {APIRequestConfig} config - API configuration to validate
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  static validateConfig(config: APIRequestConfig): boolean {
    // Common validations
    if (!config.tenant || !config.table || !config.action) {
      throw new Error('Missing required fields: tenant, table, and action are required');
    }

    // REST-specific validations
    if (config.apiType === 'rest') {
      if (!config.oDataService && !config.fullUrl) {
        throw new Error('REST API requires either oDataService or fullUrl to be specified');
      }
    }

    // SOAP-specific validations (if any)
    if (config.apiType === 'soap') {
      // SOAP validations can be added here if needed
    }

    return true;
  }

  /**
   * Determines the appropriate API type based on endpoint or service name
   * @static
   * @param {string} endpoint - The endpoint or service name
   * @returns {'soap' | 'rest'} Suggested API type
   */
  static suggestAPIType(endpoint: string): 'soap' | 'rest' {
    // If endpoint contains OData indicators, suggest REST
    if (endpoint.includes('odata') || endpoint.includes('tsapi.') || endpoint.includes('/')) {
      return 'rest';
    }
    
    // Default to SOAP for traditional service names
    return 'soap';
  }

  /**
   * Parses endpoint information to extract OData service and entity names
   * @static
   * @param {string} endpoint - The endpoint string
   * @returns {object} Parsed endpoint information
   */
  static parseEndpoint(endpoint: string): {
    serviceName: string;
    oDataService?: string;
    entityName?: string;
    apiType: 'soap' | 'rest';
  } {
    // Check if this looks like an OData endpoint
    if (endpoint.includes('/')) {
      const parts = endpoint.split('/');
      if (parts.length >= 2) {
        return {
          serviceName: endpoint,
          oDataService: parts[0],
          entityName: parts[1],
          apiType: 'rest'
        };
      }
    }

    // Traditional SOAP service name
    return {
      serviceName: endpoint,
      apiType: 'soap'
    };
  }
}