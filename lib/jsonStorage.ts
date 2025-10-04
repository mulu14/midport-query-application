/**
 * @fileoverview JSON Storage Manager for Database Configuration Persistence
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

import fs from 'fs';
import path from 'path';

/**
 * Interface for database table metadata
 * @interface DatabaseTable
 */
interface DatabaseTable {
  /** Name of the table */
  name: string;
  /** Optional record count for the table */
  record_count?: number;
}

/**
 * Interface for database configuration data
 * @interface DatabaseData
 */
export interface DatabaseData {
  /** Optional unique identifier */
  id?: string;
  /** Display name of the database */
  name: string;
  /** Type of database connection */
  type: 'postgresql' | 'mysql' | 'mongodb' | 'api' | 'local';
  /** Connection string for the database */
  connection_string?: string;
  /** API key for authentication */
  api_key?: string;
  /** Array of tables in the database */
  tables?: DatabaseTable[];
  /** Current connection status */
  status?: 'connected' | 'disconnected' | 'error';
}

/**
 * JSON Storage class for managing database configuration persistence
 * Provides CRUD operations for database configurations stored in JSON file
 * @class JSONStorage
 */
export class JSONStorage {
  private static dataFile = path.join(process.cwd(), 'database-storage.json');

  private static readData(): DatabaseData[] {
    try {
      if (!fs.existsSync(this.dataFile)) {
        console.log('📄 JSONStorage: Creating new data file');
        this.writeData([]);
        return [];
      }

      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ JSONStorage: Error reading data:', error);
      return [];
    }
  }

  private static writeData(databases: DatabaseData[]): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(databases, null, 2));
      console.log('💾 JSONStorage: Data saved successfully');
    } catch (error) {
      console.error('❌ JSONStorage: Error writing data:', error);
    }
  }

  static async listDatabases(): Promise<DatabaseData[]> {
    console.log('🔍 JSONStorage: Listing databases...');
    const databases = this.readData();
    console.log('📋 JSONStorage: Found', databases.length, 'databases');
    return databases;
  }

  static async createDatabase(data: DatabaseData): Promise<DatabaseData> {
    console.log('🔄 JSONStorage: Creating database:', data.name);

    // Check if database with same name already exists
    const existingDb = this.readData().find(db => db.name === data.name);
    if (existingDb) {
      console.log('Database already exists:', data.name, '- returning existing');
      return existingDb;
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newDb: DatabaseData = {
      id,
      ...data,
      status: data.status || 'connected'
    };

    const databases = this.readData();
    databases.push(newDb);
    this.writeData(databases);

    console.log('✅ JSONStorage: Database created:', newDb.name);
    return newDb;
  }

  static async findDatabaseById(id: string): Promise<DatabaseData | null> {
    const databases = this.readData();
    return databases.find(db => db.id === id) || null;
  }

  static async findDatabaseByName(name: string): Promise<DatabaseData | null> {
    const databases = this.readData();
    return databases.find(db => db.name === name) || null;
  }

  static async updateDatabase(id: string, data: Partial<DatabaseData>): Promise<DatabaseData | null> {
    console.log('🔄 JSONStorage: Updating database:', id);
    const databases = this.readData();
    const index = databases.findIndex(db => db.id === id);

    if (index === -1) {
      console.log('❌ JSONStorage: Database not found for update:', id);
      return null;
    }

    databases[index] = { ...databases[index], ...data };
    this.writeData(databases);

    console.log('✅ JSONStorage: Database updated:', databases[index].name);
    return databases[index];
  }

  static async deleteDatabase(id: string): Promise<boolean> {
    console.log('🗑️ JSONStorage: Deleting database:', id);
    const databases = this.readData();
    const filteredDatabases = databases.filter(db => db.id !== id);

    if (filteredDatabases.length === databases.length) {
      console.log('❌ JSONStorage: Database not found for deletion:', id);
      return false;
    }

    this.writeData(filteredDatabases);
    console.log('✅ JSONStorage: Database deleted');
    return true;
  }

  static async clearAllDatabases(): Promise<void> {
    console.log('🧹 JSONStorage: Clearing all databases...');
    this.writeData([]);
    console.log('✅ JSONStorage: All databases cleared');
  }

  static async initializeWithDefaults(): Promise<DatabaseData[]> {
    console.log('🚀 JSONStorage: Initializing with default databases...');

    // Check if already has databases
    const existing = this.readData();
    if (existing.length > 0) {
      console.log('📋 JSONStorage: Already has databases, skipping initialization');
      return existing;
    }

    const defaultDatabases: DatabaseData[] = [
      {
        id: 'prod-db',
        name: 'Production Database',
        type: 'local',
        status: 'connected',
        tables: [
          { name: 'Products', record_count: 5 },
          { name: 'Customers', record_count: 3 },
          { name: 'Orders', record_count: 7 }
        ]
      },
      {
        id: 'dev-db',
        name: 'Development Database',
        type: 'local',
        status: 'connected',
        tables: [
          { name: 'Products', record_count: 5 },
          { name: 'Customers', record_count: 3 },
          { name: 'Orders', record_count: 7 }
        ]
      }
    ];

    this.writeData(defaultDatabases);
    console.log('✅ JSONStorage: Initialized with default databases');
    return defaultDatabases;
  }
}
