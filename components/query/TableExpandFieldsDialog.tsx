/**
 * @fileoverview Table Expand Fields Dialog Component for managing OData expand fields per table/service
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
import { X, Plus, Database } from 'lucide-react';

/**
 * Props interface for TableExpandFieldsDialog component
 * @interface TableExpandFieldsDialogProps
 */
interface TableExpandFieldsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** Function to call when expand fields are successfully updated */
  onSuccess: () => void;
  /** Database ID */
  databaseId: string;
  /** Table information */
  table: {
    id: number;
    name: string;
    apiType: string;
    expandFields?: { name: string; description?: string; isActive: boolean }[];
  } | null;
}

/**
 * Dialog component for managing expand fields per table/service
 * Allows adding/removing OData expand fields specific to each REST API service
 * @component TableExpandFieldsDialog
 * @param {TableExpandFieldsDialogProps} props - Component props
 * @returns {JSX.Element} Dialog component for managing expand fields per table
 */
export default function TableExpandFieldsDialog({ 
  open, 
  onClose, 
  onSuccess, 
  databaseId, 
  table 
}: TableExpandFieldsDialogProps) {
  const [expandFields, setExpandFields] = useState<string[]>([]);
  const [newExpandField, setNewExpandField] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  

  // Load expand fields when dialog opens
  useEffect(() => {
    if (open && table) {
      setIsLoading(true);
      loadExpandFields();
    } else if (!open) {
      // Clear fields when dialog is fully closed
      setExpandFields([]);
      setNewExpandField('');
    }
  }, [open, table]);

  const loadExpandFields = async () => {
    if (!table) return;

    try {
      const encodedTableName = encodeURIComponent(table.name);
      const response = await fetch(`/api/remote-databases/${databaseId}/tables/${encodedTableName}/expand-fields`);
      if (response.ok) {
        const fields = await response.json();
        setExpandFields(fields);
      } else {
        // Fallback to existing data if API fails
        setExpandFields(table.expandFields?.map(ef => ef.name) || []);
      }
    } catch (error) {
      console.error('Failed to load expand fields:', error);
      // Fallback to existing data
      setExpandFields(table.expandFields?.map(ef => ef.name) || []);
    } finally {
      setIsLoading(false);
    }
  };

  const addExpandField = (field: string) => {
    const trimmedField = field.trim();
    
    if (!trimmedField) {
      return;
    }
    
    // Handle comma-separated fields
    const fieldsToAdd = trimmedField.split(',').map(f => f.trim()).filter(f => f.length > 0);
    
    setExpandFields(prev => {
      const newFields = [...prev];
      
      fieldsToAdd.forEach(fieldName => {
        if (!newFields.includes(fieldName)) {
          newFields.push(fieldName);
        }
      });
      
      return newFields;
    });
    
    setNewExpandField('');
  };

  const removeExpandField = (fieldToRemove: string) => {
    setExpandFields(prev => prev.filter(field => field !== fieldToRemove));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!table) return;

    setIsSaving(true);

    try {
      const encodedTableName = encodeURIComponent(table.name);
      const requestData = {
        expandFields: expandFields
      };
      
      const apiUrl = `/api/remote-databases/${databaseId}/tables/${encodedTableName}/expand-fields`;
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update expand fields: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();

      onSuccess();
      onClose();
    } catch (error) {
      alert(`Failed to update expand fields: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Only clear fields when cancelling, not after successful save
    setNewExpandField('');
    onClose();
  };
  
  const handleCancel = () => {
    // Reset to original state when cancelling
    setExpandFields([]);
    setNewExpandField('');
    onClose();
  };

  if (!table) return null;

  // Only show for REST APIs
  if (table.apiType !== 'rest') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-md bg-[#1a5f7a] border-[#0f3d4f] text-white">
          <DialogHeader className="bg-[#1a5f7a] px-4 py-4 -mx-4 -mt-4 mb-4">
            <DialogTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Expand Fields Not Supported
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-4 text-center">
            <p className="text-white mb-4">
              Expand fields are only supported for REST API services.
            </p>
            <p className="text-sm text-gray-300">
              <strong>{table.name}</strong> is a {table.apiType.toUpperCase()} service.
            </p>
          </div>

          <DialogFooter className="bg-[#1a5f7a] px-4 py-4 -mx-4 -mb-4 mt-4">
            <Button 
              type="button" 
              onClick={handleClose}
              className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white border border-[#0f3d4f]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-2xl bg-[#1a5f7a] border-[#0f3d4f] text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader className="bg-[#1a5f7a] px-4 py-4 -mx-4 -mt-4 mb-4">
          <DialogTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5" />
            Manage Expand Fields: {table.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label className="text-white">Service Information</Label>
            <div className="bg-[#0f3d4f] p-3 rounded border border-[#1a5f7a]">
              <p className="text-sm text-gray-300">
                <strong>Service:</strong> {table.name}
              </p>
              <p className="text-sm text-gray-300">
                <strong>Type:</strong> {table.apiType.toUpperCase()} API
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white">OData Expand Fields</Label>
            
            {isLoading ? (
              <div className="text-center py-4 text-gray-300">Loading expand fields...</div>
            ) : (
              <>
                {/* Current expand fields */}
                {expandFields.length > 0 ? (
                  <div className="space-y-2">
                    {expandFields.map((field, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#2a6b83] text-white px-3 py-2 rounded">
                        <span className="text-sm font-medium">{field}</span>
                        <button
                          type="button"
                          onClick={() => removeExpandField(field)}
                          className="text-red-300 hover:text-red-200 transition-colors"
                          title={`Remove ${field}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 bg-[#0f3d4f] rounded border border-[#1a5f7a]">
                    No expand fields configured yet.
                    <br />
                    <span className="text-xs">Add fields below to expand nested data in OData queries.</span>
                  </div>
                )}

                {/* Add new expand field */}
                <div className="flex gap-2">
                  <Input
                    value={newExpandField}
                    onChange={(e) => setNewExpandField(e.target.value)}
                    placeholder="Enter field name or comma-separated list (e.g., LineRefs, SoldToBPRef)"
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
                    disabled={!newExpandField.trim()}
                    className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white px-3 h-10"
                    title="Add expand field(s)"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="bg-[#0f3d4f] p-3 rounded border border-[#1a5f7a]">
                  <p className="text-xs text-[#8bb3cc] mb-2">
                    <strong>About Expand Fields:</strong>
                  </p>
                  <ul className="text-xs text-[#8bb3cc] space-y-1">
                    <li>• These fields will be used in OData $expand queries</li>
                    <li>• Each field represents a navigation property to expand</li>
                    <li>• Examples: LineRefs (order lines), SoldToBPRef (customer data)</li>
                    <li>• Only add fields that exist in the API service</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="bg-[#1a5f7a] px-4 py-4 -mx-4 -mb-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              className="border-[#1a5f7a] text-white hover:bg-[#2a6b83] hover:text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || isLoading} 
              className="bg-[#1a5f7a] hover:bg-[#2a6b83] text-white border border-[#0f3d4f]"
            >
              {isSaving ? 'Saving...' : 'Save Expand Fields'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}