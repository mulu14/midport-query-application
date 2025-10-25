/**
 * @fileoverview Remote API Context Provider for managing remote API databases and queries
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { RemoteAPITenant, RemoteAPITable, RemoteAPIQueryResult, APIRequestConfig, StoredOAuth2Token } from '@/Entities/RemoteAPI';

/**
 * Context interface for Remote API functionality
 * Provides state management for tenants, tables, queries, and results
 * @interface RemoteAPIContextType
 */
interface RemoteAPIContextType {
  /** Array of available remote API tenants */
  tenants: RemoteAPITenant[];
  /** Currently selected tenant */
  selectedTenant: RemoteAPITenant | null;
  /** Currently selected table */
  selectedTable: RemoteAPITable | null;
  /** Current SQL query string */
  query: string;
  /** Array of query execution results */
  results: RemoteAPIQueryResult[];
  /** Current error message, if any */
  error: string | null;
  /** Whether a query is currently executing */
  isExecuting: boolean;
  /** Whether the add database dialog is visible */
  showAddDialog: boolean;
  /** Function to set the selected tenant */
  setSelectedTenant: (tenant: RemoteAPITenant | null) => void;
  /** Function to set the selected table */
  setSelectedTable: (table: RemoteAPITable | null) => void;
  /** Function to set the current query */
  setQuery: (query: string) => void;
  /** Function to select a table and generate initial query */
  selectTableAndQuery: (tenant: RemoteAPITenant, table: RemoteAPITable) => void;
  /** Function to execute the current query */
  executeQuery: () => Promise<void>;
  /** Function to load all tenants from the API */
  loadTenants: () => Promise<void>;
  /** Function to show/hide the add database dialog */
  setShowAddDialog: (show: boolean) => void;
  /** Function to update tenant information */
  updateTenant: (id: string, data: Partial<RemoteAPITenant>) => Promise<void>;
  /** Function to delete a tenant */
  deleteTenant: (id: string) => Promise<void>;
  /** Function to create a new remote API database */
  createRemoteAPIDatabase: (data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[]; expandFields?: string[] }) => Promise<RemoteAPITenant>;
  /** Function to update an existing remote API database */
  updateRemoteAPIDatabase: (id: string, data: { name: string; baseUrl: string; tenantName: string; services: string; tables: string[]; expandFields: string[]; status: string }) => Promise<RemoteAPITenant>;
}

/**
 * React Context for Remote API state management
 * @constant RemoteAPIContext
 */
const RemoteAPIContext = createContext<RemoteAPIContextType | undefined>(undefined);

/**
 * Remote API Provider component that manages state for remote API operations
 * Provides context to child components for managing tenants, tables, queries, and results
 * @component RemoteAPIProvider
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with context
 * @returns {JSX.Element} Provider component with context value
 */
