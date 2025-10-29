/**
 * @fileoverview SQL WHERE clause parser for converting SQL conditions to ION API filters
 * 
 * ⚠️ SHARED UTILITY: This parser is used by BOTH SOAP and REST APIs.
 * 
 * ARCHITECTURE:
 * =============
 * This file ONLY parses SQL syntax. It does NOT generate SOAP XML or OData queries.
 * 
 * Flow:
 * 1. SQLParser extracts parameters from SQL (field, operator, value)
 * 2. SOAP: RemoteAPIManager.generateSOAPEnvelope() converts to SOAP XML
 * 3. REST: RestAPIManager.generateODataQuery() converts to OData $filter
 * 
 * The parser output is API-agnostic. Each API manager handles the conversion.
 * 
 * SUPPORTED OPERATORS:
 * ===================
 * Basic: =, !=, >, <, >=, <=
 * Advanced: LIKE, IN, BETWEEN, IS NULL, IS NOT NULL
 * Future: Complex boolean logic with parentheses
 * 
 * OUTPUT FORMAT:
 * ==============
 * Generates a parameters object with:
 * - field: value (e.g., Status: 'Active')
 * - field_operator: 'eq', 'gt', 'between', etc.
 * - field_value2: (for BETWEEN operator only)
 * 
 * Internal metadata (baseTable, baseEndpoint, _operator, _value2) is filtered
 * by the respective API managers before making API calls.
 * 
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

/**
 * Represents a single filter condition extracted from SQL WHERE clause
 * @interface FilterCondition
 */
export interface FilterCondition {
  /** Field/column name */
  field: string;
  /** Comparison operator (=, !=, >, <, >=, <=, LIKE, IN, BETWEEN, IS NULL, IS NOT NULL) */
  operator: string;
  /** Value to compare against */
  value: string | number | string[] | null;
  /** ION API comparison operator */
  ionOperator: string;
  /** Optional second value for BETWEEN operator */
  value2?: string | number;
}

/**
 * SQL WHERE clause parser for ION API integration
 * 
 * ⚠️ SHARED BY BOTH SOAP AND REST: This parser only extracts SQL conditions.
 * It does NOT generate API-specific requests. That's handled by:
 * - RemoteAPIManager.generateSOAPEnvelope() for SOAP APIs
 * - RestAPIManager.generateODataQuery() for REST APIs
 * 
 * Converts SQL WHERE conditions to a normalized parameter object.
 * 
 * @class SQLParser
 */
export class SQLParser {
  
  /**
   * Parses SQL WHERE clause and extracts filter conditions
   * Supports: =, !=, <>, >, <, >=, <=, LIKE, IN, AND, OR
   * @static
   * @param {string} whereClause - The WHERE clause without the WHERE keyword
   * @returns {FilterCondition[]} Array of filter conditions
   * 
   * @example
   * // Input: "Country='Mexico' AND Status='Active'"
   * // Output: [
   * //   { field: 'Country', operator: '=', value: 'Mexico', ionOperator: 'eq' },
   * //   { field: 'Status', operator: '=', value: 'Active', ionOperator: 'eq' }
   * // ]
   */
  static parseWhereClause(whereClause: string): FilterCondition[] {
    const conditions: FilterCondition[] = [];
    
    if (!whereClause?.trim()) {
      return conditions;
    }

    // Clean up the where clause
    let cleanClause = whereClause.trim();
    
    // Handle different logical operators (for now we'll split by AND/OR and process each condition)
    // This is a simplified approach - a full SQL parser would handle parentheses and complex logic
    const conditionParts = this.splitByLogicalOperators(cleanClause);
    
    for (const part of conditionParts) {
      const condition = this.parseCondition(part.trim());
      if (condition) {
        conditions.push(condition);
      }
    }
    
    return conditions;
  }

  /**
   * Splits WHERE clause by logical operators (AND, OR)
   * @private
   * @static
   * @param {string} clause - WHERE clause to split
   * @returns {string[]} Array of individual conditions
   */
  private static splitByLogicalOperators(clause: string): string[] {
    // Simple split by AND/OR (case insensitive)
    // This doesn't handle parentheses - could be enhanced for complex queries
    const parts = clause.split(/\s+(?:and|or)\s+/i);
    return parts;
  }

