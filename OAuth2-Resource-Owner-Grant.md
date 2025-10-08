# OAuth2 Resource Owner Grant Implementation for Midport SQL Platform

## Overview

This document outlines the implementation of OAuth2 Resource Owner Grant authentication for accessing Infor ION APIs within the Midport SQL Platform. The implementation follows the OAuth2 specification and Infor's specific requirements for API authentication.

## OAuth2 Resource Owner Grant Flow

### 1. Authentication Flow Overview

The OAuth2 Resource Owner Grant flow allows the application to obtain access tokens using user credentials directly. This is suitable for trusted applications where the user can securely provide their credentials.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Server    │    │   Resource  │
│ Application │    │ (ION API)   │    │   Owner     │
│             │    │             │    │   (User)    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │ 1. Request Token  │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │ 2. Access Token   │                   │
       │◀──────────────────│                   │
       │                   │                   │
       │ 3. API Request    │                   │
       │    with Token     │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │ 4. Protected      │                   │
       │    Resource       │                   │
       │◀──────────────────│                   │
```

### 2. Required Components

#### 2.1 OAuth2 Configuration
Each tenant requires the following OAuth2 configuration:

```typescript
interface OAuth2Config {
  clientId: string;           // OAuth2 client identifier
  clientSecret: string;       // OAuth2 client secret
  username: string;           // ION API username
  password: string;           // ION API password
  tokenEndpoint: string;      // Token endpoint URL
  scope?: string;             // Requested scope (optional)
}
```

#### 2.2 Token Management
The application must handle:
- Token acquisition
- Token storage (secure)
- Token refresh
- Token expiration handling

```typescript
interface StoredOAuth2Token {
  accessToken: string;        // Bearer token
  tokenType: string;         // Usually "Bearer"
  expiresAt: number;         // Expiration timestamp
  refreshToken?: string;     // For token refresh
  scope?: string;            // Granted scope
}
```

### 3. Implementation Architecture

#### 3.1 OAuth2Manager Class
A dedicated class to handle OAuth2 operations:

```typescript
class OAuth2Manager {
  // Obtain access token using Resource Owner Grant
  static async getAccessToken(config: OAuth2Config): Promise<StoredOAuth2Token>
  
  // Refresh expired token
  static async refreshToken(token: StoredOAuth2Token, config: OAuth2Config): Promise<StoredOAuth2Token>
  
  // Check if token is valid and not expired
  static isTokenValid(token: StoredOAuth2Token): boolean
  
