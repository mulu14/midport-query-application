/**
 * @fileoverview React component for displaying table schemas with metadata
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronDown, 
  ChevronRight, 
  Database, 
  Clock, 
  FileText, 
  Server, 
  Info,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
import { TableSchema, FieldSchema } from '@/lib/utils/SchemaExtractor';

interface SchemaViewerProps {
  tenantId: string;
  serviceName: string;
  schema?: TableSchema;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  className?: string;
}

/**
 * SchemaViewer component for displaying table schemas
 */
export function SchemaViewer({
  tenantId,
  serviceName,
  schema,
  loading = false,
  error,
  onRefresh,
  className = ''
}: SchemaViewerProps) {
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const fetchSchema = async () => {
    try {
      const response = await fetch(`/api/schema/${tenantId}/${serviceName}/json`);
      
      if (!response.ok) {
        console.error(`Schema API returned ${response.status}: ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Schema fetch failed:', data.error || 'Unknown error');
        return;
      }
      
      // Schema would be handled by parent component state
      console.log('Schema fetched:', data.schema);
    } catch (err) {
      console.error('Failed to fetch schema:', err);
    }
  };

  // Auto-fetch schema if not provided
  useEffect(() => {
    if (!schema && !loading && !error) {
      fetchSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, serviceName]);

  const handleCopyJSON = async () => {
    if (!schema) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleDownloadJSON = () => {
    if (!schema) return;
    
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.tableName}_schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDataTypeIcon = (dataType: string): string => {
    switch (dataType.toLowerCase()) {
      case 'string': return '📝';
      case 'integer': case 'numeric': case 'decimal': return '🔢';
      case 'boolean': return '☑️';
      case 'datetime': case 'date': return '📅';
      case 'array': return '📋';
      case 'object': return '🗂️';
      default: return '❓';
    }
  };

  const toggleSection = (sectionPath: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionPath) 
        ? prev.filter(p => p !== sectionPath)
        : [...prev, sectionPath]
    );
  };

  const isExpanded = (sectionPath: string): boolean => {
    return expandedSections.includes(sectionPath);
  };

  // Organize fields into hierarchical structure preserving original response order
  const organizeFieldsHierarchically = (fields: FieldSchema[]) => {
    // First, separate root fields from nested fields
    const rootFields: FieldSchema[] = [];
    const nestedFieldsMap: Record<string, FieldSchema[]> = {};
    
    // Group nested fields by their parent
    fields.forEach(field => {
      if (field.fieldName.includes('.') || field.fieldName.includes('[')) {
        const parentName = field.fieldName.split(/[\.\[]/)[0];
        if (!nestedFieldsMap[parentName]) {
          nestedFieldsMap[parentName] = [];
        }
        nestedFieldsMap[parentName].push(field);
      } else {
        rootFields.push(field);
      }
    });
    
    // Keep fields in their original response order - DO NOT SORT
    // The order should exactly match the API response structure
    
    // Create organized structure
    const organizedFields: Array<{
      field: FieldSchema;
      type: 'root' | 'parent';
      children?: FieldSchema[];
    }> = [];
    
    // Process root fields in their original response order
    rootFields.forEach(field => {
      if (nestedFieldsMap[field.fieldName]) {
        // This field has children - make it a parent
        organizedFields.push({
          field,
          type: 'parent',
          children: nestedFieldsMap[field.fieldName]
        });
      } else {
        // This is a simple root field
        organizedFields.push({
          field,
          type: 'root'
        });
      }
    });
    
    console.log('🗂️ ORGANIZED FIELDS:', {
      totalFields: fields.length,
      rootFields: rootFields.length,
      nestedSections: Object.keys(nestedFieldsMap).length,
      firstFewFields: organizedFields.slice(0, 5).map(item => `${item.field.fieldName} (${item.type})`)
    });
    
    return organizedFields;
  };

  // Render a field row with proper indentation
  const renderFieldRow = (field: FieldSchema, level: number = 0) => {
    const indent = level * 24;
    const isNested = level > 0;
    
    return (
      <TableRow key={field.fieldName} className={isNested ? 'bg-slate-800 hover:bg-slate-750' : 'bg-slate-900 hover:bg-slate-800'}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2" style={{ marginLeft: `${indent}px` }}>
            <span className="text-lg">{getDataTypeIcon(field.dataType)}</span>
            <span className={isNested ? 'text-sm text-white font-medium' : 'text-white font-semibold'}>
              {isNested ? field.fieldName.split(/[\.\[]/).pop()?.replace(']', '') : field.fieldName}
            </span>
            {isNested && (
              <span className="text-xs text-slate-300 ml-1">
                ({field.fieldName.includes('[') ? 'array item' : 'nested field'})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono bg-slate-600 text-white border-slate-500">
            {field.dataType}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge 
            variant={field.isNullable ? 'secondary' : 'destructive'} 
            className={field.isNullable ? 'bg-slate-500 text-white' : 'bg-red-600 text-white'}
          >
            {field.isNullable ? 'YES' : 'NO'}
          </Badge>
        </TableCell>
        <TableCell>
          {field.isPrimaryKey && (
            <Badge variant="default" className="bg-blue-600 text-white">PRIMARY</Badge>
          )}
        </TableCell>
        <TableCell>
          {field.maxLength && (
            <span className="text-sm text-muted-foreground">
              {field.maxLength}
            </span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  // Render parent field with its children immediately following
  const renderParentWithChildren = (parentField: FieldSchema, children: FieldSchema[]) => {
    const isOpen = isExpanded(parentField.fieldName);
    
    return (
      <React.Fragment key={parentField.fieldName}>
        {/* Parent field row with expand/collapse button */}
        <TableRow className="bg-slate-700 hover:bg-slate-600 border-b border-slate-500">
          <TableCell className="font-medium">
            <button
              onClick={() => toggleSection(parentField.fieldName)}
              className="flex items-center gap-2 hover:bg-slate-800 px-3 py-2 rounded-md transition-colors duration-200 text-white"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>{getDataTypeIcon(parentField.dataType)}</span>
              <span className="font-semibold text-white">{parentField.fieldName}</span>
              <Badge variant="secondary" className="text-xs bg-slate-500 text-white border-slate-400">
                {children.length} fields
              </Badge>
            </button>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono bg-slate-600 text-white border-slate-500">
              {parentField.dataType}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge 
              variant={parentField.isNullable ? 'secondary' : 'destructive'}
              className={parentField.isNullable ? 'bg-slate-500 text-white' : 'bg-red-600 text-white'}
            >
              {parentField.isNullable ? 'YES' : 'NO'}
            </Badge>
          </TableCell>
          <TableCell>
            {parentField.isPrimaryKey && (
              <Badge variant="default" className="bg-blue-600 text-white">PRIMARY</Badge>
            )}
          </TableCell>
          <TableCell>
            {parentField.maxLength && (
              <span className="text-sm text-slate-300">
                {parentField.maxLength}
              </span>
            )}
          </TableCell>
        </TableRow>
        
        {/* Child fields - shown immediately after parent when expanded */}
        {isOpen && children.map(field => renderFieldRow(field, 1))}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Loading Schema...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Database className="h-5 w-5" />
            Schema Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 bg-red-50 p-4 rounded-md">
            {error}
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!schema) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            No Schema Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Schema information is not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Metadata Section - Collapsible */}
      {schema.metadata && (
        <Card>
          <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Request & Response Metadata
                  </div>
                  {metadataOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Tenant:</span>
                      <Badge variant="secondary">{schema.tenantId}</Badge>
                    </div>
                    
                    {schema.extractedAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Extracted:</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(schema.extractedAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {schema.metadata.responseTime !== undefined && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Response Time:</span>
                        <span className="text-sm">{schema.metadata.responseTime}ms</span>
                      </div>
                    )}

                    {schema.metadata.recordCount !== undefined && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Sample Records:</span>
                        <span className="text-sm">{schema.metadata.recordCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {schema.metadata.responseSize !== undefined && (
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium">Response Size:</span>
                        <span className="text-sm">{formatFileSize(schema.metadata.responseSize)}</span>
                      </div>
                    )}

                    {schema.metadata.contentType && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-500" />
                        <span className="font-medium">Content Type:</span>
                        <span className="text-sm font-mono">{schema.metadata.contentType}</span>
                      </div>
                    )}

                    {schema.namespace && (
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Namespace:</span>
                        <code className="text-xs bg-gray-100 px-1 rounded">
                          {schema.namespace.length > 30 ? 
                            `${schema.namespace.substring(0, 30)}...` : 
                            schema.namespace
                          }
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {schema.metadata.queryUsed && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <span className="font-medium text-sm">Query Used:</span>
                    <pre className="text-xs mt-1 overflow-x-auto">
                      <code>{schema.metadata.queryUsed}</code>
                    </pre>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Schema Table Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {schema.tableName}
              <Badge 
                variant={schema.serviceType === 'SOAP' ? 'destructive' : 'default'}
                className="ml-2"
              >
                {schema.serviceType}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {copyStatus && (
                <span className="text-sm text-green-600">{copyStatus}</span>
              )}
              <Button
                onClick={handleCopyJSON}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </Button>
              <Button
                onClick={handleDownloadJSON}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {schema.fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fields detected in this schema
            </div>
          ) : (() => {
            const organizedFields = organizeFieldsHierarchically(schema.fields);
            const parentFields = organizedFields.filter(item => item.type === 'parent').map(item => item.field.fieldName);
            
            return (
              <div className="space-y-4">
                {/* Add expand/collapse all button */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {organizedFields.filter(item => item.type === 'root').length} root fields, {parentFields.length} nested sections
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setExpandedSections(parentFields)}
                      variant="outline"
                      size="sm"
                    >
                      Expand All
                    </Button>
                    <Button
                      onClick={() => setExpandedSections([])}
                      variant="outline"
                      size="sm"
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table className="bg-slate-900">
                    <TableHeader>
                      <TableRow className="bg-slate-700 border-b border-slate-600">
                        <TableHead className="text-white font-semibold">Field Name</TableHead>
                        <TableHead className="text-white font-semibold">Data Type</TableHead>
                        <TableHead className="text-white font-semibold">Nullable</TableHead>
                        <TableHead className="text-white font-semibold">Key</TableHead>
                        <TableHead className="text-white font-semibold">Max Length</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Render fields in hierarchical order */}
                      {organizedFields.map((item, index) => {
                        if (item.type === 'root') {
                          return renderFieldRow(item.field, 0);
                        } else if (item.type === 'parent' && item.children) {
                          return renderParentWithChildren(item.field, item.children);
                        }
                        return null;
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
          
          <div className="mt-4 text-sm text-muted-foreground">
            Total Fields: {schema.totalFields}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchemaViewer;