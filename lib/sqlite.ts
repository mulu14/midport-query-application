/**
 * @fileoverview SQLite database manager for Midport SQL Query Platform
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import path from "path";
import sqlite3 from "sqlite3";

/**
 * Represents a database table with metadata
 * @interface DatabaseTable
 */
export interface DatabaseTable {
  /** The name of the table */
  name: string;
  /** Optional record count for the table */
  record_count?: number;
}

/**
 * Represents a database connection configuration
 * @interface DatabaseData
 */
export interface DatabaseData {
  /** Optional unique identifier */
  id?: string;
  /** Display name of the database */
  name: string;
  /** Type of database connection */
  type: 'postgresql' | 'mysql' | 'mongodb' | 'api' | 'local' | 'sqlitecloud';
  /** Connection string for the database */
  connection_string?: string;
  /** API key for authentication */
  api_key?: string;
  /** Array of tables in the database */
  tables?: DatabaseTable[];
  /** Current connection status */
  status?: 'connected' | 'disconnected' | 'error';
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * SQLite database manager class for handling all database operations
 * 
 * @class SQLiteManager
 * 
 * @description
 * Central manager for the Midport Query Platform's SQLite database operations.
 * Handles both local database connections and remote ION API tenant configurations.
 * 
 * **Database File:** `midport_query_platform.db` (created in project root)
 * 
 * **Tables Managed:**
 * 1. `databases` - Local database connections (PostgreSQL, MySQL, MongoDB, etc.)
 * 2. `database_tables` - Table metadata for local databases
 * 3. `remote_api_databases` - ION API tenant configurations
 * 4. `remote_api_tables` - Services/tables within ION API tenants
 * 5. `remote_api_expand_fields` - OData expand fields for REST APIs
 * 
 * **Key Features:**
 * - Singleton pattern: Single database connection per application lifecycle
 * - Automatic migrations: Schema updates run automatically on initialization
 * - Multi-tenant support: Tenant isolation for ION API configurations
 * - SOAP + REST support: Handles both API types for ION services
 * - Transaction safety: Foreign key constraints and CASCADE deletes
 * 
 * **Usage Pattern:**
 * ```typescript
 * // All methods are static - no instantiation needed
 * const databases = await SQLiteManager.listDatabases();
 * const tenant = await SQLiteManager.createRemoteAPIDatabase({...});
 * ```
 * 
 * @see runMigrations() for detailed table schema documentation
 */
export class SQLiteManager {
  private static db: sqlite3.Database | null = null;

  /**
   * Initializes the SQLite database connection
   * Creates the database file if it doesn't exist and runs migrations
   * @private
   * @static
   * @returns {Promise<sqlite3.Database>} The initialized database instance
   * @throws {Error} If database connection fails
   */
  private static async initialize(): Promise<sqlite3.Database> {
    if (this.db) {
      return this.db;
    }

    const dbPath = path.join(process.cwd(), "midport_query_platform.db");

    this.db = new sqlite3.Database(
      dbPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          throw err;
        }
      }
    );

    // Create tables if they don't exist
    await this.runMigrations();

