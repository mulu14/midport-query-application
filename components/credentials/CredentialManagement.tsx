/**
 * @fileoverview Complete ION API Credential Management Interface
 * @author Mulugeta Forsido
 * @company Midport Scandinavia  
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TestTube, Settings, Eye, EyeOff, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TenantConfig, TenantSummary, NewTenantConfig, IONAPIConfig } from '@/Entities/TenantConfig';
import { CredentialFormDialog } from './CredentialFormDialog';
import { TenantConnectionTest } from './TenantConnectionTest';

/**
 * Main Credential Management Component
 */
export default function CredentialManagement() {
  const [credentials, setCredentials] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCredential, setEditingCredential] = useState<TenantConfig | null>(null);
  const [testingCredential, setTestingCredential] = useState<string | null>(null);
  
  // UI states
  const [expandedCredential, setExpandedCredential] = useState<string | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState<Set<string>>(new Set());

  /**
   * Load credential summaries
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

  /**
   * Load detailed credential for editing
   */
  const loadCredentialForEdit = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/credentials/${credentialId}`);
      if (!response.ok) {
        throw new Error('Failed to load credential details');
      }
      const credential = await response.json();
      setEditingCredential(credential);
    } catch (error) {
      console.error('Error loading credential details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load credential details');
    }
  };

  /**
   * Delete credential
   */
  const deleteCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${credentialId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      await loadCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete credential');
    }
  };

  /**
   * Toggle credential active status
   */
  const toggleCredentialStatus = async (credential: TenantSummary) => {
    try {
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !credential.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update credential status');
      }

      await loadCredentials();
    } catch (error) {
      console.error('Error updating credential status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update credential status');
    }
  };

  /**
   * Handle form submission success
   */
  const handleFormSuccess = () => {
    setShowCreateDialog(false);
    setEditingCredential(null);
    loadCredentials();
  };

  /**
   * Toggle sensitive data visibility
   */
  const toggleSensitiveData = (credentialId: string) => {
    const newSet = new Set(showSensitiveData);
    if (newSet.has(credentialId)) {
      newSet.delete(credentialId);
    } else {
      newSet.add(credentialId);
    }
    setShowSensitiveData(newSet);
  };

  /**
   * Get status indicator
   */
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'testing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * Get status text
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'error': return 'Error';
      case 'testing': return 'Testing...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credentials
          </Button>
          <Button
            onClick={loadCredentials}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Refresh
          </Button>
        </div>
        
        {credentials.length > 0 && (
          <div className="text-sm text-slate-300">
            {credentials.filter(c => c.isActive).length} active of {credentials.length} total credentials
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-100">{error}</span>
            <Button
              onClick={() => setError(null)}
              size="sm"
              variant="ghost"
              className="text-red-100 hover:bg-red-500/20 ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Credentials Configured</h3>
          <p className="text-slate-300 mb-6">
            Get started by adding your first ION API credential configuration.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credentials
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden"
            >
              {/* Credential Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIndicator(credential.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {credential.displayName}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {credential.tenantName} • {getStatusText(credential.status)}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      credential.isActive 
                        ? 'bg-green-500/20 text-green-100 border border-green-500/50'
                        : 'bg-gray-500/20 text-gray-100 border border-gray-500/50'
                    }`}>
                      {credential.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setTestingCredential(credential.id)}
                      size="sm"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => loadCredentialForEdit(credential.id)}
                      size="sm"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => toggleCredentialStatus(credential)}
                      size="sm"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      {credential.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => deleteCredential(credential.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-3 flex items-center space-x-4 text-sm">
                  <button
                    onClick={() => setExpandedCredential(
                      expandedCredential === credential.id ? null : credential.id
                    )}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {expandedCredential === credential.id ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {expandedCredential === credential.id && (
                    <button
                      onClick={() => toggleSensitiveData(credential.id)}
                      className="text-slate-400 hover:text-slate-300 flex items-center space-x-1"
                    >
                      {showSensitiveData.has(credential.id) ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Hide Sensitive Data</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Show Sensitive Data</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCredential === credential.id && (
                <CredentialDetails
                  credentialId={credential.id}
                  showSensitive={showSensitiveData.has(credential.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Credential Dialog */}
      {showCreateDialog && (
        <CredentialFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Edit Credential Dialog */}
      {editingCredential && (
        <CredentialFormDialog
          open={true}
          credential={editingCredential}
          onClose={() => setEditingCredential(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Connection Test Dialog */}
      {testingCredential && (
        <TenantConnectionTest
          tenantId={testingCredential}
          onClose={() => setTestingCredential(null)}
          onSuccess={loadCredentials}
        />
      )}
    </div>
  );
}

/**
 * Credential Details Component
 */
interface CredentialDetailsProps {
  credentialId: string;
  showSensitive: boolean;
}

function CredentialDetails({ credentialId, showSensitive }: CredentialDetailsProps) {
  const [credential, setCredential] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCredential = async () => {
      try {
        const response = await fetch(`/api/credentials/${credentialId}`);
        if (response.ok) {
          const data = await response.json();
          setCredential(data);
        }
      } catch (error) {
        console.error('Error loading credential details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCredential();
  }, [credentialId]);

  if (loading) {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center space-x-2 text-slate-300">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading details...</span>
        </div>
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="px-4 pb-4">
        <p className="text-sm text-red-300">Failed to load credential details</p>
      </div>
    );
  }

  const maskValue = (value: string) => {
    if (!showSensitive) {
      return '••••••••';
    }
    return value;
  };

  return (
    <div className="px-4 pb-4 border-t border-white/10">
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Basic Information */}
        <div className="space-y-2">
          <h4 className="text-white font-medium mb-3">Basic Information</h4>
          <div>
            <span className="text-slate-400">Tenant ID:</span>
            <span className="text-white ml-2">{credential.ionConfig.tenantId}</span>
          </div>
          <div>
            <span className="text-slate-400">Environment Version:</span>
            <span className="text-white ml-2">{credential.environmentVersion || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400">Created:</span>
            <span className="text-white ml-2">
              {new Date(credential.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Last Updated:</span>
            <span className="text-white ml-2">
              {new Date(credential.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ION Configuration */}
        <div className="space-y-2">
          <h4 className="text-white font-medium mb-3">ION API Configuration</h4>
          <div>
            <span className="text-slate-400">Client ID:</span>
            <span className="text-white ml-2 font-mono text-xs">
              {showSensitive ? credential.ionConfig.clientId : credential.ionConfig.clientId.split('~')[0] + '~••••'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Portal URL:</span>
            <span className="text-white ml-2 break-all">{credential.ionConfig.portalUrl}</span>
          </div>
          <div>
            <span className="text-slate-400">Identity URL:</span>
            <span className="text-white ml-2 break-all">
              {credential.ionConfig.identityUrl || 'Not specified'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Scope:</span>
            <span className="text-white ml-2">{credential.ionConfig.scope}</span>
          </div>
          {(credential.ionConfig.lnCompany || credential.ionConfig.lnIdentity) && (
            <div className="space-y-1 mt-3">
              <h5 className="text-slate-300 font-medium text-xs">HTTP Headers:</h5>
              {credential.ionConfig.lnCompany && (
                <div>
                  <span className="text-slate-400">X-Infor-LnCompany:</span>
                  <span className="text-white ml-2">{credential.ionConfig.lnCompany}</span>
                </div>
              )}
              {credential.ionConfig.lnIdentity && (
                <div>
                  <span className="text-slate-400">X-Infor-LnIdentity:</span>
                  <span className="text-white ml-2">{credential.ionConfig.lnIdentity}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sensitive Information (only when revealed) */}
        {showSensitive && (
          <>
            <div className="space-y-2">
              <h4 className="text-yellow-400 font-medium mb-3">⚠️ Sensitive Data</h4>
              <div>
                <span className="text-slate-400">Client Secret:</span>
                <span className="text-white ml-2 font-mono text-xs break-all">
                  {credential.ionConfig.clientSecret}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Service Account Access Key:</span>
                <span className="text-white ml-2 font-mono text-xs break-all">
                  {credential.ionConfig.serviceAccountAccessKey}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-transparent font-medium mb-3">.</h4>
              <div>
                <span className="text-slate-400">Service Account Secret Key:</span>
                <span className="text-white ml-2 font-mono text-xs break-all">
                  {credential.ionConfig.serviceAccountSecretKey}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}