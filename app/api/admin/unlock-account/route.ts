/**
 * @fileoverview Admin API - Unlock Account
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Admin endpoint to manually unlock locked accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { unlockAccount, isAccountLocked } from '@/lib/utils/account-lockout';
import { auth } from '@/app/auth';

/**
 * POST /api/admin/unlock-account
 * Unlock a locked account (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin/superadmin role
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const userRoles = session.user?.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    const isAdmin = userRoles.includes('admin');
    
    // Only admin and superadmin can unlock accounts
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - Administrator access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, tenant } = body;

    // Validation
    if (!username || !tenant) {
      return NextResponse.json(
        { message: 'Username and tenant are required' },
        { status: 400 }
      );
    }
    
    // Ensure admin can only unlock accounts in their own tenant (unless superadmin)
    if (!isSuperAdmin && tenant !== session.user?.tenant) {
      return NextResponse.json(
        { message: 'Forbidden - You can only unlock accounts in your own tenant' },
        { status: 403 }
      );
    }

    // Check current lock status
    const lockStatus = isAccountLocked(username, tenant);

    // Unlock the account
    unlockAccount(username, tenant);

    return NextResponse.json({
      success: true,
      message: `Account ${username}@${tenant} has been unlocked`,
      previousStatus: {
        locked: lockStatus.locked,
        failedAttempts: lockStatus.failedAttempts,
      }
    });

  } catch (error) {
    console.error('Unlock account error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/unlock-account?username=X&tenant=Y
 * Check lock status of an account
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin/superadmin role
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const userRoles = session.user?.roles || [];
    const isSuperAdmin = userRoles.includes('superadmin');
    const isAdmin = userRoles.includes('admin');
    
    // Only admin and superadmin can check lock status
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - Administrator access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const tenant = searchParams.get('tenant');

    if (!username || !tenant) {
      return NextResponse.json(
        { message: 'Username and tenant are required' },
        { status: 400 }
      );
    }
    
    // Ensure admin can only check accounts in their own tenant (unless superadmin)
    if (!isSuperAdmin && tenant !== session.user?.tenant) {
      return NextResponse.json(
        { message: 'Forbidden - You can only check accounts in your own tenant' },
        { status: 403 }
      );
    }

    // Get lock status
    const lockStatus = isAccountLocked(username, tenant);

    return NextResponse.json({
      username,
      tenant,
      locked: lockStatus.locked,
      failedAttempts: lockStatus.failedAttempts,
      remainingSeconds: lockStatus.remainingSeconds,
      remainingMinutes: lockStatus.locked ? Math.ceil(lockStatus.remainingSeconds / 60) : 0,
    });

  } catch (error) {
    console.error('Check lock status error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
