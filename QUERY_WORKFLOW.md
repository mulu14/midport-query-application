# Query Workflow Documentation

**Author:** Mulugeta Forsido  
**Company:** Midport Scandinavia  
**Date:** October 2025

## Overview

This document explains the complete workflow of how a SQL query is processed from user input to rendered results in the Midport Query Application. The system supports both local SQLite databases and remote ION API queries (SOAP and REST).

---

## 🔄 Complete Query Flow

### 1. Query Input Layer
**Component:** `components/query/QueryEditor.tsx`

The query editor provides a textarea where users write SQL-like queries:

```typescript
<QueryEditor
  query={query}           // Current SQL string
  onChange={setQuery}     // Updates query state
  onExecute={executeQuery} // Triggers execution
  isExecuting={isExecuting} // Shows loading state
/>
```

**User Actions:**
- Types SQL query in the textarea
- `onChange` updates the query state in the appropriate context
- Clicks "Run Query" button to execute
- Button is disabled if no database/tenant or table is selected

**Example Query:**
```sql
SELECT * FROM ServiceCall WHERE Status = 'Open' LIMIT 10
```

---

### 2. Query State Management
**Component:** `app/page.tsx`

The main page determines whether the user is in local or remote mode and routes to the appropriate context:

```typescript
const query = mode === 'remote' ? remoteAPI.query : localDB.query;
const setQuery = mode === 'remote' ? remoteAPI.setQuery : localDB.setQuery;
const executeQuery = mode === 'remote' ? remoteAPI.executeQuery : localDB.executeQuery;
const isExecuting = mode === 'remote' ? remoteAPI.isExecuting : localDB.isExecuting;
const results = mode === 'remote' ? remoteAPI.results : localDB.results;
const error = mode === 'remote' ? remoteAPI.error : localDB.error;
```

**Mode Detection:**
- **Local Mode:** Uses `DatabaseContext` for local SQLite queries
- **Remote Mode:** Uses `RemoteAPIContext` for ION API queries

---

### 3. Query Parsing & Preparation
**Component:** `lib/RemoteAPIContext.tsx` (for remote queries)

When `executeQuery()` is called, the system parses the SQL query to determine the API action and parameters:

#### SQL Query Parsing
```typescript
// Parse the query to determine action and parameters
const queryStr = query.trim().toLowerCase();
const apiType = (selectedTable as any).apiType || 'soap';
let action: string;
let parameters = parseParametersFromQuery(query, selectedTable);
```

#### Action Determination

**For REST APIs:**
- `SELECT`, `GET`, `READ`, `LIST` → HTTP `GET`
- `INSERT`, `CREATE` → HTTP `POST`
- `UPDATE` → HTTP `PUT`
- `DELETE` → HTTP `DELETE`

**For SOAP APIs:**
- `SELECT`, `GET`, `READ`, `LIST` → `List`
- `INSERT`, `CREATE` → `create`
- `UPDATE` → `update`
- `DELETE` → `delete`

#### Parameter Extraction

From SQL `WHERE` clause and other keywords:
```sql
SELECT * FROM ServiceCall WHERE Status = 'Open' AND Priority = 'High' LIMIT 10
```

Extracted parameters:
```javascript
{
  Status: 'Open',
  Priority: 'High',
  limit: 10
}
```

---

### 4. API Configuration Building

The system builds a unified configuration object for the API request:

#### For SOAP APIs:
```javascript
{
  tenant: 'MIDPORT_DEM',
  table: 'ServiceCall_v2',
  apiType: 'soap',
  action: 'List',
  parameters: { Status: 'Open', limit: 10 },
  sqlQuery: 'SELECT * FROM ServiceCall WHERE Status = \'Open\' LIMIT 10',
  fullUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/IONAPI',
  company: '',
  oDataService: null,
  entityName: null
}
```

