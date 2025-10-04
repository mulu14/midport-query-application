/**
 * @fileoverview Database Context Provider for Local Database Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DatabaseData, DatabaseTable } from '@/Entities/all';

/**
 * Context interface for Database functionality
 * Provides state management for local databases, tables, queries, and results
 * @interface DatabaseContextType
 */
interface DatabaseContextType {
  /** Array of available local databases */
  databases: DatabaseData[];
  /** Currently selected database */
  selectedDatabase: DatabaseData | null;
  /** Currently selected table */
  selectedTable: DatabaseTable | null;
  /** Current SQL query string */
  query: string;
  /** Array of query execution results */
  results: any[];
  /** Current error message, if any */
  error: string | null;
  /** Whether a query is currently executing */
  isExecuting: boolean;
  /** Whether the add database dialog is visible */
  showAddDialog: boolean;
  /** Function to set the selected database */
  setSelectedDatabase: (db: DatabaseData | null) => void;
  /** Function to set the selected table */
  setSelectedTable: (table: DatabaseTable | null) => void;
  /** Function to set the current query */
  setQuery: (query: string) => void;
  /** Function to select a table and generate initial query */
  selectTableAndQuery: (db: DatabaseData, table: DatabaseTable) => void;
  /** Function to execute the current query */
  executeQuery: () => Promise<void>;
  /** Function to show/hide the add database dialog */
  setShowAddDialog: (show: boolean) => void;
  /** Function to refresh the database list */
  refreshDatabases: () => Promise<void>;
  /** Function to create a new database */
  createDatabase: (data: DatabaseData) => Promise<DatabaseData>;
  /** Function to update database information */
  updateDatabase: (id: string, data: Partial<DatabaseData>) => Promise<DatabaseData>;
  /** Function to delete a database */
  deleteDatabase: (id: string) => Promise<boolean>;
}

/**
 * React Context for Database state management
 * @constant DatabaseContext
 */
const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

