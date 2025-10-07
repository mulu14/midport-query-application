# 🌐 Project Objective

## **Core Mission**
Enable **secure and seamless integration** with remote **Infor ION APIs** through a unified query platform.

### **Example ION API Endpoint**
```
https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
```

## 🧩 Technical Context

### **Multi-Tenant Architecture**
- **Tenant Structure**: Each tenant (e.g., `MIDPORT_DEM`) contains multiple API endpoints and services
- **Service Examples**:
  - `ServiceCall_v2` - Service call management
  - `Customer_v1` - Customer data operations
  - `Order_v1` - Order processing

### **Local Configuration Management**
- **Metadata Storage**: All tenant and service configuration stored locally before API calls
- **Connection Management**: Centralized configuration for multiple ION API tenants

### **User Experience Abstraction**
- **Simplified Interface**: Users execute queries without understanding:
  - Complex API structures
  - OAuth2 authentication flows
  - SOAP XML payload formatting
  - Response parsing requirements

## 🔐 Authentication Strategy

### **OAuth 2.0 Implementation**
**Authorization Code Grant** flow as specified in Infor's developer documentation.

### **Authentication Workflow**
1. **Token Acquisition** - Obtain access tokens for authenticated requests
2. **API Requests** - Use tokens for POST requests to ION API endpoints
3. **Request Format** - SOAP XML payloads with proper authentication headers
4. **Response Processing** - Parse XML responses and convert to structured JSON

### **Example API Call**
```http
POST https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2
Authorization: Bearer <access_token>
Content-Type: text/xml; charset=utf-8

<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Read xmlns="http://www.infor.com/ln/c4ws">
      <!-- Query parameters -->
    </Read>
  </soap:Body>
</soap:Envelope>
```

## ⚙️ Implementation Workflow

### **Core Process Steps**
1. **Configuration Storage** - Store tenant and service metadata in local database
2. **OAuth2 Token Management** - Implement Authorization Code Grant for valid access tokens
3. **SOAP Request Generation** - Create properly formatted SOAP XML requests
4. **API Communication** - Execute authenticated POST requests to ION API endpoints
5. **Response Processing** - Parse XML responses and format for frontend consumption
6. **User Interface** - Provide simple query interface abstracting technical complexity

### **Technical Requirements**
- **Local Database**: SQLite for configuration and metadata storage
- **Authentication**: OAuth2 service account integration
- **API Protocol**: SOAP XML over HTTP POST
- **Response Format**: XML to JSON conversion
- **Error Handling**: Comprehensive error management and user feedback

---

# 🏗️ System Architecture & Codebase Analysis

## **Project Architecture Overview**

This is a **Midport SQL Query Platform** that provides a unified interface for both local SQLite databases and remote Infor ION API integration.

### **Core System Design**
- **Dual-Mode Architecture**:
  - **Local Mode**: Traditional SQL queries against local SQLite database
  - **Remote Mode**: Integration with Infor ION APIs using OAuth 2.0 + SOAP XML

### **Key Components**

#### **1. Context Management**
- **`SidebarModeContext`**: Manages switching between local/remote modes
- **`DatabaseContext`**: Handles local SQLite databases, queries, and results
- **`RemoteAPIContext`**: Manages remote ION API tenants, authentication, and API calls

#### **2. Authentication & API Integration**
- **`OAuth2ConfigManager`**: Loads service account credentials from environment variables
- **`RemoteAPIManager`**:
  - Generates SOAP XML envelopes for ION API requests
  - Handles OAuth 2.0 token management and API calls
  - Converts SQL-like queries to SOAP actions (Read, Create, Update, Delete)

#### **3. Database Layer**
- **SQLite Manager**: Handles local database operations, migrations, and sample data
- **Tables**: customers, products, orders (with relationships)
- **Remote API Database Management**: Stores tenant configurations and service metadata

#### **4. API Endpoints**
- **`/api/databases`**: Local database CRUD operations
- **`/api/remote-databases`**: Remote ION API tenant management
- **`/api/sqlite/query`**: SQL query execution against local database
- **`/api/sqlite/tables`**: Local database table metadata

## **Component Analysis**

### **AddDatabaseDialog.tsx**
A sophisticated dialog component for adding databases with dual-mode support:

**Key Features:**
- **Dynamic Form Rendering**: Adapts based on sidebar mode (local vs remote)
- **URL Parsing**: Automatically extracts ION API URL components (base URL, tenant, services, tables)
- **Form State Management**: Comprehensive state handling for all database configuration fields
- **Validation**: Required field validation and form submission handling

