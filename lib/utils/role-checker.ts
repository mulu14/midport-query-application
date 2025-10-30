/**
 * @fileoverview Role Checker Utility
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Provides role-based access control (RBAC) utilities
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'midport_query_platform.db');

/**
 * Get user roles from database
 * @param userId - User ID
 * @returns Array of role names
 */
export async function getUserRoles(userId: string | number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(
        `SELECT r.name 
         FROM roles r 
         INNER JOIN user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = ?`,
        [userId],
        (err, rows: any[]) => {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }

          const roles = rows.map(row => row.name);
          resolve(roles);
        }
      );
    });
  });
}

/**
 * Check if user has specific role
 * @param userId - User ID
 * @param roleName - Role name to check
 * @returns True if user has the role
 */
export async function hasRole(userId: string | number, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleName);
}

/**
 * Check if user has any of the specified roles
 * @param userId - User ID
 * @param roleNames - Array of role names to check
 * @returns True if user has at least one of the roles
 */
export async function hasAnyRole(userId: string | number, roleNames: string[]): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roleNames.some(role => roles.includes(role));
}

/**
 * Check if user is admin or superadmin
 * @param userId - User ID
 * @returns True if user is admin or superadmin
 */
export async function isAdminOrSuperAdmin(userId: string | number): Promise<boolean> {
  return hasAnyRole(userId, ['admin', 'superadmin']);
}

/**
 * Check if user is superadmin
 * @param userId - User ID
 * @returns True if user is superadmin
 */
export async function isSuperAdmin(userId: string | number): Promise<boolean> {
  return hasRole(userId, 'superadmin');
}

/**
 * Assign role to user
 * @param userId - User ID
 * @param roleName - Role name to assign
 */
export async function assignRole(userId: string | number, roleName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Get role ID
      db.get(
        'SELECT id FROM roles WHERE name = ?',
        [roleName],
        (err, row: any) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          if (!row) {
            db.close();
            reject(new Error(`Role ${roleName} not found`));
            return;
          }

          // Insert user_role
          db.run(
            'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [userId, row.id],
            (err) => {
              db.close();
              
              if (err) {
                reject(err);
                return;
              }

              resolve();
            }
          );
        }
      );
    });
  });
}
