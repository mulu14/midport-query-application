/**
 * @fileoverview JSON Storage Manager for Database Configuration Persistence
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
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
        this.writeData([]);
        return [];
      }

      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private static writeData(databases: DatabaseData[]): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(databases, null, 2));
    } catch (error) {
      // Silently handle write errors
    }
  }

  static async listDatabases(): Promise<DatabaseData[]> {
    const databases = this.readData();
    return databases;
  }

  static async createDatabase(data: DatabaseData): Promise<DatabaseData> {
    // Check if database with same name already exists
    const existingDb = this.readData().find(db => db.name === data.name);
    if (existingDb) {
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
    const databases = this.readData();
    const index = databases.findIndex(db => db.id === id);

    if (index === -1) {
      return null;
    }

    databases[index] = { ...databases[index], ...data };
    this.writeData(databases);

    return databases[index];
  }

  static async deleteDatabase(id: string): Promise<boolean> {
    const databases = this.readData();
    const filteredDatabases = databases.filter(db => db.id !== id);

    if (filteredDatabases.length === databases.length) {
      return false;
    }

    this.writeData(filteredDatabases);
    return true;
  }

  static async clearAllDatabases(): Promise<void> {
    this.writeData([]);
  }

  static async initializeWithDefaults(): Promise<DatabaseData[]> {
    // Check if already has databases
    const existing = this.readData();
    if (existing.length > 0) {
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
    return defaultDatabases;
  }
}