#### For REST APIs:
```javascript
{
  tenant: 'MIDPORT_DEM',
  table: 'Orders',
  apiType: 'rest',
  action: 'GET',
  parameters: { Country: 'Mexico', limit: 10 },
  sqlQuery: 'SELECT * FROM Orders WHERE Country = \'Mexico\' LIMIT 10',
  fullUrl: null,
  company: '2405',
  oDataService: 'tdapi.slsSalesOrder',
  entityName: 'Orders',
  expandFields: ['SoldToBPRef', 'LineRefs', 'ShipToBPRef']
}
```

---

### 5. Client-Side API Request
**Component:** `lib/RemoteAPIContext.tsx`

The context sends a POST request to the server-side API endpoint:

```typescript
const response = await fetch('/api/remote-query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    config: config,
    currentToken: currentToken
  })
});

const responseData = await response.json();
const result = responseData.result;
const newToken = responseData.token;

// Update token for future requests
if (newToken) {
  setCurrentToken(newToken);
}

// Store results in context
setResults([result]);
```

**Why Server-Side?**
- OAuth2 credentials must remain secure
- Token refresh logic runs server-side
- Prevents CORS issues with ION API

---

### 6. Server-Side API Processing
**Endpoint:** `app/api/remote-query/route.ts`

The server-side route handles OAuth2 authentication and API execution:

```typescript
export async function POST(request: NextRequest) {
  // 1. Extract configuration from request
  const config: APIRequestConfig = data.config;
  const currentToken: StoredOAuth2Token | null = data.currentToken || null;

  // 2. Load OAuth2 configuration from database
  const oauth2Config = await OAuth2ConfigManager.loadConfig();

  // 3. Get or refresh OAuth2 token
  const token = await OAuth2ConfigManager.getValidToken(currentToken, oauth2Config);

  // 4. Execute the remote API query
  const result = await UnifiedAPIManager.executeQueryWithOAuth2(config, '', '', token);

  // 5. Return result and token to client
  return NextResponse.json({
    success: true,
    result: result,
    token: token
  });
}
```

---

### 7. Unified API Manager
**Component:** `lib/UnifiedAPIManager.ts`

Routes the request to the appropriate API manager (SOAP or REST):

```typescript
static async executeQueryWithOAuth2(
  config: APIRequestConfig,
  username: string,
  password: string,
  currentToken?: StoredOAuth2Token | null
): Promise<RemoteAPIQueryResult> {
  
  // Get or refresh token as needed
  const token = await OAuth2ConfigManager.getValidToken(currentToken ?? null, oauth2Config);

  // Route to appropriate API manager
  let rawResult: RemoteAPIQueryResult;
  
  if (config.apiType === 'rest') {
    rawResult = await RestAPIManager.executeQuery(config, token);
  } else {
    rawResult = await RemoteAPIManager.executeQueryWithToken(soapConfig, token);
  }

  // Parse the response using unified parser
  const limit = config.parameters?.limit || 15;
  const parsedResult = ResponseParser.parseUnifiedResponse(rawResult, limit);
  
  return parsedResult;
}
```

---

### 8. API Execution

#### SOAP API Execution
**Component:** `lib/RemoteAPIManager.ts`

```typescript
static async executeQueryWithToken(
  config: SOAPRequestConfig, 
  token: StoredOAuth2Token
): Promise<RemoteAPIQueryResult> {
  
  // Build SOAP XML request
  const soapEnvelope = this.buildSOAPEnvelope(config.action, config.parameters);
  
  // Make HTTP request to ION API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Authorization': `Bearer ${token.accessToken}`,
      'SOAPAction': config.action
    },
    body: soapEnvelope
  });
  
  const responseText = await response.text();
  
  // Parse SOAP XML response
  const parsedData = this.parseSOAPResponse(responseText, config.table);
  
  // Extract schema metadata
  const schema = SchemaExtractor.extractSchema(queryResult, serviceName, tenantId, queryUsed);
  
  return queryResult;
}
```

#### REST API Execution
**Component:** `lib/RestAPIManager.ts`

