/**
 * @fileoverview Database Sidebar Component for Navigation Between Local and Remote Databases
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';
import { Database, Globe, ToggleLeft, ToggleRight } from 'lucide-react';
import DatabaseList from '@/components/query/DatabaseList';
import RemoteAPIDatabaseList from '@/components/query/RemoteAPIDatabaseList';
import { Button } from '@/components/ui/button';
import { useSidebarMode } from '@/lib/SidebarModeContext';

/**
 * Database Sidebar component that provides navigation between local and remote databases
 * Features a mode toggle to switch between local SQLite databases and remote API databases
 * Conditionally renders the appropriate database list component based on current mode
 * @component DatabaseSidebar
 * @returns {JSX.Element} Sidebar component with mode toggle and database lists
 */
export function DatabaseSidebar() {
  const { mode, setMode } = useSidebarMode();

  return (
    <div className="h-full flex flex-col">
      {/* Mode Toggle Header */}
      <div className="p-2 border-b border-slate-600/50 bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'local' ? (
            <Database className="w-4 h-4 text-blue-400" />
          ) : (
            <Globe className="w-4 h-4 text-green-400" />
          )}
          <span className="text-xs text-slate-300 font-medium">
            {mode === 'local' ? 'LOCAL DATABASES' : 'REMOTE API'}
          </span>
        </div>

        <Button
          onClick={() => setMode(mode === 'local' ? 'remote' : 'local')}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
          title={`Switch to ${mode === 'local' ? 'Remote API' : 'Local Databases'}`}
        >
          {mode === 'local' ? (
            <ToggleLeft className="w-4 h-4" />
          ) : (
            <ToggleRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Database List Content */}
      <div className="flex-1">
        {mode === 'local' ? (
          <DatabaseList />
        ) : (
          <RemoteAPIDatabaseList />
        )}
      </div>
    </div>
  );
}
