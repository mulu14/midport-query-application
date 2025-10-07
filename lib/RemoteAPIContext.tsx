/**
 * @fileoverview Remote API Context Provider for managing remote API databases and queries
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { RemoteAPITenant, RemoteAPITable, RemoteAPIQueryResult, SOAPRequestConfig, StoredOAuth2Token } from '@/Entities/RemoteAPI';

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
  createRemoteAPIDatabase: (data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[] }) => Promise<RemoteAPITenant>;
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
        name: db.name || db.tenantName, // Use name field if available, fallback to tenantName
        tables: db.tables || [],
        status: db.status === 'active' ? 'connected' : 'disconnected',
        fullUrl: db.fullUrl // Include the full URL from database configuration
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
      let action = 'List'; // Default action for ION API
      let parameters = parseParametersFromQuery(query, selectedTable);

      // Simple action determination based on query type
      if (queryStr.includes('read') || queryStr.includes('get') || queryStr.startsWith('select') || queryStr.includes('list')) {
        action = 'List';
      } else if (queryStr.includes('create') || queryStr.includes('insert') || queryStr.startsWith('insert')) {
        action = 'create';
      } else if (queryStr.includes('update') || queryStr.startsWith('update')) {
        action = 'update';
      } else if (queryStr.includes('delete') || queryStr.startsWith('delete')) {
        action = 'delete';
      }

      // Build ION API request configuration
      const config: SOAPRequestConfig = {
        tenant: selectedTenant.name,
        table: selectedTable.endpoint, // Service name like 'ServiceCall_v2'
        action: action,
        parameters: parameters,
        sqlQuery: query, // Keep original query for reference
        fullUrl: selectedTenant.fullUrl, // Use configured full URL if available
        company: '' // Company code for ION API activation header (can be added later)
      };

      // Call server-side API route for OAuth2 authentication and ION API execution
      const response = await fetch('/api/remote-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: config,
          currentToken: currentToken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to execute remote API query');
      }

      const data = await response.json();
      
      // Store the token for future use
      if (data.token) {
        setCurrentToken(data.token);
      }
      
      setResults([data.result]);

    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExecuting(false);
    }
  };

  const selectTableAndQuery = (tenant: RemoteAPITenant, table: RemoteAPITable) => {
    setSelectedTenant(tenant);
    setSelectedTable(table);

    // Generate a simple API request for the user
    const apiQuery = `Read data from ${table.name} service`;
    setQuery(apiQuery);
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

    return parameters;
  };

  const updateTenant = async (id: string, data: Partial<RemoteAPITenant>) => {
    try {
      console.log('🔄 Updating remote tenant:', id, data);
      setTenants(prev => prev.map(tenant =>
        tenant.id === id ? { ...tenant, ...data } : tenant
      ));
      console.log('✅ Tenant updated successfully');
    } catch (error) {
      console.error('❌ Error updating tenant:', error);
      throw error;
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      console.log('🔄 Deleting remote tenant:', id);

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

      console.log('✅ Tenant deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting tenant:', error);
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
      console.log('🔄 Creating remote API database:', data);

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
        console.error('❌ API Error Response:', response.status, response.statusText);
        console.error('❌ API Error Data:', errorData);
        throw new Error(`Failed to create remote database: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const newDatabase = await response.json();

      // Check if this is an existing database
      if (newDatabase.isExisting) {
        console.log('ℹ️ Database already exists:', newDatabase.message);
        
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
      console.log('✅ Remote API database created successfully');
      alert(newDatabase.message || 'Database created successfully');
      return newTenant;
    } catch (error) {
      console.error('❌ Error creating remote API database:', error);
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
    createRemoteAPIDatabase
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
