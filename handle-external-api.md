# External Request Handling Action Plan

## Goals

- **DefineRequestLifecycle** Document how incoming API requests are processed by the Next.js backend (`app/api/*`).
- **ProtectTenantData** Ensure tenant credentials and context are resolved safely before forwarding to downstream services.
- **GuaranteeReliability** Establish validation, throttling, and error handling patterns that keep the platform resilient under load.

## Request Lifecycle Blueprint

1. **Ingress & Proxy Role**
   - **EntryPoint** External callers hit `app/api/remote-query/route.ts`, which acts as the proxy. Browser clients call this route instead of Infor endpoints directly.
   - **RequestEnvelope** Payload includes tenant identifier, target service table, action, and optional parameters (`APIRequestConfig`).
2. **Credential Vault Access**
   - **TenantLookup** Invoke `TenantConfigManager.getTenantApiConfig(tenantId)` to fetch decrypted OAuth client credentials and Infor header metadata from the SQLite vault.
   - **PermissionCheck** Ensure `isActive` flag and required permissions are present; reject unauthorized tenants with `401/404` responses.
3. **Authentication & Token Lifecycle**
   - **TokenReuse** Use `OAuth2ConfigManager.getValidTokenForTenant(tenantId)` to reuse cached tokens in `tenant_oauth_tokens`.
   - **TokenRefresh** Refresh when token is missing or near expiry and persist the refreshed token for subsequent calls.
4. **Request Construction**
   - **URLBuilder** Select REST or SOAP path via `UnifiedAPIManager.executeQueryWithOAuth2()` delegating to `RemoteAPIManager` (SOAP) or `RestAPIManager` (OData).
   - **HeaderAssembly** Attach `Authorization`, `X-Infor-LnCompany`, and `X-Infor-LnIdentity` headers plus any service-specific headers.
   - **ExpandHandling** Accept `$expand` arrays (e.g., `SoldToBPRef`, `LineRefs`, `ShipToBPRef`, `ActualDeliveryLineRefs`, `SalesOrderTypeRef`, `InvoicetoBusinessPartnerRef`, `PaybyBusinessPartnerRef`, `InternalSalesRepresentativeRef`, `ExternalSalesRepresentativeRef`, `SalesOfficeRef`, `FinancialDepartmentRef`, `SoldtoAddressRef`, `SoldtoContactRef`, `ShiptoAddressRef`, `ShiptoContactRef`, `InvoicetoAddressRef`, `InvoicetoContactRef`, `PaybyAddressRef`, `PaybyContactRef`, `OrderCurrencyRef`, `ExchangeRateTypeRef`, `TaxClassificationRef`, `LatePaymentSurchargeRef`, `CarrierLSPRef`, `SalesPriceListRef`, `PriceListForDirectDeliveryRef`, `BPPricesDiscountsRef`, `BusinessPartnerTextsRef`, `DeliveryTermsRef`, `PointOfTitlePassageRef`, `InstallmentPlanRef`, `LineOfBusinessRef`, `AreaRef`, `ProjectRef`, `ReturnReasonRef`, `SiteRef`, `WarehouseRef`, `PaymentTermsRef`, `RouteRef`, `SalesAcknowledgmentRef`, `ChangeReasonRef`, `ChangeTypeRef`, `MotiveOfTransportRef`, `DeliveryCodeRef`, `ChangeOrderSequenceNoRef`) and transform them into comma-separated OData `$expand` strings via `RestAPIManager.generateODataQuery()`.
   - **OrderingSelection** Support `$orderby` and `$select` inputs as arrays or strings; normalize them into OData-compliant comma-separated values before appending to the query string, preserving field order and allowing multiple sort directives.
5. **Downstream Execution**
   - **SOAPFlow** `RemoteAPIManager.buildIONAPIUrl()` and SOAP envelope helpers craft the payload before issuing `fetch` to `https://mingle-ionapi.eu1.inforcloudsuite.com/{TENANT}/SOAP/LN/services/...`.
   - **RESTFlow** `RestAPIManager.buildIONODataUrl()` creates the OData URL under `https://mingle-ionapi.eu1.inforcloudsuite.com/{TENANT}/LN/lnapi/odata/...` with translated filters.
6. **Response Normalization**
   - **Parser** `ResponseParser.parseRemoteResponse()` cleans XML/JSON, strips namespaces, and produces tabular JSON consumed by the UI.
   - **ResultReturn** Proxy returns `{ success, result, token }`, ensuring sensitive credentials are never exposed to clients.

