/**
 * @fileoverview Query Results Component for Displaying Database Query Results
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date December 2024
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Props interface for QueryResults component
 * @interface QueryResultsProps
 */
interface QueryResultsProps {
  /** Array of query results to display */
  results: any[];
  /** Error message if query failed */
  error: string;
  /** Whether a query is currently executing */
  isExecuting: boolean;
}

/**
 * Query Results component for displaying database query results
 * Shows loading state, error messages, or tabular results
 * Handles both local database and remote API query results
 * @component QueryResults
 * @param {QueryResultsProps} props - Component props
 * @returns {JSX.Element} Results display with loading, error, or data table
 */
export default function QueryResults({ results, error, isExecuting }: QueryResultsProps) {
  if (isExecuting) {
    return (
      <div className="bg-[#2a6b83] border border-[#1a5f7a] rounded-lg shadow-lg p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-white">Executing query...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a5f7a] border border-red-500/50 rounded-lg shadow-lg p-6 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Error</h3>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="bg-[#2a6b83] border border-[#1a5f7a] rounded-lg shadow-lg p-8 backdrop-blur-sm">
        <div className="text-center text-[#9bc5d4]">
          <p>No results to display. Run a query to see results.</p>
        </div>
      </div>
    );
  }

  const columns = Object.keys(results[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2a6b83] border border-[#1a5f7a] rounded-lg shadow-lg backdrop-blur-sm"
    >
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[#1a5f7a] bg-[#1a5f7a]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Result:</span>
          </div>
          <span className="text-xs sm:text-sm text-[#9bc5d4]">
            Records: {results.length}
          </span>
        </div>
      </div>
      
      <div className="overflow-auto max-h-48 sm:max-h-64 lg:max-h-96">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1a5f7a] hover:bg-[#1a5f7a]">
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold text-white whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-[#2a6b83]">
                {columns.map((col) => (
                  <TableCell key={col} className="text-white whitespace-nowrap bg-[#2a6b83]">
                    {row[col]?.toString() || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}