/**
 * Database Provider component that manages state for local database operations
 * Provides context to child components for managing databases, tables, queries, and results
 * @component DatabaseProvider
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with context
 * @returns {JSX.Element} Provider component with context value
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [databases, setDatabases] = useState<DatabaseData[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseData | null>(null);
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);

  const loadDatabases = async () => {
    try {
      console.log('Starting loadDatabases...');

      // Load virtual databases from SQLite storage
      console.log('🔄 Loading virtual databases from SQLite...');

      const response = await fetch('/api/databases');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      let dbList: DatabaseData[] = await response.json();
      console.log('✅ Loaded virtual databases:', dbList.length);

      // If no databases exist, initialize with default SQLite database
      if (dbList.length === 0) {
        console.log('🔄 No databases found, initializing with default SQLite database...');

        const initResponse = await fetch('/api/databases/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (initResponse.ok) {
          dbList = await initResponse.json();
          console.log('✅ Initialized with default databases:', dbList.length);
        } else {
          console.warn('⚠️ Database initialization failed:', initResponse.status);
          // Fallback to static SQLite database
          dbList = [
            {
              id: 'local-sqlite',
              name: 'Local SQLite Database',
              type: 'sqlite',
              status: 'connected',
              tables: [
                { name: 'customers', record_count: 3 },
                { name: 'products', record_count: 5 },
                { name: 'orders', record_count: 7 }
              ]
            }
          ];
        }
      }

      console.log('📊 Final database list:', dbList);
      console.log('📈 Number of databases:', dbList.length);

      console.log('✅ Setting databases state...');
      setDatabases(dbList);

      // Auto-select first database
      if (dbList.length > 0) {
        console.log('🎯 Auto-selecting first database:', dbList[0].name);
        setSelectedDatabase(dbList[0]);

        if (dbList[0].tables && dbList[0].tables.length > 0) {
          console.log('🎯 Auto-selecting first table:', dbList[0].tables[0].name);
          setSelectedTable(dbList[0].tables[0]);
        }
      }

      console.log('✅ Database loading completed successfully!');
    } catch (error) {
      console.error('❌ Error loading databases:', error);
      setError('Failed to load databases');
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setError(null);
    setResults([]);

    try {
      console.log('Executing query:', query);
      console.log('Selected database:', selectedDatabase?.name);
      console.log('Selected table:', selectedTable?.name);

      // Validate database selection
      if (!selectedDatabase) {
        throw new Error('Please select a database before running queries');
      }

      // Handle different database types
      if (selectedDatabase.type === 'sqlite') {
        console.log('Executing SQL query against SQLite database');

        // Execute query via API
        const apiResponse = await fetch('/api/sqlite/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!apiResponse.ok) {
          throw new Error(`Query failed: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        console.log('Query executed successfully, results:', result);

        if (result.success) {
          setResults(result.data);
        } else {
          throw new Error(result.error || 'Query execution failed');
        }
      } else {
        // For other database types, show connection info
        console.log(`Database type "${selectedDatabase.type}" selected but not implemented`);

        if (selectedDatabase.type === 'api') {
          setResults([{
            message: `API Database: ${selectedDatabase.name}`,
            endpoint: selectedDatabase.connection_string || 'Not configured',
            api_key: selectedDatabase.api_key ? 'Configured' : 'Not configured',
            status: selectedDatabase.status
          }]);
        } else {
          setResults([{
            message: `Database Type: ${selectedDatabase.type}`,
            name: selectedDatabase.name,
            connection: selectedDatabase.connection_string || 'Not configured',
            status: selectedDatabase.status,
            note: 'This database type is not yet implemented for live queries'
          }]);
        }
      }

    } catch (error) {
      console.error('Error executing query:', error);
      setError(error instanceof Array ? error.join('\n') : String(error));
    } finally {
      setIsExecuting(false);
    }
  };

  const refreshDatabases = async () => {
    console.log('🔄 Context: Refreshing databases from SQLite...');
    await loadDatabases();
  };

  const selectTableAndQuery = (db: DatabaseData, table: DatabaseTable) => {
    console.log('🔄 Selecting table and generating query:', table.name);
    setSelectedDatabase(db);
    setSelectedTable(table);
    // Generate default SQL query based on selected table
    const defaultQuery = `SELECT * FROM ${table.name}`;
    setQuery(defaultQuery);
    console.log('📝 Generated query:', defaultQuery);
  };

  const createDatabase = async (data: DatabaseData) => {
    try {
      console.log('🔄 Context: Creating virtual database in SQLite:', data);

      // Create database entry via API
      const response = await fetch('/api/databases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newDatabase = await response.json();
      console.log('✅ Context: Virtual database created in SQLite:', newDatabase);

      // Refresh databases to show the new one
      await refreshDatabases();

      return newDatabase;
    } catch (error) {
      console.error('❌ Context: Error creating virtual database:', error);
      throw error;
    }
  };

  const updateDatabase = async (id: string, data: Partial<DatabaseData>) => {
    try {
      const response = await fetch(`/api/databases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await refreshDatabases();
      return await response.json();
    } catch (error) {
      console.error('Error updating database:', error);
      throw error;
    }
  };

  const deleteDatabase = async (id: string) => {
    try {
      const response = await fetch(`/api/databases/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await refreshDatabases();
      return true;
    } catch (error) {
      console.error('Error deleting database:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const value: DatabaseContextType = {
    databases,
    selectedDatabase,
    selectedTable,
    query,
    results,
    error,
    isExecuting,
    showAddDialog,
    setSelectedDatabase,
    setSelectedTable,
    setQuery,
    selectTableAndQuery,
    executeQuery,
    setShowAddDialog,
    refreshDatabases,
    createDatabase,
    updateDatabase,
    deleteDatabase
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function withDatabaseContext<T extends object>(
  Component: React.ComponentType<T>
) {
  return function WithDatabaseContext(props: T) {
    return (
      <DatabaseProvider>
        <Component {...props} />
      </DatabaseProvider>
    );
  };
}

/**
 * Custom hook to access Database context
 * Must be used within a DatabaseProvider component
 * @function useDatabase
 * @returns {DatabaseContextType} The Database context value
 * @throws {Error} If used outside of DatabaseProvider
 */
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
