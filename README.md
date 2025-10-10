# Midport ION API Query Platform

A modern web application for **secure and seamless integration** with **Infor ION APIs** using **OAuth 2.0 authentication** and **SOAP XML** requests, providing a **simple SQL-like interface** that abstracts complex API technical details.

## 📋 Project Information

- **Company**: Midport Scandinavia
- **Developer**: Mulugeta Forsido
- **Date**: October 2025
- **Version**: 1.0.0

## 🚀 Features

### **ION API Integration**
- **Secure Authentication**: OAuth 2.0 integration with Infor ION API service accounts
- **Multi-Tenant Support**: Manage multiple ION API tenants (e.g., MIDPORT_DEM, MIDPORT_PROD)
- **SOAP XML Generation**: Automatic conversion of SQL queries to proper SOAP envelopes
- **Service Management**: Support for ION API services like ServiceCall_v2, Customer_v1, Order_v1
- **Real-time Query Execution**: Execute queries against remote ION APIs with live results

### **User Experience**
- **Simple SQL Interface**: Write SQL queries without understanding ION API technical details
- **Database Sidebar**: Navigate between local SQLite databases and remote ION API tenants
- **Table/Service Selection**: View and select services from connected ION API tenants
- **Responsive Design**: Mobile-friendly interface with modern UI components

### **Technical Architecture**
- **Dual-Mode System**: Switch between local SQLite queries and remote ION API queries
- **Local Configuration Storage**: SQLite database for storing ION API tenant configurations
- **Error Handling**: Comprehensive error handling and user feedback for API failures
- **Type Safety**: Full TypeScript implementation with strict typing
- **Modular Design**: Clean separation between local and remote query execution

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15.5.4**: React framework with App Router
- **React 18**: Component-based UI with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Modern icon library

### Backend Stack
- **Next.js API Routes**: Serverless API endpoints
- **SQLite**: Local database for configuration storage
- **Fetch API**: HTTP client for remote API calls

### Key Components

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── remote-databases/     # Remote database management API
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Home page
├── components/                   # React components
│   ├── layout/                  # Layout components
│   │   ├── DatabaseSidebar.tsx # Main sidebar navigation
│   │   └── SidebarModeContext.tsx # Sidebar mode management
│   ├── query/                   # Query-related components
│   │   ├── AddDatabaseDialog.tsx # Add new database dialog
│   │   ├── DatabaseList.tsx     # Local database list
│   │   ├── QueryEditor.tsx      # SQL query editor
│   │   └── RemoteAPIDatabaseList.tsx # Remote API database list
│   └── ui/                      # Reusable UI components
├── lib/                         # Core utilities and contexts
│   ├── DatabaseContext.tsx      # Local database management
│   ├── RemoteAPIContext.tsx     # Remote API management
│   ├── RemoteAPIManager.ts     # SOAP API client
│   └── sqlite.ts               # SQLite database operations
└── Entities/                    # TypeScript interfaces
    └── RemoteAPI.ts            # Remote API type definitions
```

## 🏛️ System Architecture Diagrams

### System Overview Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                       │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  React UI       │   Query Editor  │  Result Display │   Tenant Management     │
│  Components     │                 │                 │                         │
│                 │                 │                 │                         │
└─────────┬───────┴─────────┬───────┴─────────┬───────┴─────────┬───────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                      │
├─────────────────────────┬─────────────────────┬─────────────────────────────────┤
│    Next.js App Router   │     API Routes      │      React Contexts             │
│                         │                     │                                 │
└─────────┬───────────────┴─────────┬───────────┴─────────┬───────────────────────┘
          │                         │                     │
          ▼                         ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬───────────┤
│UnifiedAPI   │RestAPI      │RemoteAPI    │OAuth2Config │TenantConfig │SQLParser/ │
│Manager      │Manager      │Manager      │Manager      │Manager      │Response   │
│             │             │(SOAP)       │             │             │Parser     │
└─────┬───────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴───────────┘
      │              │             │             │             │
      ▼              ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                           │
├─────────────────────┬─────────────────────┬─────────────────────────────────────┤
│   SQLite Database   │ Environment Variables│         Token Cache                 │
│  (Multi-Tenant)     │    (.env files)     │     (Per-Tenant)                   │
└─────────┬───────────┴─────────┬───────────┴─────────┬───────────────────────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                                        │
├─────────────────────┬─────────────────────┬─────────────────────────────────────┤
│   ION OData APIs    │   ION SOAP APIs     │     ION OAuth2 Server               │
│  (REST/tdapi.*)     │ (BusinessPartner_v3)│   (Token Authentication)            │
│                     │                     │                                     │
└─────────────────────┴─────────────────────┴─────────────────────────────────────┘
```

### Multi-Tenant Authentication Flow

