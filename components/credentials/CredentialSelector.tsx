/**
 * @fileoverview Credential selection component for multi-tenant ION API access
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TenantSummary } from '@/Entities/TenantConfig';

interface CredentialSelectorProps {
  selectedCredentialId?: string;
  onCredentialChange: (credentialId: string, credential: TenantSummary) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Credential selector component for choosing active credential
 */
export const CredentialSelector: React.FC<CredentialSelectorProps> = ({
  selectedCredentialId,
  onCredentialChange,
  disabled = false,
  className = ''
}) => {
  const [credentials, setCredentials] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load credential summaries from API
   */
  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credentials');
      
      if (!response.ok) {
        throw new Error('Failed to load credentials');
      }
      
      const data = await response.json();
      setCredentials(data);
      setError(null);
    } catch (error) {
      console.error('Error loading credentials:', error);
      setError(error instanceof Error ? error.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  /**
   * Handle credential selection
   */
  const handleCredentialChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const credentialId = event.target.value;
    const credential = credentials.find(c => c.id === credentialId);
    
    if (credential) {
      onCredentialChange(credentialId, credential);
    }
  };

  /**
   * Get status indicator for credential
   */
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'error':
        return '🔴';
      case 'testing':
        return '🟡';
      case 'disconnected':
      default:
        return '⚫';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading credentials...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        <span>Error: {error}</span>
        <button 
          onClick={loadCredentials}
          className="ml-2 text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className={`text-gray-600 text-sm ${className}`}>
        No credentials configured.{' '}
        <a href="/credentials" className="text-blue-600 hover:text-blue-800 underline">
          Add credentials
        </a>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label htmlFor="credential-selector" className="text-sm font-medium text-gray-700">
        Credentials:
      </label>
      <select
        id="credential-selector"
        value={selectedCredentialId || ''}
        onChange={handleCredentialChange}
        disabled={disabled}
        className={`
          px-3 py-1 border rounded-md text-sm bg-white
          ${disabled 
            ? 'border-gray-300 text-gray-500 cursor-not-allowed' 
            : 'border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }
        `}
      >
        <option value="">Select credentials...</option>
        {credentials
          .filter(credential => credential.isActive)
          .map((credential) => (
            <option key={credential.id} value={credential.id}>
              {getStatusIndicator(credential.status)} {credential.displayName} ({credential.tenantName})
            </option>
          ))}
      </select>
      
      {selectedCredentialId && (
        <button
          onClick={loadCredentials}
          disabled={disabled}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Refresh credentials"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Hook for managing credential selection state
 */
export const useCredentialSelector = (initialCredentialId?: string) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(initialCredentialId || null);
  const [selectedCredential, setSelectedCredential] = useState<TenantSummary | null>(null);

  const handleCredentialChange = (credentialId: string, credential: TenantSummary) => {
    setSelectedCredentialId(credentialId);
    setSelectedCredential(credential);
  };

  const clearSelection = () => {
    setSelectedCredentialId(null);
    setSelectedCredential(null);
  };

  return {
    selectedCredentialId,
    selectedCredential,
    handleCredentialChange,
    clearSelection
  };
};