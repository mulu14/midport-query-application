/**
 * @fileoverview Unified Response Parser for SOAP and REST API responses
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { RemoteAPIQueryResult } from '@/Entities/RemoteAPI';

/**
 * Unified Response Parser that handles both SOAP XML and REST JSON responses
 * @class ResponseParser
 */
export class ResponseParser {

  /**
   * Parses either SOAP XML or REST JSON response based on content type
   * @static
   * @param {RemoteAPIQueryResult} rawResult - Raw result from API manager
   * @param {number} [limit] - Optional limit for number of records to return
   * @returns {RemoteAPIQueryResult} Processed result with unified data structure
   */
  static parseUnifiedResponse(rawResult: RemoteAPIQueryResult, limit?: number): RemoteAPIQueryResult {
    try {
      // Determine response type based on content
      const isXMLResponse = rawResult.rawResponse?.includes('<?xml') || rawResult.rawResponse?.includes('<soap:');
      const isJSONResponse = rawResult.rawResponse?.startsWith('{') || rawResult.rawResponse?.startsWith('[');
      
      // 🔍 LOG UNIFIED RESPONSE METADATA
      console.log('🔄 Unified Parser Metadata:', {
        action: rawResult.action,
        url: rawResult.url,
        success: rawResult.success,
        status: rawResult.status,
        responseSize: rawResult.rawResponse?.length || 0,
        isXMLResponse,
        isJSONResponse,
        limit,
        hasData: !!rawResult.data,
        dataRecordCount: rawResult.data?.recordCount || 0
      });

      if (isXMLResponse) {
        return this.parseSOAPResponse(rawResult, limit);
      } else if (isJSONResponse) {
        return this.parseRESTResponse(rawResult, limit);
      } else {
        // Unknown format - return as is with error flag
        return {
          ...rawResult,
          data: {
            success: false,
            serviceType: 'Unknown',
            recordCount: 0,
            records: [],
            summary: 'Unknown response format',
            error: true,
            message: 'Could not determine response format',
            type: 'unknown_format'
          }
        };
      }
    } catch (error) {
      return {
        ...rawResult,
        success: false,
        data: {
          success: false,
          serviceType: 'Parser',
          recordCount: 0,
          records: [],
          summary: 'Failed to parse response',
          error: true,
          message: error instanceof Error ? error.message : String(error),
          type: 'parse_error'
        }
      };
    }
  }

  /**
   * Parses SOAP XML response
   * @private
   * @static
   * @param {RemoteAPIQueryResult} rawResult - Raw SOAP result
   * @param {number} [limit] - Optional limit for number of records
   * @returns {RemoteAPIQueryResult} Processed SOAP result
   */
  private static parseSOAPResponse(rawResult: RemoteAPIQueryResult, limit?: number): RemoteAPIQueryResult {
    try {
      if (!rawResult.rawResponse) {
        throw new Error('No SOAP response data to parse');
      }

      // Parse SOAP XML response
      const xmlData = rawResult.rawResponse;
      let records = this.extractSOAPRecords(xmlData);
      
      // Apply client-side limit if specified
      const originalCount = records.length;
      if (limit && records.length > limit) {
        records = records.slice(0, limit);
      }
      
      const summary = limit && originalCount > limit 
        ? `Retrieved ${records.length} of ${originalCount} records via SOAP API (limited for performance)`
        : `Retrieved ${records.length} records via SOAP API`;

      return {
        ...rawResult,
        data: {
          success: true,
          serviceType: 'SOAP',
          recordCount: records.length,
          records: records,
          summary: summary,
          type: 'soap_response'
        }
      };

    } catch (error) {
      return {
        ...rawResult,
        success: false,
        data: {
          success: false,
          serviceType: 'SOAP',
          recordCount: 0,
          records: [],
          summary: 'Failed to parse SOAP response',
          error: true,
          message: error instanceof Error ? error.message : String(error),
          type: 'soap_error'
        }
      };
    }
  }

  /**
   * Parses REST JSON response  
   * @private
   * @static
   * @param {RemoteAPIQueryResult} rawResult - Raw REST result
   * @param {number} [limit] - Optional limit for number of records
   * @returns {RemoteAPIQueryResult} Processed REST result
   */
  private static parseRESTResponse(rawResult: RemoteAPIQueryResult, limit?: number): RemoteAPIQueryResult {
    try {
      if (!rawResult.rawResponse) {
        throw new Error('No REST response data to parse');
      }

      // Parse JSON response
      const jsonData = JSON.parse(rawResult.rawResponse);
      let records: any[] = [];

      // Handle OData collection responses (standard format for any OData service)
      if (jsonData.value && Array.isArray(jsonData.value)) {
        records = jsonData.value;
      } 
      // Handle single entity responses (any OData service can return single entities)
      else if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData) && !jsonData.error) {
        records = [jsonData];
      }
      // Handle direct array responses (some services might return arrays directly)
      else if (Array.isArray(jsonData)) {
        records = jsonData;
      }
      // Handle OData error responses
      else if (jsonData.error) {
        throw new Error(`OData Service Error: ${jsonData.error.message || 'Unknown error'}`);
      }
      
      // Apply client-side limiting (we get full response from server and limit display)
      const originalCount = records.length;
      if (limit && records.length > limit) {
        records = records.slice(0, limit);
      }
      
