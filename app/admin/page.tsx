/**
 * @fileoverview Admin Account Management Page
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Unlock, Search, CheckCircle, XCircle, Clock, AlertCircle, Building2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

interface AccountStatus {
  username: string;
  tenant: string;
  locked: boolean;
  failedAttempts: number;
  remainingSeconds: number;
  remainingMinutes: number;
}

interface Tenant {
  tenant: string;
  user_count: number;
  last_activity: string;
  status: string;
  disabled?: boolean;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [username, setUsername] = useState('');
  const [tenant, setTenant] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  
  // Check if user is superadmin
  const userRoles = session?.user?.roles || [];
  const isSuperAdmin = userRoles.includes('superadmin');

  /**
   * Check account lock status
   */
  const checkAccountStatus = async () => {
    if (!username.trim() || !tenant.trim()) {
      setError('Please enter both username and tenant');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/unlock-account?username=${encodeURIComponent(username)}&tenant=${encodeURIComponent(tenant)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check account status');
      }

      const data = await response.json();
      setAccountStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check account status');
      setAccountStatus(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unlock account
   */
  const unlockAccount = async () => {
    if (!accountStatus) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: accountStatus.username,
          tenant: accountStatus.tenant,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unlock account');
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      
      // Refresh status
      await checkAccountStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock account');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkAccountStatus();
  };
  
  /**
   * Load all tenants (superadmin only)
   */
  const loadTenants = async () => {
    if (!isSuperAdmin) return;
    
    setLoadingTenants(true);
    try {
      const response = await fetch('/api/admin/tenants');
      if (!response.ok) throw new Error('Failed to load tenants');
      
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoadingTenants(false);
    }
  };
  
  /**
   * Toggle tenant status (activate/deactivate)
   */
  const toggleTenantStatus = async (tenantName: string, action: 'activate' | 'deactivate') => {
    if (!isSuperAdmin) return;
    
    // Prevent deactivation of MIDPORT_DEM
    if (action === 'deactivate' && tenantName === 'MIDPORT_DEM') {
      setError('Cannot deactivate MIDPORT_DEM tenant - it contains the superadmin account');
      return;
    }
    
    if (!confirm(`Are you sure you want to ${action} tenant "${tenantName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: tenantName, action }),
      });
      
      if (!response.ok) throw new Error(`Failed to ${action} tenant`);
      
      const data = await response.json();
      setSuccessMessage(data.message);
      
      // Reload tenants
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} tenant`);
    }
  };
  
  // Load tenants on mount if superadmin
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
    }
  }, [isSuperAdmin]);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#004766' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-10 h-10 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-300">Manage locked accounts and security settings</p>
        </div>

        {/* Search Form */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Check Account Status</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>

              {/* Tenant Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tenant
                </label>
                <input
                  type="text"
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tenant name"
                />
              </div>
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Check Status</span>
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-red-100">{error}</div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-green-100">{successMessage}</div>
            </div>
          </div>
        )}

        {/* Account Status Display */}
        {accountStatus && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>

            {/* Account Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Username</p>
                  <p className="text-lg font-medium text-white">{accountStatus.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Tenant</p>
                  <p className="text-lg font-medium text-white">{accountStatus.tenant}</p>
                </div>
              </div>

              {/* Lock Status */}
              <div className="border-t border-white/20 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {accountStatus.locked ? (
                      <>
                        <XCircle className="w-6 h-6 text-red-500" />
                        <span className="text-lg font-semibold text-red-400">Account Locked</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <span className="text-lg font-semibold text-green-400">Account Active</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Failed Attempts</p>
                    <p className="text-2xl font-bold text-white">{accountStatus.failedAttempts}</p>
                  </div>
                  
                  {accountStatus.locked && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-orange-400" />
                        <p className="text-2xl font-bold text-white">{accountStatus.remainingMinutes} min</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unlock Button */}
                {accountStatus.locked && (
                  <div className="mt-6">
                    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="text-orange-100 text-sm">
                          This account is currently locked due to multiple failed login attempts. 
                          You can unlock it manually or wait for the lockout period to expire.
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={unlockAccount}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Unlocking...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Unlock className="w-5 h-5" />
                          <span>Unlock Account</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}

                {/* Account Active Message */}
                {!accountStatus.locked && accountStatus.failedAttempts > 0 && (
                  <div className="mt-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="text-yellow-100 text-sm">
                        This account has {accountStatus.failedAttempts} failed login attempt(s). 
                        After 5 failed attempts, the account will be locked for 30 minutes.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tenant Management Section - Superadmin Only */}
        {isSuperAdmin && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Tenant Management</h2>
              </div>
              <Button
                onClick={loadTenants}
                disabled={loadingTenants}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loadingTenants ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.tenant}
                  className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-white">{tenant.tenant}</h3>
                      {tenant.disabled === 1 ? (
                        <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-300 text-xs rounded-full">
                          Disabled
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 text-green-300 text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {tenant.user_count} user(s) • Last activity: {tenant.last_activity || 'Never'}
                    </p>
                  </div>
                  
                  {tenant.tenant === 'MIDPORT_DEM' && tenant.disabled !== 1 ? (
                    <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-300 text-sm rounded">
                      Superadmin Tenant
                    </div>
                  ) : (
                    <Button
                      onClick={() => toggleTenantStatus(tenant.tenant, tenant.disabled === 1 ? 'activate' : 'deactivate')}
                      className={`${tenant.disabled === 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {tenant.disabled === 1 ? 'Activate' : 'Deactivate'}
                    </Button>
                  )}
                </div>
              ))}
              
              {tenants.length === 0 && !loadingTenants && (
                <p className="text-center text-gray-400 py-8">No tenants found</p>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <span>Security Information</span>
          </h3>
          <ul className="text-sm text-blue-100 space-y-2">
            <li>• Accounts are automatically locked after 5 failed login attempts</li>
            <li>• Lockout duration is 30 minutes</li>
            <li>• Failed attempt counter resets after 15 minutes of no activity</li>
            <li>• Admins can manually unlock accounts using this interface</li>
            <li>• All unlock actions are logged in the audit log</li>
            {isSuperAdmin && <li>• Superadmins can activate/deactivate entire tenants</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