```typescript
static async executeQuery(
  config: APIRequestConfig, 
  token: StoredOAuth2Token
): Promise<RemoteAPIQueryResult> {
  
  // Build OData URL with query parameters
  const url = this.buildODataURL(config);
  // Example: /MIDPORT_DEM/api/v2/tdapi.slsSalesOrder/Orders?$filter=Country eq 'Mexico'&$top=10&$expand=LineRefs
  
  // Make HTTP request to ION API
  const response = await fetch(url, {
    method: config.action, // GET, POST, PUT, DELETE
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const responseData = await response.json();
  
  // Parse OData response
  const parsedData = this.parseODataResponse(responseData);
  
  // Extract schema metadata
  const schema = SchemaExtractor.extractSchema(resultForSchema, entityName, tenantId, sqlQuery);
  
  return queryResult;
}
```

---

### 9. Response Parsing
**Component:** `lib/ResponseParser.ts`

The response parser converts raw API responses into a unified format:

```typescript
static parseUnifiedResponse(
  result: RemoteAPIQueryResult, 
  limit: number
): RemoteAPIQueryResult {
  
  // Apply limit to prevent overwhelming UI
  if (result.data?.records && result.data.records.length > limit) {
    result.data.records = result.data.records.slice(0, limit);
    result.data.recordCount = limit;
    result.data.summary = `${result.data.summary} (Limited to ${limit} records)`;
  }
  
  return result;
}
```

**Parsed Result Structure:**
```javascript
{
  success: true,
  url: 'https://mingle-ionapi.eu1.inforcloudsuite.com/...',
  action: 'List',
  status: 200,
  statusText: 'OK',
  data: {
    success: true,
    serviceType: 'ServiceCall_v2',
    recordCount: 10,
    records: [
      { callID: '001', status: 'Open', priority: 'High', ... },
      { callID: '002', status: 'Open', priority: 'Medium', ... }
    ],
    summary: 'Successfully retrieved 10 ServiceCall records'
  },
  schema: {
    tableName: 'ServiceCall_v2',
    totalFields: 15,
    fields: [
      { fieldName: 'callID', dataType: 'string', ... },
      { fieldName: 'status', dataType: 'string', ... }
    ]
  },
  rawResponse: '<xml>...</xml>',
  note: 'ION API List operation completed successfully'
}
```

---

### 10. Results Display
**Component:** `app/page.tsx` → `components/query/QueryResults.tsx`

The results are passed to the QueryResults component:

```typescript
<QueryResults
  results={results || []}
  error={error || ''}
  isExecuting={isExecuting}
/>
```

**Display States:**
1. **Executing:** Shows loading spinner
2. **Error:** Shows error message with details
3. **Success:** Routes to appropriate results display

---

### 11. ION API Results Rendering
**Component:** `components/query/IONAPIResultsDisplay.tsx`

For remote ION API queries, a specialized component renders the structured data:

#### Features:
1. **Response Metadata:**
   - Action, status, record count
   - Service type and summary

2. **Summary Table View:**
   - Shows most important columns
   - Quick overview of multiple records

3. **Detailed Records:**
   - Expandable/collapsible records
   - All fields displayed

4. **Complex Data Handling:**
   - Nested objects shown with field counts
   - Arrays expandable to show all items
   - Proper formatting for dates, numbers, booleans

5. **Raw Response Viewer:**
   - Toggle to view raw XML/JSON
   - Copy to clipboard functionality

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Input (SQL Query)                   │
│                  QueryEditor Component                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│              RemoteAPIContext.query state                     │
│              (or DatabaseContext for local)                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│         User clicks "Run" → executeQuery()                    │
│   Parse SQL → Extract action & parameters                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│              POST /api/remote-query                           │
│         (Client-side to Server-side API)                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│      UnifiedAPIManager.executeQueryWithOAuth2()               │
│         OAuth2 Token Management                               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
            ┌──────────┴──────────┐
            ↓                     ↓
┌─────────────────────┐  ┌─────────────────────┐
│  RemoteAPIManager   │  │  RestAPIManager     │
│    (SOAP APIs)      │  │   (REST/OData)      │
└─────────┬───────────┘  └─────────┬───────────┘
          ↓                        ↓