## API Gateway Flow Architecture

┌────────────────────────────────────────────────────────────────────────────┐
│                            INBOUND REQUEST SOURCES                         │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ Internal UI          │ Trusted Partner System │ Scheduled Integration Job │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             API GATEWAY ENTRY                               │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ Method & Path Check  │ Payload Schema Guard   │ Traffic Policy / Rate Limit│
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         TENANT CONTEXT RESOLVER                             │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ Tenant Identifier    │ Credential Vault (DB)  │ Authorization Decision     │
│ Validation           │ (`TenantConfigManager`)│ (RBAC / API Key)           │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION PIPELINE                               │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ OAuth2 Config Loader │ Token Cache Lookup     │ Health Telemetry           │
│ (`OAuth2ConfigManager`)│ (`tenant_oauth_tokens`) │ (`tenant_health_checks`)  │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        REQUEST TRANSFORMATION                               │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ Policy Enforcement   │ Parameter Normalization│ Routing Decision            │
│ (limit, masking)     │ (`$expand`, `$select`,  │ (`UnifiedAPIManager` →     │
│                      │  `$orderby`, company)   │  REST or SOAP manager)     │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         DOWNSTREAM CONNECTORS                               │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ REST Connector       │ SOAP Connector         │ Token Service Connector    │
│ (`RestAPIManager`)   │ (`RemoteAPIManager`)   │ (refresh on demand)        │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSE PROCESSOR                                   │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ Payload Normalizer   │ Schema & Metadata       │ Audit & Metrics Sink       │
│ (`ResponseParser`)   │ (`SchemaExtractor`)     │ (logging, alerts)          │
└──────────┬───────────┴──────────────┬────────┴──────────────┬────────────┘
           │                          │                       │
           ▼                          ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        OUTBOUND GATEWAY RESPONSE                            │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│ JSON `{ success,     │ Token metadata (expiry │ Client hint headers /      │
│ result, token }`     │, scope)                │ throttling feedback        │
└────────────────────────────────────────────────────────────────────────────┘

```mermaid
flowchart LR
    subgraph Sources
        UI[Internal UI]
        Partner[Partner System]
        Job[Integration Job]
    end

    subgraph Gateway
        Edge[API Gateway Entry<br/>• Method routing<br/>• Rate limiting]
        Tenant[ Tenant Context Resolver<br/>TenantConfigManager ]
        Auth[ Authentication Pipeline<br/>OAuth2ConfigManager ]
        Transform[ Request Transformation<br/>UnifiedAPIManager ]
        REST[ REST Connector<br/>RestAPIManager ]
        SOAP[ SOAP Connector<br/>RemoteAPIManager ]
        Parser[ Response Processor<br/>ResponseParser + SchemaExtractor ]
        Outbound[Gateway Response<br/>{ success, result, token }]
    end

    UI --> Edge
    Partner --> Edge
    Job --> Edge
    Edge --> Tenant
    Tenant --> Auth
    Auth --> Transform
    Transform -->|REST route| REST
    Transform -->|SOAP route| SOAP
    REST --> Parser
    SOAP --> Parser
    Parser --> Outbound
    Outbound --> UI
    Outbound --> Partner
    Outbound --> Job
```

## Phase 1 – Entry & Validation

1. **Identify Entry Points**
   - Catalogue relevant routes such as `app/api/remote-query/route.ts`, `app/api/tenants/[id]/route.ts`, and `app/api/credentials/route.ts`.
   - Map consumer-facing endpoints (UI, external client) to these handlers.
2. **Normalize Input**
   - Parse `NextRequest` payloads using strict schemas (e.g., `zod`) to validate tenant name, service metadata, and query payloads.
   - Reject unsupported HTTP methods with `405` responses; return structured validation errors (`400`) citing missing fields (e.g., `config.table`).
3. **Rate Limiting & Throttling**
   - Implement per-tenant and per-IP rate limits (Redis or in-memory for MVP) to prevent abuse or accidental floods.
   - Add debounce logic for UI-originated requests to avoid duplicate submissions.

## Phase 2 – Tenant Resolution & Credential Loading

1. **Resolve Tenant Context**
   - Accept tenant identifier (`tenantId` or `tenantName`) in request body or headers.
   - Use `TenantConfigManager.getTenantApiConfig(tenantId)` to retrieve decrypted credentials and Infor headers.
   - Return `404` if tenant not found or inactive (`isActive = false`).
