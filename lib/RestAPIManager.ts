/**
 * @fileoverview REST API Manager for ION OData API interactions
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { APIRequestConfig, RemoteAPIQueryResult, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { OAuth2ConfigManager } from './OAuth2ConfigManager';

  /**
   * REST API Manager class for handling ION OData API operations
   * Provides methods for making authenticated REST requests to Infor ION OData APIs
   * Implements proper OData v4 standards for ION API
   * @class RestAPIManager
   */
export class RestAPIManager {
  private static readonly BASE_ION_API_URL = 'https://mingle-ionapi.eu1.inforcloudsuite.com';

  /**
   * Builds the complete ION OData API URL for a tenant and service (supports hundreds of OData services)
   * Based on ION API documentation: https://mingle-ionapi.eu1.inforcloudsuite.com/TENANT/LN/lnapi + /odata/service/entity
   * @static
   * @param {string} tenant - The tenant name (e.g., 'MIDPORT_DEM')
   * @param {string} oDataService - Any OData service name (e.g., 'tdapi.slsSalesOrder', 'tsapi.socServiceOrder', 'hrapi.empEmployee', 'finapi.accAccount')
   * @param {string} entityName - The entity name (e.g., 'Orders', 'Employees', 'Accounts')
   * @returns {string} Complete ION OData API URL
   * 
   * @example
   * // buildIONODataUrl('MIDPORT_DEM', 'tdapi.slsSalesOrder', 'Orders')
   * // Returns: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/tdapi.slsSalesOrder/Orders'
   * 
   * // buildIONODataUrl('MIDPORT_DEM', 'hrapi.empEmployee', 'Employees') 
   * // Returns: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/hrapi.empEmployee/Employees'
   */
  static buildIONODataUrl(tenant: string, oDataService: string, entityName: string): string {
    // Build ION API OData URL matching documentation: base + /odata/service/entity
    // Base: https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi
    // Path: /odata/tdapi.slsSalesOrder/Orders
    return `${this.BASE_ION_API_URL}/${tenant}/LN/lnapi/odata/${oDataService}/${entityName}`;
  }

