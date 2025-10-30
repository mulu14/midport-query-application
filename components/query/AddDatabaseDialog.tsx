/**
 * @fileoverview Add Database Dialog Component for Remote API Database Configuration
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
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

  // Reset form when dialog opens or mode changes
  React.useEffect(() => {
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
        tables: '',
        expand_fields: [],
        api_type: 'soap'
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
    expand_fields: string[]; // Array of OData expand fields
    api_type: 'soap' | 'rest'; // API type selection
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
    tables: '',
    expand_fields: [],
    api_type: 'soap'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newExpandField, setNewExpandField] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper functions for managing expand fields
  const addExpandField = (field: string) => {
    const trimmedField = field.trim();
    if (trimmedField && !formData.expand_fields.includes(trimmedField)) {
      setFormData(prev => ({
        ...prev,
        expand_fields: [...prev.expand_fields, trimmedField]
      }));
      setNewExpandField('');
    }
  };

  const removeExpandField = (fieldToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      expand_fields: prev.expand_fields.filter(field => field !== fieldToRemove)
    }));
  };

  const constructFullUrl = (baseUrl: string, tenantName: string, services: string, table: string) => {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/${tenantName}/${services}/${table}`;
  };

  const parseAPIUrl = (url: string) => {
    // Parse URL like: https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
    // or: https://different-api.com/COBHAM/LN/c4ws/services/ServiceCall_v2
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

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

        return result;
      } else {
      }
    } catch (error) {
      // Invalid URL format - silently fail
    }
    return null;
  };

  const handleUrlChange = (url: string) => {
    if (mode === 'remote') {
      const parsed = parseAPIUrl(url);
      if (parsed) {
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
        // If parsing fails, just set the URL
        setFormData(prev => ({ ...prev, full_url: url }));
      }
    } else {
      setFormData(prev => ({ ...prev, full_url: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

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
          tables: tablesArray,
          expandFields: formData.expand_fields
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
            tables: '',
            expand_fields: [],
            api_type: 'soap'
          });

          onSuccess();
          onClose();
        }
        // If result is null, database already exists
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
          tables: '',
          expand_fields: [],
          api_type: 'soap'
        });

        onSuccess();
        onClose();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(errorMsg);
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
          {(mode === 'remote' || formData.type === 'api') ? (
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

              <div className="space-y-2">
                <Label htmlFor="api_type" className="text-white">API Type</Label>
                <Select
                  value={formData.api_type || 'soap'}
                  onValueChange={(value: 'soap' | 'rest') => {
                    setFormData({ 
                      ...formData, 
                      api_type: value,
                      // Update services path based on API type
                      services: value === 'rest' ? 'LN/lnapi' : 'LN/c4ws/services'
                    })
                  }}
                >
                  <SelectTrigger className="bg-[#0f3d4f] border-[#1a5f7a] text-white focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a5f7a] border-[#0f3d4f] text-white">
                    <SelectItem value="soap" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">SOAP (XML)</SelectItem>
                    <SelectItem value="rest" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">REST (OData)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#8bb3cc]">Choose API type for the services you're adding now. The same tenant can have both SOAP and REST services.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="services" className="text-white">Services Path</Label>
                  <Input
                    id="services"
                    value={formData.services}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, services: e.target.value })}
                    placeholder={formData.api_type === 'rest' ? 'LN/lnapi' : 'LN/c4ws/services'}
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
                  <p className="text-xs text-[#8bb3cc]">Services for this API type. Same tenant supports both: SOAP (BusinessPartner_v3,ServiceCall_v2) and REST (tdapi.slsSalesOrder/orders,tsapi.socServiceOrder/Orders). Add different types separately.</p>
                </div>
              </div>

              {/* Expand Fields Section - Only show for REST API */}
              {formData.api_type === 'rest' && (
                <div className="space-y-2">
                  <Label className="text-white">OData Expand Fields</Label>
                  <div className="space-y-2">
                    {/* Current expand fields */}
                    {formData.expand_fields.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.expand_fields.map((field, index) => (
                          <div key={index} className="flex items-center bg-[#2a6b83] text-white px-3 py-1 rounded-full text-sm">
                            <span>{field}</span>
                            <button
                              type="button"
                              onClick={() => removeExpandField(field)}
                              className="ml-2 hover:text-red-300 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add new expand field */}
                    <div className="flex gap-2">
                      <Input
                        value={newExpandField}
                        onChange={(e) => setNewExpandField(e.target.value)}
                        placeholder="LineRefs, SoldToBPRef, ShipToBPRef..."
                        className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm h-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addExpandField(newExpandField);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => addExpandField(newExpandField)}
                        disabled={!newExpandField.trim() || formData.expand_fields.includes(newExpandField.trim())}
                        className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white px-3 h-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-[#8bb3cc]">
                    Add fields to expand in OData queries (e.g., LineRefs, SoldToBPRef, ShipToBPRef). These will be used to retrieve nested data from the API.
                  </p>
                </div>
              )}

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
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

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