/**
 * @fileoverview Database entity interfaces and client-side API wrapper
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

/**
 * Represents a database table with metadata
 * @interface DatabaseTable
 */
export interface DatabaseTable {
  /** Name of the table */
  name: string;
  /** Number of records in the table */
  record_count: number;
}

/**
 * Represents database configuration data
 * @interface DatabaseData
 */
export interface DatabaseData {
  /** Optional unique identifier */
  id?: string;
  /** Display name of the database */
  name: string;
  /** Type of database connection */
  type: 'postgresql' | 'mysql' | 'mongodb' | 'api' | 'local' | 'sqlite';
  /** Connection string for external databases */
  connection_string?: string;
  /** API key for authentication (if applicable) */
  api_key?: string;
  /** Array of tables in the database */
  tables?: DatabaseTable[];
  /** Current connection status */
  status?: 'connected' | 'disconnected' | 'error';
}

/**
 * Database class providing client-side API operations
 * All operations route through Next.js API endpoints
 * @class Database
 */
export class Database {
  /**
   * Retrieves all databases
   * @static
   * @async
   * @returns {Promise<DatabaseData[]>} Array of database objects
   * @throws {Error} If API request fails
   */
  static async list(): Promise<DatabaseData[]> {
    const response = await fetch('/api/databases');
    if (!response.ok) throw new Error('Failed to fetch databases');
    return response.json();
  }

  /**
   * Clears all databases and reinitializes with default data
   * @static
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If API request fails
   */
  static async clear(): Promise<void> {
    const response = await fetch('/api/databases/clear', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to clear databases');
  }

  /**
   * Creates a new database configuration
   * @static
   * @async
   * @param {DatabaseData} data - Database configuration data
   * @returns {Promise<DatabaseData>} Created database object
   * @throws {Error} If API request fails
   */
  static async create(data: DatabaseData): Promise<DatabaseData> {
    const response = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create database');
    return response.json();
  }

  static async update(id: string, data: Partial< DatabaseData>): Promise<DatabaseData | null> {
    const response = await fetch(`/api/databases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update database');
    return response.json();
  }

  static async delete(id: string): Promise<boolean> {
    const response = await fetch(`/api/databases/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete database');
    return true;
  }

  static async findById(id: string): Promise<DatabaseData | null> {
    const response = await fetch(`/api/databases/${id}`);
    if (!response.ok) throw new Error('Failed to fetch database');
    return response.json();
  }

  static async findByName(name: string): Promise<DatabaseData | null> {
    const databases = await this.list();
    return databases.find(db => db.name === name) || null;
  }
}