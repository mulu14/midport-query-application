/**
 * @fileoverview Sign Up API Route
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { join } from 'path';
import { EncryptionUtil } from '@/lib/utils/encryption';
import type { SignUpRequest, SignUpResponse, AuthErrorResponse } from '@/Entities/Auth';

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
 * POST /api/auth/signup
 * Register new user
 */
export async function POST(request: NextRequest) {
  let db: sqlite3.Database | null = null;
  
  try {
    const body: SignUpRequest = await request.json();
    const { username, password, tenant } = body;

    // Validation
    const errors: string[] = [];

    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!tenant || tenant.trim().length < 3) {
      errors.push('Tenant name must be at least 3 characters');
    }

    if (errors.length > 0) {
      const errorResponse: AuthErrorResponse = {
        message: errors.join(', '),
        errors
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    db = await initDatabase();

    // Check if username already exists (encrypt username for lookup)
    const encryptedUsername = EncryptionUtil.encryptUsername(username);
    const existingUser = await new Promise<any>((resolve, reject) => {
      db!.get('SELECT id FROM users WHERE username = ?', [encryptedUsername], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });

    if (existingUser) {
      db.close();
      const errorResponse: AuthErrorResponse = {
        message: 'Username already exists'
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Encrypt password (username already encrypted above)
    const encryptedPassword = EncryptionUtil.encryptPassword(password);

    // Insert new user
    await new Promise<void>((resolve, reject) => {
      db!.run(
        'INSERT INTO users (username, password_hash, tenant) VALUES (?, ?, ?)',
        [encryptedUsername, encryptedPassword, tenant],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });

    db.close();

    // Return user data (without password)
    const response: SignUpResponse = {
      username,
      tenant,
      message: 'Account created successfully'
    };
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Sign up error:', error);
    if (db) {
      db.close();
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

