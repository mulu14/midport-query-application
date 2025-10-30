/**
 * @fileoverview NextAuth.js Configuration for Midport Query Application
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * This file configures NextAuth.js to work with the existing authentication system:
 * - Uses SQLite database (user-auth.db)
 * - Uses existing EncryptionUtil for password verification
 * - Preserves tenant-based authentication
 * - JWT session strategy for optimal performance
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import sqlite3 from 'sqlite3';
import { join } from 'path';
import { EncryptionUtil } from '@/lib/utils/encryption';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '@/lib/utils/account-lockout';
import { logLoginSuccess, logLoginFailure, logAccountLocked } from '@/lib/utils/audit-logger';
import { getUserRoles } from '@/lib/utils/role-checker';

// Database path - using unified database
const dbPath = join(process.cwd(), 'midport_query_platform.db');

/**
 * Initialize and query the user authentication database
 */
async function getUserFromDatabase(username: string, password: string, tenant: string) {
  return new Promise<{ id: number; username: string; tenant: string } | null>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
        return;
      }

      // Encrypt the input username for database lookup
      let encryptedInputUsername: string;
      try {
        encryptedInputUsername = EncryptionUtil.encryptUsername(username);
      } catch (error) {
        console.error('Username encryption error:', error);
        db.close();
        resolve(null);
        return;
      }

      // Query database for user with encrypted username and matching tenant
      db.get(
        'SELECT * FROM users WHERE username = ? AND tenant = ?',
        [encryptedInputUsername, tenant],
        (err, row: any) => {
          if (err) {
            console.error('Database query error:', err);
            db.close();
            reject(err);
            return;
          }

          if (!row) {
            // User not found
            db.close();
            resolve(null);
            return;
          }
          
          // Check if tenant is disabled
          if (row.disabled === 1) {
            console.error('Tenant is disabled:', tenant);
            db.close();
            resolve(null);
            return;
          }

          // Decrypt stored password and compare with input password
          try {
            const decryptedPassword = EncryptionUtil.decryptPassword(row.password_hash);
            
            if (decryptedPassword === password) {
              // Password matches - decrypt username for session
              const decryptedUsername = EncryptionUtil.decryptUsername(row.username);
              
              // Update last_login timestamp
              db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [row.id],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Failed to update last_login:', updateErr);
                  }
                  db.close();
                }
              );

              resolve({
                id: row.id,
                username: decryptedUsername,
                tenant: row.tenant
              });
            } else {
              // Password doesn't match
              db.close();
              resolve(null);
            }
          } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            db.close();
            resolve(null);
          }
        }
      );
    });
  });
}

/**
 * Validate required environment variables
 * NextAuth v5 uses AUTH_SECRET (but NEXTAUTH_SECRET still works for backward compatibility)
 */
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error('⚠️ ERROR: AUTH_SECRET is not set in environment variables.');
  console.error('Please add AUTH_SECRET to your .env.local file.');
}

