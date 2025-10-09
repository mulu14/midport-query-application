/**
 * @fileoverview Main Query Platform Page Component
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState } from 'react';
import QueryEditor from '@/components/query/QueryEditor';
import QueryResults from '@/components/query/QueryResults';
import AddDatabaseDialog from '@/components/query/AddDatabaseDialog';
import SchemaViewer from '@/components/SchemaViewer';
import { useDatabase } from '@/lib/DatabaseContext';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';
import { TableSchema, SchemaExtractor } from '@/lib/utils/SchemaExtractor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Table, Code } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'query' | 'schema'>('query');
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string>('');

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

  // Automatically extract schema from query results
  React.useEffect(() => {
    if (mode === 'remote' && results && results.length > 0) {
      // Check if the latest result has schema information (already extracted by RemoteAPIManager)
      const latestResult = results[results.length - 1];
      if (latestResult && 'schema' in latestResult && latestResult.schema) {
        setSchema(latestResult.schema as TableSchema);
        setSchemaError('');
      }
    }
  }, [results, mode]);

  const handleRefreshSchema = () => {
    // Schema is automatically extracted by RemoteAPIManager, so just re-execute the query
    if (executeQuery) {
      executeQuery();
    }
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
          {mode === 'remote' ? 'Remote API Query Platform' : 'SQL Query Platform'}
        </h1>
        <div className="w-16 sm:w-20 h-1 bg-white/80 rounded-full"></div>
        <p className="text-gray-200 mt-2 lg:mt-4 text-sm sm:text-base lg:text-lg">
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

      {/* Tabbed Interface for Query Results and Schema */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'query' | 'schema')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Query Results
            {results && results.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {results.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Table Schema
            {schema && (
              <Badge variant="secondary" className="ml-1">
                {schema.totalFields} fields
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="mt-4">
          <QueryResults
            results={results || []}
            error={error || ''}
            isExecuting={isExecuting}
          />

          {/* Schema info notification */}
          {mode === 'remote' && results && results.length > 0 && schema && (
            <Card className="mt-4 border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Schema metadata extracted automatically - view details in the Schema tab
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab('schema')}
                    className="ml-auto text-green-800 border-green-300 hover:bg-green-100"
                  >
                    View Schema
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          {mode === 'remote' && selectedTenant ? (
            <SchemaViewer
              tenantId={selectedTenant.id}
              serviceName={schema?.tableName || 'UnknownService'}
              schema={schema || undefined}
              loading={schemaLoading}
              error={schemaError}
              onRefresh={handleRefreshSchema}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Schema Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Schema Analysis Unavailable
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Schema extraction is only available in Remote API mode with a selected tenant.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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