**Remote API Mode Fields:**
- Database name, Base URL, Tenant name, Services path, Tables (comma-separated)
- Auto-constructs full URL from individual components
- Parses existing ION API URLs to populate form fields

**Local Database Mode Fields:**
- Database name, Database type (SQLite, PostgreSQL, MySQL, etc.)
- Connection strings for different database types
- API keys for REST API connections

**Integration:**
- Uses both `DatabaseContext` and `RemoteAPIContext` for state management
- Calls appropriate creation methods based on selected mode
- Provides success callbacks and form reset functionality

### **All Scripts Under lib/**

#### **DatabaseContext.tsx**
Context provider for local SQLite database management:
- Database CRUD operations (Create, Read, Update, Delete)
- SQL query execution against local SQLite database
- State management for selected databases, tables, queries, and results
- Auto-query generation based on selected tables

#### **RemoteAPIContext.tsx**
Context provider for remote ION API integration:
- Tenant (remote database) management
- SQL query to SOAP request conversion
- OAuth2 authentication integration
- Remote API state management (tenants, tables, queries, results)
- CRUD operations for remote API tenants

#### **RemoteAPIManager.ts**
Core ION API integration logic:
- **SOAP Envelope Generation**: Creates properly formatted SOAP XML requests
- **OAuth2 Integration**: Token management and authenticated API calls
- **URL Building**: Constructs ION API URLs for different tenants and services
- **Query Execution**: Handles the complete request/response cycle
- **Error Handling**: Comprehensive error handling for API failures

#### **OAuth2ConfigManager.ts**
OAuth2 authentication management:
- **Environment Configuration**: Loads credentials from environment variables
- **Service Account Authentication**: Uses SAAK/SASK service account keys
- **Token Management**: Token acquisition, validation, and refresh logic
- **Authorization Headers**: Generates proper auth headers for API requests

#### **SidebarModeContext.tsx**
Simple context for managing UI modes:
- Toggles between 'local' and 'remote' database modes
- Provides mode state and setter functions

#### **sqlite.ts**
SQLite database manager for local data storage:
- **Connection Management**: Handles SQLite database connections
- **Schema Management**: Database migrations and table creation
- **CRUD Operations**: Complete database, table, and record management
- **Sample Data**: Seeds customers, products, and orders tables
- **Query Execution**: Promise-based query execution wrappers

#### **jsonStorage.ts**
Alternative file-based storage manager:
- **JSON File Persistence**: Stores database configurations in JSON files
- **CRUD Operations**: Similar functionality to SQLite manager but file-based
- **Default Data**: Initializes with sample database configurations

#### **utils.ts**
CSS utility functions:
- **Class Merging**: Uses `clsx` and `tailwind-merge` for optimal CSS class management

## **Type Definitions (Entities/RemoteAPI.ts)**

Complete TypeScript interface definitions for remote API functionality:

### **Core Interfaces:**
- **`RemoteAPITable`**: Table/service metadata with name and endpoint
- **`OAuth2Config`**: OAuth2 authentication configuration
- **`OAuth2TokenResponse`**: Token response from ION API
- **`StoredOAuth2Token`**: Token storage with expiration metadata
- **`RemoteAPITenant`**: Tenant (database) object with tables and OAuth2 config
- **`SOAPRequestConfig`**: SOAP request configuration for ION API calls
- **`RemoteAPIQueryResult`**: Query execution result object
- **`RemoteAPIDatabase`**: Complete database object with all metadata

## **System Architecture Summary**

The codebase implements a **dual-mode database query platform**:

1. **Local Mode**: Traditional SQL queries against local SQLite database
2. **Remote Mode**: ION API integration using OAuth2 + SOAP XML

**Key Integration Points:**
- **OAuth2 Service Account Authentication** using ION API credentials
- **SOAP XML Request Generation** from SQL-like queries
- **ION API URL Construction** for different tenants and services
- **Unified UI** that abstracts technical complexity from users

**Data Flow:**
1. User selects mode (local/remote) in sidebar
2. Chooses database/tenant and table
3. Enters SQL-like query
4. System converts to appropriate API calls (SQL for local, SOAP for remote)
5. Returns formatted results in unified interface

**Current Implementation Status:**
- ✅ **Fully Implemented**: Local SQLite database with sample data, complete UI with mode switching
- 🔄 **In Development**: ION API integration with OAuth 2.0 authentication and SOAP XML handling

This architecture provides a seamless experience for both local database operations and complex enterprise ION API integrations while maintaining clean separation of concerns and comprehensive error handling.