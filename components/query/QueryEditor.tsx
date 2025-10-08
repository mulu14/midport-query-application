/**
 * @fileoverview SQL Query Editor Component for Database Query Interface
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import React from 'react';
import { Play, Code, Database, Table, Globe, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/lib/DatabaseContext';
import { useRemoteAPI } from '@/lib/RemoteAPIContext';

/**
 * Props interface for QueryEditor component
 * @interface QueryEditorProps
 */
interface QueryEditorProps {
  /** Current SQL query string */
  query: string;
  /** Function to handle query changes */
  onChange: (query: string) => void;
  /** Function to execute the query */
  onExecute: () => void;
  /** Whether a query is currently executing */
  isExecuting: boolean;
}

/**
 * SQL Query Editor component for writing and executing database queries
 * Provides a textarea for SQL input with database and table context information
 * Includes a run button that is disabled when no database/table is selected
 * @component QueryEditor
 * @param {QueryEditorProps} props - Component props
 * @returns {JSX.Element} Query editor interface with SQL input and execution controls
 */
export default function QueryEditor({ query, onChange, onExecute, isExecuting }: QueryEditorProps) {
  const { selectedDatabase, selectedTable } = useDatabase();
  const { selectedTenant, selectedTable: remoteSelectedTable } = useRemoteAPI();
  
  // Determine if we're in remote API mode and what type
  const isRemoteAPI = selectedTenant && remoteSelectedTable;
  const apiType = isRemoteAPI ? (remoteSelectedTable as any)?.apiType || 'soap' : null;
  const currentDatabase = isRemoteAPI ? selectedTenant : selectedDatabase;
  const currentTable = isRemoteAPI ? remoteSelectedTable : selectedTable;

  return (
    <div className="bg-[#2a6b83] border border-[#1a5f7a] rounded-lg shadow-lg backdrop-blur-sm">
      {/* Header with database info */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[#1a5f7a] bg-[#1a5f7a]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">SQL Query Editor</span>
              {isRemoteAPI && (
                <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border">
                  {apiType === 'rest' ? (
                    <>
                      <Globe className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300">REST API</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3 h-3 text-green-400" />
                      <span className="text-green-300">SOAP API</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={onExecute}
              disabled={isExecuting || !query.trim() || !currentDatabase || !currentTable}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-500"
              size="sm"
            >
              <Play className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{isExecuting ? 'Executing...' : 'Run Query'}</span>
              <span className="sm:hidden">{isExecuting ? 'Running...' : 'Run'}</span>
            </Button>
          </div>

          {/* Database and Table selection info */}
          <div className="flex flex-wrap gap-2 text-xs">
            {currentDatabase ? (
              <div className="flex items-center gap-1 text-green-400">
                <Database className="w-3 h-3" />
                <span>{currentDatabase.name}</span>
                {isRemoteAPI && (
                  <span className="text-slate-400">({selectedTenant?.tables?.length || 0} services)</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400">
                <Database className="w-3 h-3" />
                <span>No {isRemoteAPI ? 'tenant' : 'database'} selected</span>
              </div>
            )}

            {currentTable ? (
              <div className="flex items-center gap-1 text-blue-400">
                <Table className="w-3 h-3" />
                <span>{currentTable.name}</span>
                {isRemoteAPI && apiType && (
                  <span className={`text-xs px-1 rounded ${
                    apiType === 'rest' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                  }`}>
                    {apiType.toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400">
                <Table className="w-3 h-3" />
                <span>No {isRemoteAPI ? 'service' : 'table'} selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-3 sm:p-4">
        <textarea
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your SQL query here...\n\nExample: SELECT * FROM TableName WHERE condition;"
          className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 bg-[#0f3d4f] border border-[#1a5f7a] rounded-lg font-mono text-sm text-white placeholder:text-[#8bb3cc] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          spellCheck={false}
        />
        <p className="mt-1 sm:mt-2 text-xs text-[#9bc5d4]">
          Edit the SQL Statement, and click "Run" to see the result.
        </p>
      </div>
    </div>
  );
}