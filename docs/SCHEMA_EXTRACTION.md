# Schema Metadata Extraction

## Overview

The Midport Query Platform automatically extracts and displays table schema metadata when querying remote APIs. This feature provides detailed information about table structure, field types, and request/response metadata without requiring additional manual steps.

## Features

### Automatic Schema Extraction
- Schema metadata is automatically extracted when executing queries against remote APIs
- No manual intervention required - works seamlessly with existing query workflow
- Supports both SOAP and REST/OData API responses

### Metadata Information Included
- **Request Metadata:**
  - Tenant ID and service name
  - Query executed
  - Extraction timestamp
  - Response time and size
  - Content type

- **Field Information:**
  - Field names and data types
  - Nullable constraints
  - Primary key indicators
  - Maximum field lengths (where applicable)
  - Data type icons for visual identification

- **Service Information:**
  - Service type (SOAP/REST/OData)
  - Namespace information
  - OData entity set details
  - API version information

### User Interface

#### Tabbed Results View
- **Query Results Tab:** Shows traditional query results with a notification when schema is available
- **Table Schema Tab:** Displays detailed schema information with collapsible metadata section

#### Collapsible Metadata Section
- Located at the top of the schema view
- Click to expand/collapse detailed request and response information
- Includes timing data, query details, and service information

#### Interactive Schema Table
- SQL-like DESCRIBE table format
- Color-coded badges for data types and nullable status
- Copy and download functionality for schema data
- Refresh capability to re-extract schema

## Technical Implementation

### Core Components

1. **SchemaExtractor Class** (`lib/utils/SchemaExtractor.ts`)
   - Extracts field metadata from SOAP XML and REST JSON responses
   - Infers data types from sample data
   - Generates formatted output (table, JSON, CSV)

2. **SchemaViewer Component** (`components/SchemaViewer.tsx`)
   - React component for displaying schema information
   - Collapsible metadata sections
   - Interactive schema table with copy/download features

3. **Enhanced RemoteAPIManager** (`lib/RemoteAPIManager.ts`)
   - Automatically extracts schema during query execution
   - Includes schema in query results
   - No performance impact on regular queries

### API Endpoints

```
GET /api/schema/[tenant]/[service]/describe
GET /api/schema/[tenant]/[service]/json
```

Both endpoints support:
- Automatic schema extraction from sample queries
- Metadata inclusion (timing, size, query details)
- Error handling and validation

### CLI Utility

```bash
ts-node lib/cli/describe-table.ts [tenant] [service] [options]
```

**Note:** The CLI is provided for development/debugging purposes. The main application automatically extracts schema during normal query operations.

## Usage Examples

### Automatic Schema Extraction
1. Navigate to Remote API mode
2. Select a tenant and execute any query
3. Schema is automatically extracted and notification appears
4. Click "View Schema" or switch to Schema tab to see details

### Schema Information Display
- **Metadata Section (Collapsible):**
  ```
  📋 METADATA (ServiceCall_v2)
  ┌─────────────────────────┬─────────────────────────────────────────────────────┐
  │ Property                │ Value                                                   │
  ├─────────────────────────┼─────────────────────────────────────────────────────┤
  │ Tenant ID               │ contoso                                                 │
  │ Extracted At            │ 2025-10-09T13:00:00.000Z                              │
  │ Query Used              │ SELECT * FROM ServiceCall_v2                          │
  │ Response Time           │ 1250ms                                                 │
  │ Response Size           │ 15.3 KB                                                │
  │ Sample Records          │ 10                                                     │
  │ Content Type            │ application/soap+xml                                   │
  │ Namespace               │ http://www.infor.com/businessinterface/ServiceCall_v2 │
  └─────────────────────────┴─────────────────────────────────────────────────────┘
  ```

- **Schema Table:**
  ```
  📊 DESCRIBE ServiceCall_v2 (SOAP)
  ┌─────────────────────────┬──────────────┬──────────┬─────────────┬─────────────┐
  │ Field                   │ Type         │ Null     │ Key         │ Max Length  │
  ├─────────────────────────┼──────────────┼──────────┼─────────────┼─────────────┤
  │ 📝 CallNumber           │ string       │ NO       │ PRI         │ 20          │
  │ 📝 Description          │ string       │ YES      │             │ 255         │
  │ 📅 CreatedDate          │ datetime     │ NO       │             │             │
  │ ☑️ IsActive             │ boolean      │ YES      │             │             │
  └─────────────────────────┴──────────────┴──────────┴─────────────┴─────────────┘
  Total Fields: 4
  ```

## Benefits

1. **Zero Configuration:** Works automatically with existing queries
2. **Performance Optimized:** Schema extraction doesn't impact query execution
3. **Comprehensive Metadata:** Includes timing, size, and service information
4. **Developer Friendly:** Multiple export formats and debugging information
5. **User Friendly:** Intuitive interface with collapsible sections
6. **Multi-API Support:** Works with both SOAP and REST/OData services

## Error Handling

- Schema extraction failures don't affect query execution
- Graceful degradation when schema cannot be extracted
- Clear error messages with debugging information
- Retry functionality available

## Future Enhancements

- Caching of schema information for performance
- Schema comparison between different queries
- Export to database documentation formats
- Integration with API documentation systems