  // Get authorization header for API requests
  static getAuthorizationHeader(token: StoredOAuth2Token): string
}
```

#### 3.2 Integration with RemoteAPIManager
The existing `RemoteAPIManager` class needs to be enhanced to:

1. **Check Authentication**: Verify if tenant has valid OAuth2 token
2. **Auto-refresh**: Automatically refresh expired tokens
3. **Add Headers**: Include Authorization header in SOAP requests
4. **Handle Errors**: Manage authentication failures gracefully

### 4. ION API Configuration File

#### 4.1 Configuration File Format
The application uses `.ionapi` configuration files that contain JSON with OAuth2 settings:

```json
{
  "ti": "MIDPORT_DEM",                    // Tenant ID
  "cn": "Build_IMS",                      // Client Name
  "dt": "12",                            // Data Type
  "ci": "MIDPORT_DEM~xd5pOrEUEDIBOzI35n3Oxdqn3s13SW-pki8eWHPOOzQ",  // Client ID
  "cs": "P78NV1YXN18g9EdrTM3tIlMRhoHGf49WMHWExiAri8E1uj2rkVAqFoHmKJXBUApst6CB6WIvXhSzVdEC_gQgLQ",  // Client Secret
  "iu": "https://mingle-ionapi.eu1.inforcloudsuite.com",  // Identity URL
  "pu": "https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/",  // Portal URL
  "oa": "authorization.oauth2",           // OAuth Authorization endpoint
  "ot": "token.oauth2",                  // OAuth Token endpoint
  "or": "revoke_token.oauth2",           // OAuth Revoke endpoint
  "ev": "V1480769020",                   // Environment version
  "v": "1.0",                            // Version
  "saak": "MIDPORT_DEM#h2SZV7INDI9b88OlZXzb43kTuHi0ojMdOCPUm5uPMsxSyZEQiwzthSPyPqbYsYdIf2Bi2qHP6QKgMK4f7cI8wA",  // Service Account Access Key
  "sask": "MAFLmqHQpGrPi1g8lsQGnSlNtCj-wrgST681wUwgU2DzNBD4wmxVe58eNDy63TNceni7Jqhks167UHTFeocQAw"  // Service Account Secret Key
}
```

#### 4.2 Configuration Parser
A utility class to parse `.ionapi` files:

```typescript
interface IONAPIConfig {
  ti: string;    // Tenant ID
  cn: string;    // Client Name
  dt: string;    // Data Type
  ci: string;    // Client ID
  cs: string;    // Client Secret
  iu: string;    // Identity URL
  pu: string;    // Portal URL
  oa: string;    // OAuth Authorization endpoint
  ot: string;    // OAuth Token endpoint
  or: string;    // OAuth Revoke endpoint
  ev: string;    // Environment version
  v: string;     // Version
  saak: string;  // Service Account Access Key
  sask: string;  // Service Account Secret Key
}

class IONAPIConfigParser {
  static parseConfigFile(filePath: string): IONAPIConfig {
    // Parse .ionapi JSON file
  }
  
  static convertToOAuth2Config(ionConfig: IONAPIConfig): OAuth2Config {
    // Convert ION API config to OAuth2Config format
  }
}
```

### 5. Token Endpoint Configuration

#### 5.1 Infor ION API Authorization Code Grant
Based on the actual configuration file `Build_IMS.ionapi`, the Authorization Code Grant flow uses:

**URLs from Build_IMS.ionapi:**
- **Portal URL (pu)**: `https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/`
- **Authorization Endpoint (oa)**: `authorization.oauth2`
- **Token Endpoint (ot)**: `token.oauth2`
- **Client ID (ci)**: `MIDPORT_DEM~xd5pOrEUEDIBOzI35n3Oxdqn3s13SW-pki8eWHPOOzQ`
- **Client Secret (cs)**: `P78NV1YXN18g9EdrTM3tIlMRhoHGf49WMHWExiAri8E1uj2rkVAqFoHmKJXBUApst6CB6WIvXhSzVdEC_gQgLQ`

**Authorization Code Grant Flow:**
1. **Authorization Request**: `pu + oa` = `https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/authorization.oauth2`
2. **Token Exchange**: `pu + ot` = `https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/token.oauth2`

#### 5.2 Request Format
The token request should be sent as `application/x-www-form-urlencoded`:

```
POST /MIDPORT_DEM/oauth2/token HTTP/1.1
Host: mingle-ionapi.eu1.inforcloudsuite.com
Content-Type: application/x-www-form-urlencoded

grant_type=password&
client_id=MIDPORT_DEM~xd5pOrEUEDIBOzI35n3Oxdqn3s13SW-pki8eWHPOOzQ&
client_secret=P78NV1YXN18g9EdrTM3tIlMRhoHGf49WMHWExiAri8E1uj2rkVAqFoHmKJXBUApst6CB6WIvXhSzVdEC_gQgLQ&
username={username}&
password={password}&
scope={scope}
```

#### 5.3 Response Format
The token endpoint returns a JSON response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "scope": "read write"
}
```

### 5. Implementation with Service Account Keys

#### 5.1 Service Account Authentication for Infor ION APIs
For programmatic access, Infor ION APIs support **Service Account Keys** from the `.ionapi` configuration file:

