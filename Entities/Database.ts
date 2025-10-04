// Database entity - client-side only
export interface DatabaseTable {
  name: string;
  record_count: number;
}

export interface DatabaseData {
  id?: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'api' | 'local' | 'sqlite';
  connection_string?: string;
  api_key?: string;
  tables?: DatabaseTable[];
  status?: 'connected' | 'disconnected' | 'error';
}

export class Database {
  // Client-side API wrapper - all operations go through API routes
  static async list(): Promise<DatabaseData[]> {
    const response = await fetch('/api/databases');
    if (!response.ok) throw new Error('Failed to fetch databases');
    return response.json();
  }

  static async clear(): Promise<void> {
    const response = await fetch('/api/databases/clear', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to clear databases');
  }

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