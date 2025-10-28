/**
 * @fileoverview Login API Route
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { join } from 'path';
import * as crypto from 'crypto';
import type { LoginRequest, LoginResponse, DatabaseUser, AuthErrorResponse } from '@/Entities/Auth';

// Database path
const dbPath = join(process.cwd(), 'user-auth.db');

/**
 * Initialize user authentication database
 */
function initDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create users table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          tenant TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    });
  });
}

/**
 * Hash password with salt
 */
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Verify password
 */
function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(':');
  const testHash = hashPassword(password, salt);
  return testHash === storedHash;
}

/**
 * POST /api/auth/login
 * Authenticate user and return session
 */
export async function POST(request: NextRequest) {
  let db: sqlite3.Database | null = null;
  
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      const errorResponse: AuthErrorResponse = {
        message: 'Username and password are required'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    db = await initDatabase();

    // Find user
    const user = await new Promise<DatabaseUser | undefined>((resolve, reject) => {
      db!.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row as DatabaseUser | undefined);
      });
    });

    if (!user) {
      db.close();
      const errorResponse: AuthErrorResponse = {
        message: 'Invalid username or password'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      db.close();
      const errorResponse: AuthErrorResponse = {
        message: 'Invalid username or password'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Update last login
    await new Promise<void>((resolve, reject) => {
      db!.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    db.close();

    // Return user data (without password)
    const response: LoginResponse = {
      username: user.username,
      tenant: user.tenant,
      lastLogin: user.last_login
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Login error:', error);
    if (db) {
      db.close();
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

