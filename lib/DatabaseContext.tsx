/**
 * @fileoverview Database Context Provider for Local Database Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 202
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

  /**
   * Loads all databases from the API and initializes default database if none exist
   * @async
   * @function loadDatabases
   * @throws {Error} If API request fails
   * 
   * @description
   * Fetches all database configurations from the SQLite storage via API.
   * If no databases exist, initializes with a default SQLite database.
   * Auto-selects the first database and table for immediate use.
   */
  const loadDatabases = async () => {
    try {
      const response = await fetch('/api/databases');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      let dbList: DatabaseData[] = await response.json();

      // If no databases exist, initialize with default SQLite database
      if (dbList.length === 0) {

        const initResponse = await fetch('/api/databases/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (initResponse.ok) {
          dbList = await initResponse.json();
        } else {
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

      setDatabases(dbList);

      // Auto-select first database
      if (dbList.length > 0) {
        setSelectedDatabase(dbList[0]);

        if (dbList[0].tables && dbList[0].tables.length > 0) {
          setSelectedTable(dbList[0].tables[0]);
        }
      }

    } catch (error) {
      setError('Failed to load databases');
    }
  };

  /**
   * Executes the current SQL query against the selected database
   * @async
   * @function executeQuery
   * @throws {Error} If no database is selected or query execution fails
   * 
   * @description
   * Executes the current query string against the selected database.
   * Handles different database types (SQLite, API, etc.) with appropriate execution methods.
   * Updates results state with query output and handles errors gracefully.
   */
  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setError(null);
    setResults([]);

    try {
      // Validate database selection
      if (!selectedDatabase) {
        throw new Error('Please select a database before running queries');
      }

      // Handle different database types
      if (selectedDatabase.type === 'sqlite') {

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

        if (result.success) {
          setResults(result.data);
        } else {
          throw new Error(result.error || 'Query execution failed');
        }
      } else {
        // For other database types, show connection info

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
      setError(error instanceof Array ? error.join('\n') : String(error));
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Refreshes the database list by reloading from API
   * @async
   * @function refreshDatabases
   * 
   * @description
   * Triggers a reload of all database configurations from the server.
   * Useful after adding, updating, or deleting databases.
   */
  const refreshDatabases = async () => {
    await loadDatabases();
  };

  /**
   * Selects a database table and generates a default SELECT query
   * @function selectTableAndQuery
   * @param {DatabaseData} db - Database to select
   * @param {DatabaseTable} table - Table to select
   * 
   * @description
   * Updates the selected database and table, then generates a default
   * SELECT * FROM [table] query for immediate execution.
   * 
   * @example
   * ```typescript
   * selectTableAndQuery(myDatabase, { name: 'customers', record_count: 100 });
   * // Sets query to: "SELECT * FROM customers"
   * ```
   */
  const selectTableAndQuery = (db: DatabaseData, table: DatabaseTable) => {
    setSelectedDatabase(db);
    setSelectedTable(table);
    // Generate default SQL query based on selected table
    const defaultQuery = `SELECT * FROM ${table.name}`;
    setQuery(defaultQuery);
  };

  /**
   * Creates a new database configuration entry
   * @async
   * @function createDatabase
   * @param {DatabaseData} data - Database configuration data
   * @param {string} data.name - Database display name
   * @param {string} data.type - Database type (postgresql, mysql, mongodb, etc.)
   * @param {string} [data.connection_string] - Database connection string
   * @param {DatabaseTable[]} [data.tables] - Array of table definitions
   * @returns {Promise<DatabaseData>} Created database object
   * @throws {Error} If database creation fails
   * 
   * @description
   * Creates a new database configuration via API call and refreshes the database list.
   * If a database with the same name exists, returns the existing configuration.
   * 
   * @example
   * ```typescript
   * const newDb = await createDatabase({
   *   name: 'My Database',
   *   type: 'postgresql',
   *   connection_string: 'postgresql://...',
   *   tables: [{ name: 'users', record_count: 0 }]
   * });
   * ```
   */
  const createDatabase = async (data: DatabaseData) => {
    try {
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

      // Refresh databases to show the new one
      await refreshDatabases();

      return newDatabase;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Updates an existing database configuration
   * @async
   * @function updateDatabase
   * @param {string} id - Database ID to update
   * @param {Partial<DatabaseData>} data - Partial database data to update
   * @returns {Promise<DatabaseData>} Updated database object
   * @throws {Error} If database update fails
   * 
   * @description
   * Updates specific fields of an existing database configuration via API call.
   * Refreshes the database list to reflect changes.
   * 
   * @example
   * ```typescript
   * const updated = await updateDatabase('db-123', {
   *   name: 'Updated Database Name',
   *   status: 'connected'
   * });
   * ```
   */
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
      throw error;
    }
  };

  /**
   * Deletes a database configuration
   * @async
   * @function deleteDatabase
   * @param {string} id - Database ID to delete
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If database deletion fails
   * 
   * @description
   * Permanently deletes a database configuration via API call.
   * This operation cannot be undone. Refreshes the database list after deletion.
   * 
   * @example
   * ```typescript
   * const success = await deleteDatabase('db-123');
   * if (success) {
   *   // Database deleted successfully
   * }
   * ```
   */
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

/**
 * Higher-Order Component that wraps a component with DatabaseProvider
 * @function withDatabaseContext
 * @template T - Component props type
 * @param {React.ComponentType<T>} Component - Component to wrap with database context
 * @returns {React.ComponentType<T>} Component wrapped with DatabaseProvider
 * 
 * @description
 * HOC that provides database context to components that don't have access to a parent provider.
 * Automatically wraps the component with DatabaseProvider.
 * 
 * @example
 * ```typescript
 * const MyComponentWithDB = withDatabaseContext(MyComponent);
 * // MyComponent now has access to database context without needing a parent provider
 * ```
 */
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
 * Custom hook to access Database context state and methods
 * @function useDatabase
 * @returns {DatabaseContextType} The Database context value containing:
 * @returns {DatabaseData[]} databases - Array of all available databases
 * @returns {DatabaseData|null} selectedDatabase - Currently selected database
 * @returns {DatabaseTable|null} selectedTable - Currently selected table
 * @returns {string} query - Current SQL query string
 * @returns {any[]} results - Query execution results
 * @returns {string|null} error - Current error message
 * @returns {boolean} isExecuting - Whether a query is currently executing
 * @returns {boolean} showAddDialog - Whether the add database dialog is visible
 * @returns {Function} setSelectedDatabase - Function to set selected database
 * @returns {Function} setSelectedTable - Function to set selected table
 * @returns {Function} setQuery - Function to set query string
 * @returns {Function} selectTableAndQuery - Function to select table and generate query
 * @returns {Function} executeQuery - Function to execute current query
 * @returns {Function} setShowAddDialog - Function to control dialog visibility
 * @returns {Function} refreshDatabases - Function to refresh database list
 * @returns {Function} createDatabase - Function to create new database
 * @returns {Function} updateDatabase - Function to update existing database
 * @returns {Function} deleteDatabase - Function to delete database
 * 
 * @throws {Error} If used outside of DatabaseProvider
 * 
 * @description
 * Must be used within a component wrapped by DatabaseProvider.
 * Provides access to all database-related state and operations.
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const {
 *     databases,
 *     selectedDatabase,
 *     executeQuery,
 *     results
 *   } = useDatabase();
 * 
 *   return (
 *     <div>
 *       <p>Databases: {databases.length}</p>
 *       <p>Results: {results.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
