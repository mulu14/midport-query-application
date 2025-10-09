/**
 * @fileoverview Tenant Connection Test Dialog Component
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, TestTube, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TenantConnectionTestProps {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime: number;
  tokenInfo?: {
    tokenType: string;
    expiresAt: string;
    hasRefreshToken: boolean;
    scope?: string;
  };
  error?: string;
}

/**
 * Tenant Connection Test Dialog Component
 */
export function TenantConnectionTest({ tenantId, onClose, onSuccess }: TenantConnectionTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Run connection test
   */
  const runTest = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/credentials/${tenantId}/test-connection`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        onSuccess(); // Refresh tenant list to show updated status
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setError(error instanceof Error ? error.message : 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  // Auto-run test when component mounts
  useEffect(() => {
    runTest();
  }, [tenantId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <TestTube className="w-5 h-5" />
            <span>Connection Test</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Testing State */}
          {testing && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-white mb-2">Testing Connection</h3>
                <p className="text-slate-300">
                  Attempting to authenticate with ION API...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-100">Failed to run connection test</span>
              </div>
              <p className="text-red-200 mt-2">{error}</p>
            </div>
          )}

          {/* Test Results */}
          {result && (
            <div className="space-y-4">
              {/* Result Summary */}
              <div className={`rounded-lg p-4 ${
                result.success 
                  ? 'bg-green-500/20 border border-green-500/50' 
                  : 'bg-red-500/20 border border-red-500/50'
              }`}>
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${
                      result.success ? 'text-green-100' : 'text-red-100'
                    }`}>
                      {result.success ? 'Connection Successful' : 'Connection Failed'}
                    </h3>
                    <p className={`text-sm ${
                      result.success ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Response Time:</span>
                  <span className="text-white font-mono">
                    {result.responseTime}ms
                  </span>
                </div>
              </div>

              {/* Token Information (if successful) */}
              {result.success && result.tokenInfo && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Token Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Token Type:</span>
                      <span className="text-white font-mono">{result.tokenInfo.tokenType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Expires At:</span>
                      <span className="text-white font-mono text-xs">
                        {new Date(result.tokenInfo.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Has Refresh Token:</span>
                      <span className={`font-medium ${
                        result.tokenInfo.hasRefreshToken ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {result.tokenInfo.hasRefreshToken ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {result.tokenInfo.scope && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Scope:</span>
                        <span className="text-white">{result.tokenInfo.scope}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Details (if failed) */}
              {!result.success && result.error && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Error Details</h4>
                  <p className="text-red-300 text-sm font-mono">
                    {result.error}
                  </p>
                </div>
              )}

              {/* Troubleshooting Tips */}
              {!result.success && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-medium mb-2">Troubleshooting Tips</h4>
                  <ul className="text-yellow-200 text-sm space-y-1">
                    <li>• Verify that all credential fields are correct</li>
                    <li>• Check that the Portal URL is accessible</li>
                    <li>• Ensure the tenant is active in ION</li>
                    <li>• Confirm service account has proper permissions</li>
                    <li>• Verify network connectivity to ION endpoints</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-slate-700">
          <Button
            onClick={runTest}
            disabled={testing}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {testing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                <span>Testing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <TestTube className="w-4 h-4" />
                <span>Test Again</span>
              </div>
            )}
          </Button>
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}