┌─────────────────────────────────────────────┐
│        ION API Call (with OAuth2)           │
│  https://mingle-ionapi.eu1.inforcloudsuite  │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│     Raw Response (XML or JSON)              │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│  ResponseParser.parseUnifiedResponse()      │
│  + SchemaExtractor.extractSchema()          │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│    Structured Result with Schema            │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│      Return to RemoteAPIContext             │
│        Update results state                 │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│      QueryResults Component                 │
│   (Determines display type)                 │
└─────────┬───────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│    IONAPIResultsDisplay Component           │
│  (Rendered UI with expandable data)         │
└─────────────────────────────────────────────┘
```

---

## 🔍 Query Lookup Process

### How Queries are Generated from Sidebar

When a user clicks a service in the sidebar (`RemoteAPIDatabaseList.tsx`), the system automatically generates a SQL query:

```typescript
const selectTableAndQuery = (tenant: RemoteAPITenant, table: RemoteAPITable) => {
  setSelectedTenant(tenant);
  setSelectedTable(table);

  // Generate SQL query based on the service/table name
  const tableName = table.endpoint || table.name;
  const sqlQuery = `SELECT * FROM ${tableName};`;
  setQuery(sqlQuery);
};
```

**Example:**
- User clicks "ServiceCall_v2" in sidebar
- System generates: `SELECT * FROM ServiceCall_v2;`
- Query appears in QueryEditor
- User can modify before executing

### Navigation from Credentials Page

When on `/credentials` route and clicking a service link:

```typescript
const handleTableSelection = (tenant: any, table: any) => {
  // If currently on credentials page, navigate to home first
  if (pathname === '/credentials') {
    router.push('/');
  }
  // Then select the table and query
  selectTableAndQuery(tenant, table);
};
```

This ensures users are always on the main query page when executing queries.

---

## 🛡️ Security Considerations

### OAuth2 Token Management
- **Client-side:** Never stores OAuth2 credentials
- **Server-side:** Manages token lifecycle
- **Token Refresh:** Automatic when expired
- **Encryption:** All credentials encrypted in database

### Tenant Isolation
- Each query validates tenant credentials
- Service account keys must match registered users
- Multi-tenant architecture ensures data separation

### SQL Injection Prevention
- Queries are parsed and parameterized
- No direct SQL execution to backend databases
- All parameters validated before API calls

---

## 📈 Performance Optimizations

### Result Limiting
- Default limit: 15 records (configurable)
- Prevents overwhelming UI with large datasets
- User can adjust via `LIMIT` clause

### Token Caching
- OAuth2 tokens cached in context
- Reused until expiration
- Reduces authentication overhead

### Schema Extraction
- Automatic metadata extraction
- Cached for current session
- Reused across queries to same service

---

## 🔧 Troubleshooting

### Common Issues

**Query Not Executing:**
- Ensure tenant and table are selected
- Check network connectivity
- Verify OAuth2 credentials in database

**No Results Displayed:**
- Check if service has data
- Verify WHERE conditions are valid
- Review browser console for errors

**Authentication Errors:**
- Verify service account credentials match registered user
- Check token expiration
- Ensure OAuth2 config is correct in database

**Parsing Errors:**
- Review raw response in results display
- Check if service returns expected format
- Verify SOAP/REST action is correct

---

## 📚 Related Documentation

- **Multi-Tenant Setup:** `MULTI_TENANT_SETUP.md`
- **Service Creation Guide:** `service-creation-guide.md`
- **OAuth2 Configuration:** `OAuth2-Resource-Owner-Grant.md`
- **High-Level Architecture:** `high-level-architecture.md`
- **Project Objectives:** `project-objective.md`

---

## 🎯 Key Takeaways

1. **Unified Interface:** Same SQL-like syntax works for both SOAP and REST APIs
2. **Automatic Parsing:** System determines action and parameters from SQL
3. **Secure by Design:** OAuth2 handled server-side, credentials encrypted
4. **Schema Extraction:** Automatic metadata discovery for all services
5. **Rich Display:** Complex nested data properly rendered with expand/collapse
6. **Performance Focused:** Smart limiting and caching strategies

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Maintained By:** Midport Scandinavia Development Team

