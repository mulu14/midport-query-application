/**
 * @fileoverview SQLite database manager for Midport SQL Query Platform
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
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
    console.log('🔌 SQLiteManager: Connecting to local SQLite database...');

    this.db = new sqlite3.Database(
      dbPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          console.error('❌ SQLiteManager: Connection error:', err.message);
          throw err;
        }
        console.log("✅ SQLiteManager: Connected to local SQLite database");
      }
    );

    // Create tables if they don't exist
    await this.runMigrations();

    return this.db;
  }

  // Promise-based wrapper functions following the article's pattern
  private static async apiGet(query: string, params: any[] = []): Promise<any[]> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(query, params, (err: Error, rows: any[]) => {
        if (err) {
          console.error('SQLiteManager: apiGet error:', err);
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  private static async apiPost(query: string, params: any[] = []): Promise<any> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(query, params, function(err: Error) {
        if (err) {
          console.error('SQLiteManager: apiPost error:', err);
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  private static async apiExec(query: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.exec(query, (err: Error | null) => {
        if (err) {
          console.error('SQLiteManager: apiExec error:', err);
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
    console.log('🏗️ SQLiteManager: Running migrations...');

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
          console.log('🔄 Migrating TEXT id column to INTEGER...');

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

          console.log('✅ Migrated id column from TEXT to INTEGER');
        }
      } catch (migrationError) {
        console.log('ℹ️ Migration issue (likely already migrated):', migrationError instanceof Error ? migrationError.message : String(migrationError));
      }

      // Migration for existing tables - check if columns exist and add if needed
      try {
        const columns = await this.apiGet(`PRAGMA table_info(remote_api_databases)`);

        // Add full_url column if it doesn't exist (migration)
        const hasFullUrlColumn = columns.some((col: any) => col.name === 'full_url');
        if (!hasFullUrlColumn) {
          await this.apiExec(`ALTER TABLE remote_api_databases ADD COLUMN full_url TEXT`);
          console.log('✅ Added full_url column to existing table');
        } else {
          console.log('ℹ️ full_url column already exists');
        }

        // Add name column if it doesn't exist (migration)
        const hasNameColumn = columns.some((col: any) => col.name === 'name');
        if (!hasNameColumn) {
          await this.apiExec(`ALTER TABLE remote_api_databases ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown'`);
          console.log('✅ Added name column to existing table');
        } else {
          console.log('ℹ️ name column already exists');
        }
      } catch (error) {
        console.log('ℹ️ Migration error (likely table is new):', error instanceof Error ? error.message : String(error));
      }

      // Create remote API tables table
      await this.apiExec(`
        CREATE TABLE IF NOT EXISTS remote_api_tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          database_id INTEGER NOT NULL,
          name TEXT NOT NULL,
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

      console.log('✅ SQLiteManager: Migrations completed successfully');
    } catch (error) {
      console.error('❌ SQLiteManager: Error running migrations:', error);
      throw error;
    }
  }

  private static async seedSampleData(): Promise<void> {
    console.log('🌱 SQLiteManager: Seeding sample data...');

    try {
      // Check if data already exists
      const existingCustomers = await this.apiGet('SELECT COUNT(*) as count FROM customers');
      if (existingCustomers[0].count > 0) {
        console.log('✅ SQLiteManager: Sample data already exists, skipping seed');
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

      console.log('✅ SQLiteManager: Sample data seeded successfully');
    } catch (error) {
      console.error('❌ SQLiteManager: Error seeding sample data:', error);
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
  static async createRemoteAPIDatabase(data: { name?: string; fullUrl: string; baseUrl: string; tenantName: string; services: string; tables: string[] }): Promise<any> {
    console.log('🔄 SQLiteManager: createRemoteAPIDatabase called with:', data);
    await this.initialize();

    // Check if tenant already exists (tenant_name UNIQUE constraint will handle this)
    const existingTenant = await this.apiGet(
      'SELECT id FROM remote_api_databases WHERE tenant_name = ?',
      [data.tenantName]
    );

    if (existingTenant.length > 0) {
      // Database already exists - return existing database with a message
      const tenantId = existingTenant[0].id;
      console.log('ℹ️ Database already exists:', data.tenantName);
      
      const existingDatabase = await this.getRemoteAPIDatabaseById(tenantId);
      
      // Add a flag to indicate this is an existing database
      return {
        ...existingDatabase,
        isExisting: true,
        message: `Database "${data.tenantName}" already exists`
      };
    } else {
      // Create new tenant
      console.log('🆕 Creating new tenant:', data.tenantName);

      try {
        const result = await this.apiPost(
          'INSERT INTO remote_api_databases (name, base_url, tenant_name, services, full_url) VALUES (?, ?, ?, ?, ?)',
          [data.name || `${data.tenantName} - ${data.tables[0] || 'default'}`, data.baseUrl, data.tenantName, data.services, data.fullUrl || '']
        );

        const tenantId = result.lastID;

        // Insert tables
        if (data.tables && data.tables.length > 0) {
          for (const table of data.tables) {
            await this.apiPost(
              'INSERT INTO remote_api_tables (database_id, name) VALUES (?, ?)',
              [tenantId, table]
            );
            console.log('✅ Added table:', table, 'to tenant:', data.tenantName);
          }
        }

        const newDatabase = await this.getRemoteAPIDatabaseById(tenantId);
        return {
          ...newDatabase,
          isExisting: false,
          message: `Database "${data.tenantName}" created successfully`
        };
      } catch (error) {
        console.error('❌ SQLiteManager: Error creating new tenant:', error);
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
        SELECT name FROM remote_api_tables WHERE database_id = ? ORDER BY name
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
          endpoint: table.name // Use name as endpoint for now
        }))
      });
    }

    return result;
  }

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

  static async deleteRemoteAPIDatabase(id: string): Promise<boolean> {
    await this.initialize();
    await this.apiPost('DELETE FROM remote_api_databases WHERE id = ?', [id]);
    return true;
  }

  static async createDatabase(data: DatabaseData): Promise<DatabaseData> {
    console.log('🔄 SQLiteManager: Creating database:', data.name);
    await this.initialize();

    let status: number;
    let respBody: any;

    try {
      // Check if database with same name already exists
      const existingDb = await this.findDatabaseByName(data.name);
      if (existingDb) {
        console.log('Database already exists:', data.name, '- returning existing');
        return existingDb;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      console.log('📝 SQLiteManager: Generated ID:', id);

      console.log('💾 SQLiteManager: Inserting database record...');
      const query = 'INSERT INTO databases (id, name, type, connection_string, api_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [id, data.name, data.type, data.connection_string || null, data.api_key || null, data.status || 'connected', now, now];

      await this.apiPost(query, values);
      console.log('✅ SQLiteManager: Database record inserted successfully');

      // Insert tables if provided
      if (data.tables && data.tables.length > 0) {
        for (const table of data.tables) {
          const tableQuery = 'INSERT INTO database_tables (database_id, name, record_count) VALUES (?, ?, ?)';
          const tableValues = [id, table.name, table.record_count || 0];
          await this.apiPost(tableQuery, tableValues);
        }
      }

      console.log('Database created in SQLiteCloud:', data.name);
      const result = await this.findDatabaseById(id);
      if (!result) {
        throw new Error('Failed to retrieve created database');
      }
      return result;

    } catch (error) {
      console.error('❌ SQLiteManager: Error creating database:', error);
      throw error;
    }
  }

  static async listDatabases(): Promise<DatabaseData[]> {
    console.log('🔍 SQLiteManager: Listing databases...');
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

      console.log('📋 SQLiteManager: Found', databases.length, 'database records');

      const result: DatabaseData[] = [];
      for (const dbInfo of databases) {
        const tables = await this.apiGet(
          'SELECT name, record_count FROM database_tables WHERE database_id = ? ORDER BY name',
          [dbInfo.id]
        ) as Array<{
          name: string;
          record_count: number;
        }>;

        console.log(`📋 SQLiteManager: Database ${dbInfo.name} has ${tables.length} tables`);

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

      console.log(`SQLiteCloud database list() returned ${result.length} databases`);
      return result;

    } catch (error) {
      console.error('❌ SQLiteManager: Error listing databases:', error);
      throw error;
    }
  }

  static async findDatabaseById(id: string): Promise<DatabaseData | null> {
    console.log('🔍 SQLiteManager: Finding database by ID:', id);
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
        console.log('❌ SQLiteManager: Database not found by ID:', id);
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

      console.log(`📋 SQLiteManager: Found database ${database.name} with ${tables.length} tables`);

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
      console.error('❌ SQLiteManager: Error finding database by ID:', error);
      throw error;
    }
  }

  static async findDatabaseByName(name: string): Promise<DatabaseData | null> {
    console.log('🔍 SQLiteManager: Finding database by name:', name);
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
        console.log('❌ SQLiteManager: Database not found by name:', name);
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

      console.log(`📋 SQLiteManager: Found database ${database.name} with ${tables.length} tables`);

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
      console.error('❌ SQLiteManager: Error finding database by name:', error);
      throw error;
    }
  }

  static async updateDatabase(id: string, data: Partial<DatabaseData>): Promise<DatabaseData | null> {
    console.log('🔄 SQLiteManager: Updating database:', id);
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
      console.log('💾 SQLiteManager: Executing update query:', updateQuery);

      const result = await this.apiPost(updateQuery, values);

      console.log('✅ SQLiteManager: Database updated successfully');

      // Update tables if provided
      if (data.tables) {
        console.log('🔄 SQLiteManager: Updating tables...');

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

      console.log('Database updated in SQLiteCloud:', id);
      return this.findDatabaseById(id);

    } catch (error) {
      console.error('❌ SQLiteManager: Error updating database:', error);
      throw error;
    }
  }

  static async deleteDatabase(id: string): Promise<boolean> {
    console.log('🗑️ SQLiteManager: Deleting database:', id);
    await this.initialize();

    try {
      const result = await this.apiPost('DELETE FROM databases WHERE id = ?', [id]);

      console.log('Database deleted from SQLiteCloud:', id);
      return true;

    } catch (error) {
      console.error('❌ SQLiteManager: Error deleting database:', error);
      throw error;
    }
  }

  static async clearAllDatabases(): Promise<void> {
    console.log('🧹 SQLiteManager: Clearing all databases...');
    await this.initialize();

    try {
      // Clear tables (foreign key constraint will handle cascading)
      await this.apiExec('DELETE FROM databases');

      console.log('✅ SQLiteManager: All databases cleared from SQLiteCloud');

    } catch (error) {
      console.error('❌ SQLiteManager: Error clearing databases:', error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    return await new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ SQLiteManager: Error closing database:', err);
          } else {
            console.log('✅ SQLiteManager: Database connection closed');
          }
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Public methods for entity access
  static async getCustomers(): Promise<any[]> {
    await this.initialize();
    return this.apiGet('SELECT id, name, email, phone FROM customers ORDER BY name');
  }

  static async getCustomerById(id: string): Promise<any | null> {
    await this.initialize();
    const customers = await this.apiGet('SELECT id, name, email, phone FROM customers WHERE id = ?', [id]);
    return customers.length > 0 ? customers[0] : null;
  }

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
