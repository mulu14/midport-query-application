/**
 * @fileoverview Remote API Database List Component for Remote Database Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

'use client';

import React, { useState } from 'react';
import { Table, ChevronDown, ChevronRight, Globe, Server, Plus, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';
import { useSidebarMode } from '@/lib/SidebarModeContext';

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
  const {
    tenants,
    selectedTenant,
    selectedTable,
    selectTableAndQuery,
    setShowAddDialog,
    updateTenant,
    deleteTenant
  } = useRemoteAPI();
  
  const { setMode } = useSidebarMode();

  const [expandedTenants, setExpandedTenants] = useState<string[]>([]);

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
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
    if (window.confirm(`Are you sure you want to delete the tenant "${tenantName}"? This action cannot be undone.`)) {
      try {
        await deleteTenant(tenantId);
        console.log('✅ Tenant deleted successfully:', tenantName);
      } catch (error) {
        console.error('❌ Error deleting tenant:', error);
        alert('Failed to delete tenant. Please try again.');
      }
    }
  };

  const handleEditTenant = (tenant: any) => {
    // For now, just show an alert. In a real implementation, this would open an edit dialog
    alert(`Edit functionality for "${tenant.name}" will be implemented in a future update.`);
  };

  return (
    <div className="h-full bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-b lg:border-r border-slate-600/50 backdrop-blur-xl flex flex-col">
      <div className="p-3 lg:p-4 border-b border-slate-600/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white text-sm lg:text-base tracking-wide">REMOTE API</h2>
          <span className="text-[#8bb3cc] text-xs">Query Platform</span>
        </div>
      </div>

      {/* Tenant List */}
      <div className="flex-1 overflow-auto p-1 lg:p-2 mb-2 lg:mb-0">
        {tenants.length > 0 ? (
          tenants.map((tenant) => (
            <div key={tenant.id} className="mb-1">
              {/* Tenant Header */}
              <div className={`p-2 rounded transition-colors duration-200 group ${
                selectedTenant?.id === tenant.id ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      toggleTenant(tenant.id);
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Server className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">{tenant.name}</span>
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
                      className="p-1 hover:bg-slate-600/50 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      title="Edit tenant"
                    >
                      <Edit className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTenant(tenant.id, tenant.name);
                      }}
                      className="p-1 hover:bg-red-600/50 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      title="Delete tenant"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTenant(tenant.id);
                      }}
                      className="p-1 hover:bg-slate-600/50 rounded transition-colors duration-200"
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

              {/* Tables */}
              <AnimatePresence>
                {expandedTenants.includes(tenant.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-4 space-y-1 border-l border-slate-600/30 pl-3"
                  >
                    {tenant.tables && tenant.tables.length > 0 ? (
                      tenant.tables.map((table) => (
                        <button
                          key={`${tenant.id}-${table.name}`}
                          onClick={() => selectTableAndQuery(tenant, table)}
                          className={`w-full text-left p-2 rounded transition-colors duration-200 text-xs hover:bg-slate-700/50 hover:text-white flex items-center gap-2 group ${
                            selectedTable?.name === table.name && selectedTenant?.id === tenant.id ? 'bg-blue-500/30 text-white border border-blue-500/50' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          <Table className="w-3 h-3" />
                          <span className="text-sm font-medium flex-1 text-left text-white">{table.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-2">
                        No tables found
                      </div>
                    )}
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
    </div>
  );
}
