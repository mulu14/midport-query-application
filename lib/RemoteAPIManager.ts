/**
 * @fileoverview Remote API Manager for SOAP API interactions
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

import type { RemoteAPITenant, RemoteAPITable, SOAPRequestConfig, RemoteAPIQueryResult } from '@/Entities/RemoteAPI';

/**
 * Remote API Manager class for handling SOAP API operations
 * Provides methods for building URLs, generating SOAP envelopes, and executing queries
 * @class RemoteAPIManager
 */
export class RemoteAPIManager {
  private static readonly BASE_URL = 'https://mingle-ionapi.eu1.inforcloudsuite.com';
  private static readonly SERVICE_PATH = 'LN/c4ws/services';

  /**
   * Builds the complete API URL for a tenant and table
   * @static
   * @param {string} tenant - The tenant name
   * @param {string} table - The table endpoint
   * @returns {string} Complete API URL
   */
  static buildAPIUrl(tenant: string, table: string): string {
    return `${this.BASE_URL}/${tenant}/${this.SERVICE_PATH}/${table}`;
  }

  /**
   * Generates a SOAP envelope for API requests
   * @static
   * @param {string} action - The SOAP action to perform
   * @param {Record<string, any>} [parameters={}] - Optional parameters for the request
   * @returns {string} Complete SOAP envelope XML
   */
  static generateSOAPEnvelope(action: string, parameters: Record<string, any> = {}): string {
    const paramXml = Object.entries(parameters)
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${action} xmlns="http://www.infor.com/ln/c4ws">
      ${paramXml}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Executes a query against the remote API
   * Sends SOAP request and returns the result
   * Uses the fullUrl from config if provided, otherwise builds URL from tenant/table
   * @static
   * @async
   * @param {SOAPRequestConfig} config - Configuration for the SOAP request
   * @returns {Promise<RemoteAPIQueryResult>} Result of the API call
   * @throws {Error} If the API request fails
   */
  static async executeQuery(config: SOAPRequestConfig): Promise<RemoteAPIQueryResult> {
    try {
      // Use fullUrl from config if provided, otherwise build URL from tenant/table
      const url = config.fullUrl || this.buildAPIUrl(config.tenant, config.table);
      const soapEnvelope = this.generateSOAPEnvelope(config.action, config.parameters);

      console.log('🔗 RemoteAPIManager: Executing query');
      console.log('📍 URL:', url);
      console.log('📋 Action:', config.action);
      console.log('📦 Parameters:', config.parameters);
      console.log('📄 SQL Query:', config.sqlQuery);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"${config.action}"`,
          'Accept': 'text/xml',
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('✅ RemoteAPIManager: Request successful');
      console.log('📄 Response:', responseText.substring(0, 500) + '...'); // Log first 500 chars

      // For Phase One, we just return success without processing the response
      return {
        success: true,
        url: url,
        action: config.action,
        status: response.status,
        statusText: response.statusText,
        note: 'Response processing will be implemented in Phase Two'
      };

    } catch (error) {
      console.error('❌ RemoteAPIManager: Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get list of available tenants (for now returns hardcoded list)
   */
  static async getTenants(): Promise<RemoteAPITenant[]> {
    // In a real implementation, this would fetch from an API
    // For Phase One, return hardcoded tenants
    return [
      {
        id: 'midport_dem',
        name: 'MIDPORT_DEM',
        status: 'connected',
        tables: [
          { name: 'ServiceCall_v2', endpoint: 'ServiceCall_v2' },
          { name: 'Customer_v1', endpoint: 'Customer_v1' },
          { name: 'Order_v1', endpoint: 'Order_v1' }
        ]
      },
      {
        id: 'midport_prod',
        name: 'MIDPORT_PROD',
        status: 'connected',
        tables: [
          { name: 'ServiceCall_v2', endpoint: 'ServiceCall_v2' },
          { name: 'Customer_v1', endpoint: 'Customer_v1' },
          { name: 'Product_v1', endpoint: 'Product_v1' }
        ]
      }
    ];
  }

  /**
   * Test connection to a tenant
   */
  static async testTenantConnection(tenant: string): Promise<boolean> {
    try {
      // Simple ping test - in real implementation, this might do a lightweight API call
      const url = `${this.BASE_URL}/${tenant}/${this.SERVICE_PATH}/ping`;

      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to test connectivity without full response
        headers: {
          'Accept': 'text/xml',
        },
      });

      return response.ok || response.status === 405; // 405 means method not allowed but endpoint exists
    } catch (error) {
      console.error(`❌ RemoteAPIManager: Connection test failed for tenant ${tenant}:`, error);
      return false;
    }
  }

  /**
   * Generate a sample query for a table (for demo purposes)
   */
  static generateSampleQuery(table: RemoteAPITable): SOAPRequestConfig {
    return {
      tenant: 'MIDPORT_DEM', // Default tenant
      table: table.endpoint,
      action: 'Read',
      parameters: {
        // Add default parameters if needed
      }
    };
  }
}