```
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User   │    │Query Editor │    │UnifiedAPI    │    │OAuth2Config     │    │TenantConfig     │
│         │    │             │    │Manager       │    │Manager          │    │Manager          │
└────┬────┘    └──────┬──────┘    └──────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
     │                │                  │                      │                      │
     │ 1. Execute     │                  │                      │                      │
     │    Query       │                  │                      │                      │
     │ ──────────────>│                  │                      │                      │
     │                │ 2. executeQuery  │                      │                      │
     │                │    WithOAuth2()  │                      │                      │
     │                │ ────────────────>│                      │                      │
     │                │                  │ 3. loadConfig()      │                      │
     │                │                  │ ────────────────────>│                      │
     │                │                  │                      │ 4. getTenantSumm()  │
     │                │                  │                      │ ───────────────────>│
     │                │                  │                      │                      │
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CREDENTIAL PRIORITY LOGIC                                            │
│                                                                                                 │
│  ┌─────────────────┐                         ┌─────────────────┐                             │
│  │ SQLite Database │ ◄─── Priority 1 ──────► │ Active Tenant?  │                             │
│  │ (Encrypted)     │                         │                 │                             │
│  └─────────────────┘                         └─────────┬───────┘                             │
│           │                                            │                                       │
│           │ Found: Return                               │ Not Found:                           │
│           │ encrypted config                           │ Fallback                             │
│           ▼                                            ▼                                       │
│  ┌─────────────────┐                         ┌─────────────────┐                             │
│  │ Decrypt & Use   │                         │ Environment     │ ◄─── Priority 2            │
│  │ Database Config │                         │ Variables       │                             │
│  └─────────────────┘                         │ (.env files)    │                             │
│                                               └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
     │                │                  │                      │                      │
     │                │                  │ 5. OAuth2Config      │                      │
     │                │                  │    (DB or ENV)       │                      │
     │                │                  │ ◄────────────────────│                      │
     │                │                  │ 6. getValidToken()   │                      │
     │                │                  │ ────────────────────>│                      │
     │                │                  │                      │                      │
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            ION OAUTH2 SERVER                                                   │
│                                                                                                 │
│  ┌─────────────────┐    7. POST /token.oauth2    ┌─────────────────┐                         │
│  │ Token Request   │ ─────────────────────────────│ Access Token +  │                         │
│  │ (Service Acct.) │ ◄─────────────────────────────│ Expires        │                         │
│  └─────────────────┘                              └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
     │                │                  │                      │                      │
     │                │                  │ 8. Cache Token       │                      │
     │                │                  │    (Database)        │                      │
     │                │                  │ ◄────────────────────│                      │
     │                │                  │                      │                      │
     │                │                  │ 9. Authenticated     │                      │
     │                │                  │    API Request       │                      │
     │                │                  │ ──────────────────────────────────────────────────┐
     │                │                  │                      │                      │       │
     │                │                  │ 10. Response Data    │                      │       │
     │                │                  │ ◄─────────────────────────────────────────────────│
     │                │ 11. Parsed       │                      │                      │       ▼
     │                │     Results      │                      │                      │ ┌─────────────┐
     │                │ ◄────────────────│                      │                      │ │ ION APIs    │
     │ 12. Display    │                  │                      │                      │ │ (SOAP/REST) │
     │     Results    │                  │                      │                      │ └─────────────┘
     │ ◄──────────────│                  │                      │                      │
     ▼                ▼                  ▼                      ▼                      ▼
```

### Query Processing Pipeline (7-Step Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 QUERY PROCESSING PIPELINE                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│    STEP 1:         │     │    STEP 2:         │     │     STEP 3:           │
│ Input Validation │     │  SQL Parsing      │     │ Parameter Extraction  │
│                    │     │                    │     │                       │
│ - Validate Tenant  │ ───>│ - Parse SQL Query  │ ───>│ - Extract WHERE       │
│ - Validate Table   │     │ - Determine SOAP   │     │ - Parse LIMIT/OFFSET  │
│   Selection        │     │   Action           │     │ - Handle Parameters   │
└──────────────────────┘     └──────────────────────┘     └─────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 4: Request Generation                                       │
│                                                                                                 │
│      ┌──────────────────────┐                       ┌──────────────────────┐      │
│      │   SOAP Path        │                       │    REST Path        │      │
│      │                    │                       │                    │      │
│ ────>│ - Generate SOAP    │                  ────>│ - Build OData URL  │ <──── │
│      │   Envelope         │                       │ - Add Query Params │      │
│      │ - XML Structure    │                       │ - OData v4 Format  │      │
│      └────────┬─────────────┘                       └────────┬─────────────┘      │
└───────────────────────────────┴────────────────────────────────┴───────────────────────────────┘
                                    │                                     │
                                    │              BOTH PATHS            │
                                    ▼                                     ▼

