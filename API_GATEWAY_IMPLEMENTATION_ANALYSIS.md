# API Gateway Implementation Analysis

## Executive Summary

This document provides a comprehensive analysis of the **Midport ION API Query Platform's API gateway implementation**, comparing the current state against the target architecture defined in `handle-external-api.md`. The platform's UI is largely complete, but the API proxy/gateway functionality requires substantial development to meet enterprise-grade requirements.

---

## Current State Assessment

### ✅ **What's Already Implemented**

#### 1. **Core Infrastructure**

- **Multi-tenant credential management** via SQLite with AES-256-GCM encryption (`TenantConfigManager`)
- **OAuth2 token management** with basic caching (`OAuth2ConfigManager`)
- **Dual API architecture** supporting both SOAP and REST (`UnifiedAPIManager`)
- **SOAP API client** with envelope generation (`RemoteAPIManager`)
- **REST/OData API client** with query building (`RestAPIManager`)
- **Response parsing** for XML and JSON (`ResponseParser`)
- **Schema extraction** from ION API responses (`SchemaExtractor`)

#### 2. **Existing API Endpoints**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/remote-query` | POST | Execute ION API queries | ✅ Basic implementation |
| `/api/tenants` | GET | List tenant summaries | ✅ Implemented |
| `/api/tenants` | POST | Create tenant | ✅ Implemented |
| `/api/tenants/[id]` | GET | Get tenant details | ✅ Implemented |
| `/api/tenants/[id]` | PUT | Update tenant | ✅ Implemented |
| `/api/tenants/[id]` | DELETE | Delete tenant | ✅ Implemented |
| `/api/tenants/[id]/test-connection` | POST | Test tenant connection | ✅ Implemented |
| `/api/credentials` | GET | Get credential summaries | ✅ Implemented |
| `/api/sqlite/query` | POST | Execute local SQLite queries | ✅ Implemented |

#### 3. **Core Managers & Libraries**

```typescript
// Existing Core Classes
TenantConfigManager     // ✅ Multi-tenant CRUD, encryption, health checks
OAuth2ConfigManager     // ✅ Token acquisition, refresh, caching
UnifiedAPIManager       // ✅ SOAP/REST routing
RestAPIManager          // ✅ OData query building (partial)
RemoteAPIManager        // ✅ SOAP envelope generation
ResponseParser          // ✅ XML/JSON parsing
SchemaExtractor         // ✅ Metadata extraction
EncryptionUtil          // ✅ AES-256-GCM encryption
```

---

## ❌ **Critical Gaps (Not Implemented)**

### Phase 1: Entry & Validation

- ❌ **Schema validation** using zod or similar library
- ❌ **Structured validation errors** with field-specific messages
- ❌ **HTTP method enforcement** (405 responses)

### Phase 2: Tenant Resolution & Access Control

- ❌ **Flexible tenant identification** (by ID or name in request body/headers)
- ❌ **isActive tenant checks** with proper 404 responses
- ✅ **Database-only credential storage** (no environment variable fallback - already implemented)
- ❌ **RBAC framework** for tenant/service permissions (optional for direct client access)
- ❌ **API key validation** or session middleware (optional for direct client access)
- ❌ **Access control gates** for internal routes

### Phase 3: Enhanced Authentication

- ❌ **Near-expiry token refresh** (< 60s threshold)
- ❌ **Detailed auth failure logging** with context
- ❌ **Request correlation IDs** for distributed tracing
- ❌ **Auth metrics** (success/failure rates)
- ❌ **Token rotation policies**

### Phase 4: Advanced Request Processing

- ❌ **$expand array handling** (currently partially implemented)
- ⚠️ **$orderby array transformation** (basic implementation exists)
- ⚠️ **$select array projection** (basic implementation exists)
- ❌ **X-Infor-LnCompany header injection** (exists but not in UnifiedAPIManager)
- ❌ **X-Infor-LnIdentity header injection**
- ❌ **Correlation ID propagation** through all layers
- ❌ **Request timeout** (30s default)
- ❌ **Retry logic** for idempotent operations
- ❌ **Exponential backoff** on transient failures

### Phase 5: Response Management

- ⚠️ **Consistent response format** (partially implemented)
- ❌ **Token metadata** in all responses
- ❌ **Streaming support** for large results
- ❌ **Request ID** in all error responses
- ❌ **Error categorization** (4xx vs 5xx)
- ❌ **Sensitive data sanitization** in errors

### Phase 6: Security Hardening

- ❌ **Input sanitization** for SQL injection prevention
- ❌ **XML/SOAP injection protection**
- ❌ **OData filter validation**
- ❌ **Comprehensive audit logging** system
- ❌ **Structured logging** with context
- ❌ **Health check persistence** to `tenant_health_checks`

