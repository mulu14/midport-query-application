# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Midport ION API Query Platform** - A Next.js application providing SQL-like access to Infor ION APIs (both SOAP and REST), with multi-tenant support and OAuth2 authentication.

**Key Features:**
- SQL-to-SOAP/REST API translation
- Multi-tenant ION API credential management
- OAuth2 service account authentication
- Query hundreds of ION OData services (tdapi.*, tsapi.*, hrapi.*, finapi.*)
- Unified response parsing with client-side limiting (default 15 records)

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Development server (default: http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Initialize multi-tenant database
npm run init-tenants
```

### Environment Setup
```bash
# Generate encryption key for tenant credentials
node -e "console.log('TENANT_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Required environment variables (`.env.local`):
```env
# Multi-tenant encryption
TENANT_ENCRYPTION_KEY=<64-character-hex-string>

# ION API OAuth2 (for default tenant initialization)
ION_CLIENT_ID=<your_client_id>
ION_CLIENT_SECRET=<your_client_secret>
ION_IDENTITY_URL=<ion_identity_url>
ION_TENANT_ID=<your_tenant_id>
ION_SERVICE_ACCOUNT_ACCESS_KEY=<service_account_key>
ION_SERVICE_ACCOUNT_SECRET_KEY=<service_account_secret>
```

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Backend:** Next.js API Routes (serverless)
- **Authentication:** OAuth2 Client Credentials Flow + Resource Owner Password Grant
- **Database:** SQLite (tenant configs & metadata)
- **APIs:** ION SOAP (WSDL-based) + ION REST (OData v4)

### Key Architectural Patterns

#### 1. Dual API Architecture (SOAP + REST)
The platform supports both SOAP and REST APIs through a unified interface:

```typescript
// lib/UnifiedAPIManager.ts - Routes requests to appropriate manager
if (config.apiType === 'rest') {
  rawResult = await RestAPIManager.executeQuery(config, token);
} else {
  rawResult = await RemoteAPIManager.executeQueryWithToken(soapConfig, token);
}
```

**Decision Flow:**
- REST APIs: Use `RestAPIManager` → OData v4 URLs → JSON parsing
- SOAP APIs: Use `RemoteAPIManager` → SOAP envelopes → XML parsing

#### 2. Multi-Tenant Credential Management
Credentials are stored encrypted in SQLite with individual field-level encryption (AES-256-GCM):

```typescript
// lib/TenantConfigManager.ts
// Sensitive fields encrypted: clientId, clientSecret, SAAK, SASK
// Non-sensitive fields stored plain: URLs, tenant names, scopes
```

**Priority Hierarchy:**
1. **SQLite Database** (primary) - encrypted credentials per tenant
2. **Environment Variables** (fallback) - single tenant for initial setup

#### 3. 7-Step Query Processing Pipeline

```
1. Input Validation    → Check tenant/table selection
2. SQL Parsing         → Determine action (READ/CREATE/UPDATE/DELETE)
3. Parameter Extract.  → Parse WHERE, LIMIT, OFFSET
4. Request Generation  → Build SOAP envelope OR OData URL
5. Authentication      → OAuth2 token acquisition/refresh
6. API Communication   → HTTP POST with Bearer token
7. Response Processing → Parse XML/JSON + apply client-side limit
```

### Project Structure

```
midport-query-application/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── remote-databases/     # Remote DB management
│   │   ├── tenants/              # Multi-tenant CRUD
│   │   └── sqlite/               # Local SQLite queries
│   ├── layout.tsx                # Root layout + providers
│   └── page.tsx                  # Main query interface
│
├── components/                   # React components
│   ├── layout/                   # Layout components
│   │   ├── DatabaseSidebar.tsx   # Main navigation
│   │   └── NavigationHeader.tsx  # Top header
│   ├── credentials/              # Tenant management UI
│   │   ├── CredentialSelector.tsx
│   │   └── CredentialManagement.tsx
│   └── ui/                       # Reusable UI (shadcn/ui)
│
├── lib/                          # Core business logic
│   ├── UnifiedAPIManager.ts      # Central router (SOAP/REST)
│   ├── RestAPIManager.ts         # OData/REST API client
│   ├── RemoteAPIManager.ts       # SOAP XML API client
│   ├── OAuth2ConfigManager.ts    # Token management
│   ├── TenantConfigManager.ts    # Multi-tenant DB operations
│   ├── ResponseParser.ts         # Unified response parsing
│   ├── SQLParser.ts              # SQL query parsing
│   ├── DatabaseContext.tsx       # Local DB context
│   ├── RemoteAPIContext.tsx      # Remote API context
│   └── utils/
│       └── encryption.ts         # AES-256-GCM encryption
│
├── Entities/                     # TypeScript type definitions
│   ├── RemoteAPI.ts              # API config interfaces
│   ├── TenantConfig.ts           # Tenant credential types
│   └── Database.ts               # Database schema types
│
├── scripts/                      # Utility scripts
│   └── initializeTenantDatabase.js  # DB initialization
│
└── tenant-configs.db            # SQLite database (created at runtime)
```

## Development Patterns

### Adding a New ION API Service

#### For REST/OData Services:
1. **Identify the service** (e.g., `tdapi.financials`, `tsapi.transactions`)
2. **Add to UnifiedAPIManager** type detection:
```typescript
static suggestAPIType(endpoint: string): 'soap' | 'rest' {
  if (endpoint.includes('tdapi.') || endpoint.includes('tsapi.')) {
    return 'rest';
  }
  return 'soap';
}
```
3. **Update RemoteAPIContext** to handle service selection
4. **No backend changes needed** - OData URL construction is automatic

#### For SOAP Services:
1. **Identify the WSDL service** (e.g., `BusinessPartner_v3`, `ServiceCall_v2`)
2. **Add service-specific parameter extraction** in `SQLParser.ts`:
```typescript
export function parseParametersFromQuery(
  query: string, 
  table: { endpoint: string }
): Record<string, any> {
  // Add custom parameter handling for your service
}
```
3. **SOAP envelope generation** is automatic in `RemoteAPIManager.generateSOAPEnvelope()`

### Multi-Tenant Development Workflow

#### Adding a New Tenant via API:
```typescript
// POST /api/tenants
const response = await fetch('/api/tenants', {
  method: 'POST',
  body: JSON.stringify({
    tenantName: 'CUSTOMER_ABC',
    displayName: 'Customer ABC Production',
    ionConfig: {
      clientId: 'CUSTOMER_ABC~...',
      clientSecret: '...',
      serviceAccountAccessKey: '...',
      serviceAccountSecretKey: '...',
      // ... other ION config
    }
  })
});
```

#### Using Tenant-Specific Tokens:
```typescript
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';

// Get token by tenant ID
const token = await OAuth2ConfigManager.getValidTokenForTenant(tenantId);

// Get token by tenant name
const token = await OAuth2ConfigManager.getValidTokenForTenantName('CUSTOMER_ABC');

// Token is cached and auto-refreshed
```

### Context Providers Architecture

The app uses three nested context providers:

```typescript
// app/layout.tsx
<SidebarModeProvider>          // Manages sidebar mode (local/remote)
  <DatabaseProvider>            // Local SQLite database operations
    <RemoteAPIProvider>         // Remote ION API operations
      {children}
    </RemoteAPIProvider>
  </DatabaseProvider>
</SidebarModeProvider>
```

**Key Responsibilities:**
- **SidebarModeProvider**: Controls UI mode switching between local SQLite and remote ION APIs
- **DatabaseProvider**: Manages local SQLite connections, queries, and schema
- **RemoteAPIProvider**: Handles remote API state, tenant selection, token management

### Response Parsing & Limiting

All API responses go through unified parsing with client-side limiting:

```typescript
// lib/ResponseParser.ts
static parseUnifiedResponse(
  result: RemoteAPIQueryResult, 
  limit: number = 15  // Default client-side limit
): RemoteAPIQueryResult {
  // Parse XML (SOAP) or JSON (REST)
  // Apply limit to prevent large result sets
  // Return unified format
}
```

**Why client-side limiting?**
- ION APIs don't always respect `$top` parameter
- Prevents browser performance issues
- Consistent UX across SOAP and REST
- Can be overridden with `?limit=N` parameter

## Security Considerations

### Credential Encryption
- **Method:** AES-256-GCM with IV and auth tag
- **Scope:** Individual fields (clientId, clientSecret, SAAK, SASK)
- **Key Storage:** `TENANT_ENCRYPTION_KEY` in environment variables
- **Key Generation:** 64-character hex string (32 bytes)

### Token Management
- **Storage:** Per-tenant in `tenant_oauth_tokens` table
- **Lifetime:** Automatic refresh before expiration
- **Scope:** Isolated by tenant_id
- **Security:** Never exposed to browser (server-side only)

### Browser vs. Server Separation

**Critical Rule:** OAuth2 and API calls MUST happen server-side:

```typescript
// ❌ WRONG - Don't do this
if (typeof window !== 'undefined') {
  throw new Error('UnifiedAPIManager cannot be used in browser environment');
}

// ✅ CORRECT - Use API routes
const response = await fetch('/api/remote-query', {
  method: 'POST',
  body: JSON.stringify({ query, tenant, table })
});
```

## Testing Patterns

### Manual Testing Workflow
1. Start dev server: `npm run dev`
2. Initialize tenant DB: `npm run init-tenants`
3. Navigate to http://localhost:3000
4. Select tenant from credential selector
5. Choose service from sidebar (SOAP or REST)
6. Write SQL query: `SELECT * FROM ServiceCall_v2 WHERE status = 'active'`
7. Execute and verify response

### Common Test Scenarios
- ✅ SOAP service query (e.g., `BusinessPartner_v3`)
- ✅ REST/OData query (e.g., `tdapi.Customers`)
- ✅ Token refresh on expiration
- ✅ Multi-tenant switching
- ✅ Client-side limiting (verify max 15 records)
- ✅ Error handling (invalid credentials, network failures)

## Common Issues & Solutions

### Issue: "Missing required environment variables"
**Cause:** `TENANT_ENCRYPTION_KEY` not set
**Solution:** Generate key with provided command and add to `.env.local`

### Issue: "Failed to decrypt tenant configuration"
**Cause:** Encryption key changed or database corrupted
**Solution:** Re-run `npm run init-tenants` or restore backup

### Issue: "UnifiedAPIManager cannot be used in browser environment"
**Cause:** Trying to call OAuth2/API manager directly from client component
**Solution:** Use API routes (`/api/remote-query`) for all API calls

### Issue: REST API returns 0 results, SOAP works fine
**Cause:** Incorrect OData service name or entity name
**Solution:** Verify service exists in ION API Gateway and check exact spelling

### Issue: Token expired during query execution
**Cause:** Token lifetime is shorter than expected
**Solution:** System auto-refreshes tokens; check `OAuth2ConfigManager.getValidToken()` logic

## Performance Optimization

### Current Optimizations
- **Client-side limiting:** Default 15 records to prevent large datasets
- **Token caching:** Per-tenant OAuth2 token storage
- **SQLite for metadata:** Fast local lookups for tenant configs
- **Unified response parser:** Single parsing logic for SOAP + REST

### Potential Improvements
- Add pagination support (`$skip`, `$top` for OData)
- Implement response caching (Redis or in-memory)
- Batch query support for multiple entities
- Server-side query result streaming

## Database Schema

### Key Tables

**tenant_credentials** (Main tenant storage)
- Encrypted fields: `encrypted_client_id`, `encrypted_client_secret`, `encrypted_saak`, `encrypted_sask`
- Plain text: `identity_url`, `portal_url`, `tenant_id`, endpoints

**tenant_oauth_tokens** (Token cache)
- Per-tenant token storage
- Columns: `tenant_id`, `access_token`, `expires_at`, `refresh_token`

**tenant_health_checks** (Connection monitoring)
- Tracks connection status and response times
- Useful for tenant health dashboards

## API Endpoints Reference

### Tenant Management
- `GET /api/tenants` - List all tenants (summary)
- `GET /api/tenants?detailed=true` - List with credentials
- `POST /api/tenants` - Create new tenant
- `PUT /api/tenants/[id]` - Update tenant
- `DELETE /api/tenants/[id]` - Delete tenant
- `POST /api/tenants/[id]/test-connection` - Test tenant connection

### Query Execution
- `POST /api/remote-query` - Execute SQL query against ION API
- `POST /api/sqlite/query` - Execute local SQLite query

### Remote Database Management
- `GET /api/remote-databases` - List remote API configurations
- `POST /api/remote-databases` - Add new remote database

## Contributing Guidelines

### Code Standards
- Use TypeScript for all new code with strict type checking
- Follow existing naming conventions (`PascalCase` for classes, `camelCase` for functions)
- Add JSDoc comments for all public methods
- Handle errors gracefully with try-catch and meaningful error messages

### Pull Request Checklist
- [ ] TypeScript compiles without errors
- [ ] Lint passes (`npm run lint`)
- [ ] Manual testing completed for affected features
- [ ] Documentation updated (if API changes)
- [ ] No sensitive credentials in code or commits

---

**Company:** Midport Scandinavia  
**Developer:** Mulugeta Forsido  
**Date:** October 2025
