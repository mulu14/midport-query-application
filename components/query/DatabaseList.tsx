/**
 * @fileoverview Database List Component for Local Database Management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState } from 'react';
import { Database, Table, ChevronDown, ChevronRight, Plus, Server, Edit, Trash2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/lib/DatabaseContext';

/**
 * Interface for table data structure
 * @interface TableData
 */
interface TableData {
  /** Name of the table */
  name: string;
  /** Optional record count for the table */
  record_count?: number;
}

/**
 * Props interface for DatabaseList component
 * @interface DatabaseListProps
 */
interface DatabaseListProps {
  /** Optional array of databases to display */
  databases?: any[];
  /** Currently selected database */
  selectedDatabase?: any;
  /** Currently selected table */
  selectedTable?: any;
  /** Function to call when a database is selected */
  onSelectDatabase?: (db: any) => void;
  /** Function to call when a table is selected */
  onSelectTable?: (db: any, table: any) => void;
  /** Function to call when add database button is clicked */
  onAddDatabase?: () => void;
  /** Function to select table and generate query */
  selectTableAndQuery?: (db: any, table: any) => void;
  /** Function to update database information */
  updateDatabase?: (id: string, data: Partial<any>) => Promise<any>;
  /** Function to delete a database */
  deleteDatabase?: (id: string) => Promise<boolean>;
}

/**
 * Database List component for displaying and managing local databases
 * Shows expandable list of databases with their tables
 * Provides CRUD operations for databases and table selection
 * Supports both context-based and props-based usage
 * @component DatabaseList
 * @param {DatabaseListProps} [props] - Optional props for component customization
 * @returns {JSX.Element} Database list interface with expandable database items
 */
