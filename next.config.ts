/**
 * @fileoverview Next.js configuration file for Midport SQL Query Platform
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { NextConfig } from "next";

/**
 * Next.js configuration object
 * Contains configuration options for the Next.js application
 * Includes security headers and HTTPS configuration
 * @constant nextConfig
 */
const nextConfig: NextConfig = {
  /**
   * Security headers for enhanced protection
   */
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
    ];
  },

  /**
   * Redirect HTTP to HTTPS in production
   */
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/:path*',
            has: [
              {
                type: 'header',
                key: 'x-forwarded-proto',
                value: 'http',
              },
            ],
            destination: 'https://localhost/:path*',
            permanent: true,
          },
        ]
      : [];
  },
};

export default nextConfig;