**Service Account Keys from Build_IMS.ionapi:**
- **Service Account Access Key (saak)**: `MIDPORT_DEM#h2SZV7INDI9b88OlZXzb43kTuHi0ojMdOCPUm5uPMsxSyZEQiwzthSPyPqbYsYdIf2Bi2qHP6QKgMK4f7cI8wA`
- **Service Account Secret Key (sask)**: `MAFLmqHQpGrPi1g8lsQGnSlNtCj-wrgST681wUwgU2DzNBD4wmxVe58eNDy63TNceni7Jqhks167UHTFeocQAw`

**Resource Owner Grant with Service Account Keys:**
```
POST https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/token.oauth2
Content-Type: application/x-www-form-urlencoded

grant_type=password&
client_id=MIDPORT_DEM~xd5pOrEUEDIBOzI35n3Oxdqn3s13SW-pki8eWHPOOzQ&
client_secret=P78NV1YXN18g9EdrTM3tIlMRhoHGf49WMHWExiAri8E1uj2rkVAqFoHmKJXBUApst6CB6WIvXhSzVdEC_gQgLQ&
saak=MIDPORT_DEM#h2SZV7INDI9b88OlZXzb43kTuHi0ojMdOCPUm5uPMsxSyZEQiwzthSPyPqbYsYdIf2Bi2qHP6QKgMK4f7cI8wA&
sask=MAFLmqHQpGrPi1g8lsQGnSlNtCj-wrgST681wUwgU2DzNBD4wmxVe58eNDy63TNceni7Jqhks167UHTFeocQAw
```

### 6. Implementation with .ionapi Files

#### 5.1 Environment Configuration (.env.local)
Store OAuth2 credentials securely in environment variables:

```bash
# .env.local
# ION API OAuth2 Configuration with Service Account Keys
ION_CLIENT_ID=MIDPORT_DEM~xd5pOrEUEDIBOzI35n3Oxdqn3s13SW-pki8eWHPOOzQ
ION_CLIENT_SECRET=P78NV1YXN18g9EdrTM3tIlMRhoHGf49WMHWExiAri8E1uj2rkVAqFoHmKJXBUApst6CB6WIvXhSzVdEC_gQgLQ
ION_IDENTITY_URL=https://mingle-ionapi.eu1.inforcloudsuite.com
ION_PORTAL_URL=https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/
ION_TENANT_ID=MIDPORT_DEM
ION_TOKEN_ENDPOINT=token.oauth2
ION_AUTHORIZATION_ENDPOINT=authorization.oauth2
ION_REVOKE_ENDPOINT=revoke_token.oauth2

# Service Account Keys (for programmatic access)
ION_SERVICE_ACCOUNT_ACCESS_KEY=MIDPORT_DEM#h2SZV7INDI9b88OlZXzb43kTuHi0ojMdOCPUm5uPMsxSyZEQiwzthSPyPqbYsYdIf2Bi2qHP6QKgMK4f7cI8wA
ION_SERVICE_ACCOUNT_SECRET_KEY=MAFLmqHQpGrPi1g8lsQGnSlNtCj-wrgST681wUwgU2DzNBD4wmxVe58eNDy63TNceni7Jqhks167UHTFeocQAw

ION_SCOPE=read write
ION_ENVIRONMENT_VERSION=V1480769020
ION_VERSION=1.0
ION_CLIENT_NAME=Build_IMS
ION_DATA_TYPE=12
```

#### 5.2 Loading Configuration from Environment
Load OAuth2 configuration from environment variables:

```typescript
class IONAPIConfigLoader {
  static loadConfigFromEnv(): OAuth2Config {
    const requiredEnvVars = [
      'ION_CLIENT_ID',
      'ION_CLIENT_SECRET',
      'ION_IDENTITY_URL',
      'ION_TENANT_ID',
      'ION_TOKEN_ENDPOINT'
    ];

    // Validate required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      clientId: process.env.ION_CLIENT_ID!,
      clientSecret: process.env.ION_CLIENT_SECRET!,
      username: '', // To be provided by user
      password: '', // To be provided by user
      tokenEndpoint: `${process.env.ION_IDENTITY_URL}/${process.env.ION_TENANT_ID}/${process.env.ION_TOKEN_ENDPOINT}`,
      scope: process.env.ION_SCOPE || 'read write'
    };
  }

  static async loadConfigFromFile(filePath: string): Promise<OAuth2Config> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const ionConfig: IONAPIConfig = JSON.parse(fileContent);
      
      return {
        clientId: ionConfig.ci,
        clientSecret: ionConfig.cs,
        username: '', // To be provided by user
        password: '', // To be provided by user
        tokenEndpoint: `${ionConfig.iu}/${ionConfig.ti}/${ionConfig.ot}`,
        scope: 'read write' // Default scope
      };
    } catch (error) {
      throw new Error(`Failed to load ION API configuration: ${error.message}`);
    }
  }
}
```

#### 5.3 Integration with RemoteAPIManager
Update the RemoteAPIManager to use environment configuration:

```typescript
class RemoteAPIManager {
  static async executeQueryWithOAuth2(
    config: SOAPRequestConfig, 
    username: string,
    password: string
  ): Promise<RemoteAPIQueryResult> {
    // Load OAuth2 configuration from environment variables
    const oauth2Config = IONAPIConfigLoader.loadConfigFromEnv();
    oauth2Config.username = username;
    oauth2Config.password = password;
    
    // Get access token
    const token = await OAuth2Manager.getAccessToken(oauth2Config);
    
    // Execute query with OAuth2 headers
    return this.executeQueryWithToken(config, token);
  }

  static async executeQueryWithToken(
    config: SOAPRequestConfig, 
    token: StoredOAuth2Token
  ): Promise<RemoteAPIQueryResult> {
    const url = config.fullUrl || this.buildAPIUrl(config.tenant, config.table);
    const soapEnvelope = this.generateSOAPEnvelope(config.action, config.parameters);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${config.action}"`,
        'Accept': 'text/xml',
        'Authorization': `${token.tokenType} ${token.accessToken}`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    return {
      success: true,
      url: url,
      action: config.action,
      status: response.status,
      statusText: response.statusText,
      note: 'Response processing will be implemented in Phase Two'
    };
  }
}
```

#### 5.4 Example Usage with Service Account
```typescript
// Execute query with OAuth2 service account authentication (automatic)
const result = await RemoteAPIManager.executeQueryWithOAuth2(
  {
    tenant: 'MIDPORT_DEM',
    table: 'Customer_v1',
    action: 'Read',
    parameters: {}
  },
  '', // Empty username - uses service account from env
  '', // Empty password - uses service account from env
);

// With token caching (recommended for multiple requests)
let currentToken: StoredOAuth2Token | null = null;

const result1 = await RemoteAPIManager.executeQueryWithOAuth2(
  {
    tenant: 'MIDPORT_DEM',
    table: 'Customer_v1',
    action: 'Read',
    parameters: {}
  },
  '', // Service account authentication
  '',
  currentToken
);

// Subsequent requests will reuse the token if it's still valid
const result2 = await RemoteAPIManager.executeQueryWithOAuth2(
  {
    tenant: 'MIDPORT_DEM',
    table: 'ServiceCall_v2',
    action: 'Read',
    parameters: {}
  },
  '', // Service account authentication
  '',
  currentToken
);
```

#### 5.5 Environment Setup
1. **Copy the sample file**: Copy `.env.local.example` to `.env.local` in your project root
2. **Update values**: Modify the values in `.env.local` as needed for your environment
3. **Never commit**: Ensure `.env.local` is in your `.gitignore` file
4. **Load automatically**: The `OAuth2ConfigManager` will automatically load these values

```bash
# Copy the sample file
cp .env.local.example .env.local