### Phase 7: Observability & Resilience

- ❌ **Metrics emission** (success/failure counts, latency)
- ❌ **Alerting infrastructure** for 401/5xx patterns
- ❌ **Circuit breaker pattern** for failing tenants
- ❌ **Graceful degradation** with cached responses
- ❌ **Fallback logic** for service outages
- ❌ **Health dashboard integration**

### Phase 8: Testing & Documentation

- ❌ **Unit tests** for validation, tenant resolution, token refresh
- ❌ **Integration tests** for API routes
- ❌ **Load tests** for concurrent requests
- ❌ **API gateway documentation** for external consumers
- ❌ **Troubleshooting runbook**

---

## Implementation Roadmap

### **Priority 1: Foundation (Week 1)**

#### 1.1 Input Validation & Schema Guards

```typescript
// Install zod for schema validation
npm install zod

// Create validation schemas
// lib/validation/api-schemas.ts
import { z } from 'zod';

export const RemoteQueryRequestSchema = z.object({
  config: z.object({
    tenant: z.string().min(1, "Tenant is required"),
    table: z.string().min(1, "Table is required"),
    apiType: z.enum(['soap', 'rest']),
    action: z.string().min(1, "Action is required"),
    parameters: z.record(z.any()).optional(),
    oDataService: z.string().optional(),
    entityName: z.string().optional(),
    company: z.string().optional(),
  }),
  currentToken: z.object({
    accessToken: z.string(),
    expiresAt: z.number(),
  }).nullable().optional()
});

// Update app/api/remote-query/route.ts
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate with zod
    const validation = RemoteQueryRequestSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request payload',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }
    
    // Continue with validated data
    const { config, currentToken } = validation.data;
    // ...
  } catch (error) {
    // ...
  }
}
```

### **Priority 2: Tenant Resolution (Week 2)**

#### 2.1 Enhanced Tenant Resolution

```typescript
// lib/TenantConfigManager.ts - Add new methods

/**
 * Get tenant by ID or name
 */
static async getTenantByIdOrName(identifier: string): Promise<TenantConfig | null> {
  // Try as ID first
  let tenant = await this.getTenantById(identifier);
  if (tenant) return tenant;
  
  // Try as name
  tenant = await this.getTenantByName(identifier);
  return tenant;
}

/**
 * Get tenant with active check
 */
static async getActiveTenant(identifier: string): Promise<TenantConfig | null> {
  const tenant = await this.getTenantByIdOrName(identifier);
  if (!tenant || !tenant.isActive) {
    return null;
  }
  return tenant;
}
```

#### 2.2 Note on Access Control

**For direct client connections to Midport, additional access control (API keys, RBAC) is optional.** The platform already has:

- ✅ OAuth2 authentication to ION APIs
- ✅ Tenant-based credential isolation in database
- ✅ Per-tenant token management

If you need API-level authentication in the future, consider adding API key validation or session-based auth.

### **Priority 3: Request Processing Enhancements (Weeks 3-4)**

#### 3.1 OData $expand Array Handling

```typescript
// lib/RestAPIManager.ts - Enhanced generateODataQuery

static generateODataQuery(parameters: Record<string, any>): string {
  const queryParts: string[] = [];
  
  // Handle $expand with full ION API support
  const expandFields = parameters.expand || parameters.$expand;
  if (expandFields) {
    if (Array.isArray(expandFields) && expandFields.length > 0) {
      queryParts.push(`$expand=${expandFields.join(',')}`);
    } else if (typeof expandFields === 'string' && expandFields.length > 0) {
      queryParts.push(`$expand=${expandFields}`);
    }
  }
  
  // Handle $select arrays
  const selectFields = parameters.select || parameters.$select;
  if (selectFields) {
    if (Array.isArray(selectFields) && selectFields.length > 0) {
      queryParts.push(`$select=${selectFields.join(',')}`);
    } else if (typeof selectFields === 'string' && selectFields.length > 0) {
      queryParts.push(`$select=${selectFields}`);
    }
  }
  
  // Handle $orderby arrays
  const orderByFields = parameters.orderby || parameters.$orderby;
  if (orderByFields) {
    if (Array.isArray(orderByFields) && orderByFields.length > 0) {
      // Support ['Field1 asc', 'Field2 desc'] format
      queryParts.push(`$orderby=${orderByFields.join(',')}`);
    } else if (typeof orderByFields === 'string' && orderByFields.length > 0) {
      queryParts.push(`$orderby=${orderByFields}`);
    }
  }
  
  // ... rest of existing filter logic
  
  return queryParts.join('&');
}
```

#### 3.2 Request Timeout & Retry