export function RemoteAPIProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<RemoteAPITenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<RemoteAPITenant | null>(null);
  const [selectedTable, setSelectedTable] = useState<RemoteAPITable | null>(null);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<RemoteAPIQueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  
  // OAuth2 token management with service account
  const [currentToken, setCurrentToken] = useState<StoredOAuth2Token | null>(null);

  const loadTenants = async () => {
    try {

      // Load from API endpoint instead of direct SQLite access
      const response = await fetch('/api/remote-databases');
      if (!response.ok) {
        throw new Error('Failed to fetch remote databases');
      }

      const tenantList = await response.json();

      // Convert to RemoteAPITenant format
      const formattedTenants: RemoteAPITenant[] = tenantList.map((db: any) => ({
        id: db.id,
        name: db.name || db.tenantName, // Display name
        tables: db.tables || [],
        status: db.status === 'active' ? 'connected' : 'disconnected',
        fullUrl: db.fullUrl, // Include the full URL from database configuration
        tenantName: db.tenantName, // Keep the actual tenant ID for API calls
        expandFields: db.expandFields || [] // Include expand fields for OData queries
      }));

      setTenants(formattedTenants);

      // Auto-select first tenant and table if available
      if (formattedTenants.length > 0) {
        const firstTenant = formattedTenants[0];
        setSelectedTenant(firstTenant);

        if (firstTenant.tables && firstTenant.tables.length > 0) {
          setSelectedTable(firstTenant.tables[0]);
        }
      }

    } catch (error) {
      setError('Failed to load remote tenants');
    }
  };

  /**
   * Executes the current SQL query against the selected remote API table
   * Converts SQL query to SOAP request and handles the API call
   * @async
   * @function executeQuery
   * @throws {Error} If no tenant or table is selected
   * @throws {Error} If API request fails
   */
  const executeQuery = async () => {
    if (!selectedTenant || !selectedTable) {
      setError('Please select a tenant and table before running queries');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResults([]);

    try {

      // Parse the query to determine action and parameters
      const queryStr = query.trim().toLowerCase();
      const apiType = (selectedTable as any).apiType || 'soap';
      let action: string;
      let parameters = parseParametersFromQuery(query, selectedTable);

      // Different action determination based on API type
      if (apiType === 'rest') {
        // For REST APIs, use HTTP methods
        if (queryStr.includes('read') || queryStr.includes('get') || queryStr.startsWith('select') || queryStr.includes('list')) {
          action = 'GET';
        } else if (queryStr.includes('create') || queryStr.includes('insert') || queryStr.startsWith('insert')) {
          action = 'POST';
        } else if (queryStr.includes('update') || queryStr.startsWith('update')) {
          action = 'PUT';
        } else if (queryStr.includes('delete') || queryStr.startsWith('delete')) {
          action = 'DELETE';
        } else {
          action = 'GET'; // Default for REST
        }
      } else {
        // For SOAP APIs, use SOAP actions
        if (queryStr.includes('read') || queryStr.includes('get') || queryStr.startsWith('select') || queryStr.includes('list')) {
          action = 'List';
        } else if (queryStr.includes('create') || queryStr.includes('insert') || queryStr.startsWith('insert')) {
          action = 'create';
        } else if (queryStr.includes('update') || queryStr.startsWith('update')) {
          action = 'update';
        } else if (queryStr.includes('delete') || queryStr.startsWith('delete')) {
          action = 'delete';
        } else {
          action = 'List'; // Default for SOAP
        }
      }

      // Build unified API request configuration
      let config: any;
      
      if (apiType === 'rest') {
        // For REST APIs, parse the table endpoint to extract oDataService and entityName
        const endpoint = selectedTable.endpoint || selectedTable.name;
        let oDataService = (selectedTable as any).oDataService;
        let entityName = (selectedTable as any).entityName;
        
        // Parse endpoint like "/odata/tdapi.slsSalesOrder/Orders" or "tdapi.slsSalesOrder/Orders"
        if (endpoint.includes('/')) {
          const parts = endpoint.replace('/odata/', '').split('/');
          if (parts.length >= 2) {
            oDataService = parts[0]; // e.g., "tdapi.slsSalesOrder"
            entityName = parts[1];   // e.g., "Orders"
          }
        }
        
        // Get expand fields from the selected table configuration
        const expandFields = (selectedTable as any)?.expandFields?.map((ef: any) => ef.name) || [];
        
        config = {
          tenant: (selectedTenant as any).tenantName || selectedTenant.name, // Use actual tenant ID for API
          table: entityName || endpoint,
          apiType: 'rest',
          action: action,
          parameters: parameters,
          sqlQuery: query,
          fullUrl: null, // Don't use SOAP URL for REST
          company: '2405', // Correct LN company number (confirmed from LN user config)
          oDataService: oDataService,
          entityName: entityName,
          expandFields: expandFields // Add expand fields for OData $expand parameter
        };
      } else {
        // For SOAP APIs, use the existing logic
        config = {
          tenant: (selectedTenant as any).tenantName || selectedTenant.name, // Use actual tenant ID for API
          table: selectedTable.endpoint,
          apiType: 'soap',
          action: action,
          parameters: parameters,
          sqlQuery: query,
          fullUrl: selectedTenant.fullUrl,
          company: '',
          oDataService: null,
          entityName: null
        };
      }

      // Use server-side API endpoint for OAuth2 and API calls
      console.log('🚀 API Request Configuration:', {
        apiType: config.apiType,
        tenant: config.tenant,
        table: config.table,
        action: config.action,
        oDataService: config.oDataService,
        entityName: config.entityName,
        expandFields: config.expandFields,
        parameters: config.parameters,
        fullUrl: config.fullUrl,
        sqlQuery: config.sqlQuery
      });
      
      const response = await fetch('/api/remote-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: config,
          currentToken: currentToken
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.error || 'Unknown server error');
      }
      
      const result = responseData.result;
      const newToken = responseData.token;
      
      // Update the stored token for future requests
      if (newToken) {
        setCurrentToken(newToken);
      }
      
      // Add limit information to result summary
      const limitApplied = parameters.limit;
      const resultSummary = result.data?.summary || 'No summary available';
      const finalSummary = limitApplied 
        ? `${resultSummary} (Limited to ${limitApplied} records)`
        : resultSummary;
      
      // Update result with limit info
      if (result.data && limitApplied) {
        result.data.summary = finalSummary;
        result.note = `${result.note || ''} - Limited to first ${limitApplied} records for performance`.trim();
      }
      
      setResults([result]);

    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExecuting(false);
    }
  };

  const selectTableAndQuery = (tenant: RemoteAPITenant, table: RemoteAPITable) => {
    setSelectedTenant(tenant);
    setSelectedTable(table);

    // Generate a proper SQL query based on the service/table name
    const tableName = getBusinessFriendlyTableName(table);
    const sqlQuery = `SELECT * FROM ${tableName};`;
    setQuery(sqlQuery);
  };

  /**
   * Converts technical service names to business-friendly table names for SQL
   * @private
   * @param {RemoteAPITable} table - The table/service object
   * @returns {string} Business-friendly table name for SQL queries
   */
  const getBusinessFriendlyTableName = (table: RemoteAPITable): string => {
    const serviceName = table.name || table.endpoint;
    
    // Handle OData REST services (e.g., "tdapi.slsSalesOrder/Orders" -> "Orders")
    if (serviceName.includes('/')) {
      const parts = serviceName.split('/');
      const entityName = parts[parts.length - 1]; // Get the entity name after the last /
      return entityName;
    }
    
    // Handle SOAP services - convert technical names to business names
    const businessNameMap: Record<string, string> = {
      'BusinessPartner_v3': 'BusinessPartners',
      'ServiceCall_v2': 'ServiceCalls', 
      'ATPService_WT': 'AvailableToPromise',
      'SalesOrder': 'SalesOrders',
      'Customer_v1': 'Customers',
      'Item_v1': 'Items',
      'Address_v1': 'Addresses'
    };
    
    // Return business-friendly name or fallback to original
    return businessNameMap[serviceName] || serviceName;
  };

  /**
   * Parse parameters from query and table configuration using advanced SQL parsing
   * @private
   * @param {string} query - The SQL query string
   * @param {RemoteAPITable} table - The selected table/service
   * @returns {Record<string, any>} Parameters object with parsed SQL conditions
   */
  const parseParametersFromQuery = (query: string, table: RemoteAPITable): Record<string, any> => {
    // Import SQLParser dynamically to avoid import issues
    const { SQLParser } = require('@/lib/SQLParser');
    
    // Use advanced SQL parsing for WHERE clauses and other SQL features
    const sqlParameters = SQLParser.parseSQL(query);
    
    // Start with parsed SQL parameters
    const parameters: Record<string, any> = { ...sqlParameters };

    // Legacy fallback for non-SQL queries (maintain backward compatibility)
    if (!query.toLowerCase().includes('select') && !query.toLowerCase().includes('where')) {
      const queryLower = query.toLowerCase();
      
      // Extract filter conditions from non-SQL queries
      if (queryLower.includes('where') || queryLower.includes('filter')) {
        const filterMatch = queryLower.match(/where\s+(.+)/i);
        if (filterMatch) {
          parameters.legacyFilter = filterMatch[1].trim();
        }
      }
    }

    // Add service-specific metadata (keep existing logic)
    if (table.endpoint.includes('ServiceCall')) {
      parameters.serviceType = 'ServiceCall';
    } else if (table.endpoint.includes('Customer') || table.endpoint.includes('BusinessPartner')) {
      parameters.entityType = 'Customer';
    } else if (table.endpoint.includes('Order') || table.endpoint.includes('SalesOrder')) {
      parameters.entityType = 'Order';
    } else if (table.endpoint.includes('Address')) {
      parameters.entityType = 'Address';
    } else if (table.endpoint.includes('ATPService')) {
      parameters.entityType = 'ATP';
    }

    // Always add timestamp (overriding the one from SQLParser if needed)
    parameters.timestamp = new Date().toISOString();
    
    // Add default limit of 15 records if no limit is specified
    if (!parameters.limit && !query.toLowerCase().includes('limit')) {
      parameters.limit = 15;
    }
    
    // Handle OData expand parameter for getting nested data (LineRefs, SoldToBPRef, etc.)
    if (query.toLowerCase().includes('expand=')) {
      const expandMatch = query.match(/expand\s*=\s*['"]([^'"]+)['"]/i);
      if (expandMatch) {
        parameters.expand = expandMatch[1];
        console.log('📝 EXPAND PARAMETER DETECTED:', parameters.expand);
      }
    }

    return parameters;
  };

  const updateTenant = async (id: string, data: Partial<RemoteAPITenant>) => {
    try {
      setTenants(prev => prev.map(tenant =>
        tenant.id === id ? { ...tenant, ...data } : tenant
      ));
    } catch (error) {
      throw error;
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      // Delete via API endpoint
      const response = await fetch(`/api/remote-databases/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete remote database');
      }

      setTenants(prev => prev.filter(tenant => tenant.id !== id));

      // Clear selection if the deleted tenant was selected
      if (selectedTenant?.id === id) {
        setSelectedTenant(null);
        setSelectedTable(null);
        setQuery('');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Creates a new remote API database by calling the API endpoint
   * Handles both new database creation and existing database detection
   * @async
   * @function createRemoteAPIDatabase
   * @param {Object} data - Database configuration data
   * @param {string} [data.name] - Display name for the database
   * @param {string} data.fullUrl - Complete API URL
   * @param {string} data.baseUrl - Base URL for the API
   * @param {string} data.tenantName - Tenant name (must be unique)
   * @param {string} data.services - Services path
   * @param {string[]} data.tables - Array of table names
   * @returns {Promise<RemoteAPITenant>} The created or existing tenant
   * @throws {Error} If API request fails
   */
  const createRemoteAPIDatabase = async (data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[] }) => {
    try {
      // Create via API endpoint
      const response = await fetch('/api/remote-databases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create remote database: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const newDatabase = await response.json();

      // Check if this is an existing database
      if (newDatabase.isExisting) {
        // Convert to RemoteAPITenant format
        const existingTenant: RemoteAPITenant = {
          id: newDatabase.id,
          name: newDatabase.name || newDatabase.tenantName,
          tables: newDatabase.tables || [],
          status: newDatabase.status === 'active' ? 'connected' : 'disconnected',
          fullUrl: newDatabase.fullUrl
        };

        // Update the tenant in the list with new tables if services were added
        setTenants(prev => {
          return prev.map(tenant => {
            if (tenant.id === existingTenant.id) {
              // Update existing tenant with new tables
              return existingTenant;
            }
            return tenant;
          });
        });

        // Show appropriate message based on whether new services were added
        const message = newDatabase.isUpdated 
          ? `✅ ${newDatabase.message}` 
          : `ℹ️ ${newDatabase.message}`;
        alert(message);
        
        return existingTenant;
      }

      // Convert to RemoteAPITenant format and add to state
      const newTenant: RemoteAPITenant = {
        id: newDatabase.id,
        name: newDatabase.name || newDatabase.tenantName, // Use name field if available, fallback to tenantName
        tables: newDatabase.tables || [],
        status: newDatabase.status === 'active' ? 'connected' : 'disconnected',
        fullUrl: newDatabase.fullUrl
      };

      setTenants(prev => [newTenant, ...prev]);
      alert(newDatabase.message || 'Database created successfully');
      return newTenant;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Updates an existing remote API database by calling the API endpoint
   * @async
   * @function updateRemoteAPIDatabase
   * @param {string} id - Database ID to update
   * @param {Object} data - Database configuration data to update
   * @param {string} data.name - Display name for the database
   * @param {string} data.baseUrl - Base URL for the API
   * @param {string} data.tenantName - Tenant name
   * @param {string} data.services - Services path
   * @param {string[]} data.tables - Array of table names
   * @param {string[]} data.expandFields - Array of OData expand fields
   * @param {string} data.status - Database status (active/inactive)
   * @returns {Promise<RemoteAPITenant>} The updated tenant
   * @throws {Error} If API request fails
   */
  const updateRemoteAPIDatabase = async (id: string, data: { name: string; baseUrl: string; tenantName: string; services: string; tables: string[]; expandFields: string[]; status: string }) => {
    try {
      // Update via API endpoint
      const response = await fetch(`/api/remote-databases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update remote database: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const updatedDatabase = await response.json();

      // Convert to RemoteAPITenant format
      const updatedTenant: RemoteAPITenant = {
        id: updatedDatabase.id,
        name: updatedDatabase.name || updatedDatabase.tenantName,
        tables: updatedDatabase.tables || [],
        status: updatedDatabase.status === 'active' ? 'connected' : 'disconnected',
        fullUrl: updatedDatabase.fullUrl,
        tenantName: updatedDatabase.tenantName,
        expandFields: updatedDatabase.expandFields || []
      };

      // Update the tenant in the list
      setTenants(prev => prev.map(tenant => 
        tenant.id === id ? updatedTenant : tenant
      ));

      return updatedTenant;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const value: RemoteAPIContextType = {
    tenants,
    selectedTenant,
    selectedTable,
    query,
    results,
    error,
    isExecuting,
    showAddDialog,
    setSelectedTenant,
    setSelectedTable,
    setQuery,
    selectTableAndQuery,
    executeQuery,
    loadTenants,
    setShowAddDialog,
    updateTenant,
    deleteTenant,
    createRemoteAPIDatabase,
    updateRemoteAPIDatabase
  };

  return (
    <RemoteAPIContext.Provider value={value}>
      {children}
    </RemoteAPIContext.Provider>
  );
}

/**
 * Custom hook to access Remote API context
 * Must be used within a RemoteAPIProvider component
 * @function useRemoteAPI
 * @returns {RemoteAPIContextType} The Remote API context value
 * @throws {Error} If used outside of RemoteAPIProvider
 */
export function useRemoteAPI() {
  const context = useContext(RemoteAPIContext);
  if (context === undefined) {
    throw new Error('useRemoteAPI must be used within a RemoteAPIProvider');
  }
  return context;
}