  /**
   * Parses a single condition (e.g., "Country='Mexico'" or "Price > 100")
   * @private
   * @static
   * @param {string} condition - Single condition string
   * @returns {FilterCondition | null} Parsed condition or null if invalid
   */
  private static parseCondition(condition: string): FilterCondition | null {
    // Remove extra spaces
    condition = condition.trim();
    
    // Handle special OData parameters (expand, $expand, etc.)
    const specialParams = ['expand', '$expand', '$select', '$filter', '$orderby', '$top', '$skip'];
    for (const param of specialParams) {
      const paramMatch = condition.match(new RegExp(`\\b${param.replace('$', '\\$')}\\s*=\\s*['"]([^'"]+)['"]`, 'i'));
      if (paramMatch) {
        // This is a special parameter, not a filter condition
        return null;
      }
    }
    
    // Check for IS NOT NULL
    const isNotNullMatch = condition.match(/(\w+)\s+is\s+not\s+null/i);
    if (isNotNullMatch) {
      return {
        field: isNotNullMatch[1],
        operator: 'IS NOT NULL',
        value: null,
        ionOperator: 'is_not_null'
      };
    }

    // Check for IS NULL
    const isNullMatch = condition.match(/(\w+)\s+is\s+null/i);
    if (isNullMatch) {
      return {
        field: isNullMatch[1],
        operator: 'IS NULL',
        value: null,
        ionOperator: 'is_null'
      };
    }

    // Check for BETWEEN
    const betweenMatch = condition.match(/(\w+)\s+between\s+['"]?([^'"]+)['"]?\s+and\s+['"]?([^'"]+)['"]?/i);
    if (betweenMatch) {
      let value1: string | number = betweenMatch[2].trim().replace(/^['"]|['"]$/g, '');
      let value2: string | number = betweenMatch[3].trim().replace(/^['"]|['"]$/g, '');
      
      // Convert to numbers if numeric
      if (!isNaN(Number(value1))) value1 = Number(value1);
      if (!isNaN(Number(value2))) value2 = Number(value2);
      
      return {
        field: betweenMatch[1],
        operator: 'BETWEEN',
        value: value1,
        value2: value2,
        ionOperator: 'between'
      };
    }
    
    // Regex patterns for different operators
    const patterns = [
      // LIKE operator
      { regex: /(\w+)\s+like\s+['"]([^'"]+)['"]/i, operator: 'LIKE', ionOperator: 'like' },
      // IN operator  
      { regex: /(\w+)\s+in\s*\(([^)]+)\)/i, operator: 'IN', ionOperator: 'in' },
      // Comparison operators (>=, <=, <>, !=, =, >, <)
      { regex: /(\w+)\s*(>=)\s*['"]?([^'"]+)['"]?/i, operator: '>=', ionOperator: 'ge' },
      { regex: /(\w+)\s*(<=)\s*['"]?([^'"]+)['"]?/i, operator: '<=', ionOperator: 'le' },
      { regex: /(\w+)\s*(<>|!=)\s*['"]?([^'"]+)['"]?/i, operator: '!=', ionOperator: 'ne' },
      { regex: /(\w+)\s*(=)\s*['"]?([^'"]+)['"]?/i, operator: '=', ionOperator: 'eq' },
      { regex: /(\w+)\s*(>)\s*['"]?([^'"]+)['"]?/i, operator: '>', ionOperator: 'gt' },
      { regex: /(\w+)\s*(<)\s*['"]?([^'"]+)['"]?/i, operator: '<', ionOperator: 'lt' },
    ];

    for (const pattern of patterns) {
      const match = condition.match(pattern.regex);
      if (match) {
        const field = match[1];
        const operator = pattern.operator;
        const ionOperator = pattern.ionOperator;
        let value: string | number | string[] = match[3] || match[2];

        // Handle special cases
        if (operator === 'IN') {
          // Parse IN values: "('value1', 'value2', 'value3')"
          const inValues = value.toString()
            .split(',')
            .map(v => v.trim().replace(/^['"]|['"]$/g, ''));
          value = inValues;
        } else {
          // Clean quotes from value
          value = value.toString().replace(/^['"]|['"]$/g, '');
          
          // Try to convert to number if it's numeric
          if (!isNaN(Number(value)) && value !== '') {
            value = Number(value);
          }
        }

        return {
          field,
          operator,
          value,
          ionOperator
        };
      }
    }

    return null;
  }

  /**
   * Converts SQL query to parameters object for ION API
   * @static
   * @param {string} sqlQuery - Complete SQL query
   * @returns {Record<string, any>} Parameters object for ION API
   * 
   * @example
   * // Input: "SELECT * FROM Customers WHERE Country='Mexico' AND Status='Active' LIMIT 10"
   * // Output: { Country: 'Mexico', Status: 'Active', limit: 10 }
   */
  static parseSQL(sqlQuery: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    if (!sqlQuery?.trim()) {
      return parameters;
    }

    const queryLower = sqlQuery.toLowerCase();
    
    // Extract WHERE clause
    const whereMatch = sqlQuery.match(/where\s+(.+?)(?:\s+(?:order\s+by|group\s+by|having|limit)|\s*$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      const conditions = this.parseWhereClause(whereClause);
      
      // Convert conditions to parameters
      for (const condition of conditions) {
        if (condition.operator === 'IN') {
          // For IN operator, use array values
          parameters[condition.field] = condition.value;
        } else if (condition.operator === 'BETWEEN') {
          // For BETWEEN operator, store both values
          parameters[condition.field] = condition.value;
          parameters[`${condition.field}_value2`] = (condition as any).value2;
          parameters[`${condition.field}_operator`] = condition.ionOperator;
        } else if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          // For IS NULL/IS NOT NULL, store null value
          parameters[condition.field] = null;
          parameters[`${condition.field}_operator`] = condition.ionOperator;
        } else {
          // For other operators, use the value directly
          parameters[condition.field] = condition.value;
          // Also store the operator for complex filtering
          parameters[`${condition.field}_operator`] = condition.ionOperator;
        }
      }
    }

    // Extract LIMIT
    const limitMatch = sqlQuery.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      parameters.limit = parseInt(limitMatch[1]);
    }

    // Extract ORDER BY
    const orderByMatch = sqlQuery.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
    if (orderByMatch) {
      parameters.orderBy = orderByMatch[1];
      parameters.orderDirection = orderByMatch[2] || 'asc';
    }

    // Extract EXPAND clause (for OData $expand parameter) - must be in WHERE clause
    const expandMatch = sqlQuery.match(/\bexpand\s*=\s*['"]([^'"]+)['"]/i);
    if (expandMatch) {
      parameters.expand = expandMatch[1];
      console.log('📝 SQL PARSER: Found expand parameter:', expandMatch[1]);
    }
    
    // Extract direct $expand parameter
    const dollarExpandMatch = sqlQuery.match(/\$expand\s*=\s*['"]([^'"]+)['"]/i);
    if (dollarExpandMatch) {
      parameters['$expand'] = dollarExpandMatch[1];
      console.log('📝 SQL PARSER: Found $expand parameter:', dollarExpandMatch[1]);
    }
    
    // Debug: Show what we're trying to parse
    console.log('📝 SQL PARSER DEBUG:', {
      originalQuery: sqlQuery,
      foundParams: Object.keys(parameters),
      hasExpand: !!parameters.expand,
      hasDollarExpand: !!parameters['$expand']
    });

    // Add timestamp for all requests
    parameters.timestamp = new Date().toISOString();

    return parameters;
  }

  /**
   * Generates ION API filter conditions from parsed SQL
   * @static
   * @param {FilterCondition[]} conditions - Array of filter conditions
   * @returns {Array<Object>} ION API filter conditions
   */
  static generateIONFilters(conditions: FilterCondition[]): Array<{
    comparisonOperator: string;
    attributeName: string;
    instanceValue: string | number | string[] | null;
  }> {
    return conditions.map(condition => ({
      comparisonOperator: condition.ionOperator,
      attributeName: condition.field,
      instanceValue: condition.value
    }));
  }
}