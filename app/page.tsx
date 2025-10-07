/**
 * @fileoverview Main Query Platform Page Component
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';
import QueryEditor from '@/components/query/QueryEditor';
import QueryResults from '@/components/query/QueryResults';
import AddDatabaseDialog from '@/components/query/AddDatabaseDialog';
import { useDatabase } from '@/lib/DatabaseContext';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';

import { useSidebarMode } from '@/lib/SidebarModeContext';

/**
 * Main Query Platform component that serves as the primary interface
 * Integrates local database and remote API functionality with mode switching
 * Provides unified query interface that adapts based on selected mode (local/remote)
 * @component QueryPlatform
 * @returns {JSX.Element} Main application interface with query editor and results
 */
export default function QueryPlatform() {
  const { mode } = useSidebarMode();

  const localDB = useDatabase();
  const remoteAPI = useRemoteAPI();

  // Handle mode-specific properties
  const selectedDb = mode === 'local' ? localDB.selectedDatabase : null;
  const selectedTenant = mode === 'remote' ? remoteAPI.selectedTenant : null;

  const query = mode === 'remote' ? remoteAPI.query : localDB.query;
  const setQuery = mode === 'remote' ? remoteAPI.setQuery : localDB.setQuery;
  const executeQuery = mode === 'remote' ? remoteAPI.executeQuery : localDB.executeQuery;
  const isExecuting = mode === 'remote' ? remoteAPI.isExecuting : localDB.isExecuting;
  const results = mode === 'remote' ? remoteAPI.results : localDB.results;
  const error = mode === 'remote' ? remoteAPI.error : localDB.error;

  // Mode-specific properties
  const showAddDialog = mode === 'remote' ? remoteAPI.showAddDialog : localDB.showAddDialog;
  const setShowAddDialog = mode === 'remote' ? remoteAPI.setShowAddDialog : localDB.setShowAddDialog;
  const refreshDatabases = mode === 'remote' ? remoteAPI.loadTenants : localDB.refreshDatabases;

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
          {mode === 'remote' ? 'Remote API Query Platform' : 'SQL Query Platform'}
        </h1>
        <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
        <p className="text-slate-300 mt-2 lg:mt-4 text-sm sm:text-base lg:text-lg">
          {mode === 'remote' ? (
            selectedTenant
              ? `Connected to: ${selectedTenant.name} (${selectedTenant.status})`
              : 'Select a tenant and table to begin querying'
          ) : (
            selectedDb
              ? `Connected to: ${selectedDb.name} (${selectedDb.type})`
              : 'Select a database and table to begin querying'
          )}
        </p>
      </div>

      <QueryEditor
        query={query}
        onChange={setQuery}
        onExecute={executeQuery}
        isExecuting={isExecuting}
      />

      <QueryResults
        results={results || []}
        error={error || ''}
        isExecuting={isExecuting}
      />

      {/* Add Database Dialog */}
      {showAddDialog && (
        <AddDatabaseDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            refreshDatabases();
          }}
        />
      )}
    </div>
  );
}