/**
 * @fileoverview Remote API Database List Component for Remote Database Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Table, ChevronDown, ChevronRight, Globe, Server, Plus, Edit, Trash2, Code2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';
import { useSidebarMode } from '@/lib/SidebarModeContext';
import EditDatabaseDialog from './EditDatabaseDialog';
import TableExpandFieldsDialog from './TableExpandFieldsDialog';

/**
 * Props interface for RemoteAPIDatabaseList component
 * @interface RemoteAPIDatabaseListProps
 */
interface RemoteAPIDatabaseListProps {
  /** Optional function to call when add database button is clicked */
  onAddDatabase?: () => void;
}

/**
 * Remote API Database List component for displaying and managing remote API databases
 * Shows expandable list of remote API tenants with their tables
 * Provides CRUD operations for remote databases and table selection
 * Integrates with RemoteAPI context for state management
 * @component RemoteAPIDatabaseList
 * @param {RemoteAPIDatabaseListProps} props - Component props
 * @returns {JSX.Element} Remote API database list interface with expandable tenant items
 */
export default function RemoteAPIDatabaseList({ onAddDatabase }: RemoteAPIDatabaseListProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const {
    tenants,
    selectedTenant,
    selectedTable,
    selectTableAndQuery,
    setShowAddDialog,
    updateTenant,
    deleteTenant,
    loadTenants
  } = useRemoteAPI();
  
  const { setMode } = useSidebarMode();

  const [expandedTenants, setExpandedTenants] = useState<string[]>([]);
  const [expandedApiTypes, setExpandedApiTypes] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [expandFieldsDialogOpen, setExpandFieldsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [editingDatabaseId, setEditingDatabaseId] = useState<string>('');

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const toggleApiType = (tenantId: string, apiType: 'soap' | 'rest') => {
    const key = `${tenantId}-${apiType}`;
    setExpandedApiTypes(prev =>
      prev.includes(key)
        ? prev.filter(id => id !== key)
        : [...prev, key]
    );
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-slate-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (window.confirm(`Are you sure you want to delete the tenant \"${tenantName}\"? This action cannot be undone.`)) {
      try {
        await deleteTenant(tenantId);
      } catch (error) {
        alert('Failed to delete tenant. Please try again.');
      }
    }
  };

  const handleEditTenant = (tenant: any) => {
    setEditingTenant(tenant);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingTenant(null);
  };

  const handleEditDialogSuccess = async () => {
    await loadTenants();
    setEditDialogOpen(false);
    setEditingTenant(null);
  };

  const handleManageExpandFields = (tenant: any, table: any) => {
    setEditingTable(table);
    setEditingDatabaseId(tenant.id);
    setExpandFieldsDialogOpen(true);
  };

  const handleExpandFieldsDialogClose = () => {
    setExpandFieldsDialogOpen(false);
    setEditingTable(null);
    setEditingDatabaseId('');
  };

  const handleExpandFieldsDialogSuccess = async () => {
    await loadTenants();
    setExpandFieldsDialogOpen(false);
    setEditingTable(null);
    setEditingDatabaseId('');
  };

  /**
   * Handles editing a table/service within a tenant
   * For REST services: Opens expand fields dialog
   * For SOAP services: Allows name editing (no expand fields)
   * @param {string} tenantId - ID of the tenant containing the table
   * @param {any} table - Table object to edit
   * @param {'soap'|'rest'} apiType - API type of the service
   */
  const handleEditTable = (tenantId: string, table: any, apiType: 'soap' | 'rest') => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    if (apiType === 'rest') {
      // For REST services, open expand fields dialog
      handleManageExpandFields(tenant, table);
    } else {
      // For SOAP services, just edit the name (no expand fields)
      const newName = prompt(`Edit ${apiType.toUpperCase()} service name:`, table.name);
      if (newName && newName !== table.name) {
        updateTableName(tenantId, table.name, newName, apiType);
      }
    }
  };

  /**
   * Handles deleting a table/service from a tenant
   * @param {string} tenantId - ID of the tenant containing the table
   * @param {any} table - Table object to delete
   * @param {'soap'|'rest'} apiType - API type of the service
   */
  const handleDeleteTable = (tenantId: string, table: any, apiType: 'soap' | 'rest') => {
    const serviceType = apiType.toUpperCase();
    const displayName = getBusinessFriendlyDisplayName(table);
    
    if (window.confirm(`Are you sure you want to delete the ${serviceType} service \"${displayName}\" (${table.name})?\n\nThis action cannot be undone.`)) {
      deleteTableFromTenant(tenantId, table.name);
    }
  };

  /**
   * Updates a table name in the database
   * @param {string} tenantId - ID of the tenant
   * @param {string} oldName - Current table name
   * @param {string} newName - New table name
   * @param {'soap'|'rest'} apiType - API type of the service
   */
  const updateTableName = async (tenantId: string, oldName: string, newName: string, apiType: 'soap' | 'rest') => {
    try {
      const response = await fetch(`/api/remote-databases/${tenantId}/tables/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newName,
          apiType: apiType
        }),
      });
      
      if (response.ok) {
        // Refresh the tenants list to show updated data
        await loadTenants();
        alert('Service name updated successfully!');
      } else {
        alert('Failed to update service name. Please try again.');
      }
    } catch (error) {
      alert('Error updating service name. Please check your connection and try again.');
    }
  };

  /**
   * Deletes a table from a tenant
   * @param {string} tenantId - ID of the tenant
   * @param {string} tableName - Name of the table to delete
   */
  const deleteTableFromTenant = async (tenantId: string, tableName: string) => {
    try {
      const response = await fetch(`/api/remote-databases/${tenantId}/tables/${encodeURIComponent(tableName)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Refresh the tenants list to show updated data
        await loadTenants();
        alert('Service deleted successfully!');
      } else {
        alert('Failed to delete service. Please try again.');
      }
    } catch (error) {
      alert('Error deleting service. Please check your connection and try again.');
    }
  };
  
  /**
   * Converts technical service names to business-friendly display names
   * @param {any} table - The table/service object
   * @returns {string} Business-friendly display name
   */
  /**
   * Handles table selection with navigation logic
   * If on /credentials route, navigate to home page first
   * @param {any} tenant - The tenant object
   * @param {any} table - The table object to select
   */
  const handleTableSelection = (tenant: any, table: any) => {
    // If currently on credentials page, navigate to home first
    if (pathname === '/credentials') {
      router.push('/');
    }
    
    // Then select the table and query
    selectTableAndQuery(tenant, table);
  };

  /**
   * Converts technical service names to business-friendly display names
   * @param {any} table - The table/service object
   * @returns {string} Business-friendly display name
   */
  const getBusinessFriendlyDisplayName = (table: any): string => {
    const serviceName = table.name || table.endpoint;
    
    // Handle REST services with URL paths
    if (serviceName.includes('/')) {
      const parts = serviceName.split('/');
      let entityName = parts[parts.length - 1]; // Last segment (e.g., "Orders")
      
      // Simple approach: remove first 9 characters from service URL segment
      // Handle patterns like "tdapi.slsSalesOrder" or "tcapi.comEmployeeMasterData" 
      if (parts.length >= 3) {
        const serviceSegment = parts[2]; // Third segment: tdapi.slsSalesOrder
        
        // Check for API service definitions with dot notation and sufficient length
        if (serviceSegment.includes('.') && serviceSegment.length > 9) {
          // Remove first 9 characters (e.g., "tdapi.sls" or "tcapi.com")
          const businessContext = serviceSegment.substring(9);
          
          // Convert business context to readable format
          const readableContext = businessContext
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between consecutive capitals
            .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
            .trim();
          
          // Convert entity name to readable format  
          const readableEntity = entityName
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .replace(/^./, (str: string) => str.toUpperCase())
            .trim();
          
          // Just return the business context to avoid duplication
          // "Purchase Order" is more descriptive than "Purchase Order Orders"
          return readableContext || readableEntity;
        }
      }
      
      // Fallback: just format the entity name
      return entityName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .replace(/^./, (str: string) => str.toUpperCase())
        .trim();
    }
    
    // Handle SOAP services - convert technical names using pattern matching
    if (serviceName.includes('_v') || serviceName.includes('_WT')) {
      // Extract the base name before version or suffix
      const baseName = serviceName.replace(/_v\d+$|_WT$/, '');
      
      // Convert camelCase/PascalCase to readable format
      const readable = baseName
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between consecutive capitals
        .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
        .trim();
      
      return readable;
    }
    
    // For any other format, try to make it readable
    return serviceName
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between consecutive capitals
      .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <div className="h-full border-b lg:border-r border-white/20 backdrop-blur-xl flex flex-col" style={{backgroundColor: '#004766'}}>
      <div className="p-3 lg:p-4 border-b border-white/20" style={{backgroundColor: '#004766'}}>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-sm lg:text-base tracking-wide">API and SOAP</h2>
          <span className="text-gray-200 text-xs">Query Platform</span>
        </div>
      </div>

      {/* Tenant List */}
      <div className="flex-1 overflow-auto p-1 lg:p-2 mb-2 lg:mb-0">
        {tenants.length > 0 ? (
          tenants.map((tenant) => (
            <div key={tenant.id} className="mb-1">
              {/* Tenant Header */}
              <div className={`p-2 rounded transition-colors duration-200 group hover:bg-white/10 ${
                selectedTenant?.id === tenant.id ? 'text-white border border-white/30' : 'text-gray-200 hover:text-white'
              }`} style={{
                backgroundColor: selectedTenant?.id === tenant.id ? 'rgba(0, 109, 163, 0.3)' : 'transparent'
              }}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      toggleTenant(tenant.id);
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Server className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">{tenant.name}</span>
                    {(tenant as any).hasMultipleApiTypes && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                        MIXED
                      </span>
                    )}
                    <span className={`text-xs ${getStatusColor(tenant.status)}`}>
                      •
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTenant(tenant);
                      }}
                      className="p-1 hover:bg-white/20 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      title="Edit tenant"
                    >
                      <Edit className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTenant(tenant.id, tenant.name);
                      }}
                      className="p-1 hover:bg-red-500/30 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-200"
                      title="Delete tenant"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTenant(tenant.id);
                      }}
                      className="p-1 hover:bg-white/20 rounded transition-colors duration-200"
                    >
                      {expandedTenants.includes(tenant.id) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* API Type Groups */}
              <AnimatePresence>
                {expandedTenants.includes(tenant.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 border border-white/30 rounded-lg p-2 bg-black/20"
                  >
                    {(() => {
                      // Group services by API type
                      const soapServices = (tenant.tables || []).filter((t: any) => (t.apiType || 'soap') === 'soap');
                      const restServices = (tenant.tables || []).filter((t: any) => t.apiType === 'rest');
                      
                      return (
                        <div className="space-y-1">
                          {/* SOAP Services Group */}
                          {soapServices.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleApiType(tenant.id, 'soap')}
                                className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-slate-700/30 rounded transition-colors duration-200"
                              >
                                {expandedApiTypes.includes(`${tenant.id}-soap`) ? (
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                )}
                                <Code2 className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-green-300">SOAP Services</span>
                                <span className="text-xs text-slate-400">({soapServices.length})</span>
                              </button>
                              
                              <AnimatePresence>
                                {expandedApiTypes.includes(`${tenant.id}-soap`) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="ml-6 space-y-0.5"
                                  >
                                    {soapServices.map((table: any) => (
                                      <div key={`${tenant.id}-soap-${table.name}`} className="group relative">
                                        <div
                                          onClick={() => handleTableSelection(tenant, table)}
                                          className={`w-full text-left p-2 rounded transition-colors duration-200 text-xs hover:bg-slate-700/50 hover:text-white flex items-center gap-2 cursor-pointer ${
                                            selectedTable?.name === table.name && selectedTenant?.id === tenant.id ? 'bg-blue-500/30 text-white border border-blue-500/50' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                          }`}
                                        >
                                          <Table className="w-3 h-3" />
                                          <span className="text-sm font-medium flex-1 text-left text-white">{getBusinessFriendlyDisplayName(table)}</span>
                                          
                                          {/* Action buttons - show on hover */}
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditTable(tenant.id, table, 'soap');
                                              }}
                                              className="p-1 hover:bg-blue-600/50 rounded transition-colors duration-200 text-blue-400 hover:text-blue-300"
                                              title={`Edit service name: ${table.name}`}
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTable(tenant.id, table, 'soap');
                                              }}
                                              className="p-1 hover:bg-red-600/50 rounded transition-colors duration-200 text-red-400 hover:text-red-300"
                                              title={`Delete ${table.name}`}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                          
                          {/* REST Services Group - Always show */}
                          <div>
                            <button
                              onClick={() => toggleApiType(tenant.id, 'rest')}
                              className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-slate-700/30 rounded transition-colors duration-200"
                            >
                              {expandedApiTypes.includes(`${tenant.id}-rest`) ? (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                              )}
                              <Database className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-blue-300">REST Services</span>
                              <span className="text-xs text-slate-400">({restServices.length})</span>
                            </button>
                            
                            <AnimatePresence>
                              {expandedApiTypes.includes(`${tenant.id}-rest`) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="ml-6 space-y-0.5"
                                >
                                  {restServices.length > 0 ? (
                                    restServices.map((table: any) => (
                                      <div key={`${tenant.id}-rest-${table.name}`} className="group relative">
                                        <div
                                          onClick={() => handleTableSelection(tenant, table)}
                                          className={`w-full text-left p-2 rounded transition-colors duration-200 text-xs hover:bg-slate-700/50 hover:text-white flex items-center gap-2 cursor-pointer ${
                                            selectedTable?.name === table.name && selectedTenant?.id === tenant.id ? 'bg-blue-500/30 text-white border border-blue-500/50' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                          }`}
                                        >
                                          <Table className="w-3 h-3" />
                                          <span className="text-sm font-medium flex-1 text-left text-white">{getBusinessFriendlyDisplayName(table)}</span>
                                          
                                          {/* Action buttons - show on hover */}
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditTable(tenant.id, table, 'rest');
                                              }}
                                              className="p-1 hover:bg-blue-600/50 rounded transition-colors duration-200 text-blue-400 hover:text-blue-300"
                                              title={`Edit expand fields for ${table.name}`}
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTable(tenant.id, table, 'rest');
                                              }}
                                              className="p-1 hover:bg-red-600/50 rounded transition-colors duration-200 text-red-400 hover:text-red-300"
                                              title={`Delete ${table.name}`}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-2 text-xs text-slate-400 text-center">
                                      <div className="mb-2">No REST services configured yet</div>
                                      <button
                                        onClick={() => {
                                          setMode('remote');
                                          setShowAddDialog(true);
                                        }}
                                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                                      >
                                        + Add REST API Service
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          {/* No SOAP services message */}
                          {soapServices.length === 0 && (
                            <div className="text-xs text-slate-400 py-2 text-center">
                              <div className="mb-2">No SOAP services configured yet</div>
                              <button
                                onClick={() => {
                                  setMode('remote');
                                  setShowAddDialog(true);
                                }}
                                className="text-xs text-green-400 hover:text-green-300 underline"
                              >
                                + Add SOAP API Service
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-white mb-4">No remote tenants available</p>
            <Button
              onClick={onAddDatabase || (() => {
                setMode('remote');
                setShowAddDialog(true);
              })}
              className="mt-3 border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Remote Database
            </Button>
          </div>
        )}
      </div>

      {/* Add Database Button */}
      {tenants.length > 0 && (
        <div className="p-2 lg:p-3 border-t border-slate-600/50">
          <Button
            onClick={onAddDatabase || (() => setShowAddDialog(true))}
            className="w-full bg-green-600/20 text-green-400 hover:bg-green-500/30 hover:text-white border border-green-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm">Add New Remote Database</span>
          </Button>
        </div>
      )}

      {/* Edit Database Dialog */}
      <EditDatabaseDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        onSuccess={handleEditDialogSuccess}
        database={editingTenant}
      />

      {/* Table Expand Fields Dialog */}
      <TableExpandFieldsDialog
        open={expandFieldsDialogOpen}
        onClose={handleExpandFieldsDialogClose}
        onSuccess={handleExpandFieldsDialogSuccess}
        databaseId={editingDatabaseId}
        table={editingTable}
      />
    </div>
  );
}