┌──────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│    STEP 5:         │     │      STEP 6:         │     │     STEP 7:          │
│ Authentication   │     │ API Communication   │     │ Response Processing  │
│                  │     │                      │     │                      │
│ - OAuth2 Token   │ ───>│ - HTTP Request       │ ───>│ - Parse XML/JSON     │
│   Management     │     │   Execution          │     │ - Apply Client-Side  │
│ - Multi-Tenant   │     │ - Apply Auth Headers │     │   Limiting (15 rec)   │
│   Context        │     │ - Send to ION APIs   │     │ - Format for Display │
└──────────────────────┘     └──────────────────────────┘     └─────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PIPELINE BENEFITS                                              │
│                                                                                                 │
│ ✓ Modular Design     - Each step can be independently modified or enhanced                 │
│ ✓ Error Isolation    - Failures in one step don't affect others                           │
│ ✓ Debugging Support  - Clear separation of concerns for troubleshooting                   │
│ ✓ Extensibility      - Easy to add new features at any pipeline stage                     │
│ ✓ Type Safety        - Full TypeScript coverage throughout the pipeline                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DATABASE SCHEMA                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TENANT_CREDENTIALS                          │
├─────────────────────────────────────────────────────────────┤
│ 🔑 id (PK)                    - Unique identifier        │
│ 🏷️ tenant_name (UK)           - Unique tenant name       │
│    display_name               - Human-readable name      │
│    environment_version        - Version info             │
│    is_active                  - Boolean status           │
│                                                           │
│ 🔓 ENCRYPTED FIELDS:                                     │
│    encrypted_client_id        - OAuth2 Client ID        │
│    encrypted_client_secret    - OAuth2 Client Secret    │
│    encrypted_saak             - Service Account Key     │
│    encrypted_sask             - Service Account Secret  │
│                                                           │
│ 🔍 PLAIN TEXT FIELDS:                                    │
│    identity_url, portal_url, tenant_id, token_endpoint   │
│    authorization_endpoint, revoke_endpoint, scope,       │
│    version, client_name, data_type, ln_company,          │
│    ln_identity, created_at, updated_at                   │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N (monitors)
                                    ▼
┌─────────────────────────────────────────────────────────────┐     ┌───────────────────────────────────────────────────┐
│               TENANT_HEALTH_CHECKS                      │     │               TENANT_OAUTH_TOKENS               │
├─────────────────────────────────────────────────────────────┤     ├───────────────────────────────────────────────┤
│ 🔑 id (PK)                                         │     │ 🔑 tenant_id (PK)                        │
│ 🔗 tenant_id (FK)                                 │     │    access_token                           │
│    status                                             │     │    token_type                             │
│    response_time                                      │ ◄───│    expires_at                             │
│    error_message                                      │     │    refresh_token                          │
│    checked_at                                         │     │    scope                                  │
└─────────────────────────────────────────────────────────────┘     │    created_at                             │
                                                                    └───────────────────────────────────────────────┘
                                                                    
┌─────────────────────────────────────────────────────────────┐                    ┌─────────────────────────────────────┐
│                REMOTE_API_DATABASES                      │                    │            REMOTE_API_TABLES           │
├─────────────────────────────────────────────────────────────┤                    ├─────────────────────────────────────┤
│ 🔑 id (PK)                                              │ ────────────────────>│ 🔑 id (PK)                      │
│    name                                                   │ 1:N (contains)       │ 🔗 database_id (FK)             │
│ 🏷️ tenant_name (UK)                                    │                      │    name                         │
│    base_url                                               │                      │    endpoint                     │
│    services                                               │                      │    status                       │
│    full_url                                               │                      │    created_at                   │
│    status                                                 │                      └─────────────────────────────────────┘
│    created_at, updated_at                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 KEY RELATIONSHIPS                                               │
│                                                                                                 │
│ • tenant_credentials → tenant_health_checks (1:N) - Monitors connection health            │
│ • tenant_credentials → tenant_oauth_tokens (1:1) - Stores cached authentication tokens  │
│ • remote_api_databases → remote_api_tables (1:N) - Contains available services/tables    │
│                                                                                                 │
│ 🔒 SECURITY FEATURES:                                                                         │
│ • AES-256-GCM encryption for sensitive credentials                                          │
│ • Individual field encryption (not full-record encryption)                                  │
│ • Environment-based encryption key (TENANT_ENCRYPTION_KEY)                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### API Manager Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                API MANAGER ARCHITECTURE                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                               ┌────────────────────────────┐
                               │    UnifiedAPIManager      │
                               │     (Central Router)      │
                               └──────┬───────────────┬──────┘
                                      │                      │
                           REST PATH  │          SOAP PATH    │
                                      ▼                      ▼
