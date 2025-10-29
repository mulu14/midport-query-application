/**
 * @fileoverview REST API Manager for ION OData API interactions ONLY
 * 
 * ⚠️ CRITICAL: This file handles REST/OData API operations exclusively.
 * 
 * ARCHITECTURE SEPARATION:
 * ========================
 * - This file (RestAPIManager.ts) → REST/OData APIs ONLY
 * - RemoteAPIManager.ts → SOAP APIs ONLY
 * - DO NOT mix SOAP and REST logic in the same file
 * - Each API type has completely separate request/response handling
 * 
 * REST/OData API Specifics:
 * - Uses HTTP GET/POST/PUT/DELETE with JSON payloads
 * - OData v4 query parameters ($filter, $expand, $orderby, $top, $skip)
 * - RESTful URL-based operations
 * - No SOAP XML envelopes
 * 
 * Supported OData Features:
 * - $filter: WHERE clause conversion with advanced operators (BETWEEN, IS NULL, etc.)
 * - $expand: JOIN-like navigation property expansion
 * - $orderby: Sorting
 * - $top/$skip: Pagination
 * 
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { APIRequestConfig, RemoteAPIQueryResult, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { OAuth2ConfigManager } from './OAuth2ConfigManager';
import { TenantConfigManager } from './TenantConfigManager';
import { SchemaExtractor, type TableSchema } from './utils/SchemaExtractor';

/**
 * REST API Manager class for handling ION OData API operations
 * 
 * ⚠️ WARNING: This class is for REST/OData APIs ONLY. Do not add SOAP logic here.
 * For SOAP APIs, use RemoteAPIManager.ts instead.
 * 
 * Provides methods for:
 * - Building OData query URLs with $filter, $expand, etc.
 * - Making authenticated REST requests to Infor ION OData APIs
 * - Parsing JSON responses
 * - Converting SQL WHERE clauses to OData $filter syntax
 * 
 * Implements proper OData v4 standards for ION API
 * 
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
   * 
   * ⚠️ REST/OData ONLY: This method generates OData query strings for REST APIs.
   * For SOAP APIs, use RemoteAPIManager.generateSOAPEnvelope() instead.
   * 
   * PARAMETER FILTERING:
   * ====================
   * The following parameters are filtered out and NOT included in the OData query:
   * - baseTable, baseEndpoint: Internal validation parameters
   * - limit, offset, timestamp: Handled client-side or separately
   * - orderBy, orderDirection: Converted to $orderby
   * - company: Sent as X-Infor-LnCompany header
   * - expand, $expand: Converted to $expand parameter
   * - _operator, _value2: Internal SQL parsing metadata
   * 
   * ADVANCED OPERATOR SUPPORT (REST ONLY):
   * ======================================
   * - BETWEEN: Converted to (field ge value1 and field le value2)
   * - IS NULL: Converted to field eq null
   * - IS NOT NULL: Converted to field ne null
   * - NOT: Converted to not(condition)
   * - LIKE: Converted to contains(field, 'value')
   * - IN: Converted to (field eq 'val1' or field eq 'val2')
   * 
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
      if (['limit', 'offset', 'timestamp', 'orderBy', 'orderDirection', 'serviceType', 'entityType', 'legacyFilter', 'company', 'expand', '$expand', 'baseTable', 'baseEndpoint'].includes(key)) {
        return;
      }
      
      // Skip operator parameters and special suffixes
      if (key.endsWith('_operator') || key.endsWith('_value2')) {
        return;
      }

      // Get the operator for this field
      const operatorKey = `${key}_operator`;
      const sqlOperator = parameters[operatorKey] || 'eq';
      
      // Handle special operators
      
      // IS NULL operator
      if (sqlOperator === 'is_null' || (value === null && sqlOperator === 'eq')) {
        filterConditions.push(`${key} eq null`);
        return;
      }
      
      // IS NOT NULL operator
      if (sqlOperator === 'is_not_null' || (value === null && sqlOperator === 'ne')) {
        filterConditions.push(`${key} ne null`);
        return;
      }
      
      // BETWEEN operator - convert to: (field ge value1 and field le value2)
      if (sqlOperator === 'between') {
        const value2Key = `${key}_value2`;
        const value2 = parameters[value2Key];
        if (value2 !== undefined) {
          const val1 = typeof value === 'string' ? `'${this.escapeODataValue(value)}'` : value;
          const val2 = typeof value2 === 'string' ? `'${this.escapeODataValue(value2)}'` : value2;
          filterConditions.push(`(${key} ge ${val1} and ${key} le ${val2})`);
          return;
        }
      }
      
      // NOT operator - negate the condition
      if (sqlOperator === 'not') {
        if (typeof value === 'string') {
          filterConditions.push(`not(${key} eq '${this.escapeODataValue(value)}')`);
        } else {
          filterConditions.push(`not(${key} eq ${value})`);
        }
        return;
      }
      
      // Convert SQL operators to OData operators
      const oDataOperator = this.convertToODataOperator(sqlOperator);
      
      // Handle different value types
      if (Array.isArray(value)) {
        // Handle IN operator - convert to multiple OR conditions
        const inConditions = value.map(v => `${key} eq '${this.escapeODataValue(v)}'`).join(' or ');
        filterConditions.push(`(${inConditions})`);
      } else if (value === null) {
        // Handle null values
        filterConditions.push(`${key} ${oDataOperator} null`);
      } else if (typeof value === 'string') {
        // Handle LIKE/contains operator
        if (oDataOperator === 'contains') {
          filterConditions.push(`contains(${key}, '${this.escapeODataValue(value)}')`);
        } else {
          filterConditions.push(`${key} ${oDataOperator} '${this.escapeODataValue(value)}'`);
        }
      } else {
        // Handle numeric and boolean values
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

    // Handle EXPAND for nested objects/arrays ($expand parameter from OData API)
    if (parameters.expand) {
      if (Array.isArray(parameters.expand)) {
        // Handle array of expand entities: ['SoldToBPRef', 'LineRefs', 'ShipToBPRef']
        const expandQuery = `$expand=${parameters.expand.join(',')}`;
        queryParts.push(expandQuery);
      } else if (typeof parameters.expand === 'string') {
        // Handle comma-separated string: 'SoldToBPRef,LineRefs,ShipToBPRef'
        const expandQuery = `$expand=${parameters.expand}`;
        queryParts.push(expandQuery);
      }
    }
    
    // Handle direct $expand parameter (alternative syntax)
    if (parameters['$expand']) {
      if (Array.isArray(parameters['$expand'])) {
        const expandQuery = `$expand=${parameters['$expand'].join(',')}`;
        queryParts.push(expandQuery);
      } else {
        const expandQuery = `$expand=${parameters['$expand']}`;
        queryParts.push(expandQuery);
      }
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
      if (['limit', 'offset', 'timestamp', 'orderBy', 'orderDirection', 'serviceType', 'entityType', 'legacyFilter', 'company', 'expand', '$expand', 'baseTable', 'baseEndpoint'].includes(key)) {
        return;
      }
      
      // Skip operator parameters and special suffixes
      if (key.endsWith('_operator') || key.endsWith('_value2')) {
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
   * @param {string} sqlOperator - SQL operator (eq, ne, gt, lt, ge, le, like, between, is_null, is_not_null, not)
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
      'like': 'contains', // OData uses 'contains' for LIKE functionality
      'between': 'between', // Handled specially in generateODataQuery
      'is_null': 'eq', // field eq null
      'is_not_null': 'ne', // field ne null  
      'not': 'not' // not(condition)
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
    // Use expand fields from configuration if available
    const modifiedParams = { ...(config.parameters || {}) };
    if (config.expandFields && config.expandFields.length > 0) {
      modifiedParams.expand = config.expandFields.join(',');
    }
    
    const queryString = this.generateODataQuery(modifiedParams);
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      // Convert API action to appropriate HTTP method
      const method = this.getHttpMethod(config.action);
      
      // Prepare request body for create/update operations
      let body: string | undefined;
      const contentType = 'application/json';

      if (method === 'POST' || method === 'PUT') {
        body = JSON.stringify(config.parameters || {});
      }

      // Get tenant-specific headers from database by tenant name
      const tenant = await TenantConfigManager.getTenantByName(config.tenant);
      const tenantHeaders: { lnCompany: string | null; lnIdentity: string | null } = tenant ? 
        await TenantConfigManager.getTenantInforHeaders(tenant.id) : 
        { lnCompany: null, lnIdentity: null };
        
      // Convert to HTTP header format
      const httpHeaders: Record<string, string> = {};
      if (tenantHeaders.lnCompany) {
        httpHeaders['X-Infor-LnCompany'] = tenantHeaders.lnCompany; 
      }
      if (tenantHeaders.lnIdentity) {
        httpHeaders['X-Infor-LnIdentity'] = tenantHeaders.lnIdentity;
      }

      // Prepare headers with OAuth2 authentication and tenant-specific LN headers
      const headers = {
        'Accept': 'application/json',
        'Content-Type': contentType,
        'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        ...httpHeaders // Include tenant-specific X-Infor-LnCompany and X-Infor-LnIdentity
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

      // Extract schema metadata from the parsed response
      let schemaMetadata: TableSchema | undefined = undefined;
      try {
        if (parsedData.records && parsedData.records.length > 0) {
          // Create a result object that matches RemoteAPIQueryResult interface
          const resultForSchema = {
            success: true,
            url: url,
            action: config.action,
            status: response.status,
            statusText: response.statusText,
            data: parsedData,
            rawResponse: JSON.stringify(responseData, null, 2),
            note: `ION OData API ${config.action} operation completed successfully`,
            records: parsedData.records
          };
          
          schemaMetadata = SchemaExtractor.extractSchema(
            resultForSchema,
            config.entityName || config.table || 'UnknownEntity',
            config.tenant,
            `SELECT * FROM ${config.entityName || config.table}`
          );
          console.log('🔍 REST Schema extracted:', {
            entityName: config.entityName || config.table,
            fieldCount: schemaMetadata?.fields?.length || 0,
            fields: schemaMetadata?.fields?.map(f => `${f.fieldName}: ${f.dataType}`).slice(0, 5)
          });
        }
      } catch (schemaError) {
        console.warn('⚠️ Schema extraction failed for REST response:', schemaError);
      }

      return {
        success: true,
        url: url,
        action: config.action,
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        schema: schemaMetadata,
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