```typescript
// lib/utils/http-client.ts
export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 30000, // 30s default
    retries = 1,
    retryDelay = 1000,
    ...fetchOptions
  } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry on timeout or network errors
    if (retries > 0 && (error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('fetch failed')))) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchWithTimeout(url, { ...options, retries: retries - 1 });
    }
    
    throw error;
  }
}

// Update RestAPIManager and RemoteAPIManager to use fetchWithTimeout
```

### **Priority 4: Observability & Logging (Weeks 4-5)**

#### 4.1 Structured Logging

```typescript
// lib/logging/logger.ts
export interface LogContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  static info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }));
  }
  
  static error(message: string, error: Error, context?: LogContext) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    }));
  }
  
  static metric(name: string, value: number, tags?: Record<string, string>) {
    console.log(JSON.stringify({
      type: 'metric',
      timestamp: new Date().toISOString(),
      name,
      value,
      tags
    }));
  }
}

// Generate correlation IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
```

#### 4.2 Audit Logging to Database

```typescript
// lib/TenantConfigManager.ts - Add audit method

static async recordAuditLog(data: {
  tenantId: string;
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  requestId: string;
  error?: string;
}): Promise<void> {
  const db = await this.initializeDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO tenant_audit_logs (
        tenant_id, endpoint, method, status, duration, request_id, error, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.tenantId,
      data.endpoint,
      data.method,
      data.status,
      data.duration,
      data.requestId,
      data.error || null,
      new Date().toISOString()
    ], (err) => {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
}
```

### **Priority 5: Circuit Breaker & Resilience (Weeks 5-6)**

#### 5.1 Circuit Breaker Implementation

```typescript
// lib/resilience/circuit-breaker.ts
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private halfOpenAttempts: number = 3
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenAttempts) {
        this.state = CircuitState.CLOSED;
      }
    }
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
}

// Per-tenant circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getTenantCircuitBreaker(tenantId: string): CircuitBreaker {
  if (!circuitBreakers.has(tenantId)) {
    circuitBreakers.set(tenantId, new CircuitBreaker());
  }
  return circuitBreakers.get(tenantId)!;
}
```

---

## API Gateway Request Flow (Enhanced)

┌─────────────────────────────────────────────────────────────────┐
│                     1. API GATEWAY ENTRY                        │
├─────────────────────────────────────────────────────────────────┤
│  • Generate requestId (correlation tracking)                    │
│  • Validate HTTP method (405 if not supported)                  │
│  • Parse request body                                           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  2. INPUT VALIDATION (zod)                      │
├─────────────────────────────────────────────────────────────────┤
│  • Schema validation (tenant, table, action required)           │
│  • Parameter type checking                                      │
│  • Return 400 with field-specific errors if invalid            │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. TENANT RESOLUTION                               │
├─────────────────────────────────────────────────────────────────┤
│  • Resolve tenant by ID or name from database                   │
│  • Check isActive status (404 if inactive)                      │
│  • Load tenant credentials (encrypted in database)              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            4. AUTHENTICATION & TOKEN MANAGEMENT                  │
├─────────────────────────────────────────────────────────────────┤
│  • Load OAuth2 config from DB (encrypted)                       │
│  • Check token cache (tenant_oauth_tokens)                      │
│  • Refresh if near expiry (< 60s)                               │
│  • Handle auth failures (401 with context)                      │
│  • Generate correlation ID for tracing                          │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. CIRCUIT BREAKER CHECK                           │
├─────────────────────────────────────────────────────────────────┤
│  • Check tenant circuit breaker state                           │
│  • Return cached response if OPEN                               │
│  • Allow request if CLOSED or HALF_OPEN                         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            6. REQUEST TRANSFORMATION & ROUTING                   │
├─────────────────────────────────────────────────────────────────┤
│  • Sanitize inputs (SQL injection prevention)                   │
│  • Transform OData parameters ($expand, $select, $orderby)      │
│  • Inject headers (X-Infor-LnCompany, X-Infor-LnIdentity)       │
│  • Add Authorization header (Bearer token)                      │
│  • Route to RestAPIManager or RemoteAPIManager                  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         7. DOWNSTREAM EXECUTION (with timeout & retry)          │
├─────────────────────────────────────────────────────────────────┤
│  • Execute fetch with 30s timeout                               │
│  • Retry once on transient errors                               │
│  • Exponential backoff between retries                          │
│  • Emit metrics (duration, success/failure)                     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              8. RESPONSE PROCESSING & LOGGING                    │
├─────────────────────────────────────────────────────────────────┤
│  • Parse XML/JSON response (ResponseParser)                     │
│  • Apply client-side limit (default 15)                         │
│  • Normalize to {success, data, metadata}                       │
│  • Update circuit breaker state                                 │
│  • Record audit log to DB                                       │
│  • Emit success/failure metrics                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  9. RESPONSE RETURN                             │
├─────────────────────────────────────────────────────────────────┤
│  • Attach requestId to response                                 │
│  • Include updated token metadata                               │
│  • Sanitize sensitive data in errors                            │
│  • Return with appropriate HTTP status                          │
└─────────────────────────────────────────────────────────────────┘