export default function DatabaseList(props?: DatabaseListProps) {
  // Use context if no props provided, otherwise use props (for backward compatibility)
  const context = useDatabase();
  
  const databases = props?.databases ?? context.databases;
  const selectedDatabase = props?.selectedDatabase ?? context.selectedDatabase;
  const selectedTable = props?.selectedTable ?? context.selectedTable;
  const onSelectDatabase = props?.onSelectDatabase ?? context.setSelectedDatabase;
  const onSelectTable = props?.onSelectTable ?? context.setSelectedTable;
  const selectTableAndQuery = props?.selectTableAndQuery ?? context.selectTableAndQuery;
  const onAddDatabase = props?.onAddDatabase ?? (() => context.setShowAddDialog(true));
  const updateDatabase = props?.updateDatabase ?? context.updateDatabase;
  const deleteDatabase = props?.deleteDatabase ?? context.deleteDatabase;

  const [expandedDatabases, setExpandedDatabases] = useState<string[]>([]);

  /**
   * Toggles the expanded/collapsed state of a database in the list
   * @function toggleDatabase
   * @param {string} dbId - Database ID to toggle
   * 
   * @description
   * Manages the expansion state of database items to show/hide their tables.
   * If the database is currently expanded, it collapses it. If collapsed, it expands it.
   */
  const toggleDatabase = (dbId: string) => {
    setExpandedDatabases(prev => 
      prev.includes(dbId) 
        ? prev.filter(id => id !== dbId)
        : [...prev, dbId]
    );
  };

  /**
   * Returns the appropriate CSS color class for database connection status
   * @function getStatusColor
   * @param {string} status - Database connection status
   * @returns {string} CSS class name for the status color
   * 
   * @description
   * Maps database connection status to appropriate Tailwind CSS color classes
   * for visual status indication in the UI.
   */
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'connected': return 'text-blue-400';
      case 'disconnected': return 'text-slate-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  /**
   * Handles the add database button click event
   * @function handleAddDatabase
   * 
   * @description
   * Triggers the add database functionality, either through props callback
   * or by showing the add database dialog via context.
   */
  const handleAddDatabase = () => {
    onAddDatabase();
  };

  /**
   * Handles database deletion with user confirmation
   * @async
   * @function handleDeleteDatabase
   * @param {string} dbId - Database ID to delete
   * @param {string} dbName - Database name for confirmation dialog
   * 
   * @description
   * Prompts user for confirmation before deleting a database.
   * Shows success/error feedback and refreshes the database list.
   */
  const handleDeleteDatabase = async (dbId: string, dbName: string) => {
    if (window.confirm(`Are you sure you want to delete the database \"${dbName}\"? This action cannot be undone.`)) {
      try {
        await deleteDatabase(dbId);
      } catch (error) {
        alert('Failed to delete database. Please try again.');
      }
    }
  };

  /**
   * Handles database edit button click
   * @function handleEditDatabase
   * @param {any} db - Database object to edit
   * 
   * @description
   * Currently shows a placeholder alert. In future implementations,
   * this would open an edit dialog for modifying database settings.
   * 
   * @todo Implement actual database editing functionality
   */
  const handleEditDatabase = (db: any) => {
    // For now, just show an alert. In a real implementation, this would open an edit dialog
    alert(`Edit functionality for \"${db.name}\" will be implemented in a future update.`);
  };

  return (
    <div className="h-full bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-b lg:border-r border-slate-600/50 backdrop-blur-xl flex flex-col">
      <div className="p-3 lg:p-4 border-b border-slate-600/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-white text-sm lg:text-base tracking-wide">MIDPORT</h2>
          <span className="text-[#8bb3cc] text-xs">Query Platform</span>
        </div>
      </div>

      {/* Database List */}
      <div className="flex-1 overflow-auto p-1 lg:p-2 mb-2 lg:mb-0">
        {databases.length > 0 ? (
          databases.map((db) => (
            <div key={db.id} className="mb-1">
              {/* Database Header */}
              <div className={`p-2 rounded transition-colors duration-200 group ${
                selectedDatabase?.id === db.id ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      onSelectDatabase(db);
                      toggleDatabase(db.id);
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">{db.name}</span>
                    {db.status && (
                      <span className={`text-xs ${getStatusColor(db.status)}`}>
                        •
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDatabase(db);
                      }}
                      className="p-1 hover:bg-slate-600/50 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      title="Edit database"
                    >
                      <Edit className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDatabase(db.id, db.name);
                      }}
                      className="p-1 hover:bg-red-600/50 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      title="Delete database"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDatabase(db.id);
                      }}
                      className="p-1 hover:bg-slate-600/50 rounded transition-colors duration-200"
                    >
                      {expandedDatabases.includes(db.id) ? (
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
                {expandedDatabases.includes(db.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-4 space-y-1 border-l border-slate-600/30 pl-3"
                  >
                    {db.tables && db.tables.length > 0 ? (
                      db.tables.map((table: TableData, idx: number) => (
                        <button
                          key={`${db.id}-${table.name}`}
                          onClick={() => selectTableAndQuery(db, table)}
                          className={`w-full text-left p-2 rounded transition-colors duration-200 text-xs hover:bg-slate-700/50 hover:text-white flex items-center gap-2 group ${
                            selectedTable?.name === table.name && selectedDatabase?.id === db.id ? 'bg-blue-500/30 text-white border border-blue-500/50' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          <Table className="w-3 h-3" />
                          <span className="text-sm font-medium flex-1 text-left text-white">{table.name}</span>
                          {table.record_count && (
                            <span className="text-xs text-slate-300">
                              {table.record_count.toLocaleString()}
                            </span>
                          )}
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
            <Database className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-white mb-4">No databases connected</p>
            <Button
              onClick={onAddDatabase}
              className="mt-3 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Database
            </Button>
          </div>
        )}
      </div>

      {/* Add Database Button */}
      {databases.length > 0 && (
        <div className="p-2 lg:p-3 border-t border-slate-600/50">
            <Button
              onClick={handleAddDatabase}
              className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-500/30 hover:text-white border border-blue-500/30"
            >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm">Add New Database</span>
          </Button>
        </div>
      )}
    </div>
  );
}