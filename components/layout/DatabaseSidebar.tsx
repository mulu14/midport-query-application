/**
 * @fileoverview Database Sidebar Component for Navigation Between Local and Remote Databases
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';
import { Database, Globe, ToggleLeft, ToggleRight } from 'lucide-react';
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

  return (
    <div className="h-full flex flex-col">
  
      <div className="flex-1">
    
         <RemoteAPIDatabaseList />
      </div>
    </div>
  );
}