    return this.db;
  }

  /**
   * Promise-based wrapper for SQLite's db.all() method to retrieve multiple rows
   * @private
   * @static
   * @async
   * @param {string} query - SQL query string with parameter placeholders
   * @param {any[]} [params=[]] - Array of values to bind to query placeholders
   * @returns {Promise<any[]>} Array of rows returned by the query
   * @throws {Error} If database is not initialized or query fails
   * 
   * @example
   * ```typescript
   * // Get all customers with a specific email domain
   * const users = await apiGet('SELECT * FROM customers WHERE email LIKE ?', ['%@example.com']);
   * ```
   */
  private static async apiGet(query: string, params: any[] = []): Promise<any[]> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(query, params, (err: Error, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Promise-based wrapper for SQLite's db.run() method to execute INSERT, UPDATE, DELETE queries
   * @private
   * @static
   * @async
   * @param {string} query - SQL query string with parameter placeholders
   * @param {any[]} [params=[]] - Array of values to bind to query placeholders
   * @returns {Promise<any>} SQLite run result object with lastID, changes properties
   * @throws {Error} If database is not initialized or query execution fails
   * 
   * @example
   * ```typescript
   * // Insert a new customer and get the lastID
   * const result = await apiPost('INSERT INTO customers (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
   * // Access the lastID from result.lastID
   * ```
   */
  private static async apiPost(query: string, params: any[] = []): Promise<any> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(query, params, function(err: Error) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  /**
   * Promise-based wrapper for SQLite's db.exec() method to execute multiple SQL statements
   * @private
   * @static
   * @async
   * @param {string} query - SQL statement(s) to execute (can contain multiple statements separated by semicolons)
   * @returns {Promise<void>} Resolves when execution completes successfully
   * @throws {Error} If database is not initialized or execution fails
   * 
   * @description
   * Used primarily for schema operations like CREATE TABLE, CREATE INDEX, and migrations.
   * Does not support parameter binding - use apiPost() for parameterized queries.
   * 
   * @example
   * ```typescript
   * // Create multiple tables in one call
   * await apiExec(`
   *   CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
   *   CREATE INDEX idx_users_name ON users(name);
   * `);
   * ```
   */
  private static async apiExec(query: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.exec(query, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Runs database migrations to create and update table schemas
   * 
   * @private
   * @static
   * @async
   * @throws {Error} If migration fails
   * 
   * @description
   * This function is called ONCE per application lifecycle when the database is first initialized.
   * It creates 5 tables and handles schema migrations for existing databases.
   * 
   * **Execution Frequency:**
   * - Runs only once when `initialize()` is first called
   * - Subsequent calls use cached database connection
   * - Typically executes on first API call after application starts
   * 
   * **Tables Created:**
   * 
   * 1. **databases** - Local database connections (PostgreSQL, MySQL, MongoDB, etc.)
   *    - Used by: `/api/databases/*` endpoints
   *    - Purpose: Store and manage connections to external databases
   * 
   * 2. **database_tables** - Metadata about tables in local databases
   *    - Used by: Internal queries in SQLiteManager methods
   *    - Purpose: Track table names and record counts for local databases
   * 
   * 3. **remote_api_databases** - ION API tenant configurations
   *    - Used by: `/api/remote-databases/*` endpoints
   *    - Purpose: Store tenant/database configurations for ION APIs
   *    - Key fields: tenant_name, base_url, services, status
   * 
   * 4. **remote_api_tables** - Services/tables available in each ION API tenant
   *    - Used by: `/api/remote-databases/[id]/tables/*` endpoints
   *    - Purpose: Store table/service definitions (SOAP and REST)
   *    - Key fields: name, endpoint, api_type, odata_service, entity_name
   * 
   * 5. **remote_api_expand_fields** - OData expand fields for REST APIs
   *    - Used by: `/api/remote-databases/[id]/tables/[tableName]/expand-fields` endpoints
   *    - Purpose: Store nested data fetch configurations for REST/OData APIs
   *    - Key fields: table_id, field_name, is_active
   * 
   * **Migration Features:**
   * - Idempotent: Safe to run multiple times (uses IF NOT EXISTS)
   * - Backward compatible: Handles legacy schema changes
   * - Data preservation: Migrates existing data when changing schemas
   * - Column additions: Adds missing columns to existing tables
   * - Index creation: Creates performance indexes automatically
   * 
   * **Database Relationships:**
   * ```
   * databases (1:N) → database_tables
   * remote_api_databases (1:N) → remote_api_tables (1:N) → remote_api_expand_fields
   * ```
   * 
   * @example
   * ```typescript
   * // Automatically called during initialization
   * const db = await SQLiteManager.initialize();
   * // runMigrations() has already executed
   * ```
   */
  private static async runMigrations(): Promise<void> {
    try {
      // ========================================================================
      // TABLE 1: databases
      // ========================================================================
      // Purpose: Store local database connections (PostgreSQL, MySQL, MongoDB, etc.)
      // Used by: /api/databases/* endpoints
      // Relationships: Parent to database_tables (1:N)
      // ========================================================================
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS databases (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('postgresql', 'mysql', 'mongodb', 'api', 'local', 'sqlite')),
          connection_string TEXT,
          api_key TEXT,
          status TEXT DEFAULT 'connected' CHECK(status IN ('connected', 'disconnected', 'error')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ========================================================================
      // TABLE 2: database_tables
      // ========================================================================
      // Purpose: Store metadata about tables within local databases
      // Used by: Internal SQLiteManager queries (listDatabases, findDatabaseById, etc.)
      // Relationships: Child of databases (N:1)
      // ========================================================================
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS database_tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          database_id TEXT NOT NULL,
          name TEXT NOT NULL,
          record_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE
        )
      `);

      // ========================================================================
      // TABLE 3: remote_api_databases
      // ========================================================================
      // Purpose: Store ION API tenant configurations (main tenant/database records)
      // Used by: /api/remote-databases/* endpoints, lib/RemoteAPIContext.tsx
      // Relationships: Parent to remote_api_tables (1:N)
      // Key fields: tenant_name (unique), base_url, services, status
      // ========================================================================
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS remote_api_databases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL,
          tenant_name TEXT NOT NULL UNIQUE,
          services TEXT NOT NULL,
          full_url TEXT,
          status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ========================================================================
      // MIGRATION: Convert TEXT id to INTEGER id (Legacy Support)
      // ========================================================================
      // Purpose: Handle old databases where id was TEXT instead of INTEGER
      // Note: This migration only runs if legacy schema is detected
      // ========================================================================
      try {
        const columns = await this.apiGet(`PRAGMA table_info(remote_api_databases)`);
        const idColumn = columns.find((col: any) => col.name === 'id');

        if (idColumn && idColumn.type === 'TEXT') {

          // Create new table with correct schema
          await this.apiExec(`
            CREATE TABLE remote_api_databases_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              base_url TEXT NOT NULL,
              tenant_name TEXT NOT NULL UNIQUE,
              services TEXT NOT NULL,
              full_url TEXT,
              status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Copy data from old table to new table
          await this.apiExec(`
            INSERT INTO remote_api_databases_new (name, base_url, tenant_name, services, full_url, status, created_at, updated_at)
            SELECT name, base_url, tenant_name, services, full_url, status, created_at, updated_at
            FROM remote_api_databases
          `);

          // Drop old table and rename new table
          await this.apiExec(`DROP TABLE remote_api_databases`);
          await this.apiExec(`ALTER TABLE remote_api_databases_new RENAME TO remote_api_databases`);

        }
      } catch (migrationError) {
        // Migration likely already completed
      }

      // ========================================================================
      // MIGRATION: Add missing columns to remote_api_databases (Legacy Support)
      // ========================================================================
      // Purpose: Add columns that were added after initial schema
      // Note: These migrations only run for old databases missing these columns
      // ========================================================================
      try {
        const columns = await this.apiGet(`PRAGMA table_info(remote_api_databases)`);

        // Add full_url column if it doesn't exist (migration)
        const hasFullUrlColumn = columns.some((col: any) => col.name === 'full_url');
        if (!hasFullUrlColumn) {
          await this.apiExec(`ALTER TABLE remote_api_databases ADD COLUMN full_url TEXT`);
        }

        // Add name column if it doesn't exist (migration)
        const hasNameColumn = columns.some((col: any) => col.name === 'name');
        if (!hasNameColumn) {
          await this.apiExec(`ALTER TABLE remote_api_databases ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown'`);
        }

        // Add expand_fields column if it doesn't exist (migration)
        const hasExpandFieldsColumn = columns.some((col: any) => col.name === 'expand_fields');
        if (!hasExpandFieldsColumn) {
          await this.apiExec(`ALTER TABLE remote_api_databases ADD COLUMN expand_fields TEXT`);
        }
      } catch (error) {
        // Migration error (likely table is new)
      }

      // ========================================================================
      // TABLE 4: remote_api_tables
      // ========================================================================
      // Purpose: Store tables/services available within each ION API tenant
      // Used by: /api/remote-databases/[id]/tables/* endpoints
      // Relationships: Child of remote_api_databases (N:1), Parent to remote_api_expand_fields (1:N)
      // Key fields: name, endpoint, api_type (soap/rest), odata_service, entity_name
      // ========================================================================
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS remote_api_tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          database_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          api_type TEXT DEFAULT 'soap' CHECK(api_type IN ('soap', 'rest')),
          odata_service TEXT,
          entity_name TEXT,
          schema_definition TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (database_id) REFERENCES remote_api_databases(id) ON DELETE CASCADE
        )
      `);

      // ========================================================================
      // TABLE 5: remote_api_expand_fields
      // ========================================================================
      // Purpose: Store OData expand fields for REST API tables (related data to fetch)
      // Used by: /api/remote-databases/[id]/tables/[tableName]/expand-fields endpoints
      // Relationships: Child of remote_api_tables (N:1)
      // Key fields: table_id, field_name (unique per table), is_active
      // ========================================================================
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS remote_api_expand_fields (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id INTEGER NOT NULL,
          field_name TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (table_id) REFERENCES remote_api_tables(id) ON DELETE CASCADE,
          UNIQUE(table_id, field_name)
        )
      `);


      // ========================================================================
      // MIGRATION: Add missing columns to remote_api_tables (Legacy Support)
      // ========================================================================
      // Purpose: Add api_type, odata_service, entity_name, updated_at columns
      // Note: These migrations support transition from SOAP-only to SOAP+REST
      // ========================================================================
      try {
        const tableColumns = await this.apiGet(`PRAGMA table_info(remote_api_tables)`);
        
        // Add api_type column if it doesn't exist
        const hasApiTypeColumn = tableColumns.some((col: any) => col.name === 'api_type');
        if (!hasApiTypeColumn) {
          await this.apiExec(`ALTER TABLE remote_api_tables ADD COLUMN api_type TEXT DEFAULT 'soap' CHECK(api_type IN ('soap', 'rest'))`);
        }

        // Add odata_service column if it doesn't exist
        const hasODataServiceColumn = tableColumns.some((col: any) => col.name === 'odata_service');
        if (!hasODataServiceColumn) {
          await this.apiExec(`ALTER TABLE remote_api_tables ADD COLUMN odata_service TEXT`);
        }

        // Add entity_name column if it doesn't exist
        const hasEntityNameColumn = tableColumns.some((col: any) => col.name === 'entity_name');
        if (!hasEntityNameColumn) {
          await this.apiExec(`ALTER TABLE remote_api_tables ADD COLUMN entity_name TEXT`);
        }

        // Add updated_at column if it doesn't exist
        const hasUpdatedAtColumn = tableColumns.some((col: any) => col.name === 'updated_at');
        if (!hasUpdatedAtColumn) {
          // SQLite doesn't allow non-constant defaults when adding columns
          await this.apiExec(`ALTER TABLE remote_api_tables ADD COLUMN updated_at DATETIME`);
          // Update existing rows with current timestamp
          await this.apiExec(`UPDATE remote_api_tables SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
        }
      } catch (error) {
        // Migration error (likely table is new or already migrated)
      }

      // ========================================================================
      // INDEXES: Performance optimization
      // ========================================================================
      // Purpose: Speed up common queries on frequently accessed columns
      // All indexes use IF NOT EXISTS to prevent duplicate index errors
      // ========================================================================
      await this.apiExec(`
        CREATE INDEX IF NOT EXISTS idx_databases_name ON databases(name);
        CREATE INDEX IF NOT EXISTS idx_tables_database_id ON database_tables(database_id);
        CREATE INDEX IF NOT EXISTS idx_remote_api_databases_tenant ON remote_api_databases(tenant_name);
        CREATE INDEX IF NOT EXISTS idx_remote_api_tables_database_id ON remote_api_tables(database_id);
        CREATE INDEX IF NOT EXISTS idx_remote_api_expand_fields_table_id ON remote_api_expand_fields(table_id);
        CREATE INDEX IF NOT EXISTS idx_remote_api_expand_fields_active ON remote_api_expand_fields(is_active);
      `);

    } catch (error) {
      throw error;
    }
  }


  /**
   * Creates a new remote API database or updates an existing one
   * Handles both new database creation and existing database updates
   * @static
   * @async
   * @param {Object} data - Database configuration data
   * @param {string} [data.name] - Display name for the database
   * @param {string} data.fullUrl - Complete API URL
   * @param {string} data.baseUrl - Base URL for the API
   * @param {string} data.tenantName - Tenant name (must be unique)
   * @param {string} data.services - Services path
   * @param {string[]} data.tables - Array of table names
   * @returns {Promise<Object>} Result object with success status and message
   * @returns {boolean} result.isExisting - Whether the database already existed
   * @returns {string} result.message - Success or informational message
   * @throws {Error} If database operation fails
   */
  /**
   * Parses a service definition to extract API components (handles hundreds of possible services)
   * @private
   * @static
   * @param {string} serviceDef - Service definition
   *   SOAP examples: 'BusinessPartner_v3', 'ServiceCall_v2', 'Customer_v1'
   *   REST examples: 'tdapi.slsSalesOrder/orders', 'tsapi.socServiceOrder/Orders', 'hrapi.empEmployee/Employees'
   * @param {string} servicesPath - Services path (e.g., 'LN/c4ws/services' or 'LN/lnapi')
   * @returns {object} Parsed service information
   */
  private static parseServiceDefinition(serviceDef: string, servicesPath: string): {
    name: string;
    endpoint: string;
    apiType: 'soap' | 'rest';
    oDataService?: string;
    entityName?: string;
  } {
    // Determine API type based on services path
    const apiType: 'soap' | 'rest' = servicesPath.includes('lnapi') ? 'rest' : 'soap';
    
    if (apiType === 'rest' && serviceDef.includes('/')) {
      // Generic REST API service parsing: 'anyapi.anyService/AnyEntity'
      const parts = serviceDef.split('/');
      if (parts.length >= 2) {
        const oDataService = parts[0]; // e.g., 'tdapi.slsSalesOrder', 'tsapi.socServiceOrder', 'hrapi.empEmployee'
        const entityName = parts[1];   // e.g., 'orders', 'Orders', 'Employees'
        
        return {
          name: serviceDef,
          endpoint: serviceDef,
          apiType: 'rest',
          oDataService,
          entityName
        };
      }
    }
    
    // SOAP API service or invalid REST format - treat as SOAP
    return {
      name: serviceDef,
      endpoint: serviceDef,
      apiType: 'soap'
    };
  }

  static async createRemoteAPIDatabase(data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[]; expandFields?: string[] }): Promise<any> {
    await this.initialize();

    // Check if tenant already exists (tenant_name UNIQUE constraint will handle this)
    const existingTenant = await this.apiGet(
      'SELECT id FROM remote_api_databases WHERE tenant_name = ?',
      [data.tenantName]
    );

    if (existingTenant.length > 0) {
      // Tenant already exists - add new services/tables to existing tenant
      const tenantId = existingTenant[0].id;
      
      // Get current tables for this tenant
      const currentTables = await this.apiGet(
        'SELECT name FROM remote_api_tables WHERE database_id = ?',
        [tenantId]
      );
      const currentTableNames = currentTables.map((table: any) => table.name);
      
      // Filter out tables that already exist
      const newTables = data.tables.filter(table => !currentTableNames.includes(table));
      
      if (newTables.length > 0) {
        // Insert only new tables
        for (const table of newTables) {
          const serviceInfo = this.parseServiceDefinition(table, data.services);
          await this.apiPost(
            'INSERT INTO remote_api_tables (database_id, name, endpoint, api_type, odata_service, entity_name) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, serviceInfo.name, serviceInfo.endpoint, serviceInfo.apiType, serviceInfo.oDataService || null, serviceInfo.entityName || null]
          );
        }
      }
      
      const updatedDatabase = await this.getRemoteAPIDatabaseById(tenantId.toString());
      
      // Add a flag to indicate this is an updated existing database
      return {
        ...updatedDatabase,
        isExisting: true,
        isUpdated: newTables.length > 0,
        newTablesAdded: newTables,
        message: newTables.length > 0 
          ? `Added ${newTables.length} new service(s) to tenant "${data.tenantName}": ${newTables.join(', ')}`
          : `All services already exist in tenant "${data.tenantName}"`
      };
    } else {
      // Create new tenant
      try {
        const expandFieldsJson = data.expandFields ? JSON.stringify(data.expandFields) : null;
        const result = await this.apiPost(
          'INSERT INTO remote_api_databases (name, base_url, tenant_name, services, full_url, expand_fields) VALUES (?, ?, ?, ?, ?, ?)',
          [data.name || `${data.tenantName} - ${data.tables[0] || 'default'}`, data.baseUrl, data.tenantName, data.services, data.fullUrl || '', expandFieldsJson]
        );

        const tenantId = result.lastID;

        // Insert tables
        if (data.tables && data.tables.length > 0) {
          for (const table of data.tables) {
            const serviceInfo = this.parseServiceDefinition(table, data.services);
            await this.apiPost(
              'INSERT INTO remote_api_tables (database_id, name, endpoint, api_type, odata_service, entity_name) VALUES (?, ?, ?, ?, ?, ?)',
              [tenantId, serviceInfo.name, serviceInfo.endpoint, serviceInfo.apiType, serviceInfo.oDataService || null, serviceInfo.entityName || null]
            );
          }
        }

        const newDatabase = await this.getRemoteAPIDatabaseById(tenantId.toString());
        return {
          ...newDatabase,
          isExisting: false,
          message: `Database "${data.tenantName}" created successfully with ${data.tables.length} service(s)`
        };
      } catch (error) {
        throw error;
      }
    }
  }

  /**
   * Retrieves all remote API databases with their associated tables
   * @static
   * @async
   * @returns {Promise<Array>} Array of database objects with tables
   * @throws {Error} If database query fails
   */
  static async getRemoteAPIDatabases(): Promise<any[]> {
    await this.initialize();
    const databases = await this.apiGet(`
      SELECT id, name, full_url, base_url, tenant_name, services, expand_fields, status, created_at, updated_at
      FROM remote_api_databases
      ORDER BY created_at DESC
    `);

    // Transform to camelCase and get tables with expand fields for each database
    const result = [];
    for (let index = 0; index < databases.length; index++) {
      const db = databases[index];
      const tables = db.id ? await this.apiGet(`
        SELECT id, name, endpoint, api_type, odata_service, entity_name FROM remote_api_tables WHERE database_id = ? ORDER BY name
      `, [db.id]) : [];

      // Get expand fields for each table
      const tablesWithExpandFields = [];
      for (const table of tables) {
        const expandFields = await this.apiGet(`
          SELECT field_name, description, is_active FROM remote_api_expand_fields 
          WHERE table_id = ? AND is_active = 1 ORDER BY field_name
        `, [table.id]);

        tablesWithExpandFields.push({
          id: table.id,
          name: table.name,
          endpoint: table.endpoint || table.name,
          apiType: table.api_type || 'soap',
          oDataService: table.odata_service,
          entityName: table.entity_name,
          expandFields: expandFields.map((field: any) => ({
            name: field.field_name,
            description: field.description,
            isActive: field.is_active === 1
          }))
        });
      }

      result.push({
        id: db.id ? db.id.toString() : `temp_${index}_${Date.now()}`,
        name: db.name,
        fullUrl: db.full_url || '',
        baseUrl: db.base_url,
        tenantName: db.tenant_name,
        services: db.services,
        expandFields: db.expand_fields ? JSON.parse(db.expand_fields) : [], // Keep legacy for backward compatibility
        status: db.status,
        createdAt: new Date(db.created_at),
        updatedAt: new Date(db.updated_at),
        tables: tablesWithExpandFields,
        // Add summary statistics about API types in this tenant
        soapServicesCount: tables.filter((t: any) => (t.api_type || 'soap') === 'soap').length,
        restServicesCount: tables.filter((t: any) => t.api_type === 'rest').length,
        hasMultipleApiTypes: tables.some((t: any) => (t.api_type || 'soap') === 'soap') && tables.some((t: any) => t.api_type === 'rest')
      });
    }

    return result;
  }

  /**
   * Retrieves a specific remote API database by ID with its associated tables
   * @static
   * @async
   * @param {string} id - Database ID to retrieve
   * @returns {Promise<Object|null>} Database object with tables, or null if not found
   * @returns {string} return.id - Database ID
   * @returns {string} return.name - Display name of the database
   * @returns {string} return.fullUrl - Complete API URL
   * @returns {string} return.baseUrl - Base URL of the API
   * @returns {string} return.tenantName - Tenant identifier
   * @returns {string} return.services - Services path
   * @returns {string} return.status - Connection status
   * @returns {Date} return.createdAt - Creation timestamp
   * @returns {Date} return.updatedAt - Last update timestamp
   * @returns {Array} return.tables - Array of table objects with name and endpoint
   * @throws {Error} If database query fails
   * 
   * @example
   * ```typescript
   * const database = await SQLiteManager.getRemoteAPIDatabaseById('123');
   * if (database) {
   *   // Process the database with its tables
   *   return database;
   * }
   * ```
   */
  static async getRemoteAPIDatabaseById(id: string): Promise<any | null> {
    await this.initialize();
    const databases = await this.apiGet(`
      SELECT id, name, full_url, base_url, tenant_name, services, expand_fields, status, created_at, updated_at
      FROM remote_api_databases
      WHERE id = ?
    `, [id]);

    if (databases.length === 0) return null;

    const db = databases[0];
    const tables = await this.apiGet(`
      SELECT id, name, endpoint, api_type, odata_service, entity_name FROM remote_api_tables WHERE database_id = ? ORDER BY name
    `, [id]);

    // Get expand fields for each table (same logic as getRemoteAPIDatabases)
    const tablesWithExpandFields = [];
    for (const table of tables) {
      const expandFields = await this.apiGet(`
        SELECT field_name, description, is_active FROM remote_api_expand_fields 
        WHERE table_id = ? AND is_active = 1 ORDER BY field_name
      `, [table.id]);

      const processedExpandFields = expandFields.map((field: any) => ({
        name: field.field_name,
        description: field.description,
        isActive: field.is_active === 1
      }));
      
      tablesWithExpandFields.push({
        id: table.id,
        name: table.name,
        endpoint: table.endpoint || table.name,
        apiType: table.api_type || 'soap',
        oDataService: table.odata_service,
        entityName: table.entity_name,
        expandFields: processedExpandFields
      });
    }

    return {
      id: db.id ? db.id.toString() : `temp_${Date.now()}`,
      name: db.name,
      fullUrl: db.full_url || '',
      baseUrl: db.base_url,
      tenantName: db.tenant_name,
      services: db.services,
      expandFields: db.expand_fields ? JSON.parse(db.expand_fields) : [], // Keep legacy for backward compatibility
      status: db.status,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
      tables: tablesWithExpandFields
    };
  }

  /**
   * Deletes a remote API database and all its associated tables
   * @static
   * @async
   * @param {string} id - Database ID to delete
   * @returns {Promise<boolean>} Always returns true if deletion succeeds
   * @throws {Error} If database deletion fails
   * 
   * @description
   * Uses CASCADE DELETE to automatically remove all associated tables from remote_api_tables.
   * This operation is irreversible.
   * 
   * @example
   * ```typescript
   * const success = await SQLiteManager.deleteRemoteAPIDatabase('123');
   * // Database deletion completed successfully
   * ```
   */
  static async deleteRemoteAPIDatabase(id: string): Promise<boolean> {
    await this.initialize();
    await this.apiPost('DELETE FROM remote_api_databases WHERE id = ?', [id]);
    return true;
  }

  /**
   * Updates a specific table name within a remote database
   * @static
   * @async
   * @param {string} databaseId - Database/tenant ID
   * @param {string} currentTableName - Current table name to update
   * @param {string} newTableName - New table name
   * @returns {Promise<boolean>} True if update succeeded
   * @throws {Error} If update fails
   */
  static async updateRemoteAPITable(databaseId: string, currentTableName: string, newTableName: string): Promise<boolean> {
    await this.initialize();
    await this.apiPost(
      'UPDATE remote_api_tables SET name = ?, endpoint = ?, updated_at = CURRENT_TIMESTAMP WHERE database_id = ? AND name = ?',
      [newTableName, newTableName, databaseId, currentTableName]
    );
    return true;
  }

  /**
   * Deletes a specific table from a remote database
   * @static
   * @async
   * @param {string} databaseId - Database/tenant ID
   * @param {string} tableName - Table name to delete
   * @returns {Promise<boolean>} True if deletion succeeded
   * @throws {Error} If deletion fails
   */
  static async deleteRemoteAPITable(databaseId: string, tableName: string): Promise<boolean> {
    await this.initialize();
    await this.apiPost(
      'DELETE FROM remote_api_tables WHERE database_id = ? AND name = ?',
      [databaseId, tableName]
    );
    return true;
  }

  /**
   * Adds expand fields to a specific table
   * @static
   * @async
   * @param {number} tableId - Table ID to add expand fields to
   * @param {string[]} expandFields - Array of expand field names
   * @returns {Promise<boolean>} True if fields were added successfully
   * @throws {Error} If operation fails
   */
  static async addExpandFieldsToTable(tableId: number, expandFields: string[]): Promise<boolean> {
    await this.initialize();
    
    for (const fieldName of expandFields) {
      try {
        const trimmedField = fieldName.trim();
        await this.apiPost(
          'INSERT OR IGNORE INTO remote_api_expand_fields (table_id, field_name, is_active) VALUES (?, ?, 1)',
          [tableId, trimmedField]
        );
      } catch (error) {
        // Continue with other fields if one fails
        console.warn(`Failed to add expand field ${fieldName} to table ${tableId}:`, error);
      }
    }
    
    return true;
  }

  /**
   * Updates expand fields for a specific table
   * @static
   * @async
   * @param {number} tableId - Table ID to update expand fields for
   * @param {string[]} expandFields - New array of expand field names
   * @returns {Promise<boolean>} True if fields were updated successfully
   * @throws {Error} If operation fails
   */
  static async updateTableExpandFields(tableId: number, expandFields: string[]): Promise<boolean> {
    await this.initialize();
    
    try {
      // Delete existing expand fields for this table
      await this.apiPost(
        'DELETE FROM remote_api_expand_fields WHERE table_id = ?',
        [tableId]
      );
      
      // Add new expand fields
      if (expandFields && expandFields.length > 0) {
        await this.addExpandFieldsToTable(tableId, expandFields);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gets expand fields for a specific table
   * @static
   * @async
   * @param {number} tableId - Table ID to get expand fields for
   * @returns {Promise<string[]>} Array of active expand field names
   * @throws {Error} If query fails
   */
  static async getTableExpandFields(tableId: number): Promise<string[]> {
    await this.initialize();
    
    const fields = await this.apiGet(
      'SELECT field_name FROM remote_api_expand_fields WHERE table_id = ? AND is_active = 1 ORDER BY field_name',
      [tableId]
    );
    
    return fields.map((field: any) => field.field_name);
  }

  /**
   * Creates a new local database entry with tables
   * @static
   * @async
   * @param {DatabaseData} data - Database configuration data
   * @param {string} data.name - Display name for the database (must be unique)
   * @param {'postgresql'|'mysql'|'mongodb'|'api'|'local'|'sqlitecloud'} data.type - Database type
   * @param {string} [data.connection_string] - Connection string for external databases
   * @param {string} [data.api_key] - API key for authentication
   * @param {DatabaseTable[]} [data.tables] - Array of table definitions
   * @param {'connected'|'disconnected'|'error'} [data.status='connected'] - Initial status
   * @returns {Promise<DatabaseData>} Created database object with generated ID and timestamps
   * @throws {Error} If database creation fails
   * 
   * @description
   * Creates a local database configuration entry. If a database with the same name already exists,
   * returns the existing database instead of creating a duplicate.
   * 
   * @example
   * ```typescript
   * const newDb = await SQLiteManager.createDatabase({
   *   name: 'Production PostgreSQL',
   *   type: 'postgresql',
   *   connection_string: 'postgresql://user:pass@localhost:5432/dbname',
   *   tables: [{ name: 'users', record_count: 100 }]
   * });
   * ```
   */
  static async createDatabase(data: DatabaseData): Promise<DatabaseData> {
    await this.initialize();

    let status: number;
    let respBody: any;

    try {
      // Check if database with same name already exists
      const existingDb = await this.findDatabaseByName(data.name);
      if (existingDb) {
        return existingDb;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const query = 'INSERT INTO databases (id, name, type, connection_string, api_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [id, data.name, data.type, data.connection_string || null, data.api_key || null, data.status || 'connected', now, now];

      await this.apiPost(query, values);

      // Insert tables if provided
      if (data.tables && data.tables.length > 0) {
        for (const table of data.tables) {
          const tableQuery = 'INSERT INTO database_tables (database_id, name, record_count) VALUES (?, ?, ?)';
          const tableValues = [id, table.name, table.record_count || 0];
          await this.apiPost(tableQuery, tableValues);
        }
      }

      const result = await this.findDatabaseById(id);
      if (!result) {
        throw new Error('Failed to retrieve created database');
      }
      return result;

    } catch (error) {
      throw error;
    }
  }

  static async listDatabases(): Promise<DatabaseData[]> {
    await this.initialize();

    try {
      const databases = await this.apiGet(`
        SELECT id, name, type, connection_string, api_key, status, created_at, updated_at
        FROM databases
        ORDER BY name
      `) as Array<{
        id: string;
        name: string;
        type: string;
        connection_string: string | null;
        api_key: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>;

      const result: DatabaseData[] = [];
      for (const dbInfo of databases) {
        const tables = await this.apiGet(
          'SELECT name, record_count FROM database_tables WHERE database_id = ? ORDER BY name',
          [dbInfo.id]
        ) as Array<{
          name: string;
          record_count: number;
        }>;

        result.push({
          id: dbInfo.id,
          name: dbInfo.name,
          type: dbInfo.type as DatabaseData['type'],
          connection_string: dbInfo.connection_string || undefined,
          api_key: dbInfo.api_key || undefined,
          status: dbInfo.status as DatabaseData['status'],
          tables: tables,
          created_at: dbInfo.created_at,
          updated_at: dbInfo.updated_at
        });
      }

      return result;

    } catch (error) {
      throw error;
    }
  }

  static async findDatabaseById(id: string): Promise<DatabaseData | null> {
    await this.initialize();

    try {
      const databases = await this.apiGet(
        'SELECT id, name, type, connection_string, api_key, status, created_at, updated_at FROM databases WHERE id = ?',
        [id]
      ) as Array<{
        id: string;
        name: string;
        type: string;
        connection_string: string | null;
        api_key: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>;

      if (!databases || databases.length === 0) {
        return null;
      }

      const database = databases[0];

      // Get tables
      const tables = await this.apiGet(
        'SELECT name, record_count FROM database_tables WHERE database_id = ? ORDER BY name',
        [id]
      ) as Array<{
        name: string;
        record_count: number;
      }>;

      return {
        id: database.id,
        name: database.name,
        type: database.type as DatabaseData['type'],
        connection_string: database.connection_string || undefined,
        api_key: database.api_key || undefined,
        status: database.status as DatabaseData['status'],
        tables: tables,
        created_at: database.created_at,
        updated_at: database.updated_at
      };

    } catch (error) {
      throw error;
    }
  }

  static async findDatabaseByName(name: string): Promise<DatabaseData | null> {
    await this.initialize();

    try {
      const databases = await this.apiGet(
        'SELECT id, name, type, connection_string, api_key, status, created_at, updated_at FROM databases WHERE name = ?',
        [name]
      ) as Array<{
        id: string;
        name: string;
        type: string;
        connection_string: string | null;
        api_key: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>;

      if (!databases || databases.length === 0) {
        return null;
      }

      const database = databases[0];

      // Get tables
      const tables = await this.apiGet(
        'SELECT name, record_count FROM database_tables WHERE database_id = ? ORDER BY name',
        [database.id]
      ) as Array<{
        name: string;
        record_count: number;
      }>;

      return {
        id: database.id,
        name: database.name,
        type: database.type as DatabaseData['type'],
        connection_string: database.connection_string || undefined,
        api_key: database.api_key || undefined,
        status: database.status as DatabaseData['status'],
        tables: tables,
        created_at: database.created_at,
        updated_at: database.updated_at
      };

    } catch (error) {
      throw error;
    }
  }

  static async updateDatabase(id: string, data: Partial<DatabaseData>): Promise<DatabaseData | null> {
    await this.initialize();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined && key !== 'tables') {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (updateFields.length === 0) {
        return this.findDatabaseById(id);
      }

      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const updateQuery = `UPDATE databases SET ${updateFields.join(', ')} WHERE id = ?`;

      const result = await this.apiPost(updateQuery, values);

      // Update tables if provided
      if (data.tables) {

        // Delete existing tables
        await this.apiPost('DELETE FROM database_tables WHERE database_id = ?', [id]);

        // Insert new tables
        if (data.tables.length > 0) {
          for (const table of data.tables) {
            await this.apiPost(
              'INSERT INTO database_tables (database_id, name, record_count) VALUES (?, ?, ?)',
              [id, table.name, table.record_count || 0]
            );
          }
        }
      }

      return this.findDatabaseById(id);

    } catch (error) {
      throw error;
    }
  }

  static async deleteDatabase(id: string): Promise<boolean> {
    await this.initialize();

    try {
      const result = await this.apiPost('DELETE FROM databases WHERE id = ?', [id]);

      return true;

    } catch (error) {
      throw error;
    }
  }

  static async clearAllDatabases(): Promise<void> {
    await this.initialize();

    try {
      // Clear tables (foreign key constraint will handle cascading)
      await this.apiExec('DELETE FROM databases');

    } catch (error) {
      throw error;
    }
  }

  static async close(): Promise<void> {
    return await new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }


  /**
   * Updates an existing remote API database configuration
   * @static
   * @async
   * @param {string} id - Database ID to update
   * @param {Object} data - Updated database configuration
   * @param {string} data.name - Display name for the database
   * @param {string} data.fullUrl - Complete API URL
   * @param {string} data.baseUrl - Base URL for the API
   * @param {string} data.tenantName - Tenant name
   * @param {string} data.services - Services path
   * @param {string[]} data.tables - Array of table/service names
   * @param {string[]} data.expandFields - Array of OData expand fields
   * @param {string} data.status - Database status (active/inactive)
   * @returns {Promise<Object>} Updated database object
   * @throws {Error} If database update fails
   */
  static async updateRemoteAPIDatabase(id: string, data: {
    name: string;
    fullUrl: string;
    baseUrl: string;
    tenantName: string;
    services: string;
    tables: string[];
    expandFields: string[];
    status: string;
  }): Promise<any> {
    await this.initialize();

    try {
      // Update main database record
      const expandFieldsJson = data.expandFields ? JSON.stringify(data.expandFields) : null;
      await this.apiPost(
        'UPDATE remote_api_databases SET name = ?, base_url = ?, tenant_name = ?, services = ?, full_url = ?, expand_fields = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.name, data.baseUrl, data.tenantName, data.services, data.fullUrl, expandFieldsJson, data.status, id]
      );

      // Update tables - delete existing and insert new ones
      await this.apiPost('DELETE FROM remote_api_tables WHERE database_id = ?', [id]);

      // Insert updated tables
      if (data.tables && data.tables.length > 0) {
        for (const table of data.tables) {
          const serviceInfo = this.parseServiceDefinition(table, data.services);
          await this.apiPost(
            'INSERT INTO remote_api_tables (database_id, name, endpoint, api_type, odata_service, entity_name) VALUES (?, ?, ?, ?, ?, ?)',
            [id, serviceInfo.name, serviceInfo.endpoint, serviceInfo.apiType, serviceInfo.oDataService || null, serviceInfo.entityName || null]
          );
        }
      }

      // Return the updated database
      return await this.getRemoteAPIDatabaseById(id);
    } catch (error) {
      throw error;
    }
  }
}
