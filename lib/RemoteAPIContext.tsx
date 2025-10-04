/**
 * @fileoverview Remote API Context Provider for managing remote API databases and queries
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { RemoteAPITenant, RemoteAPITable, RemoteAPIQueryResult, SOAPRequestConfig } from '@/Entities/RemoteAPI';
import { RemoteAPIManager } from './RemoteAPIManager';

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

  const loadTenants = async () => {
    try {
      console.log('🔄 Loading remote tenants...');

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

      console.log('✅ Loaded remote tenants:', formattedTenants.length);
    } catch (error) {
      console.error('❌ Error loading tenants:', error);
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
      console.log('Executing SQL query:', query);
      console.log('Selected tenant:', selectedTenant.name);
      console.log('Selected table:', selectedTable.name);

      // Parse the SQL query to determine the action and parameters
      const sqlQuery = query.trim().toLowerCase();
      let action = 'Read';
      let parameters = {};

      if (sqlQuery.startsWith('select')) {
        action = 'Read';
        // Extract WHERE conditions, LIMIT, etc. from SQL if needed
        // For now, we'll use a simple Read action
      } else if (sqlQuery.startsWith('insert')) {
        action = 'Create';
        // Extract values from INSERT statement
      } else if (sqlQuery.startsWith('update')) {
        action = 'Update';
        // Extract SET and WHERE clauses
      } else if (sqlQuery.startsWith('delete')) {
        action = 'Delete';
        // Extract WHERE clause
      }

      // Convert SQL query to SOAP request configuration
      const config: SOAPRequestConfig = {
        tenant: selectedTenant.name,
        table: selectedTable.endpoint,
        action: action,
        parameters: parameters,
        sqlQuery: query, // Pass the original SQL query for reference
        fullUrl: selectedTenant.fullUrl // Use the full URL from the database configuration
      };

      console.log('Converting to SOAP request:', config);
      console.log('Using full URL from database:', selectedTenant.fullUrl);
      const result = await RemoteAPIManager.executeQuery(config);
      setResults([result]);

    } catch (error) {
      console.error('Error executing remote API query:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExecuting(false);
    }
  };

  const selectTableAndQuery = (tenant: RemoteAPITenant, table: RemoteAPITable) => {
    console.log('🔄 Selecting remote table and generating query:', table.name);
    setSelectedTenant(tenant);
    setSelectedTable(table);

    // Generate a simple SQL SELECT statement for the user
    const sqlQuery = `SELECT * FROM ${table.name} LIMIT 10;`;
    setQuery(sqlQuery);
    console.log('📝 Generated SQL query for:', table.name);
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
        
        // Convert to RemoteAPITenant format and add to state
        const existingTenant: RemoteAPITenant = {
          id: newDatabase.id,
          name: newDatabase.name || newDatabase.tenantName,
          tables: newDatabase.tables || [],
          status: newDatabase.status === 'active' ? 'connected' : 'disconnected',
          fullUrl: newDatabase.fullUrl
        };

        // Check if this tenant is already in the list to avoid duplicates
        setTenants(prev => {
          const exists = prev.some(tenant => tenant.id === existingTenant.id);
          if (!exists) {
            return [existingTenant, ...prev];
          }
          return prev;
        });

        alert(newDatabase.message);
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