# Edit the file with your actual values
# The OAuth2ConfigManager will automatically use these environment variables
```

### 6. Security Considerations

#### 5.1 Credential Storage
- **Client Secret**: Store securely, never log or expose
- **User Credentials**: Store encrypted or prompt user each time
- **Access Tokens**: Store securely with expiration tracking
- **Refresh Tokens**: Store securely for token renewal

#### 5.2 Token Security
- **HTTPS Only**: All token requests must use HTTPS
- **Token Expiration**: Implement proper expiration handling
- **Token Revocation**: Handle token invalidation scenarios
- **Secure Storage**: Use secure storage mechanisms

#### 5.3 Error Handling
- **Authentication Failures**: Handle invalid credentials gracefully
- **Token Expiration**: Automatically refresh when possible
- **Network Errors**: Implement retry logic with exponential backoff
- **Rate Limiting**: Handle API rate limiting responses

### 6. Database Schema Updates

#### 6.1 Remote API Tenants Table
Add OAuth2 configuration fields:

```sql
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_client_id TEXT;
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_client_secret TEXT;
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_username TEXT;
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_password TEXT;
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_token_endpoint TEXT;
ALTER TABLE remote_api_tenants ADD COLUMN oauth2_scope TEXT;
```

#### 6.2 Token Storage
Consider separate table for token storage:

```sql
CREATE TABLE oauth2_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES remote_api_tenants(id)
);
```

### 7. UI/UX Considerations

#### 7.1 Configuration Interface
- **OAuth2 Settings**: Add OAuth2 configuration section to tenant setup
- **Credential Input**: Secure input fields for client credentials
- **Test Connection**: Button to test OAuth2 authentication
- **Token Status**: Display current token status and expiration

#### 7.2 User Experience
- **Auto-authentication**: Seamless token management for users
- **Error Messages**: Clear error messages for authentication failures
- **Loading States**: Show loading indicators during token acquisition
- **Security Indicators**: Visual indicators for secure connections

### 8. Implementation Phases

#### Phase 1: Core OAuth2 Implementation
1. Create OAuth2Manager class
2. Implement token acquisition
3. Add basic token storage
4. Update RemoteAPIManager integration

#### Phase 2: Enhanced Security
1. Implement secure credential storage
2. Add token refresh mechanism
3. Implement proper error handling
4. Add comprehensive logging

#### Phase 3: UI Integration
1. Update tenant configuration UI
2. Add OAuth2 settings forms
3. Implement connection testing
4. Add token status indicators

#### Phase 4: Advanced Features
1. Implement token caching
2. Add multi-tenant token management
3. Implement token revocation
4. Add comprehensive monitoring

### 9. Testing Strategy

#### 9.1 Unit Tests
- OAuth2Manager token acquisition
- Token validation logic
- Error handling scenarios
- Token refresh functionality

#### 9.2 Integration Tests
- End-to-end authentication flow
- API request with OAuth2 headers
- Token expiration handling
- Network failure scenarios

#### 9.3 Security Tests
- Credential storage security
- Token transmission security
- Authentication bypass attempts
- Token manipulation attempts

### 10. Monitoring and Logging

#### 10.1 Authentication Events
- Token acquisition attempts
- Token refresh operations
- Authentication failures
- Token expiration events

#### 10.2 Performance Metrics
- Token acquisition time
- API request latency
- Token refresh frequency
- Authentication success rate

#### 10.3 Security Monitoring
- Failed authentication attempts
- Token usage patterns
- Unusual access patterns
- Security policy violations

## Conclusion

This OAuth2 Resource Owner Grant implementation provides a secure, scalable approach to authenticating with Infor ION APIs. The implementation follows OAuth2 best practices while addressing the specific requirements of the Midport SQL Platform's multi-tenant architecture.

The phased approach ensures a robust implementation that can be built incrementally while maintaining security and usability throughout the development process.