┌────────────────────────────────────────────────┐     ┌────────────────────────────────────────────────┐
│                REST API PROCESSING                  │     │                SOAP API PROCESSING                  │
├────────────────────────────────────────────────┤     ├────────────────────────────────────────────────┤
│                                              │     │                                              │
│  ┌─────────────────────┐           │     │  ┌─────────────────────┐           │
│  │   RestAPIManager   │           │     │  │  RemoteAPIManager  │           │
│  └────────┬────────────┘           │     │  └────────┬────────────┘           │
│           │                         │     │           │                         │
│           ▼                         │     │           ▼                         │
│  ┌─────────────────────┐           │     │  ┌─────────────────────┐           │
│  │ OData Query Builder │           │     │  │SOAP Envelope Gen.  │           │
│  └─────────────────────┘           │     │  └─────────────────────┘           │
│                                              │     │                                              │
│  ┌─────────────────────┐           │     │  ┌─────────────────────┐           │
│  │ION OData URL Build.│           │     │  │ ION SOAP URL Build. │           │
│  └─────────────────────┘           │     │  └─────────────────────┘           │
│                                              │     │                                              │
│  ┌─────────────────────┐           │     │  ┌─────────────────────┐           │
│  │  HTTP REST Client   │           │     │  │  HTTP SOAP Client   │           │
│  └─────────────────────┘           │     │  └─────────────────────┘           │
└────────────────────────────────────────────────┘     └────────────────────────────────────────────────┘
                                 │                                       │
                                 ▼                                       ▼
                                       BOTH CONNECT TO SHARED LAYERS
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               AUTHENTICATION LAYER                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────┐    ┌──────────────────┐    ┌───────────────────┐          │
│  │OAuth2ConfigManager │    │ Token Management │    │Token Refresh Logic│          │
│  └────────┬────────────┘    └──────────────────┘    └───────────────────┘          │
└─────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONFIGURATION LAYER                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────┐       ┌────────────────────────────────┐                     │
│  │TenantConfigManager │       │   Encryption/Decryption     │                     │
│  └────────┬────────────┘       └────────────────────────────────┘                     │
│           │                                                                                │
│           ▼                                                                                │
│  ┌────────────────────────────────┐                                             │
│  │     Database Connection         │                                             │
│  │    (SQLite Multi-Tenant)       │                                             │
│  └────────────────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             COMPONENT ARCHITECTURE HIERARCHY                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────────────────────────────────────┐
│   LAYOUT COMPONENTS   │     │                  QUERY COMPONENTS                     │
├─────────────────────┤     ├─────────────────────────────────────────────────────┤
│  DatabaseSidebar     │     │  QueryEditor                                       │
│  NavigationHeader    │     │      │                                           │
│  Footer              │     │      ▼                                           │
└─────┬─────────────────┘     │  QueryResults                                      │
      │                           │      │                                           │
      │ connects to               │      ▼                                           │
      │ credential mgmt           │  IONAPIResultsDisplay                            │
      ▼                           │  RemoteAPIDatabaseList                           │
                                  └─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐     ┌─────────────────────────────────┐
│             CREDENTIAL COMPONENTS                    │     │         UI COMPONENTS          │
├─────────────────────────────────────────────────────┤     ├─────────────────────────────────┤
│  CredentialSelector                               │     │  Button, Dialog, Input,       │
│      │                                         │ ◄───│  Card, Badge                  │
│      ▼                                         │     │                               │
│  CredentialManagement                             │     │  👆 Used throughout all       │
│      │                                         │     │     higher-level components  │
│      ├─────────> CredentialFormDialog              │     └─────────────────────────────────┘
│      │                                         │
│      └─────────> TenantConnectionTest             │
│                                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            CONTEXT PROVIDERS                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌──────────────────────────────────────────────┐                                 │
│  │            DatabaseContext                     │                                 │
│  │      (Local SQLite Database Management)      │                                 │
│  └──────────────────────────────────────────────┘                                 │
│                                                                                                 │
│  ┌──────────────────────────────────────────────┐                                 │
│  │           RemoteAPIContext                     │                                 │
│  │       (ION API & Multi-Tenant Management)      │                                 │
│  └──────────────────────────────────────────────┘                                 │
│                                                                                                 │
│ 🔗 CONTEXT INTEGRATION:                                                                      │
│ • DatabaseSidebar connects to both contexts for mode switching                              │
│ • QueryEditor uses RemoteAPIContext for ION API queries                                    │
│ • All components share state through React Context API                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DATA FLOW ARCHITECTURE                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             USER INTERFACE                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌────────────────────────────────────┐                                         │
│   │         User Input (SQL Query)       │                                         │
│   └────────────────┬────────────────────┘                                         │
│                              │                                                   │
└──────────────────────────────┴──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            QUERY PROCESSING                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌──────────────────────────────────┐       ┌──────────────────────────────────┐        │
│   │      SQL Parser              │       │        API Router           │        │
│   │   (Extract Parameters)        │ ─────>│     (SOAP vs REST)        │        │
│   └──────────────────────────────────┘       └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             AUTHENTICATION                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│       ┌────────────────────────────┐                                                 │
│       │    Database Credentials    │                                                 │
│   ╔═>│       (Priority 1)        │───────────────────────────────────────────────┐        │
│   ║   └────────────────────────────┘                                                 │
│   ║                                                     Token Management       │        │
│   ║   ┌────────────────────────────┐                                                 │
│   ╔═>│   Environment Variables   │            (Cache & Refresh)            │        │
│       │       (Priority 2)        │ ───────────────────────────────────────────────┘        │
│       └────────────────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────┘
                                                                                │
                                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           API COMMUNICATION                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌─────────────────────────────────────┐       ┌─────────────────────────────────┐        │
