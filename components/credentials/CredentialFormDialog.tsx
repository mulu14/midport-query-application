/**
 * @fileoverview Credential Form Dialog for Creating and Editing ION API Credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TenantConfig, NewTenantConfig, IONAPIConfig } from '@/Entities/TenantConfig';

interface CredentialFormDialogProps {
  open: boolean;
  credential?: TenantConfig;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Credential Form Dialog Component
 */
export function CredentialFormDialog({ open, credential, onClose, onSuccess }: CredentialFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [showServiceAccountSensitive, setShowServiceAccountSensitive] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    tenantName: '',
    environmentVersion: '',
    isActive: true,
    ionConfig: {
      clientId: '',
      clientSecret: '',
      identityUrl: '',
      portalUrl: '',
      tenantId: '',
      tokenEndpoint: '',
      authorizationEndpoint: '',
      revokeEndpoint: '',
      serviceAccountAccessKey: '',
      serviceAccountSecretKey: '',
      scope: '',
      version: '',
      clientName: '',
      dataType: '',
      lnCompany: '',
      lnIdentity: ''
    }
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Initialize form data
   */
  useEffect(() => {
    if (credential) {
      // Edit mode - populate form with existing credential data
      setFormData({
        tenantName: credential.tenantName,
        environmentVersion: credential.environmentVersion || '',
        isActive: credential.isActive,
        ionConfig: { 
          clientId: credential.ionConfig.clientId || '',
          clientSecret: credential.ionConfig.clientSecret || '',
          identityUrl: credential.ionConfig.identityUrl || '',
          portalUrl: credential.ionConfig.portalUrl || '',
          tenantId: credential.ionConfig.tenantId || '',
          tokenEndpoint: credential.ionConfig.tokenEndpoint || '',
          authorizationEndpoint: credential.ionConfig.authorizationEndpoint || '',
          revokeEndpoint: credential.ionConfig.revokeEndpoint || '',
          serviceAccountAccessKey: credential.ionConfig.serviceAccountAccessKey || '',
          serviceAccountSecretKey: credential.ionConfig.serviceAccountSecretKey || '',
          scope: credential.ionConfig.scope || '',
          version: credential.ionConfig.version || '',
          clientName: credential.ionConfig.clientName || '',
          dataType: credential.ionConfig.dataType || '',
          lnCompany: credential.ionConfig.lnCompany || '',
          lnIdentity: credential.ionConfig.lnIdentity || ''
        }
      });
    } else {
      // Create mode - reset to defaults
      setFormData({
        tenantName: '',
        environmentVersion: '',
        isActive: true,
        ionConfig: {
          clientId: '',
          clientSecret: '',
          identityUrl: '',
          portalUrl: '',
          tenantId: '',
          tokenEndpoint: '',
          authorizationEndpoint: '',
          revokeEndpoint: '',
          serviceAccountAccessKey: '',
          serviceAccountSecretKey: '',
          scope: '',
          version: '',
          clientName: '',
          dataType: '',
          lnCompany: '',
          lnIdentity: ''
        }
      });
    }
    setValidationErrors({});
    setError(null);
  }, [credential, open]);

  /**
   * Update form field
   */
  const updateField = (field: string, value: any) => {
    if (field.startsWith('ionConfig.')) {
      const ionField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        ionConfig: {
          ...prev.ionConfig,
          [ionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  /**
   * Auto-populate tenant ID when client ID changes
   */
  const handleClientIdChange = (value: string) => {
    updateField('ionConfig.clientId', value);
    
    // Auto-extract tenant ID from client ID
    if (value.includes('~')) {
      const extractedTenantId = value.split('~')[0];
      updateField('ionConfig.tenantId', extractedTenantId);
      
      // Also update credential name if it's empty
      if (!formData.tenantName) {
        updateField('tenantName', extractedTenantId);
      }
    }
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!formData.tenantName.trim()) {
      errors.tenantName = 'Credential name is required';
    }

    // ION API validation
    if (!formData.ionConfig.clientId.trim()) {
      errors['ionConfig.clientId'] = 'Client ID is required';
    }
    if (!formData.ionConfig.clientSecret.trim()) {
      errors['ionConfig.clientSecret'] = 'Client secret is required';
    }
    if (!formData.ionConfig.portalUrl.trim()) {
      errors['ionConfig.portalUrl'] = 'Portal URL is required';
    } else if (!formData.ionConfig.portalUrl.startsWith('https://')) {
      errors['ionConfig.portalUrl'] = 'Portal URL must start with https://';
    }
    if (!formData.ionConfig.tenantId.trim()) {
      errors['ionConfig.tenantId'] = 'Tenant ID is required';
    }
    if (!formData.ionConfig.serviceAccountAccessKey.trim()) {
      errors['ionConfig.serviceAccountAccessKey'] = 'Service account access key is required';
    }
    if (!formData.ionConfig.serviceAccountSecretKey.trim()) {
      errors['ionConfig.serviceAccountSecretKey'] = 'Service account secret key is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = credential ? `/api/credentials/${credential.id}` : '/api/credentials';
      const method = credential ? 'PUT' : 'POST';

      const payload = credential ? formData : {
        tenantName: formData.tenantName,
        environmentVersion: formData.environmentVersion || undefined,
        ionConfig: formData.ionConfig
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        // Show detailed validation errors if available
        let errorMessage = errorData.message || errorData.error || 'Failed to save credentials';
        
        if (errorData.missingFields && errorData.missingFields.length > 0) {
          errorMessage += `\n\nMissing fields: ${errorData.missingFields.join(', ')}`;
        }
        
        if (errorData.missingIonFields && errorData.missingIonFields.length > 0) {
          errorMessage += `\n\nMissing ION config fields: ${errorData.missingIonFields.join(', ')}`;
        }
        
        throw new Error(errorMessage);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving credentials:', error);
      setError(error instanceof Error ? error.message : 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-lg shadow-2xl border border-white/20 w-full max-w-4xl max-h-[85vh] flex flex-col" style={{backgroundColor: '#004766'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20 shrink-0 rounded-t-lg" style={{backgroundColor: '#004766'}}>
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            {credential ? 'Edit ION API Credentials' : 'Add New ION API Credentials'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-red-100 whitespace-pre-line">{error}</div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Credential Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tenant Name <span className="text-red-500">*</span>
                </label>
                  <input
                    type="text"
                    value={formData.tenantName}
                    onChange={(e) => updateField('tenantName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., MIDPORT_DEM"
                  />
                {validationErrors.tenantName && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.tenantName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Environment Version
                  </label>
                  <input
                    type="text"
                    value={formData.environmentVersion}
                    onChange={(e) => updateField('environmentVersion', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., V1480769020"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => updateField('isActive', e.target.checked)}
                      className="rounded border-gray-300 bg-gray-50 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    <span>Active credentials</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ION API Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">ION API OAuth2 Configuration</h3>
                <button
                  type="button"
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="flex items-center space-x-2 text-sm text-gray-200 hover:text-white"
                >
                  {showSensitive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Hide sensitive fields</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Show sensitive fields</span>
                    </>
                  )}
                </button>
              </div>

              {/* Client Credentials */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Client ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showSensitive ? "text" : "password"}
                    value={formData.ionConfig.clientId}
                    onChange={(e) => handleClientIdChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g., MIDPORT_DEM~xeEYoTVxRVCvajAOUKpp1yBzDzZ2qLvTNRKL7-4wZGA"
                  />
                  {validationErrors['ionConfig.clientId'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.clientId']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Client Secret <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showSensitive ? "text" : "password"}
                    value={formData.ionConfig.clientSecret}
                    onChange={(e) => updateField('ionConfig.clientSecret', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Client secret value"
                  />
                  {validationErrors['ionConfig.clientSecret'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.clientSecret']}</p>
                  )}
                </div>
              </div>

              {/* URLs and Endpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Portal URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.ionConfig.portalUrl}
                    onChange={(e) => updateField('ionConfig.portalUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/"
                  />
                  {validationErrors['ionConfig.portalUrl'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.portalUrl']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Identity URL
                  </label>
                  <input
                    type="url"
                    value={formData.ionConfig.identityUrl}
                    onChange={(e) => updateField('ionConfig.identityUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., https://mingle-ionapi.eu1.inforcloudsuite.com"
                  />
                </div>
              </div>

              {/* Tenant Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tenant ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.tenantId}
                    onChange={(e) => updateField('ionConfig.tenantId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., MIDPORT_DEM"
                  />
                  {validationErrors['ionConfig.tenantId'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.tenantId']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.clientName}
                    onChange={(e) => updateField('ionConfig.clientName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., MID_PORT_Quary"
                  />
                </div>
              </div>


              {/* OAuth2 Endpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Token Endpoint
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.tokenEndpoint}
                    onChange={(e) => updateField('ionConfig.tokenEndpoint', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., token.oauth2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Authorization Endpoint
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.authorizationEndpoint}
                    onChange={(e) => updateField('ionConfig.authorizationEndpoint', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., authorization.oauth2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Revoke Endpoint
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.revokeEndpoint}
                    onChange={(e) => updateField('ionConfig.revokeEndpoint', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., revoke_token.oauth2"
                  />
                </div>
              </div>

              {/* Additional Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Scope
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.scope}
                    onChange={(e) => updateField('ionConfig.scope', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., read write"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.version}
                    onChange={(e) => updateField('ionConfig.version', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data Type
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.dataType}
                    onChange={(e) => updateField('ionConfig.dataType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12"
                  />
                </div>
              </div>

              {/* HTTP Headers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    X-Infor-LnCompany
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.lnCompany || ''}
                    onChange={(e) => updateField('ionConfig.lnCompany', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2405"
                  />
                  <p className="text-slate-400 text-xs mt-1">Company identifier for Infor LN API requests</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    X-Infor-LnIdentity
                  </label>
                  <input
                    type="text"
                    value={formData.ionConfig.lnIdentity || ''}
                    onChange={(e) => updateField('ionConfig.lnIdentity', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., lnapi_mfo"
                  />
                  <p className="text-slate-400 text-xs mt-1">Identity for Infor LN API authentication</p>
                </div>
              </div>
            </div>

            {/* Service Account Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Service Account Configuration</h3>
                <button
                  type="button"
                  onClick={() => setShowServiceAccountSensitive(!showServiceAccountSensitive)}
                  className="flex items-center space-x-2 text-sm text-gray-200 hover:text-white"
                >
                  {showServiceAccountSensitive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Hide sensitive fields</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Show sensitive fields</span>
                    </>
                  )}
                </button>
              </div>

              {/* Service Account Keys */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Service Account Access Key <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showServiceAccountSensitive ? "text" : "password"}
                    value={formData.ionConfig.serviceAccountAccessKey}
                    onChange={(e) => updateField('ionConfig.serviceAccountAccessKey', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g., MIDPORT_DEM#YuBQLph3IgLAtSECaW9IJzlO0Bkag0UF10MqI2EPmVaB6dEyjnwTGF6Y67f-VEgYLL5SgXgKRfk7nF_OXcozpA"
                  />
                  {validationErrors['ionConfig.serviceAccountAccessKey'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.serviceAccountAccessKey']}</p>
                  )}
                  <p className="text-slate-400 text-xs mt-1">Service account access key for ION API authentication</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Service Account Secret Key <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showServiceAccountSensitive ? "text" : "password"}
                    value={formData.ionConfig.serviceAccountSecretKey}
                    onChange={(e) => updateField('ionConfig.serviceAccountSecretKey', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Service account secret key"
                  />
                  {validationErrors['ionConfig.serviceAccountSecretKey'] && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors['ionConfig.serviceAccountSecretKey']}</p>
                  )}
                  <p className="text-slate-400 text-xs mt-1">Service account secret key for secure API access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 sm:space-x-4 p-4 sm:p-6 border-t border-white/20 shrink-0 bg-[#004766] rounded-b-lg">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-3 sm:px-4 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-white text-sm sm:text-base px-3 sm:px-4 transition-colors hover:bg-white/10"
              style={{backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.3)'}}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{credential ? 'Updating...' : 'Creating...'}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>{credential ? 'Update Credentials' : 'Create Credentials'}</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}