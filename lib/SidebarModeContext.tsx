/**
 * @fileoverview Sidebar Mode Context Provider for Navigation Mode Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Type definition for sidebar navigation modes
 * @typedef {'local' | 'remote'} SidebarMode
 */
type SidebarMode = 'local' | 'remote';

/**
 * Context interface for Sidebar Mode functionality
 * Provides state management for switching between local and remote database modes
 * @interface SidebarModeContextType
 */
interface SidebarModeContextType {
  /** Current sidebar mode (local or remote) */
  mode: SidebarMode;
  /** Function to change the sidebar mode */
  setMode: (mode: SidebarMode) => void;
}

/**
 * React Context for Sidebar Mode state management
 * @constant SidebarModeContext
 */
const SidebarModeContext = createContext<SidebarModeContextType | undefined>(undefined);

/**
 * Sidebar Mode Provider component that manages navigation mode state
 * Provides context to child components for switching between local and remote database views
 * @component SidebarModeProvider
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with context
 * @returns {JSX.Element} Provider component with context value
 */
export function SidebarModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<SidebarMode>('local');

  const value: SidebarModeContextType = {
    mode,
    setMode
  };

  return (
    <SidebarModeContext.Provider value={value}>
      {children}
    </SidebarModeContext.Provider>
  );
}

/**
 * Custom hook to access Sidebar Mode context
 * Must be used within a SidebarModeProvider component
 * @function useSidebarMode
 * @returns {SidebarModeContextType} The Sidebar Mode context value
 * @throws {Error} If used outside of SidebarModeProvider
 */
export function useSidebarMode() {
  const context = useContext(SidebarModeContext);
  if (context === undefined) {
    throw new Error('useSidebarMode must be used within a SidebarModeProvider');
  }
  return context;
}
