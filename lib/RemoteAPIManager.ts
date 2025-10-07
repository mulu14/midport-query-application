/**
 * @fileoverview Remote API Manager for SOAP API interactions
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { RemoteAPITenant, RemoteAPITable, SOAPRequestConfig, RemoteAPIQueryResult, OAuth2Config, StoredOAuth2Token } from '@/Entities/RemoteAPI';
import { OAuth2ConfigManager } from './OAuth2ConfigManager';

/**
 * Remote API Manager class for handling ION API operations
 * Provides methods for making authenticated SOAP requests to Infor ION APIs
 * @class RemoteAPIManager
 */
export class RemoteAPIManager {
  private static readonly BASE_URL = 'https://mingle-ionapi.eu1.inforcloudsuite.com';

  /**
   * Builds the complete ION API URL for a tenant and service
   * @static
   * @param {string} tenant - The tenant name (e.g., 'MIDPORT_DEM')
   * @param {string} service - The service name (e.g., 'ServiceCall_v2', 'Customer_v1')
   * @returns {string} Complete ION API URL
   */
  static buildIONAPIUrl(tenant: string, service: string): string {
    return `${this.BASE_URL}/${tenant}/LN/c4ws/services/${service}`;
  }

  /**
   * Generates a SOAP envelope for ION API requests with company parameter support
   * @static
   * @param {string} action - The SOAP action to perform (e.g., 'list', 'create', 'update', 'delete')
   * @param {Record<string, any>} [parameters={}] - Optional parameters for the request
   * @param {string} [company=''] - Company code for ION API activation header
   * @param {string} [service=''] - The ION service name (e.g., 'ServiceCall_v2', 'Customer_v1', 'WarehouseOrder_v2')
   * @returns {string} Complete SOAP envelope XML
   */
  static generateSOAPEnvelope(action: string, parameters: Record<string, any> = {}, company: string = '', service: string = ''): string {
    // Generate dynamic business interface namespace based on service name
    // Pattern: ServiceName comes as complete parameter (e.g., "ServiceCall_v2")
    const getBusinessInterfaceNamespace = (serviceName: string): string => {
      // Use service name directly as it comes as complete parameter
      return `http://www.infor.com/businessinterface/${serviceName}`;
    };

    // Get the appropriate namespace for this service
    const businessInterfaceNamespace = getBusinessInterfaceNamespace(service);

    // Build parameters XML based on the action type and service
    let paramXml = '';

    if (action.toLowerCase() === 'list' || action.toLowerCase() === 'read') {
      // Build generic ListRequest for all ION API services
      if (Object.keys(parameters).length > 0) {
        // Build filter conditions from parsed SQL or direct parameters
        const filterConditions = Object.entries(parameters)
          .filter(([key, value]) => 
            key !== 'limit' && 
            key !== 'offset' && 
            key !== 'timestamp' && 
            key !== 'orderBy' && 
            key !== 'orderDirection' &&
            key !== 'serviceType' &&
            key !== 'entityType' &&
            key !== 'legacyFilter' &&
            !key.endsWith('_operator')
          )
          .map(([key, value]) => {
            // Check if there's a specific operator for this field
            const operatorKey = `${key}_operator`;
            const comparisonOperator = parameters[operatorKey] || 'eq';
            
            // Handle array values (for IN operator)
            if (Array.isArray(value)) {
              return `
                  <ComparisonExpression>
                    <comparisonOperator>in</comparisonOperator>
                    <attributeName>${key}</attributeName>
                    <instanceValue>${value.join(',')}</instanceValue>
                  </ComparisonExpression>`;
            } else {
              return `
                  <ComparisonExpression>
                    <comparisonOperator>${comparisonOperator}</comparisonOperator>
                    <attributeName>${key}</attributeName>
                    <instanceValue>${value}</instanceValue>
                  </ComparisonExpression>`;
            }
          })
          .join('');

        if (filterConditions) {
          paramXml = `
            <ListRequest>
              <ControlArea>
                <Filter>${filterConditions}
                </Filter>
              </ControlArea>
            </ListRequest>`;
        } else {
          // Simple ListRequest without filters
          paramXml = `
            <ListRequest>
              <ControlArea/>
            </ListRequest>`;
        }
      } else {
        // Default ListRequest for generic list operations
        paramXml = `
            <ListRequest>
              <ControlArea/>
            </ListRequest>`;
      }
    } else {
      // For other actions, build parameter XML directly
      paramXml = Object.entries(parameters)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join('');
    }
    

    // Build company header if provided
    const companyHeader = company ? `
        <vrt:Activation>
          <company>${company}</company>
        </vrt:Activation>` : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:vrt="${businessInterfaceNamespace}">
    <soapenv:Header>${companyHeader}
    </soapenv:Header>
    <soapenv:Body>
        <vrt:${action}>${paramXml}
        </vrt:${action}>
    </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Executes a query against the remote API with OAuth2 authentication
   * @static
   * @async
   * @param {SOAPRequestConfig} config - Configuration for the SOAP request
   * @param {string} username - Username for OAuth2 authentication
   * @param {string} password - Password for OAuth2 authentication
   * @param {StoredOAuth2Token | null} [currentToken] - Current token (if any)
   * @returns {Promise<RemoteAPIQueryResult>} Result of the API call
   * @throws {Error} If the API request fails
   */
  static async executeQueryWithOAuth2(
    config: SOAPRequestConfig,
    username: string,
    password: string,
    currentToken?: StoredOAuth2Token | null
  ): Promise<RemoteAPIQueryResult> {
    try {
      // Load OAuth2 configuration from environment variables (includes service account keys and client credentials)
      const oauth2Config = OAuth2ConfigManager.loadConfigFromEnv();

      // Note: Password credentials grant uses service account keys
      // The OAuth2Config already contains the service account access key and secret key

      // Get or refresh token as needed
      const token = await OAuth2ConfigManager.getValidToken(currentToken ?? null, oauth2Config);

      // Execute query with OAuth2 headers
      return await this.executeQueryWithToken(config, token);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Executes a SOAP request against the ION API with OAuth2 token
   * @static
   * @async
   * @param {SOAPRequestConfig} config - Configuration for the SOAP request
   * @param {StoredOAuth2Token} token - OAuth2 token
   * @returns {Promise<RemoteAPIQueryResult>} Result of the API call
   * @throws {Error} If the API request fails
   */
  static async executeQueryWithToken(config: SOAPRequestConfig, token: StoredOAuth2Token): Promise<RemoteAPIQueryResult> {
    try {
      const url = config.fullUrl || this.buildIONAPIUrl(config.tenant, config.table);

      // Execute ION API SOAP request with OAuth2

      const soapEnvelope = this.generateSOAPEnvelope(config.action, config.parameters, config.company || '', config.table);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"${config.action}"`,
          'Accept': 'text/xml',
          'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ION API Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();

      // Parse SOAP response to extract structured data
      const parsedData = this.parseSOAPResponse(responseText, config.table);

      return {
        success: true,
        url: url,
        action: config.action,
        status: response.status,
        statusText: response.statusText,
        data: parsedData, // Parsed structured data
        rawResponse: responseText, // Keep raw XML for debugging
        note: `ION API ${config.action} operation completed successfully`
      };

    } catch (error) {
      throw error;
    }
  }



  /**
   * Get list of available ION API tenants and their services
   */
  static async getTenants(): Promise<RemoteAPITenant[]> {
    // In a real implementation, this would fetch from ION API discovery endpoint
    // For Phase One, return hardcoded tenants with available services
    return [
      {
        id: 'midport_dem',
        name: 'MIDPORT_DEM',
        status: 'connected',
        tables: [ // Actually ION API services
          { name: 'ServiceCall_v2', endpoint: 'ServiceCall_v2' },
          { name: 'Customer_v1', endpoint: 'Customer_v1' },
          { name: 'Order_v1', endpoint: 'Order_v1' }
        ]
      },
      {
        id: 'midport_prod',
        name: 'MIDPORT_PROD',
        status: 'connected',
        tables: [ // Actually ION API services
          { name: 'ServiceCall_v2', endpoint: 'ServiceCall_v2' },
          { name: 'Customer_v1', endpoint: 'Customer_v1' },
          { name: 'Product_v1', endpoint: 'Product_v1' }
        ]
      }
    ];
  }

  /**
   * Test connection to ION API tenant
   */
  static async testTenantConnection(tenant: string): Promise<boolean> {
    try {
      // Test ION API connectivity by making a HEAD request to base tenant URL
      const url = `${this.BASE_URL}/${tenant}/LN/c4ws/services`;

      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Accept': 'application/json',
        },
      });

      return response.ok || response.status === 405; // 405 means method not allowed but endpoint exists
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse SOAP XML response and extract structured data
   * @static
   * @param {string} xmlResponse - Raw SOAP XML response
   * @param {string} serviceName - Name of the ION API service
   * @returns {Object} Parsed structured data
   */
  static parseSOAPResponse(xmlResponse: string, serviceName: string): any {
    try {
      // Check if response contains a SOAP fault
      if (xmlResponse.includes('<S:Fault>') || xmlResponse.includes('<soap:Fault>')) {
        const faultMatch = xmlResponse.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
        const errorMessage = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
        return {
          error: true,
          message: errorMessage,
          type: 'SOAP_FAULT',
          rawResponse: xmlResponse
        };
      }

      // Extract the main response body
      const bodyMatch = xmlResponse.match(/<S:Body[^>]*>([\s\S]*?)<\/S:Body>/);
      if (!bodyMatch) {
        return {
          error: true,
          message: 'Could not parse SOAP body',
          type: 'PARSE_ERROR',
          rawResponse: xmlResponse
        };
      }

      const bodyContent = bodyMatch[1];
      
      // Try to find the main data container (ServiceCall_v2, Customer_v1, etc.)
      // This makes it service-agnostic by looking for repeated elements
      const records: any[] = [];
      
      // Find all potential record containers by looking for elements that contain many child elements
      // This pattern works for ServiceCall_v2, Customer_v1, Order_v1, etc.
      const servicePattern = new RegExp(`<${serviceName}[^>]*>([\\s\\S]*?)<\/${serviceName}>`, 'g');
      let serviceMatch;
      
      // If we find service-specific containers, parse them
      while ((serviceMatch = servicePattern.exec(bodyContent)) !== null) {
        const serviceContent = serviceMatch[1];
        const record: any = { id: records.length + 1 };
        
        // Extract all field elements from this record
        const fieldPattern = /<([^\s>]+)[^>]*>([\s\S]*?)<\/\1>/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldPattern.exec(serviceContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldContent = fieldMatch[2].trim();
          
          // Skip nested complex elements (like Comment blocks) for now, just get simple values
          if (fieldContent && !fieldContent.includes('<')) {
            // Handle null values
            if (fieldContent === 'xsi:nil="true"' || fieldContent === '') {
              record[fieldName] = null;
            } else {
              record[fieldName] = fieldContent;
            }
          }
        }
        
        if (Object.keys(record).length > 1) { // More than just the 'id' field
          records.push(record);
        }
      }
      
      // If no service-specific containers found, try to parse as generic XML structure
      if (records.length === 0) {
        const genericRecord: any = { id: 1 };
        const allTags = bodyContent.match(/<[^/\s>!?][^>]*>([^<]*)<\/[^>]+>/g) || [];
        
        allTags.forEach(tag => {
          const tagMatch = tag.match(/<([^\s>]+)[^>]*>([^<]*)<\/[^>]+>/);
          if (tagMatch && tagMatch[2].trim()) {
            const fieldName = tagMatch[1];
            const fieldValue = tagMatch[2].trim();
            genericRecord[fieldName] = fieldValue;
          }
        });
        
        if (Object.keys(genericRecord).length > 1) {
          records.push(genericRecord);
        }
      }
      
      return {
        success: true,
        serviceType: serviceName,
        recordCount: records.length,
        records: records,
        summary: `Found ${records.length} ${serviceName} record(s)`,
        rawResponse: xmlResponse
      };
      
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        type: 'PARSE_ERROR',
        rawResponse: xmlResponse
      };
    }
  }

  /**
   * Generate a sample ION API request configuration (for demo purposes)
   */
  static generateSampleQuery(service: RemoteAPITable): SOAPRequestConfig {
    return {
      tenant: 'MIDPORT_DEM', // Default tenant
      table: service.endpoint, // Service endpoint like 'ServiceCall_v2'
      action: 'List', // Default action for ION API services
      parameters: {
        // Add default parameters if needed for the service
      },
      sqlQuery: `SELECT * FROM ${service.endpoint}`, // Sample SQL query
      fullUrl: `https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/${service.endpoint}`, // Full ION API URL
      company: '' // Company code (empty for sample)
    };
  }
}