  /**
   * Generates OData query parameters from parsed SQL conditions
   * @static
   * @param {Record<string, any>} parameters - Parameters from SQL parsing
   * @returns {string} OData query string (e.g., "$filter=Country eq 'Mexico'&$orderby=Name asc")
   * @note Limit is handled client-side after response, not as $top parameter
   * @note Company is sent as X-Infor-LnCompany header, not query parameter
   */
  static generateODataQuery(parameters: Record<string, any>): string {
    const queryParts: string[] = [];

    // Note: Company is now sent as X-Infor-LnCompany header, not query parameter

    // Build $filter parameter from SQL WHERE conditions
    const filterConditions: string[] = [];
    
    Object.entries(parameters).forEach(([key, value]) => {
      // Skip utility parameters (including limit - handled client-side)
      if (['limit', 'offset', 'timestamp', 'orderBy', 'orderDirection', 'serviceType', 'entityType', 'legacyFilter', 'company'].includes(key)) {
        return;
      }
      
      // Skip operator parameters (they're handled with their corresponding field)
      if (key.endsWith('_operator')) {
        return;
      }

      // Get the operator for this field
      const operatorKey = `${key}_operator`;
      const sqlOperator = parameters[operatorKey] || 'eq';
      
      // Convert SQL operators to OData operators
      const oDataOperator = this.convertToODataOperator(sqlOperator);
      
      // Handle different value types
      if (Array.isArray(value)) {
        // Handle IN operator - convert to multiple OR conditions
        const inConditions = value.map(v => `${key} eq '${this.escapeODataValue(v)}'`).join(' or ');
        filterConditions.push(`(${inConditions})`);
      } else if (typeof value === 'string') {
        filterConditions.push(`${key} ${oDataOperator} '${this.escapeODataValue(value)}'`);
      } else {
        filterConditions.push(`${key} ${oDataOperator} ${value}`);
      }
    });

    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`);
    }

    // Note: LIMIT is handled client-side after response parsing, not as $top
    // This ensures we get the full server response and limit display-side

    // Handle OFFSET -> $skip (if supported by the API)
    if (parameters.offset) {
      queryParts.push(`$skip=${parameters.offset}`);
    }

    // Handle ORDER BY -> $orderby
    if (parameters.orderBy) {
      const direction = parameters.orderDirection || 'asc';
      queryParts.push(`$orderby=${parameters.orderBy} ${direction}`);
    }

    return queryParts.join('&');
  }

  /**
   * Generates OData query parameters including company parameter for compatibility
   * @static
   * @param {Record<string, any>} parameters - Parameters from SQL parsing
   * @param {string} company - LN company code
   * @returns {string} OData query string with company parameter
   */
  static generateODataQueryWithCompany(parameters: Record<string, any>, company: string): string {
    const queryParts: string[] = [];

    // Add company parameter in multiple formats for maximum compatibility
    if (company && company !== '0') {
      queryParts.push(`company=${encodeURIComponent(company)}`);
      queryParts.push(`lncompany=${encodeURIComponent(company)}`);
      queryParts.push(`LnCompany=${encodeURIComponent(company)}`);
    }

    // Build $filter parameter from SQL WHERE conditions
    const filterConditions: string[] = [];
    
    Object.entries(parameters).forEach(([key, value]) => {
      // Skip utility parameters (including limit - handled client-side)
      if (['limit', 'offset', 'timestamp', 'orderBy', 'orderDirection', 'serviceType', 'entityType', 'legacyFilter', 'company'].includes(key)) {
        return;
      }
      
      // Skip operator parameters (they're handled with their corresponding field)
      if (key.endsWith('_operator')) {
        return;
      }

      // Get the operator for this field
      const operatorKey = `${key}_operator`;
      const sqlOperator = parameters[operatorKey] || 'eq';
      
      // Convert SQL operators to OData operators
      const oDataOperator = this.convertToODataOperator(sqlOperator);
      
      // Handle different value types
      if (Array.isArray(value)) {
        // Handle IN operator - convert to multiple OR conditions
        const inConditions = value.map(v => `${key} eq '${this.escapeODataValue(v)}'`).join(' or ');
        filterConditions.push(`(${inConditions})`);
      } else if (typeof value === 'string') {
        filterConditions.push(`${key} ${oDataOperator} '${this.escapeODataValue(value)}'`);
      } else {
        filterConditions.push(`${key} ${oDataOperator} ${value}`);
      }
    });

    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`);
    }

    // Handle OFFSET -> $skip (if supported by the API)
    if (parameters.offset) {
      queryParts.push(`$skip=${parameters.offset}`);
    }

    // Handle ORDER BY -> $orderby
    if (parameters.orderBy) {
      const direction = parameters.orderDirection || 'asc';
      queryParts.push(`$orderby=${parameters.orderBy} ${direction}`);
    }

    return queryParts.join('&');
  }

  /**
   * Converts SQL operators to OData operators
   * @private
   * @static
   * @param {string} sqlOperator - SQL operator (eq, ne, gt, lt, ge, le, like)
   * @returns {string} OData operator
   */
  private static convertToODataOperator(sqlOperator: string): string {
    const operatorMap: Record<string, string> = {
      'eq': 'eq',
      'ne': 'ne', 
      'gt': 'gt',
      'lt': 'lt',
      'ge': 'ge',
      'le': 'le',
      'like': 'contains' // OData uses 'contains' for LIKE functionality
    };

    return operatorMap[sqlOperator] || 'eq';
  }

  /**
   * Escapes single quotes in OData string values
   * @private
   * @static
   * @param {any} value - Value to escape
   * @returns {string} Escaped value
   */
  private static escapeODataValue(value: any): string {
    return String(value).replace(/'/g, "''");
  }

  /**
   * Executes a REST API query against the ION OData API with OAuth2 authentication
   * @static
   * @async
   * @param {APIRequestConfig} config - Configuration for the REST request including tenant, service, entity, and parameters
   * @param {StoredOAuth2Token} token - Valid OAuth2 token for ION API authentication
   * @returns {Promise<RemoteAPIQueryResult>} Result containing success status, data, and response metadata
   * @throws {Error} If the API request fails due to configuration or network issues
   * 
   * @example
   * ```typescript
   * const config: APIRequestConfig = {
   *   tenant: 'MIDPORT_DEM',
   *   oDataService: 'tdapi.slsSalesOrder',
   *   entityName: 'Orders',
   *   action: 'List',
   *   parameters: { limit: 10 }
   * };
   * const result = await RestAPIManager.executeQuery(config, token);
   * ```
   */
  static async executeQuery(config: APIRequestConfig, token: StoredOAuth2Token): Promise<RemoteAPIQueryResult> {
    try {
      // Validate required configuration fields
      if (!config.oDataService && !config.fullUrl) {
        throw new Error('REST API requires either oDataService or fullUrl to be specified');
      }
      
      if (!config.entityName && !config.table && !config.fullUrl) {
        throw new Error('REST API requires either entityName, table, or fullUrl to be specified');
      }
      
      // Build the complete OData API URL
      const baseUrl = config.fullUrl || this.buildIONODataUrl(
        config.tenant,
        config.oDataService || '',
        config.entityName || config.table
      );
      
      // Generate OData query parameters from the request configuration
      const queryString = this.generateODataQuery(config.parameters || {});
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      // Convert API action to appropriate HTTP method
      const method = this.getHttpMethod(config.action);
      
      // Prepare request body for create/update operations
      let body: string | undefined;
      const contentType = 'application/json';

      if (method === 'POST' || method === 'PUT') {
        body = JSON.stringify(config.parameters || {});
      }

      // Prepare headers with OAuth2 authentication and LN-specific headers
      const headers = {
        'Accept': 'application/json',
        'Content-Type': contentType,
        'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'X-Infor-LnCompany': '2405',
        'X-Infor-LnIdentity': 'lnapi_mfo'
      };
      
      // Execute the HTTP request to ION OData API
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      
      // Handle HTTP error responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ION OData API Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Parse successful response
      const responseData = await response.json();
      const limit = config.parameters?.limit || 15; // Default record limit
      const parsedData = this.parseODataResponse(responseData, config.entityName || config.table, limit);

      return {
        success: true,
        url: url,
        action: config.action,
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        rawResponse: JSON.stringify(responseData, null, 2),
        note: `ION OData API ${config.action} operation completed successfully`
      };

    } catch (error) {
      // Build URL for error context
      const baseUrl = config.fullUrl || this.buildIONODataUrl(
        config.tenant,
        config.oDataService || '',
        config.entityName || config.table
      );
      const queryString = this.generateODataQuery(config.parameters || {});
      const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      // Return structured error response
      return {
        success: false,
        url: finalUrl,
        action: config.action,
        status: 500,
        statusText: 'Internal Error',
        data: {
          success: false,
          serviceType: 'OData',
          recordCount: 0,
          records: [],
          summary: 'REST API query failed',
          error: true,
          message: error instanceof Error ? error.message : String(error),
          type: 'rest_api_error'
        },
        rawResponse: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
        note: `REST API ${config.action} operation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Converts API action names to appropriate HTTP methods
   * @private
   * @static
   * @param {string} action - API action name (e.g., 'List', 'Create', 'Update', 'Delete')
   * @returns {string} Corresponding HTTP method (GET, POST, PUT, DELETE)
   * 
   * @example
   * ```typescript
   * getHttpMethod('List') // Returns: 'GET'
   * getHttpMethod('Create') // Returns: 'POST'
   * getHttpMethod('Update') // Returns: 'PUT'
   * getHttpMethod('Delete') // Returns: 'DELETE'
   * ```
   */
  private static getHttpMethod(action: string): string {
    const actionMap: Record<string, string> = {
      'list': 'GET',
      'read': 'GET',
      'get': 'GET',
      'create': 'POST',
      'insert': 'POST',
      'update': 'PUT',
      'modify': 'PUT',
      'delete': 'DELETE',
      'remove': 'DELETE'
    };

    return actionMap[action.toLowerCase()] || 'GET';
  }

  /**
   * Parses OData JSON response and extracts structured data with optional client-side record limiting
   * @private
   * @static
   * @param {any} responseData - Raw JSON response from ION OData API
   * @param {string} entityName - Name of the OData entity for context in summaries
   * @param {number} [limit] - Optional maximum number of records to return (client-side limiting)
   * @returns {object} Structured response object containing records, metadata, and status information
   * 
   * @description
   * Handles both OData collection responses (with 'value' array) and single entity responses.
   * Applies client-side limiting when specified, preserving the original record count in summaries.
   * 
   * @example
   * ```typescript
   * // Collection response: { "value": [{...}, {...}] }
   * // Single entity: { "id": 1, "name": "Item" }
   * const parsed = parseODataResponse(responseData, 'Orders', 10);
   * // Returns: { success: true, records: [...], recordCount: 10, ... }
   * ```
   */
  private static parseODataResponse(responseData: any, entityName: string, limit?: number): {
    success: boolean;
    serviceType: string;
    recordCount: number;
    records: any[];
    summary: string;
    error?: boolean;
    message?: string;
    type: string;
  } {
    try {
      // Handle OData collection responses
      if (responseData.value && Array.isArray(responseData.value)) {
        const allRecords = responseData.value;
        const totalCount = allRecords.length;
        
        // Apply client-side limiting if specified
        const records = limit && limit > 0 ? allRecords.slice(0, limit) : allRecords;
        const limitedCount = records.length;
        
        const summaryText = limit && totalCount > limit 
          ? `Retrieved ${limitedCount} records (limited from ${totalCount}) from ${entityName} via OData API`
          : `Retrieved ${totalCount} records from ${entityName} via OData API`;
        
        return {
          success: true,
          serviceType: 'OData',
          recordCount: limitedCount,
          records: records,
          summary: summaryText,
          type: 'odata_collection'
        };
      }
      
      // Handle single entity responses
      if (responseData && typeof responseData === 'object') {
        return {
          success: true,
          serviceType: 'OData', 
          recordCount: 1,
          records: [responseData],
          summary: `Retrieved single ${entityName} record via OData API`,
          type: 'odata_single'
        };
      }

      // Handle empty or unexpected responses
      return {
        success: true,
        serviceType: 'OData',
        recordCount: 0,
        records: [],
        summary: `No data returned from ${entityName} via OData API`,
        type: 'odata_empty'
      };

    } catch (error) {
      return {
        success: false,
        serviceType: 'OData',
        recordCount: 0,
        records: [],
        summary: `Failed to parse OData response from ${entityName}`,
        error: true,
        message: error instanceof Error ? error.message : String(error),
        type: 'odata_error'
      };
    }
  }
}