│   │      REST/OData APIs              │       │         SOAP APIs              │        │
│   │   (tdapi.*, tsapi.*, etc.)        │       │   (BusinessPartner_v3, etc.)    │        │
│   └─────────────────────────────────────┘       └─────────────────────────────────┘        │
│                              │                                   │                │
└──────────────────────────────┴───────────────────────────────────┴────────────────┘
                              │                                   │
                              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSE PROCESSING                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌──────────────────┐       ┌──────────────────┐                         │
│   │    JSON Parser     │       │     XML Parser     │                         │
│   │ (OData Responses) │       │  (SOAP Responses)  │                         │
│   └────────┬──────────┘       └────────┬──────────┘                         │
│            │                            │                                   │
│            └────────────┬────────────┘                                   │
│                         │                                               │
│                         ▼                                               │
│   ┌────────────────────────────────────────┐                         │
│   │        Unified Response Format       │                         │
│   └───────────────────┬────────────────────┘                         │
│                            │                                           │
│                            ▼                                           │
│   ┌────────────────────────────────────────┐                         │
│   │   Client-Side Limiting (15 Records)    │                         │
│   └───────────────────┬────────────────────┘                         │
└───────────────────────────────┴──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               FINAL RESULT                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌──────────────────────────────────────────────────────────────┐             │
│   │                  Formatted Results                         │             │
│   │                   (Table Display)                          │             │
│   └──────────────────────────────────────────────────────────────┘             │
│                                                                                                 │
│ 🔄 DATA FLOW HIGHLIGHTS:                                                                        │
│ • Database credentials take priority over environment variables                               │
│ • Both SOAP and REST APIs converge to unified response format                                 │
│ • Client-side limiting ensures consistent UI performance (15 records default)               │
│ • Token management handles authentication automatically across all API types                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd midport-sql-platform/midport-query-application
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Setup

The application uses SQLite for local storage. The database file (`midport_query_platform.db`) will be created automatically on first run.

## 📖 Usage Guide

### **ION API Integration Workflow**

#### **1. Add ION API Tenant**
1. Click the **"Add New Remote Database"** button in the sidebar (switched to Remote API mode)
2. Fill in the ION API configuration:
   - **Database Name**: Friendly name for identification (e.g., "MIDPORT_DEM")
   - **Base URL**: ION API base URL (e.g., `https://mingle-ionapi.eu1.inforcloudsuite.com`)
   - **Tenant**: ION tenant name (e.g., `MIDPORT_DEM`)
   - **Services Path**: ION services path (e.g., `LN/c4ws/services`)
   - **Services**: Comma-separated ION service names (e.g., `ServiceCall_v2,Customer_v1,Order_v1`)
3. The system will auto-construct the full ION API URL and save the configuration

#### **2. Execute ION API Queries**
1. **Select Tenant**: Choose your ION API tenant from the sidebar
2. **Select Service**: Pick a service (e.g., ServiceCall_v2) from the expanded tenant
3. **Write SQL Query**: Use familiar SQL syntax in the query editor:
   ```sql
   SELECT * FROM ServiceCall_v2 WHERE status = 'active';
   ```
4. **Execute Query**: Click **"Run Query"** to execute

#### **3. Query Processing**
The platform automatically:
- **Parses your SQL** to determine the SOAP action (Read, Create, Update, Delete)
- **Extracts parameters** from WHERE clauses, LIMIT statements, etc.
- **Generates SOAP XML** envelope with proper ION API formatting
- **Authenticates** using OAuth 2.0 service account credentials
- **Makes HTTP POST** request to the ION API endpoint
- **Processes XML response** and displays results

### **Supported Operations**
- **✅ SELECT/Read**: Query data from ION API services
- **🔄 INSERT/Create**: Create new records (planned)
- **🔄 UPDATE/Modify**: Update existing records (planned)
- **🔄 DELETE/Remove**: Delete records (planned)

