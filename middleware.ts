/**
 * @fileoverview Next.js Middleware for Route Protection
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * This middleware uses NextAuth.js to protect routes automatically.
 * Any route matching the patterns below will require authentication.
 * 
 * Protected Routes:
 * - /credentials/* - Credentials management pages
 * - /api/credentials/* - Credentials API endpoints
 * - /api/tenants/* - Tenant management API endpoints
 * 
 * Unauthenticated users will be redirected to the home page (/) where
 * they can log in via the LoginDialog component.
 */

export { auth as middleware } from '@/app/auth';

/**
 * Matcher configuration for protected routes
 * Only routes matching these patterns will run the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - / (home page - public with LoginDialog)
     * - /api/auth/* (NextAuth.js routes must be public)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt (static files)
     */
    '/credentials/:path*',        // Protect credentials management
    '/admin/:path*',              // Protect admin panel
    '/api/credentials/:path*',    // Protect credentials API
    '/api/tenants/:path*',        // Protect tenants API
    '/api/databases/:path*',      // Protect databases API
    '/api/remote-databases/:path*', // Protect remote databases API
    '/api/remote-query/:path*',   // Protect remote query API
    '/api/sqlite/:path*',         // Protect SQLite API
    '/api/gateway/:path*',        // Protect gateway API
    '/api/admin/:path*',          // Protect admin API
  ]
};

