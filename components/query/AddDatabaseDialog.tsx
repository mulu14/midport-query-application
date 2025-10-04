/**
 * @fileoverview Add Database Dialog Component for Remote API Database Configuration
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useDatabase } from '@/lib/DatabaseContext';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';
import { useSidebarMode } from '@/lib/SidebarModeContext';

/**
 * Props interface for AddDatabaseDialog component
 * @interface AddDatabaseDialogProps
 */
interface AddDatabaseDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** Function to call when database is successfully added */
  onSuccess: () => void;
}

/**
 * Dialog component for adding new remote API databases
 * Provides form fields for database configuration including name, URL, tenant, services, and tables
 * Handles both local and remote API database creation based on sidebar mode
 * @component AddDatabaseDialog
 * @param {AddDatabaseDialogProps} props - Component props
 * @returns {JSX.Element} Dialog component with form for database configuration
 */
export default function AddDatabaseDialog({ open, onClose, onSuccess }: AddDatabaseDialogProps) {
  const { mode } = useSidebarMode();
  const { createDatabase } = useDatabase();
  const { createRemoteAPIDatabase } = useRemoteAPI();

  console.log('🔍 AddDatabaseDialog: Current mode:', mode);

  // Reset form when dialog opens or mode changes
  React.useEffect(() => {
    console.log('🔄 AddDatabaseDialog: useEffect triggered, open:', open, 'mode:', mode);
    if (open) {
      setFormData({
        name: '',
        type: 'sqlite',
        connection_string: '',
        api_key: '',
        status: 'connected',
        full_url: '',
        base_url: '',
        tenant_name: '',
        services: '',
        tables: ''
      });
    }
  }, [open, mode]);

  const [formData, setFormData] = useState<{
    // Local database fields
    name: string;
    type: 'sqlite' | 'local' | 'postgresql' | 'mysql' | 'mongodb' | 'api';
    connection_string: string;
    api_key: string;
    status: 'connected' | 'disconnected' | 'error';
    // Remote API fields
    full_url: string;
    base_url: string;
    tenant_name: string;
    services: string;
    tables: string; // Comma-separated string for input, converted to array on submit
  }>({
    name: '',
    type: 'sqlite',
    connection_string: '',
    api_key: '',
    status: 'connected',
    full_url: '',
    base_url: '',
    tenant_name: '',
    services: '',
    tables: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const constructFullUrl = (baseUrl: string, tenantName: string, services: string, table: string) => {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/${tenantName}/${services}/${table}`;
  };

  const parseAPIUrl = (url: string) => {
    // Parse URL like: https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
    // or: https://different-api.com/COBHAM/LN/c4ws/services/ServiceCall_v2
    try {
      console.log('🔍 Parsing API URL:', url);
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      console.log('📋 URL path parts:', pathParts);

      if (pathParts.length >= 3) {
        const base_url = `${urlObj.protocol}//${urlObj.host}/`;
        const tenant_name = pathParts[0];
        const services = pathParts.slice(1, -1).join('/');
        const table = pathParts[pathParts.length - 1];

        const result = {
          base_url,
          tenant_name,
          services,
          table
        };

        console.log('✅ Parsed API URL:', result);
        return result;
      } else {
        console.warn('⚠️ URL does not have enough path parts for parsing');
      }
    } catch (error) {
      console.error('❌ Invalid URL format:', error);
    }
    return null;
  };

  const handleUrlChange = (url: string) => {
    console.log('🔄 handleUrlChange called with URL:', url, 'mode:', mode);

    if (mode === 'remote') {
      const parsed = parseAPIUrl(url);
      if (parsed) {
        console.log('📝 Setting form data with parsed values');
        setFormData(prev => ({
          ...prev,
          full_url: url,
          base_url: parsed.base_url,
          tenant_name: parsed.tenant_name,
          services: parsed.services,
          tables: parsed.table,
          name: `${parsed.tenant_name} - ${parsed.table}`
        }));
      } else {
        console.log('📝 Parsing failed, just setting URL');
        // If parsing fails, just set the URL
        setFormData(prev => ({ ...prev, full_url: url }));
      }
    } else {
      console.log('📝 Non-remote mode, just setting URL');
      setFormData(prev => ({ ...prev, full_url: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (mode === 'remote' || formData.type === 'api') {
        // Create remote API database
        const tablesArray = formData.tables.split(',').map(t => t.trim()).filter(t => t);
        const firstTable = tablesArray[0] || 'default';
        const fullUrl = constructFullUrl(formData.base_url, formData.tenant_name, formData.services, firstTable);
        
        const result = await createRemoteAPIDatabase({
          name: formData.name || `${formData.tenant_name} - ${firstTable}`,
          fullUrl: fullUrl,
          baseUrl: formData.base_url,
          tenantName: formData.tenant_name,
          services: formData.services,
          tables: tablesArray
        });

        // Only reset form and close dialog if database was actually created
        if (result) {
          // Reset form
          setFormData({
            name: '',
            type: 'sqlite',
            connection_string: '',
            api_key: '',
            status: 'connected',
            full_url: '',
            base_url: '',
            tenant_name: '',
            services: '',
            tables: ''
          });

          onSuccess();
          onClose();
        }
        // If result is null, it means database already exists and user was notified
      } else {
        // Create local database
        const sampleTables = (formData.type === 'local' || formData.type === 'sqlite')
          ? [
              { name: 'customers', record_count: 3 },
              { name: 'products', record_count: 5 },
              { name: 'orders', record_count: 7 }
            ]
          : [
              { name: 'Users', record_count: 0 },
              { name: 'Posts', record_count: 0 },
              { name: 'Comments', record_count: 0 }
            ];

        await createDatabase({
          ...formData,
          tables: sampleTables
        });

        // Reset form
        setFormData({
          name: '',
          type: 'sqlite',
          connection_string: '',
          api_key: '',
          status: 'connected',
          full_url: '',
          base_url: '',
          tenant_name: '',
          services: '',
          tables: ''
        });

        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error adding database:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl sm:w-full bg-[#1a5f7a] border-[#0f3d4f] text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-[#1a5f7a] px-4 sm:px-6 py-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4">
          <DialogTitle className="text-white">
            Add New {(mode === 'remote' || formData.type === 'api') ? 'Remote API Database' : 'Database'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 px-4 sm:px-6">
          {(() => {
            console.log('🎨 AddDatabaseDialog: Rendering form, mode:', mode, 'type:', formData.type);
            return (mode === 'remote' || formData.type === 'api') ? (
              // Remote API Database Form
              <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Database Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Remote Database"
                  required
                  className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                />
                <p className="text-xs text-[#8bb3cc]">A friendly name to identify this database in the sidebar</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_url" className="text-white">Base URL</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://mingle-ionapi.eu1.inforcloudsuite.com/"
                    required
                    className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant_name" className="text-white">Tenant</Label>
                  <Input
                    id="tenant_name"
                    value={formData.tenant_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tenant_name: e.target.value })}
                    placeholder="MIDPORT_DEM"
                    required
                    className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="services" className="text-white">Services Path</Label>
                  <Input
                    id="services"
                    value={formData.services}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, services: e.target.value })}
                    placeholder="LN/c4ws/services"
                    required
                    className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tables" className="text-white">Tables</Label>
                  <Input
                    id="tables"
                    value={formData.tables}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tables: e.target.value })}
                    placeholder="ServiceCall_v2,Customer_v1,Order_v1"
                    required
                    className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                  />
                  <p className="text-xs text-[#8bb3cc]">Comma-separated table names. Each tenant can have different base URLs and multiple tables</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_url_display" className="text-white">Full Database URL</Label>
                <Input
                  id="full_url_display"
                  value={(() => {
                    const tablesArray = formData.tables.split(',').map(t => t.trim()).filter(t => t);
                    const firstTable = tablesArray[0] || '';
                    if (formData.base_url && formData.tenant_name && formData.services && firstTable) {
                      return constructFullUrl(formData.base_url, formData.tenant_name, formData.services, firstTable);
                    }
                    return 'URL will be constructed from the fields above';
                  })()}
                  readOnly
                  className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] text-sm sm:text-base h-10 sm:h-11 cursor-not-allowed"
                />
                <p className="text-xs text-[#8bb3cc]">Automatically constructed from Base URL + Tenant + Services + First Table</p>
              </div>
            </>
            ) : (
              // Local Database Form
              <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Database Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Database"
                  required
                  className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-white">Database Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'sqlite' | 'local' | 'postgresql' | 'mysql' | 'mongodb' | 'api') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-[#0f3d4f] border-[#1a5f7a] text-white focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a5f7a] border-[#0f3d4f] text-white">
                    <SelectItem value="sqlite" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">SQLite</SelectItem>
                    <SelectItem value="local" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">Local</SelectItem>
                    <SelectItem value="postgresql" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">PostgreSQL</SelectItem>
                    <SelectItem value="mysql" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">MySQL</SelectItem>
                    <SelectItem value="mongodb" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">MongoDB</SelectItem>
                    <SelectItem value="api" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">REST API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.type as string) === 'api' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="connection_string" className="text-white">API Endpoint</Label>
                    <Input
                      id="connection_string"
                      value={formData.connection_string}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, connection_string: e.target.value })}
                      placeholder="https://api.example.com"
                      className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key" className="text-white">API Key (Optional)</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Enter API key"
                      className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>
                </>
              )}

              {['postgresql', 'mysql', 'mongodb'].includes(formData.type) && (
                <div className="space-y-2">
                  <Label htmlFor="connection_string" className="text-white">Connection String</Label>
                  <Input
                    id="connection_string"
                    value={formData.connection_string}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, connection_string: e.target.value })}
                    placeholder="host:port/database"
                    className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              )}
            </>
            );
          })()}

          <DialogFooter className="bg-[#1a5f7a] px-4 sm:px-6 py-4 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-[#1a5f7a] text-white hover:bg-[#2a6b83] hover:text-white bg-transparent text-sm sm:text-base px-3 sm:px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white border border-[#0f3d4f] text-sm sm:text-base px-3 sm:px-4 py-2">
              {isSaving ? 'Adding...' : `Add ${(mode === 'remote' || formData.type === 'api') ? 'Remote API ' : ''}Database`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}