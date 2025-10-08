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
 * Provides CRUD operations for databases and tables, schema management, and migrations
 * @class SQLiteManager
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
   * Handles schema changes, column additions, and data migrations
   * @private
   * @static
   * @async
   * @throws {Error} If migration fails
   */
  private static async runMigrations(): Promise<void> {
    try {
      // Create databases table
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

      // Create tables metadata table
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

      // Create remote API databases table
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

      // Migrate existing TEXT id to INTEGER id if needed
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

      // Migration for existing tables - check if columns exist and add if needed
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
      } catch (error) {
        // Migration error (likely table is new)
      }

      // Create remote API tables table
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

      // Create customers table
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          category TEXT NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create orders table
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          order_date DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);

      // Migration for remote_api_tables - add new columns if they don't exist
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
      } catch (error) {
        // Migration error (likely table is new or already migrated)
      }

      // Create indexes for better performance
      await this.apiExec(`
        CREATE INDEX IF NOT EXISTS idx_databases_name ON databases(name);
        CREATE INDEX IF NOT EXISTS idx_tables_database_id ON database_tables(database_id);
        CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      `);

      // Seed sample data
      await this.seedSampleData();

    } catch (error) {
      throw error;
    }
  }

  /**
   * Seeds the database with sample data for testing and demonstration purposes
   * @private
   * @static
   * @async
   * @returns {Promise<void>} Resolves when seeding is complete
   * @throws {Error} If seeding operations fail
   * 
   * @description
   * Creates sample customers, products, and orders if the database is empty.
   * This method is idempotent - it checks for existing data before inserting.
   * Used during database initialization to provide meaningful demo data.
   */
  private static async seedSampleData(): Promise<void> {
    try {
      // Check if data already exists
      const existingCustomers = await this.apiGet('SELECT COUNT(*) as count FROM customers');
      if (existingCustomers[0].count > 0) {
        return;
      }

      // Seed customers
      const customers = [
        { id: '1', name: 'John Smith', email: 'john@example.com', phone: '+1-555-0123' },
        { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1-555-0124' },
        { id: '3', name: 'Mike Brown', email: 'mike@example.com', phone: '+1-555-0125' }
      ];

      for (const customer of customers) {
        await this.apiPost(
          'INSERT INTO customers (id, name, email, phone) VALUES (?, ?, ?, ?)',
          [customer.id, customer.name, customer.email, customer.phone]
        );
      }

      // Seed products
      const products = [
        { id: '1', name: 'Wireless Headphones', price: 199.99, category: 'Electronics', stock: 50 },
        { id: '2', name: 'Programming Book', price: 49.99, category: 'Books', stock: 25 },
        { id: '3', name: 'Coffee Maker', price: 89.99, category: 'Kitchen', stock: 15 },
        { id: '4', name: 'Gaming Mouse', price: 79.99, category: 'Electronics', stock: 30 },
        { id: '5', name: 'Desk Chair', price: 249.99, category: 'Furniture', stock: 10 }
      ];

      for (const product of products) {
        await this.apiPost(
          'INSERT INTO products (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)',
          [product.id, product.name, product.price, product.category, product.stock]
        );
      }

      // Seed orders
      const orders = [
        { id: '1', customer_id: '1', product_id: '1', quantity: 2, order_date: '2024-01-15', status: 'completed' },
        { id: '2', customer_id: '2', product_id: '2', quantity: 1, order_date: '2024-01-16', status: 'pending' },
        { id: '3', customer_id: '1', product_id: '3', quantity: 3, order_date: '2024-01-17', status: 'completed' },
        { id: '4', customer_id: '3', product_id: '4', quantity: 1, order_date: '2024-01-18', status: 'completed' },
        { id: '5', customer_id: '2', product_id: '5', quantity: 1, order_date: '2024-01-19', status: 'pending' },
        { id: '6', customer_id: '3', product_id: '1', quantity: 1, order_date: '2024-01-20', status: 'completed' },
        { id: '7', customer_id: '1', product_id: '2', quantity: 2, order_date: '2024-01-21', status: 'completed' }
      ];

      for (const order of orders) {
        await this.apiPost(
          'INSERT INTO orders (id, customer_id, product_id, quantity, order_date, status) VALUES (?, ?, ?, ?, ?, ?)',
          [order.id, order.customer_id, order.product_id, order.quantity, order.order_date, order.status]
        );
      }

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

  static async createRemoteAPIDatabase(data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[] }): Promise<any> {
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
        const result = await this.apiPost(
          'INSERT INTO remote_api_databases (name, base_url, tenant_name, services, full_url) VALUES (?, ?, ?, ?, ?)',
          [data.name || `${data.tenantName} - ${data.tables[0] || 'default'}`, data.baseUrl, data.tenantName, data.services, data.fullUrl || '']
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
      SELECT id, name, full_url, base_url, tenant_name, services, status, created_at, updated_at
      FROM remote_api_databases
      ORDER BY created_at DESC
    `);

    // Transform to camelCase and get tables for each database
    const result = [];
    for (let index = 0; index < databases.length; index++) {
      const db = databases[index];
      const tables = db.id ? await this.apiGet(`
        SELECT name, endpoint, api_type, odata_service, entity_name FROM remote_api_tables WHERE database_id = ? ORDER BY name
      `, [db.id]) : [];

      result.push({
        id: db.id ? db.id.toString() : `temp_${index}_${Date.now()}`,
        name: db.name,
        fullUrl: db.full_url || '',
        baseUrl: db.base_url,
        tenantName: db.tenant_name,
        services: db.services,
        status: db.status,
        createdAt: new Date(db.created_at),
        updatedAt: new Date(db.updated_at),
        tables: tables.map((table: any) => ({
          name: table.name,
          endpoint: table.endpoint || table.name,
          apiType: table.api_type || 'soap',
          oDataService: table.odata_service,
          entityName: table.entity_name
        })),
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
      SELECT id, name, full_url, base_url, tenant_name, services, status, created_at, updated_at
      FROM remote_api_databases
      WHERE id = ?
    `, [id]);

    if (databases.length === 0) return null;

    const db = databases[0];
    const tables = await this.apiGet(`
      SELECT name FROM remote_api_tables WHERE database_id = ? ORDER BY name
    `, [id]);

    return {
      id: db.id ? db.id.toString() : `temp_${Date.now()}`,
      name: db.name,
      fullUrl: db.full_url || '',
      baseUrl: db.base_url,
      tenantName: db.tenant_name,
      services: db.services,
      status: db.status,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
      tables: tables.map((table: any) => ({
        name: table.name,
        endpoint: table.name
      }))
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
   * Retrieves all customers from the sample data
   * @static
   * @async
   * @returns {Promise<Array>} Array of customer objects
   * @returns {string} return[].id - Customer ID
   * @returns {string} return[].name - Customer name
   * @returns {string} return[].email - Customer email address
   * @returns {string} return[].phone - Customer phone number
   * @throws {Error} If database query fails
   * 
   * @example
   * ```typescript
   * const customers = await SQLiteManager.getCustomers();
   * // Process the returned customers array
   * ```
   */
  static async getCustomers(): Promise<any[]> {
    await this.initialize();
    return this.apiGet('SELECT id, name, email, phone FROM customers ORDER BY name');
  }

  /**
   * Retrieves a specific customer by ID
   * @static
   * @async
   * @param {string} id - Customer ID to retrieve
   * @returns {Promise<Object|null>} Customer object or null if not found
   * @returns {string} return.id - Customer ID
   * @returns {string} return.name - Customer name
   * @returns {string} return.email - Customer email address
   * @returns {string} return.phone - Customer phone number
   * @throws {Error} If database query fails
   * 
   * @example
   * ```typescript
   * const customer = await SQLiteManager.getCustomerById('1');
   * if (customer) {
   *   // Process the customer data
   *   return customer;
   * }
   * ```
   */
  static async getCustomerById(id: string): Promise<any | null> {
    await this.initialize();
    const customers = await this.apiGet('SELECT id, name, email, phone FROM customers WHERE id = ?', [id]);
    return customers.length > 0 ? customers[0] : null;
  }

  /**
   * Creates a new customer record
   * @static
   * @async
   * @param {Object} data - Customer data
   * @param {string} data.name - Customer name
   * @param {string} data.email - Customer email address (must be unique)
   * @param {string} data.phone - Customer phone number
   * @returns {Promise<Object>} Created customer object with generated ID
   * @throws {Error} If customer creation fails or email already exists
   * 
   * @example
   * ```typescript
   * const newCustomer = await SQLiteManager.createCustomer({
   *   name: 'Jane Doe',
   *   email: 'jane@example.com',
   *   phone: '+1-555-0199'
   * });
   * // Customer created successfully with generated ID
   * ```
   */
  static async createCustomer(data: { name: string; email: string; phone: string }): Promise<any> {
    await this.initialize();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.apiPost(
      'INSERT INTO customers (id, name, email, phone) VALUES (?, ?, ?, ?)',
      [id, data.name, data.email, data.phone]
    );
    return this.getCustomerById(id);
  }

  static async getProducts(): Promise<any[]> {
    await this.initialize();
    return this.apiGet('SELECT id, name, price, category, stock FROM products ORDER BY name');
  }

  static async getProductById(id: string): Promise<any | null> {
    await this.initialize();
    const products = await this.apiGet('SELECT id, name, price, category, stock FROM products WHERE id = ?', [id]);
    return products.length > 0 ? products[0] : null;
  }

  static async createProduct(data: { name: string; price: number; category: string; stock: number }): Promise<any> {
    await this.initialize();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.apiPost(
      'INSERT INTO products (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.price, data.category, data.stock]
    );
    return this.getProductById(id);
  }

  static async getOrders(): Promise<any[]> {
    await this.initialize();
    return this.apiGet(`
      SELECT o.id, o.customer_id, o.product_id, o.quantity, o.order_date, o.status,
             c.name as customer_name, p.name as product_name, p.price
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN products p ON o.product_id = p.id
      ORDER BY o.order_date DESC
    `);
  }

  static async getOrderById(id: string): Promise<any | null> {
    await this.initialize();
    const orders = await this.apiGet(`
      SELECT o.id, o.customer_id, o.product_id, o.quantity, o.order_date, o.status,
             c.name as customer_name, p.name as product_name, p.price
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `, [id]);
    return orders.length > 0 ? orders[0] : null;
  }

  static async createOrder(data: { customer_id: string; product_id: string; quantity: number; order_date: string; status: string }): Promise<any> {
    await this.initialize();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.apiPost(
      'INSERT INTO orders (id, customer_id, product_id, quantity, order_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.customer_id, data.product_id, data.quantity, data.order_date, data.status]
    );
    return this.getOrderById(id);
  }
}
