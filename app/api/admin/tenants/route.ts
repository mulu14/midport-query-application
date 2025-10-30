/**
 * @fileoverview Admin API - Tenant Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Superadmin endpoint to manage tenants (activate/deactivate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import sqlite3 from 'sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'midport_query_platform.db');

/**
 * GET /api/admin/tenants
 * Get all tenants (superadmin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRoles = session.user?.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - Superadmin access required' },
        { status: 403 }
      );
    }

    // Get all unique tenants from users table with disabled status
    const tenants = await new Promise<any[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT DISTINCT tenant, 
         COUNT(*) as user_count,
         MAX(last_login) as last_activity,
         MAX(disabled) as disabled
         FROM users 
         GROUP BY tenant
         ORDER BY tenant`,
        [],
        (err, rows) => {
          db.close();
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants/toggle
 * Activate or deactivate a tenant (superadmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRoles = session.user?.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenant, action } = body;

    if (!tenant || !action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { message: 'Tenant and valid action (activate/deactivate) are required' },
        { status: 400 }
      );
    }
    
    // Prevent deactivation of MIDPORT_DEM (superadmin tenant)
    if (action === 'deactivate' && tenant === 'MIDPORT_DEM') {
      return NextResponse.json(
        { message: 'Cannot deactivate MIDPORT_DEM tenant - contains superadmin account' },
        { status: 403 }
      );
    }

    // For now, we'll use a simple approach: add a 'disabled' field to users
    // In a production system, you might have a separate tenants table
    const isActive = action === 'activate';
    
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // First, check if the column exists
      db.all(`PRAGMA table_info(users)`, [], (err, columns: any[]) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        const hasDisabledColumn = columns.some(col => col.name === 'disabled');
        
        if (!hasDisabledColumn) {
          // Add the column if it doesn't exist
          db.run(`ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              db.close();
              reject(err);
              return;
            }
            
            // Update users for this tenant
            db.run(
              `UPDATE users SET disabled = ? WHERE tenant = ?`,
              [isActive ? 0 : 1, tenant],
              (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
              }
            );
          });
        } else {
          // Column exists, just update
          db.run(
            `UPDATE users SET disabled = ? WHERE tenant = ?`,
            [isActive ? 0 : 1, tenant],
            (err) => {
              db.close();
              if (err) reject(err);
              else resolve();
            }
          );
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Tenant ${tenant} has been ${action}d`,
      tenant,
      status: isActive ? 'active' : 'disabled'
    });
  } catch (error) {
    console.error('Toggle tenant error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
