/**
 * @fileoverview Edit Database Dialog Component for Remote API Database Configuration
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import React, { useState, useEffect } from 'react';
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
import { X, Plus } from 'lucide-react';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';

/**
 * Props interface for EditDatabaseDialog component
 * @interface EditDatabaseDialogProps
 */
interface EditDatabaseDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** Function to call when database is successfully updated */
  onSuccess: () => void;
  /** Database to edit (null for add new) */
  database: any | null;
}

/**
 * Dialog component for editing remote API databases
 * Provides form fields for database configuration including name, URL, tenant, services, expand fields, and tables
 * @component EditDatabaseDialog
 * @param {EditDatabaseDialogProps} props - Component props
 * @returns {JSX.Element} Dialog component with form for database configuration
 */
export default function EditDatabaseDialog({ open, onClose, onSuccess, database }: EditDatabaseDialogProps) {
  const { updateRemoteAPIDatabase } = useRemoteAPI();

  const [formData, setFormData] = useState<{
    name: string;
    base_url: string;
    tenant_name: string;
    services: string;
    tables: string[];
    status: 'active' | 'inactive';
  }>({
    name: '',
    base_url: '',
    tenant_name: '',
    services: '',
    tables: [],
    status: 'active'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newTable, setNewTable] = useState('');

  // Load database data when dialog opens
  useEffect(() => {
    if (open && database) {
      setFormData({
        name: database.name || '',
        base_url: database.baseUrl || '',
        tenant_name: database.tenantName || '',
        services: database.services || '',
        tables: database.tables?.map((t: any) => t.name) || [],
        status: database.status || 'active'
      });
    }
  }, [open, database]);

  // Helper functions for managing tables
  const addTable = (table: string) => {
    const trimmedTable = table.trim();
    if (trimmedTable && !formData.tables.includes(trimmedTable)) {
      setFormData(prev => ({
        ...prev,
        tables: [...prev.tables, trimmedTable]
      }));
      setNewTable('');
    }
  };

  const removeTable = (tableToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table !== tableToRemove)
    }));
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update the remote API database
      await updateRemoteAPIDatabase(database.id, {
        name: formData.name,
        baseUrl: formData.base_url,
        tenantName: formData.tenant_name,
        services: formData.services,
        tables: formData.tables,
        expandFields: [], // No longer used - expand fields are per table
        status: formData.status
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating database:', error);
      // Error handling will be shown in the UI by the parent component
    } finally {
      setIsSaving(false);
    }
  };

  if (!database) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl sm:w-full bg-[#1a5f7a] border-[#0f3d4f] text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-[#1a5f7a] px-4 sm:px-6 py-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4">
          <DialogTitle className="text-white">
            Edit Database: {database.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 px-4 sm:px-6">
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
            <Label htmlFor="services" className="text-white">Services Path</Label>
            <Input
              id="services"
              value={formData.services}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, services: e.target.value })}
              placeholder="LN/c4ws/services or LN/lnapi"
              required
              className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11"
            />
          </div>

          {/* Tables Management */}
          <div className="space-y-2">
            <Label className="text-white">Services/Tables</Label>
            <div className="space-y-2">
              {/* Current tables */}
              {formData.tables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tables.map((table, index) => (
                    <div key={index} className="flex items-center bg-[#2a6b83] text-white px-3 py-1 rounded-full text-sm">
                      <span>{table}</span>
                      <button
                        type="button"
                        onClick={() => removeTable(table)}
                        className="ml-2 hover:text-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add new table */}
              <div className="flex gap-2">
                <Input
                  value={newTable}
                  onChange={(e) => setNewTable(e.target.value)}
                  placeholder="ServiceCall_v2, tdapi.slsSalesOrder/Orders..."
                  className="bg-[#0f3d4f] border-[#1a5f7a] text-white placeholder:text-[#8bb3cc] focus:ring-2 focus:ring-blue-500 text-sm h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTable(newTable);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => addTable(newTable)}
                  disabled={!newTable.trim() || formData.tables.includes(newTable.trim())}
                  className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white px-3 h-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expand Fields Info */}
          {(formData.services.includes('lnapi') || formData.tables.some(table => table.includes('/'))) && (
            <div className="bg-[#0f3d4f] p-4 rounded border border-[#1a5f7a]">
              <p className="text-sm text-white mb-2">
                <strong>💡 Expand Fields Management</strong>
              </p>
              <p className="text-xs text-[#8bb3cc]">
                Expand fields are now managed per service. After updating this database, use the ⚙️ Settings button on each REST service to configure its specific expand fields (LineRefs, SoldToBPRef, etc.).
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status" className="text-white">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="bg-[#0f3d4f] border-[#1a5f7a] text-white focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-10 sm:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a5f7a] border-[#0f3d4f] text-white">
                <SelectItem value="active" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">Active</SelectItem>
                <SelectItem value="inactive" className="text-white hover:bg-[#2a6b83] focus:bg-[#2a6b83]">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="bg-[#1a5f7a] px-4 sm:px-6 py-4 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-[#1a5f7a] text-white hover:bg-[#2a6b83] hover:text-white bg-transparent text-sm sm:text-base px-3 sm:px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white border border-[#0f3d4f] text-sm sm:text-base px-3 sm:px-4 py-2">
              {isSaving ? 'Updating...' : 'Update Database'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}