### **ION API Endpoints**
The platform integrates with ION API endpoints like:
```
https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/Customer_v1
https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/Order_v1
```

## 🔧 API Reference

### **ION API Integration APIs**

#### **Remote Database Management**

##### `GET /api/remote-databases`
Fetches all configured ION API tenant configurations.

**Response:**
```json
{
  "tenants": [
    {
      "id": "1",
      "name": "MIDPORT_DEM",
      "tenantName": "MIDPORT_DEM",
      "baseUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com",
      "services": "LN/c4ws/services",
      "fullUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services",
      "status": "active",
      "tables": [
        {
          "name": "ServiceCall_v2",
          "endpoint": "ServiceCall_v2"
        },
        {
          "name": "Customer_v1",
          "endpoint": "Customer_v1"
        }
      ]
    }
  ]
}
```

##### `POST /api/remote-databases`
Creates a new ION API tenant configuration.

**Request Body:**
```json
{
  "name": "MIDPORT_PROD",
  "fullUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_PROD/LN/c4ws/services",
  "baseUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com",
  "tenantName": "MIDPORT_PROD",
  "services": "LN/c4ws/services",
  "tables": ["ServiceCall_v2", "Customer_v1", "Order_v1"]
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "id": "2",
    "name": "MIDPORT_PROD",
    "tenantName": "MIDPORT_PROD",
    "baseUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com",
    "services": "LN/c4ws/services",
    "fullUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_PROD/LN/c4ws/services",
    "status": "active",
    "tables": [...]
  },
  "isExisting": false,
  "message": "ION API tenant created successfully"
}
```

#### **Query Execution**

##### `POST /api/sqlite/query` (Local SQLite queries)
Executes SQL queries against local SQLite database.

##### **ION API Query Processing**
ION API queries are processed through the frontend using the 7-step pipeline:
1. **Input Validation** - Ensures tenant and service selection
2. **SQL Parsing** - Determines SOAP action from SQL keywords
3. **Parameter Extraction** - Parses WHERE clauses and filters
4. **SOAP Generation** - Creates proper ION API SOAP envelope
5. **OAuth2 Authentication** - Service account token acquisition
6. **API Communication** - HTTP POST to ION API endpoint
7. **Response Processing** - XML response handling and display

### **Authentication Requirements**

#### **OAuth 2.0 Service Account Setup**
The application requires ION API service account credentials via environment variables:

```bash
# ION API OAuth2 Configuration
ION_CLIENT_ID=your_client_id
ION_CLIENT_SECRET=your_client_secret
ION_IDENTITY_URL=https://identity.infor.com
ION_TENANT_ID=your_tenant_id
ION_TOKEN_ENDPOINT=/oauth2/token
ION_SERVICE_ACCOUNT_ACCESS_KEY=your_service_account_key
ION_SERVICE_ACCOUNT_SECRET_KEY=your_service_account_secret
```

#### **Authentication Flow**
1. **Token Acquisition**: Uses Resource Owner Password Grant with service account credentials
2. **Token Storage**: Securely stores access tokens with expiration management
3. **Request Authorization**: Applies Bearer token to ION API requests
4. **Token Refresh**: Automatically handles token expiration and renewal

## 🗄️ Database Schema

### `remote_api_databases` Table
```sql
CREATE TABLE remote_api_databases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tenant_name TEXT UNIQUE NOT NULL,
  base_url TEXT NOT NULL,
  services TEXT NOT NULL,
  full_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `remote_api_tables` Table
```sql
CREATE TABLE remote_api_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (database_id) REFERENCES remote_api_databases(id) ON DELETE CASCADE
);
```

## 🔄 Data Flow

1. **User Input**: User writes SQL query in QueryEditor
2. **Query Parsing**: SQL query is parsed to determine operation type
3. **SOAP Conversion**: SQL is converted to SOAP envelope format
4. **API Request**: SOAP request is sent to remote API
5. **Response Processing**: Response is processed and displayed
6. **Error Handling**: Errors are caught and displayed to user

## 🔍 Remote Database Query Execution

### **Complete Query Flow Analysis**

#### **1. QueryEditor.tsx - Entry Point**
```typescript
// User clicks "Run Query" button in QueryEditor
<Button onClick={onExecute}>
  <Play className="w-4 h-4 mr-1 sm:mr-2" />
  <span>Run Query</span>
</Button>
```

The remote query execution **starts** from `QueryEditor.tsx` when the user clicks the "Run Query" button.

#### **2. Parent Component Routing** (`app/page.tsx`)
```typescript
// Routes to appropriate context based on mode
const executeQuery = mode === 'remote' ? remoteAPI.executeQuery : localDB.executeQuery;

<QueryEditor
  onExecute={executeQuery}  // Routes to RemoteAPIContext for remote mode
  // ... other props
