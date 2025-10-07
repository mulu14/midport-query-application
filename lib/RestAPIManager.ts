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
 * @class RestAPIManager
 */
export class RestAPIManager {
  private static readonly BASE_URL = 'https://mingle-ionapi.eu1.inforcloudsuite.com';

  /**
   * Builds the complete ION OData API URL for a tenant and service (supports hundreds of OData services)
   * @static
   * @param {string} tenant - The tenant name (e.g., 'MIDPORT_DEM')
   * @param {string} oDataService - Any OData service name (e.g., 'tdapi.slsSalesOrder', 'tsapi.socServiceOrder', 'hrapi.empEmployee', 'finapi.accAccount')
   * @param {string} entityName - The entity name (e.g., 'orders', 'Orders', 'Employees', 'Accounts')
   * @returns {string} Complete ION OData API URL
   * 
   * @example
   * // buildIONODataUrl('MIDPORT_DEM', 'tdapi.slsSalesOrder', 'orders')
   * // Returns: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/tdapi.slsSalesOrder/orders'
   * 
   * // buildIONODataUrl('MIDPORT_DEM', 'hrapi.empEmployee', 'Employees') 
   * // Returns: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/hrapi.empEmployee/Employees'
   */
  static buildIONODataUrl(tenant: string, oDataService: string, entityName: string): string {
    return `${this.BASE_URL}/${tenant}/LN/lnapi/odata/${oDataService}/${entityName}`;
  }

  /**
   * Generates OData query parameters from parsed SQL conditions
   * @static
   * @param {Record<string, any>} parameters - Parameters from SQL parsing
   * @returns {string} OData query string (e.g., "$filter=Country eq 'Mexico'&$top=10")
   */
  static generateODataQuery(parameters: Record<string, any>): string {
    const queryParts: string[] = [];

    // Build $filter parameter from SQL WHERE conditions
    const filterConditions: string[] = [];
    
    Object.entries(parameters).forEach(([key, value]) => {
      // Skip utility parameters
      if (['limit', 'offset', 'timestamp', 'orderBy', 'orderDirection', 'serviceType', 'entityType', 'legacyFilter'].includes(key)) {
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

    // Handle LIMIT -> $top
    if (parameters.limit) {
      queryParts.push(`$top=${parameters.limit}`);
    }

    // Handle OFFSET -> $skip
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
   * @param {APIRequestConfig} config - Configuration for the REST request
   * @param {StoredOAuth2Token} token - OAuth2 token for authentication
   * @returns {Promise<RemoteAPIQueryResult>} Result of the API call
   * @throws {Error} If the API request fails
   */
  static async executeQuery(config: APIRequestConfig, token: StoredOAuth2Token): Promise<RemoteAPIQueryResult> {
    try {
      // Build the OData URL
      const baseUrl = config.fullUrl || this.buildIONODataUrl(
        config.tenant,
        config.oDataService || '',
        config.entityName || config.table
      );

      // Generate OData query parameters
      const queryString = this.generateODataQuery(config.parameters || {});
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      // Determine HTTP method based on action
      const method = this.getHttpMethod(config.action);

      // Prepare request body for POST/PUT operations
      let body: string | undefined;
      let contentType = 'application/json';

      if (method === 'POST' || method === 'PUT') {
        // For create/update operations, prepare JSON body
        body = JSON.stringify(config.parameters || {});
      }

      // Make the REST API request
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': contentType,
          'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ION OData API Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();

      // Parse OData response
      const parsedData = this.parseODataResponse(responseData, config.entityName || config.table);

      return {
        success: true,
        url: url,
        action: config.action,
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        rawResponse: JSON.stringify(responseData, null, 2), // Pretty-printed JSON
        note: `ION OData API ${config.action} operation completed successfully`
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Converts action to HTTP method
   * @private
   * @static
   * @param {string} action - API action (List, Create, Update, Delete)
   * @returns {string} HTTP method (GET, POST, PUT, DELETE)
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
   * Parses OData JSON response to extract structured data
   * @private
   * @static
   * @param {any} responseData - Raw OData response
   * @param {string} entityName - Entity name for context
   * @returns {object} Parsed structured data
   */
  private static parseODataResponse(responseData: any, entityName: string): {
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
        const records = responseData.value;
        return {
          success: true,
          serviceType: 'OData',
          recordCount: records.length,
          records: records,
          summary: `Retrieved ${records.length} records from ${entityName} via OData API`,
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