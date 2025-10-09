/**
 * @fileoverview Credential Management Page - Complete interface for managing ION API credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';
import CredentialManagement from '@/components/credentials/CredentialManagement';

/**
 * Credential Management Page Component
 * Provides a dedicated page for managing ION API credentials
 */
export default function CredentialsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Credentials Management
        </h1>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
        <p className="text-slate-300 mt-4 text-sm lg:text-base">
          Manage ION API credentials for multi-tenant access
        </p>
      </div>

      <CredentialManagement />
    </div>
  );
}