/>
```

#### **3. RemoteAPIContext Processing** (`lib/RemoteAPIContext.tsx`)
```typescript
const executeQuery = async () => {
  // 1. Validates tenant and table selection
  if (!selectedTenant || !selectedTable) {
    setError('Please select a tenant and table before running queries');
    return;
  }

  // 2. Parses SQL query to determine SOAP action
  const queryStr = query.trim().toLowerCase();
  let action = 'read';
  if (queryStr.includes('read') || queryStr.includes('get') || queryStr.startsWith('select')) {
    action = 'read';
  }

  // 3. Builds ION API request configuration
  const config: SOAPRequestConfig = {
    tenant: selectedTenant.name,
    table: selectedTable.endpoint,
    action: action,
    parameters: parameters,
    sqlQuery: query,
    fullUrl: selectedTenant.fullUrl
  };

  // 4. Calls RemoteAPIManager for actual API execution
  const result = await RemoteAPIManager.executeQueryWithOAuth2(config, '', '', currentToken);
  setResults([result]);
};
```

#### **4. SOAP Request Generation** (`lib/RemoteAPIManager.ts`)

**URL Construction:**
```typescript
static buildIONAPIUrl(tenant: string, service: string): string {
  return `${this.BASE_URL}/${tenant}/LN/c4ws/services/${service}`;
  // https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
}
```

**SOAP Envelope Creation:**
```typescript
static generateSOAPEnvelope(action: string, parameters: Record<string, any> = {}): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${action} xmlns="http://www.infor.com/ln/c4ws">
      ${paramXml}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
}
```

#### **5. OAuth2 Authentication** (`lib/OAuth2ConfigManager.ts`)

**Service Account Authentication:**
```typescript
const formData = new URLSearchParams();
formData.append('grant_type', 'password');
formData.append('client_id', config.clientId);
formData.append('client_secret', config.clientSecret);
formData.append('saak', config.username); // Service Account Access Key
formData.append('sask', config.password); // Service Account Secret Key
```

**Token Management:**
- Loads credentials from environment variables (`ION_CLIENT_ID`, `ION_CLIENT_SECRET`, etc.)
- Uses **Resource Owner Password Grant** with service account keys
- Handles token acquisition, validation, and refresh

#### **6. HTTP Request Execution**

**Authenticated API Call:**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': `"${config.action}"`,
    'Accept': 'text/xml',
    'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
  },
  body: soapEnvelope,
});
```

#### **7. Response Processing**

**XML Response Handling:**
- Receives SOAP XML response from ION API
- Currently returns raw XML data (development stage)
- Future: Parse XML and convert to structured JSON format

### **Query Execution Summary**

| Step | Component/File | Action |
|------|----------------|---------|
| **1** | `QueryEditor.tsx` | User clicks "Run Query" → calls `onExecute()` |
| **2** | `app/page.tsx` | Routes to `remoteAPI.executeQuery` (mode-based) |
| **3** | `RemoteAPIContext.tsx` | Validates, parses SQL, builds SOAP config |
| **4** | `RemoteAPIManager.ts` | Creates SOAP envelope, makes authenticated API call |
| **5** | ION API | Processes SOAP request, returns XML response |
| **6** | `QueryResults.tsx` | Displays results to user |

### **Key Technical Components**

| Component | Responsibility |
|-----------|---------------|
| **QueryEditor.tsx** | Entry point - captures user query input and triggers execution |
| **RemoteAPIContext.tsx** | SQL parsing, SOAP config building, state management |
| **RemoteAPIManager.ts** | SOAP envelope generation, HTTP request execution |
| **OAuth2ConfigManager.ts** | Service account authentication, token management |
| **ION API** | External SOAP API that processes requests and returns XML data |

### **Query Processing Pipeline**

1. **Input Validation** - Ensures tenant and table are selected
2. **SQL Parsing** - Determines action type (read, create, update, delete)
3. **Parameter Extraction** - Parses WHERE clauses, LIMIT, etc. from SQL
4. **SOAP Generation** - Converts SQL to proper SOAP envelope format
5. **Authentication** - Applies OAuth2 service account credentials
6. **API Communication** - Makes HTTP POST request to ION API endpoint
7. **Response Handling** - Processes XML response for user display

## 🚀 7-Step Complete Query Execution Pipeline

### **Step 1: Input Validation** 🛡️
```typescript
// In RemoteAPIContext.tsx
if (!selectedTenant || !selectedTable) {
  setError('Please select a tenant and table before running queries');
  return;
}
```
- **Purpose**: Ensures user has selected both a tenant and table before proceeding
- **Validation**: Checks for non-null tenant and table objects
- **Error Handling**: Provides clear user feedback for missing selections

