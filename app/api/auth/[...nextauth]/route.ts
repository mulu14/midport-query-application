/**
 * @fileoverview NextAuth.js API Route Handler
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * This catch-all route handles all NextAuth.js requests:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback
 * - /api/auth/session
 * - /api/auth/csrf
 * - /api/auth/providers
 */

import { handlers } from '@/app/auth';

export const { GET, POST } = handlers;