---

## Testing Strategy

### Unit Tests

```typescript
// tests/api/remote-query.test.ts
import { POST } from '@/app/api/remote-query/route';
import { NextRequest } from 'next/server';

describe('POST /api/remote-query', () => {
  it('should reject requests without config', async () => {
    const req = new NextRequest('http://localhost:3000/api/remote-query', {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
  
  it('should validate tenant and table fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/remote-query', {
      method: 'POST',
      body: JSON.stringify({
        config: { tenant: '', table: 'Orders', apiType: 'rest', action: 'List' }
      })
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
```

### Load Tests

```typescript
// tests/load/concurrent-requests.test.ts
import { performance } from 'perf_hooks';

describe('Load Testing', () => {
  it('should handle 100 concurrent requests per tenant', async () => {
    const requests = Array.from({ length: 100 }, () =>
      fetch('http://localhost:3000/api/remote-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            tenant: 'MIDPORT_DEM',
            table: 'Orders',
            apiType: 'rest',
            action: 'List'
          }
        })
      })
    );
    
    const start = performance.now();
    const responses = await Promise.all(requests);
    const duration = performance.now() - start;
    
    const successCount = responses.filter(r => r.ok).length;
    
    expect(successCount).toBeGreaterThan(90); // 90% success rate
    expect(duration).toBeLessThan(10000); // Complete within 10s
  });
});
```

---

## Summary & Next Steps

### **Implementation Phases**

| Phase | Timeline | Priority | Complexity |
|-------|----------|----------|------------|
| Phase 1: Input Validation | Week 1 | 🔴 Critical | Low |
| Phase 2: Tenant Resolution Enhancement | Week 2 | 🔴 Critical | Low |
| Phase 3: Auth Enhancements | Week 2-3 | 🟠 High | Low |
| Phase 4: Request Processing | Week 3 | 🟠 High | Medium |
| Phase 5: Response Management | Week 3-4 | 🟠 High | Low |
| Phase 6: Security Hardening | Week 4 | 🟠 High | Medium |
| Phase 7: Observability & Resilience | Week 4-5 | 🟡 Medium | High |
| Phase 8: Testing & Documentation | Week 5-6 | 🟡 Medium | Medium |

### **Dependencies Installation**

```bash
# Required packages for API gateway implementation
npm install zod                    # Schema validation
npm install uuid                   # Request ID generation
npm install winston                # Structured logging (optional)
```

### **Key Decision Points**

1. **Access Control**: Not required for direct client connections (clients are trusted)
2. **Metrics**: Console logging initially, integrate with monitoring stack (Datadog/Prometheus) later
3. **Circuit Breaker**: Per-tenant in-memory initially, consider distributed state management later
4. **Credential Management**: ✅ Already implemented - all credentials stored in database (no environment fallback)

### **Success Criteria**

- ✅ All API requests validated with zod schemas
- ✅ OAuth2 tokens automatically refresh before expiry
- ✅ $expand/$select/$orderby arrays properly transformed
- ✅ Request timeouts prevent hanging requests
- ✅ Circuit breakers protect failing tenants
- ✅ All requests logged with correlation IDs
- ✅ Tenant credentials strictly from database (no environment fallback)
- ✅ 90%+ test coverage for critical paths

---

**Ready for implementation. Start with Phase 1 (Input Validation) for immediate impact.**

---

## 🎯 **Scope Clarifications**

### **What's NOT Needed (Based on Direct Client Architecture)**

1. **❌ Rate Limiting** - Not required for trusted direct client connections to Midport
2. **❌ Environment Variable Fallback** - All credentials strictly stored in database (already implemented)
3. **❌ API Key Validation** - Optional, not required for direct client access
4. **❌ Public API Rate Limiting** - This is an internal/trusted client system

### **What IS Needed (Core Focus)**

1. **✅ Input Validation** - Prevent malformed requests
2. **✅ OData Parameter Transformation** - Complete $expand/$select/$orderby support
3. **✅ Timeout & Retry Logic** - Resilient downstream calls
4. **✅ Circuit Breakers** - Protect against failing tenants
5. **✅ Structured Logging** - Debugging and audit trail
6. **✅ Comprehensive Testing** - Ensure reliability

**Focus areas:** Input validation, request transformation, resilience patterns, and observability.