### **Step 2: SQL Query Parsing** 🔍
```typescript
// Parse SQL to determine SOAP action
const queryStr = query.trim().toLowerCase();
let action = 'read';

if (queryStr.includes('read') || queryStr.includes('get') || queryStr.startsWith('select')) {
  action = 'read';
} else if (queryStr.includes('create') || queryStr.includes('insert')) {
  action = 'create';
}
// ... additional parsing logic
```
- **Purpose**: Analyzes SQL query to determine the appropriate SOAP action
- **Keywords**: Maps SQL operations (SELECT, INSERT, UPDATE, DELETE) to SOAP actions
- **Action Types**: Determines CRUD operation type for API call

### **Step 3: Parameter Extraction** 📋
```typescript
// Extract parameters from SQL query
const parameters = parseParametersFromQuery(query, selectedTable);
// Extracts WHERE clauses, LIMIT statements, etc.
```
- **Purpose**: Parses SQL query for filter conditions and parameters
- **WHERE Clauses**: Extracts filter conditions from SQL
- **LIMIT/OFFSET**: Handles pagination parameters
- **Service-Specific**: Adds default parameters based on service type

### **Step 4: SOAP Envelope Generation** 📨
```typescript
// In RemoteAPIManager.ts
static generateSOAPEnvelope(action: string, parameters: Record<string, any> = {}): string {
  const paramXml = Object.entries(parameters)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${action} xmlns="http://www.infor.com/ln/c4ws">
      ${paramXml}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
}
```
- **Purpose**: Converts parsed SQL into proper SOAP XML envelope
- **XML Structure**: Creates valid SOAP 1.1 envelope format
- **Parameters**: Embeds extracted parameters as XML elements

### **Step 5: OAuth2 Authentication** 🔐
```typescript
// In OAuth2ConfigManager.ts
const formData = new URLSearchParams();
formData.append('grant_type', 'password');
formData.append('client_id', config.clientId);
formData.append('client_secret', config.clientSecret);
formData.append('saak', config.username); // Service Account Access Key
formData.append('sask', config.password); // Service Account Secret Key

const response = await fetch(config.tokenEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: formData.toString(),
});
```
- **Purpose**: Authenticates with ION API using service account credentials
- **Grant Type**: Uses Resource Owner Password Grant flow
- **Token Storage**: Manages access tokens with expiration handling

### **Step 6: API Communication** 🌐
```typescript
// In RemoteAPIManager.ts
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': `"${config.action}"`,
    'Accept': 'text/xml',
    'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token),
  },
  body: soapEnvelope,
});

if (!response.ok) {
  throw new Error(`ION API Error ${response.status}: ${response.statusText}`);
}
```
- **Purpose**: Makes authenticated HTTP POST request to ION API
- **Protocol**: SOAP XML over HTTP POST
- **Headers**: Includes OAuth2 authorization and proper content types
- **Error Handling**: Comprehensive HTTP error management

### **Step 7: Response Processing** 📦
```typescript
// Process XML response
const responseText = await response.text();
console.log('✅ ION API request successful');

return {
  success: true,
  url: url,
  action: config.action,
  status: response.status,
  statusText: response.statusText,
  data: responseText, // Currently returns raw XML
  note: 'ION API SOAP response received successfully'
};
```
- **Purpose**: Handles API response and prepares data for UI display
- **Current State**: Returns raw SOAP XML (development stage)
- **Future Enhancement**: Will parse XML and convert to structured JSON
- **Error Handling**: Manages API failures and network issues

---

### **Pipeline Benefits**
✅ **Modular Design** - Each step can be independently modified or enhanced
✅ **Error Isolation** - Failures in one step don't affect others
✅ **Debugging Support** - Clear separation of concerns for troubleshooting
✅ **Extensibility** - Easy to add new features at any pipeline stage
✅ **Type Safety** - Full TypeScript coverage throughout the pipeline

## 🧪 Testing

### Manual Testing
1. Add a remote database with valid credentials
2. Select a table and write a simple SELECT query
3. Execute the query and verify results
4. Test error scenarios (invalid URLs, network issues)

### Test Scenarios
- ✅ Add new remote database
- ✅ Handle duplicate database names
- ✅ Execute SELECT queries
- ✅ Display query results
- ✅ Handle API errors gracefully

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
- `NODE_ENV`: Set to `production` for production builds
- `DATABASE_URL`: SQLite database file path (optional)

## 🤝 Contributing

### Code Standards
- Use TypeScript for all new code
- Follow React best practices
- Add JSDoc comments for all functions
- Use meaningful variable and function names
- Handle errors gracefully

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with proper documentation
3. Test thoroughly
4. Submit pull request with description

## 📝 License

This project is proprietary software owned by Midport Scandinavia.

## 📞 Support

For technical support or questions, contact:
- **Developer**: Mulugeta Forsido
- **Company**: Midport Scandinavia

---

**Built with ❤️ by Mulugeta Forsido for Midport Scandinavia**