      const summary = limit && originalCount > limit 
        ? `Retrieved ${records.length} of ${originalCount} records via OData REST API (client-side limited)`
        : `Retrieved ${records.length} records via OData REST API`;

      return {
        ...rawResult,
        data: {
          success: true,
          serviceType: 'OData',
          recordCount: records.length,
          records: records,
          summary: summary,
          type: 'rest_response'
        }
      };

    } catch (error) {
      return {
        ...rawResult,
        success: false,
        data: {
          success: false,
          serviceType: 'REST',
          recordCount: 0,
          records: [],
          summary: 'Failed to parse REST response',
          error: true,
          message: error instanceof Error ? error.message : String(error),
          type: 'rest_error'
        }
      };
    }
  }

  /**
   * Extracts records from SOAP XML response
   * @private
   * @static
   * @param {string} xmlData - SOAP XML response string
   * @returns {any[]} Array of extracted records
   */
  private static extractSOAPRecords(xmlData: string): any[] {
    try {
      const records: any[] = [];

      // Remove namespaces and soap envelope for easier parsing
      let cleanXml = xmlData
        .replace(/xmlns[^=]*="[^"]*"/g, '') // Remove namespace declarations
        .replace(/soap\w*:/g, '') // Remove soap prefixes
        .replace(/\w+:/g, '') // Remove other prefixes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Extract the main data area
      const dataAreaMatch = cleanXml.match(/<DataArea[^>]*>(.*?)<\/DataArea>/s);
      if (!dataAreaMatch) {
        // Try to extract from Body if no DataArea
        const bodyMatch = cleanXml.match(/<Body[^>]*>(.*?)<\/Body>/s);
        cleanXml = bodyMatch ? bodyMatch[1] : cleanXml;
      } else {
        cleanXml = dataAreaMatch[1];
      }

      // Find repeating entity patterns (common SOAP structure)
      const entityPatterns = [
        // Common ION entity patterns
        /<([A-Z]\w+)>(.*?)<\/\1>/gs,
        // Service call patterns
        /<ServiceCall[^>]*>(.*?)<\/ServiceCall>/gs,
        // Customer patterns
        /<Customer[^>]*>(.*?)<\/Customer>/gs,
        // Order patterns
        /<Order[^>]*>(.*?)<\/Order>/gs,
        // Generic item patterns
        /<Item[^>]*>(.*?)<\/Item>/gs
      ];

      for (const pattern of entityPatterns) {
        const matches = cleanXml.matchAll(pattern);
        for (const match of matches) {
          const record = this.parseXMLEntity(match[2] || match[1]);
          if (record && Object.keys(record).length > 0) {
            records.push(record);
          }
        }
        if (records.length > 0) break; // Found records with this pattern
      }

      // If no structured records found, try to parse the entire response as one record
      if (records.length === 0) {
        const record = this.parseXMLEntity(cleanXml);
        if (record && Object.keys(record).length > 0) {
          records.push(record);
        }
      }

      // 🔍 LOG SOAP EXTRACTION RESULTS
      console.log('🧼 SOAP Record Extraction:', {
        totalRecordsFound: records.length,
        hasDataArea: xmlData.includes('<DataArea'),
        cleanedXmlLength: cleanXml.length,
        entityPatternsUsed: entityPatterns.length,
        sampleRecord: records[0] ? Object.keys(records[0]).slice(0, 5) : [],
        recordFieldCounts: records.map(r => Object.keys(r).length).slice(0, 5)
      });
      
      return records;
    } catch (error) {
      console.log('❌ SOAP Extraction Error:', error);
      return [];
    }
  }

  /**
   * Parses an XML entity into a JavaScript object
   * @private
   * @static
   * @param {string} xmlEntity - XML entity string
   * @returns {any} Parsed object
   */
  private static parseXMLEntity(xmlEntity: string): any {
    const entity: any = {};

    if (!xmlEntity) return entity;

    // Extract simple elements (non-nested)
    const elementPattern = /<([^/>]+)>([^<]*)<\/\1>/g;
    let match;

    while ((match = elementPattern.exec(xmlEntity)) !== null) {
      const fieldName = match[1];
      const fieldValue = match[2]?.trim();
      
      if (fieldName && fieldValue !== undefined) {
        // Convert to appropriate data type
        if (fieldValue === 'true' || fieldValue === 'false') {
          entity[fieldName] = fieldValue === 'true';
        } else if (!isNaN(Number(fieldValue)) && fieldValue !== '') {
          entity[fieldName] = Number(fieldValue);
        } else {
          entity[fieldName] = fieldValue;
        }
      }
    }

    return entity;
  }

  /**
   * Creates a display-friendly summary of the parsed data
   * @static
   * @param {RemoteAPIQueryResult} result - Parsed result
   * @returns {string} Human-readable summary
   */
  static createSummary(result: RemoteAPIQueryResult): string {
    if (!result.data) {
      return `${result.action} operation completed (no data structure)`;
    }

    const { data } = result;
    
    if (data.error) {
      return `❌ ${data.summary}: ${data.message}`;
    }

    if (data.recordCount === 0) {
      return `📄 No records found via ${data.serviceType} API`;
    }

    if (data.recordCount === 1) {
      return `📄 Retrieved 1 record via ${data.serviceType} API`;
    }

    return `📊 Retrieved ${data.recordCount} records via ${data.serviceType} API`;
  }
}