2. **Credential Fallback**
   - Allow fallback to environment configuration via `TenantConfigManager.initializeWithCurrentEnvConfig()` but flag this in logs for visibility.
3. **Access Control Checks**
   - Ensure authenticated caller has permission for requested tenant/service (future RBAC module). For now, gate internal routes behind session middleware or API key.

## Phase 3 – Authentication & Token Management

1. **Token Retrieval**
   - Call `OAuth2ConfigManager.getValidTokenForTenant(tenantId)` to reuse cached tokens in `tenant_oauth_tokens`.
   - Handle token refresh automatically when near expiry (`expiresAt` < now + 60s).
2. **Error Surfacing**
   - On auth failure, return `401` with sanitized message while logging detailed cause (invalid client secret, tenant disabled, etc.).
3. **Header Preparation**
   - Build `Authorization`, `X-Infor-LnCompany`, and `X-Infor-LnIdentity` headers; include request correlation ID for tracing.

## Phase 4 – Request Routing & Execution

1. **Dispatch Logic**
   - Route validated request through `UnifiedAPIManager.executeQueryWithOAuth2()` selecting SOAP vs REST managers (`RemoteAPIManager`, `RestAPIManager`).
   - For local SQLite operations (if applicable), branch early and skip OAuth.
2. **Request Context**
   - Inject tenant headers, token, and parsed parameters into manager call. Ensure actions (List, Create, Update) are authorized.
   - Build canonical URLs using `RemoteAPIManager.buildIONAPIUrl(tenant, service)` or `RestAPIManager.buildIONODataUrl(tenant, oDataService, entity)` and assemble SOAP envelopes or OData query strings accordingly.
   - Flatten `$expand` arrays (zero or many elements) into the URL query string using `RestAPIManager.generateODataQuery()` to ensure OData consumers receive related records in one response.
   - Convert `$orderby` array inputs into `$orderby=Field1 asc,Field2 desc` syntax and `$select` arrays into `$select=Field1,Field2` so downstream OData services receive precise sorting and projection instructions.
3. **Timeouts & Retries**
   - Set per-call timeout (e.g., 30s) within managers. Allow single retry for idempotent operations when encountering transient errors.

## Phase 5 – Response Handling & Output

1. **Success Path**
   - Normalize responses into consistent JSON `{ success, data, metadata }` or stream results when large.
   - Attach updated token payload so client can cache it (`remote-query` route already returns token).
   - Leverage `ResponseParser.parseRemoteResponse()` and related helpers to convert SOAP XML into structured JSON tables before returning to clients.
2. **Error Mapping**
   - Translate downstream errors into categorized responses: `4xx` for user faults (invalid table), `5xx` for service issues.
   - Include `requestId` for support and avoid leaking sensitive credential details.
3. **Post-Processing**
   - Apply client-side limits/pagination only after successful response to maintain consistent row counts.

## Phase 6 – Security Safeguards

1. **Input Sanitization**
   - Sanitize SQL-like strings before passing to managers to block injection into SOAP/XML or OData filters.
2. **Secrets Protection**
   - Keep AES-256-GCM encryption via `EncryptionUtil`; ensure decrypted credentials stay in-memory and are never returned to clients.
3. **Audit Logging**
   - Record request summary (tenant, endpoint, status, duration) in secure logs and optionally `tenant_health_checks` for dashboards.

## Phase 7 – Observability & Recovery

1. **Metrics & Alerts**
   - Emit metrics (success/failure counts, latency) per tenant/service to monitoring stack.
   - Trigger alerts for repeated `401` (credential drift) or `5xx` (service outage) beyond defined thresholds.
2. **Circuit Breakers**
   - Introduce circuit breaker around failing tenants to short-circuit repeated downstream failures while still returning cached status.
3. **Fallback Responses**
   - Provide graceful degraded responses (e.g., cached results, instructions) when external ION services are unavailable.

## Phase 8 – Testing & Validation

1. **Unit & Integration Tests**
   - Cover schema validation, tenant resolution, and token refresh flows using mocked managers.
   - Add integration tests hitting `POST /api/remote-query` with representative tenant data.
2. **Load Testing**
   - Simulate concurrent requests per tenant to validate rate limiting and throttling effectiveness.
3. **Documentation & Runbooks**
   - Update `README.md`, `service-creation-guide.md`, and `docs/` with new request-handling expectations and troubleshooting steps.
