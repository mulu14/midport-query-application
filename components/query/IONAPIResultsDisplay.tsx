/**
 * @fileoverview ION API Results Display Component
 * @author Mulugeta Forsido
 * @company Midport Scandinavia  
 * @date October 2025
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, FileText, AlertCircle, CheckCircle, Info, Copy, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Props interface for IONAPIResultsDisplay component
 * @interface IONAPIResultsDisplayProps
 */
interface IONAPIResultsDisplayProps {
  /** The result data from ION API */
  result: {
    success: boolean;
    url: string;
    action: string;
    status: number;
    statusText: string;
    data?: {
      success: boolean;
      serviceType: string;
      recordCount: number;
      records: any[];
      summary: string;
      error?: boolean;
      message?: string;
      type?: string;
      rawResponse?: string;
    };
    rawResponse?: string;
    note: string;
  };
}

/**
 * ION API Results Display component for showing parsed SOAP response data
 * Displays structured data from ION API services in a user-friendly table format
 * Supports collapsible sections, raw XML viewing, and error handling
 * @component IONAPIResultsDisplay
 * @param {IONAPIResultsDisplayProps} props - Component props
 * @returns {JSX.Element} Results display interface with data tables and metadata
 */
export default function IONAPIResultsDisplay({ result }: IONAPIResultsDisplayProps) {
  const [showRawXML, setShowRawXML] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<number[]>([]);
  const [expandedArrays, setExpandedArrays] = useState<string[]>([]);
  
  // 🔍 DEBUG: Log what data we're receiving
  console.log('🎨 ION DISPLAY COMPONENT RECEIVED:', {
    success: result.success,
    hasData: !!result.data,
    recordCount: result.data?.recordCount || 0,
    firstRecordKeys: result.data?.records?.[0] ? Object.keys(result.data.records[0]) : 'No records',
    hasLineRefs: result.data?.records?.[0] ? 'LineRefs' in result.data.records[0] : 'No first record',
    lineRefsType: result.data?.records?.[0]?.LineRefs ? typeof result.data.records[0].LineRefs : 'Not found',
    lineRefsLength: Array.isArray(result.data?.records?.[0]?.LineRefs) ? result.data.records[0].LineRefs.length : 'Not array',
    hasSoldToBPRef: result.data?.records?.[0] ? 'SoldToBPRef' in result.data.records[0] : 'No first record'
  });
  // Enhanced function to render values while preserving structure and showing key nested data
  const renderComplexValue = (value: any, fieldName?: string, recordIndex?: number): React.ReactNode => {
    // Create unique identifier for arrays to track expand/collapse state
    const arrayId = `${recordIndex ?? 'root'}-${fieldName ?? 'unknown'}`;
    if (value === null || value === undefined) {
      return <span className="text-slate-500 italic">null</span>;
    }

    // Debug log to see what we're rendering
    if (fieldName === 'LineRefs' || fieldName === 'SoldToBPRef') {
      console.log(`🎨 RENDERING ${fieldName}:`, typeof value, Array.isArray(value), value);
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedArrays.includes(arrayId);
      
      return (
        <div className="space-y-1">
          <button
            onClick={() => toggleArray(arrayId)}
            className="flex items-center gap-2 text-blue-400 font-semibold hover:text-blue-300 transition-colors duration-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Array ({value.length} items)</span>
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2">
                  {value.map((item, index) => (
                    <div key={index} className="ml-4 text-xs bg-slate-700/40 p-3 rounded border border-slate-600/30">
                      <div className="text-blue-300 font-semibold mb-2">Item {index + 1}:</div>
                      {typeof item === 'object' && item ? (
                        <div className="space-y-1">
                          {Object.entries(item).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center py-1">
                              <span className="text-slate-400 font-medium min-w-0 flex-shrink-0 mr-2">{key}:</span>
                              <span className="text-white font-mono text-right min-w-0 flex-1 truncate">
                                {val === null ? (
                                  <span className="text-slate-500 italic">null</span>
                                ) : val === undefined ? (
                                  <span className="text-slate-500 italic">undefined</span>
                                ) : Array.isArray(val) ? (
                                  <span className="text-orange-400">[{val.length} items]</span>
                                ) : typeof val === 'object' ? (
                                  <span className="text-green-400">{'{' + Object.keys(val).length + ' fields}'}</span>
                                ) : typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ? (
                                  <span className="text-yellow-400">{new Date(val).toLocaleString()}</span>
                                ) : typeof val === 'number' ? (
                                  <span className="text-cyan-400">{val.toLocaleString()}</span>
                                ) : typeof val === 'boolean' ? (
                                  <span className={val ? 'text-green-400' : 'text-red-400'}>{String(val)}</span>
                                ) : (
                                  String(val)
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-white">{String(item)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      const keyCount = Object.keys(value).length;
      
      return (
        <div className="space-y-1">
          <span className="text-green-400 font-semibold">Object ({keyCount} fields)</span>
          <div className="ml-4 text-xs bg-slate-700/40 p-3 rounded border border-slate-600/30">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium min-w-0 flex-shrink-0 mr-2">{key}:</span>
                <span className="text-white font-mono text-right min-w-0 flex-1 truncate">
                  {val === null ? (
                    <span className="text-slate-500 italic">null</span>
                  ) : val === undefined ? (
                    <span className="text-slate-500 italic">undefined</span>
                  ) : Array.isArray(val) ? (
                    <span className="text-orange-400">[{val.length} items]</span>
                  ) : typeof val === 'object' ? (
                    <span className="text-green-400">{'{' + Object.keys(val).length + ' fields}'}</span>
                  ) : typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ? (
                    <span className="text-yellow-400">{new Date(val).toLocaleString()}</span>
                  ) : typeof val === 'number' ? (
                    <span className="text-cyan-400">{val.toLocaleString()}</span>
                  ) : typeof val === 'boolean' ? (
                    <span className={val ? 'text-green-400' : 'text-red-400'}>{String(val)}</span>
                  ) : (
                    String(val)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // For primitive values, return as string with appropriate styling
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return <span className="text-yellow-400 font-mono">{value}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-cyan-400 font-mono">{String(value)}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={`font-mono ${value ? 'text-green-400' : 'text-red-400'}`}>{String(value)}</span>;
    }
    
    return String(value);
  };

  const toggleRecord = (index: number) => {
    setExpandedRecords(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleArray = (arrayId: string) => {
    setExpandedArrays(prev =>
      prev.includes(arrayId)
        ? prev.filter(id => id !== arrayId)
        : [...prev, arrayId]
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      // Silently handle clipboard errors
    }
  };

  const getStatusIcon = () => {
    if (result.data?.error) {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    if (result.success && result.data?.success) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  const getStatusColor = () => {
    if (result.data?.error) return 'text-red-400';
    if (result.success && result.data?.success) return 'text-green-400';
    return 'text-blue-400';
  };

  return (
    <div className="space-y-4">
      {/* Result Header */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          {getStatusIcon()}
          <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
            ION API Response - {result.data?.serviceType || 'Unknown Service'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Action:</span>
            <span className="text-white ml-2 font-mono">{result.action}</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>
            <span className="text-white ml-2">{result.status} {result.statusText}</span>
          </div>
          <div>
            <span className="text-slate-400">Records:</span>
            <span className="text-white ml-2 font-semibold">{result.data?.recordCount || 0}</span>
          </div>
          <div>
            <span className="text-slate-400">Service:</span>
            <span className="text-white ml-2 font-mono text-xs">{result.data?.serviceType}</span>
          </div>
        </div>
        
        {result.data?.summary && (
          <div className="mt-3 p-2 bg-slate-700/50 rounded text-sm text-slate-300">
            {result.data.summary}
          </div>
        )}
      </div>

      {/* Error Display */}
      {result.data?.error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h4 className="text-red-400 font-semibold">Error</h4>
          </div>
          <p className="text-red-300">{result.data.message}</p>
          {result.data.type && (
            <p className="text-red-400 text-sm mt-1">Type: {result.data.type}</p>
          )}
        </div>
      )}

      {/* Data Records */}
      {result.data?.records && result.data.records.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-600/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Records ({result.data.recordCount})
            </h4>
          </div>

          {/* Summary Table View for multiple records */}
          {result.data?.records && result.data.records.length > 1 && (
            <div className="mb-6 overflow-x-auto">
              <h5 className="text-white font-medium mb-3">Summary View</h5>
              <table className="min-w-full bg-slate-700/30 rounded">
                <thead>
                  <tr className="bg-slate-600/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">#</th>
                    {(() => {
                      // Show the most important columns across all records
                      const allKeys = result.data?.records?.flatMap(record => Object.keys(record)) || [];
                      const keyFrequency = allKeys.reduce((acc: Record<string, number>, key) => {
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {});
                      
                      const importantFields = ['callID', 'id', 'name', 'status', 'description', 'serialNumber', 'item', 'customerName', 'orderNumber', 'callStatus', 'problemDescription', 'creationDate'];
                      const topKeys = importantFields
                        .filter(field => allKeys.some(key => key.toLowerCase().includes(field.toLowerCase())))
                        .map(field => allKeys.find(key => key.toLowerCase().includes(field.toLowerCase())))
                        .filter(Boolean)
                        .filter((key, index, array) => array.indexOf(key) === index) // Remove duplicates
                        .slice(0, 5); // Show max 5 columns
                        
                      return topKeys.map((key, index) => (
                        <th key={`header-${index}-${key}`} className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider truncate">
                          {key}
                        </th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {result.data?.records?.map((record, index) => {
                    const allKeys = result.data?.records?.flatMap(r => Object.keys(r)) || [];
                    const importantFields = ['callID', 'id', 'name', 'status', 'description', 'serialNumber', 'item', 'customerName', 'orderNumber', 'callStatus', 'problemDescription', 'creationDate'];
                    const topKeys = importantFields
                      .filter(field => allKeys.some(key => key.toLowerCase().includes(field.toLowerCase())))
                      .map(field => allKeys.find(key => key.toLowerCase().includes(field.toLowerCase())))
                      .filter(Boolean)
                      .filter((key, keyIndex, array) => array.indexOf(key) === keyIndex) // Remove duplicates
                      .slice(0, 5);
                    
                    return (
                      <tr key={index} className="border-t border-slate-600/30 hover:bg-slate-600/20">
                        <td className="px-3 py-2 text-sm text-white">{index + 1}</td>
                        {topKeys.map((key, cellIndex) => (
                          <td key={`row-${index}-col-${cellIndex}-${key}`} className="px-3 py-2 text-sm text-white truncate max-w-32">
                            {record[key as string] === null ? (
                              <span className="text-slate-500 italic">null</span>
                            ) : (
                              String(record[key as string] || '-')
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h5 className="text-white font-medium mb-3">Detailed Records</h5>
          <div className="space-y-2">
            {result.data?.records?.map((record, index) => (
              <div key={index} className="border border-slate-600/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleRecord(index)}
                  className="w-full px-4 py-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-200 flex items-center justify-between text-left"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-white font-medium">
                      {(() => {
                        // Generate meaningful titles based on record content
                        const titleFields = ['callID', 'name', 'id', 'orderNumber', 'customerName', 'serialNumber'];
                        const titleField = titleFields.find(field => 
                          Object.keys(record).some(key => key.toLowerCase().includes(field.toLowerCase()))
                        );
                        if (titleField) {
                          const actualKey = Object.keys(record).find(key => key.toLowerCase().includes(titleField.toLowerCase()));
                          const value = actualKey ? record[actualKey] : null;
                          if (value && value !== null) {
                            return `${actualKey}: ${value}`;
                          }
                        }
                        return `Record ${index + 1}`;
                      })()} 
                    </span>
                    {(() => {
                      // Show additional context like status or description
                      const statusField = Object.keys(record).find(key => 
                        key.toLowerCase().includes('status') || key.toLowerCase().includes('description')
                      );
                      if (statusField && record[statusField] && record[statusField] !== null) {
                        return (
                          <span className="text-slate-400 text-xs">
                            {statusField}: {record[statusField]}
                          </span>
                        );
                      }
                      return null;
                    })()} 
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">
                      {Object.keys(record).length} fields
                    </span>
                    {expandedRecords.includes(index) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedRecords.includes(index) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-600/30"
                    >
                      <div className="p-4">
                        {/* Show key fields in summary */}
                        <div className="mb-4 p-3 bg-slate-700/30 rounded">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(record)
                              .filter(([key]) => {
                                // Show important fields first based on common SOAP service patterns
                                const importantFields = ['callID', 'id', 'name', 'status', 'description', 'serialNumber', 'item', 'customerName', 'orderNumber', 'callStatus', 'problemDescription', 'solutionTime'];
                                return importantFields.some(field => key.toLowerCase().includes(field.toLowerCase()));
                              })
                              .slice(0, 6) // Show max 6 key fields
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-slate-400">{key}:</span>
                                  <span className="text-white font-medium truncate ml-2">
                                    {value === null ? 'null' : String(value)}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                        
                        {/* Show all fields */}
                        <div className="space-y-2">
                          <h5 className="text-white font-medium mb-2">All Fields ({Object.keys(record).length})</h5>
                          {Object.entries(record).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1 py-2 border-b border-slate-600/20">
                              <div className="text-slate-400 font-mono text-sm font-medium">{key}:</div>
                              <div className="text-white text-sm flex-1 break-all">
                                {renderComplexValue(value, key, index)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw XML Display */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Raw SOAP Response
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(result.rawResponse || result.data?.rawResponse || '')}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-1 transition-colors duration-200"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={() => setShowRawXML(!showRawXML)}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 transition-colors duration-200"
            >
              <Eye className="w-3 h-3" />
              {showRawXML ? 'Hide' : 'Show'} XML
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showRawXML && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <pre className="bg-slate-900/50 p-4 rounded border border-slate-600/30 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {result.rawResponse || result.data?.rawResponse || 'No raw response available'}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}