/**
 * NextAuth.js Configuration
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        username: { 
          label: "Username", 
          type: "text",
          placeholder: "Enter your username"
        },
        password: { 
          label: "Password", 
          type: "password",
          placeholder: "Enter your password"
        },
        tenant: { 
          label: "Tenant", 
          type: "text",
          placeholder: "Enter tenant name"
        }
      },
      
      async authorize(credentials) {
        // Validate credentials format
        if (!credentials?.username || !credentials?.password || !credentials?.tenant) {
          console.error('Missing credentials');
          logLoginFailure('unknown', 'unknown', 'Missing credentials');
          return null;
        }

        const { username, password, tenant } = credentials;

        try {
          // Check if account is locked
          const lockStatus = isAccountLocked(username as string, tenant as string);
          if (lockStatus.locked) {
            const minutes = Math.ceil(lockStatus.remainingSeconds / 60);
            logLoginFailure(
              username as string,
              tenant as string,
              `Account locked. Try again in ${minutes} minutes`
            );
            console.error(`Account locked for ${username}@${tenant}. Remaining: ${minutes} minutes`);
            return null;
          }

          // Query database and verify credentials using existing encryption
          const user = await getUserFromDatabase(
            username as string,
            password as string,
            tenant as string
          );

          if (user) {
            // Successful login - reset failed attempts and log success
            resetFailedAttempts(username as string, tenant as string);
            logLoginSuccess(username as string, tenant as string);
            
            // Get user roles
            const roles = await getUserRoles(user.id);
            
            // Return user object for session with roles
            return {
              id: user.id.toString(),
              name: user.username,
              email: `${user.username}@${user.tenant}`, // Virtual email for NextAuth compatibility
              username: user.username,
              tenant: user.tenant,
              roles: roles
            };
          }

          // Invalid credentials - record failed attempt
          const failureResult = recordFailedAttempt(username as string, tenant as string);
          logLoginFailure(username as string, tenant as string, 'Invalid credentials');
          
          // Check if account was just locked
          if (failureResult.locked) {
            logAccountLocked(
              username as string,
              tenant as string,
              failureResult.failedAttempts
            );
            console.error(
              `Account locked for ${username}@${tenant} after ${failureResult.failedAttempts} failed attempts`
            );
          } else {
            console.error(
              `Failed login for ${username}@${tenant}. ${failureResult.remainingAttempts} attempts remaining`
            );
          }

          return null;
        } catch (error) {
          console.error('Authorization error:', error);
          logLoginFailure(
            username as string,
            tenant as string,
            `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          return null;
        }
      }
    })
  ],

  /**
   * Session configuration
   * Using JWT strategy for stateless authentication (optimal for serverless)
   */
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days maximum
    updateAge: 60 * 60, // 1 hour - session refreshes every hour (minimum persistence)
  },

  /**
   * Cookie configuration for enhanced security
   * Note: __Secure- prefix requires HTTPS, so we omit it in development
   */
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,      // Prevents JavaScript access (XSS protection)
        sameSite: 'lax',     // CSRF protection
        path: '/',
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      },
    },
  },

  /**
   * Callbacks for customizing JWT and session
   */
  callbacks: {
    /**
     * JWT Callback - Called when JWT is created or updated
     * Add custom fields to the token and implement security checks
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user && user.id) {
        token.id = user.id;
        token.username = (user as any).username;
        token.tenant = (user as any).tenant;
        token.roles = (user as any).roles || [];
        // Add token creation timestamp for additional validation
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      return token;
    },

    /**
     * Session Callback - Called when session is checked
     * Populate session with user data from token
     */
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.username = token.username as string;
          session.user.tenant = token.tenant as string;
          session.user.name = token.username as string;
          session.user.roles = token.roles as string[] || [];
        }
        
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },

    /**
     * Authorized Callback - Called by middleware
     * Determines if user can access a route
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = 
        nextUrl.pathname.startsWith('/credentials') ||
        nextUrl.pathname.startsWith('/api/credentials') ||
        nextUrl.pathname.startsWith('/api/tenants');

      if (isOnProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      return true; // Allow access to public routes
    }
  },

  /**
   * Custom pages configuration
   */
  pages: {
    signIn: '/', // Custom login page (uses LoginDialog on home page)
    error: '/', // Error page (redirect to home)
  },

  /**
   * Security configuration
   * REQUIRED: Must be set in .env.local
   * NextAuth v5 prefers AUTH_SECRET but accepts NEXTAUTH_SECRET for compatibility
   */
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  /**
   * Debug mode (MUST be disabled in production for security)
   * Only log auth errors in development
   */
  debug: process.env.NODE_ENV === 'development',

  /**
   * Logger configuration
   * Disable all logging in production
   */
  logger: {
    error: process.env.NODE_ENV === 'development' ? console.error : () => {},
    warn: process.env.NODE_ENV === 'development' ? console.warn : () => {},
    debug: process.env.NODE_ENV === 'development' ? console.log : () => {},
  },

  /**
   * Trust host in production
   */
  trustHost: true,

  /**
   * Enable experimental features for App Router
   */
  experimental: {
    enableWebAuthn: false,
  },
};

/**
 * Export NextAuth handlers and utilities
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

