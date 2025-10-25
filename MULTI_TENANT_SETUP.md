# Multi-Tenant ION API Configuration

This guide explains how to set up and use the multi-tenant ION API credential management system in your application.

## Overview

The multi-tenant system allows you to:

- Store ION API credentials for multiple tenants securely in a database
- Switch between tenants dynamically in your application
- Cache OAuth2 tokens per tenant for better performance
- Monitor tenant connection health

## Quick Setup

### 1. Generate Encryption Key

Add an encryption key to your `.env.local` file:

```bash
# Generate a secure encryption key (run this in your terminal)
node -e "console.log('TENANT_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated key to your `.env.local` file.

### 2. Initialize Database

Run the initialization script to set up the tenant database:

```bash
npm run init-tenants
```

This will:

- Create the SQLite database and tables

- Import your current `.env.local` ION configuration as the default tenant
- Display the current tenant status

### 3. Verify Setup

Check that your tenant was created:

- The script should show "Successfully created default tenant configuration"

- Your current ION_TENANT_ID should appear as a tenant

## API Endpoints

### Tenant Management

```typescript
// Get all tenants (summaries only)
GET /api/tenants

// Get detailed tenant configurations (includes sensitive data)
GET /api/tenants?detailed=true

// Create new tenant
POST /api/tenants
{
  "tenantName": "CUSTOMER_ABC",
  "displayName": "Customer ABC Environment",
  "environmentVersion": "V1234567890",
  "ionConfig": {
    "clientId": "CUSTOMER_ABC~...",
    "clientSecret": "...",
    "portalUrl": "https://...",
    "tenantId": "CUSTOMER_ABC",
    "serviceAccountAccessKey": "...",
    "serviceAccountSecretKey": "..."
    // ... other ION configuration
  }
}

// Get specific tenant
GET /api/tenants/[id]

// Update tenant
PUT /api/tenants/[id]
{
  "displayName": "Updated Display Name",
  "isActive": false
}

// Delete tenant
DELETE /api/tenants/[id]

// Test tenant connection
POST /api/tenants/[id]/test-connection
```

### Response Examples

**Tenant Summary Response:**

```json
[
  {
    "id": "abc123",
    "tenantName": "MIDPORT_DEM", 
    "displayName": "Midport Demo Environment",
    "isActive": true,
    "status": "connected"
  }
]
```

**Connection Test Response:**

```json
{
  "success": true,
  "message": "Connection successful",
  "responseTime": 1240,
  "tokenInfo": {
    "tokenType": "Bearer",
    "expiresAt": "2025-10-08T15:30:00.000Z",
    "hasRefreshToken": true,
    "scope": "read write"
  }
}
```

## Using in Your Application

### 1. OAuth2 Token Management

```typescript
import { OAuth2ConfigManager } from '@/lib/OAuth2ConfigManager';

// Get token for specific tenant
const token = await OAuth2ConfigManager.getValidTokenForTenant(tenantId);

// Get token by tenant name
const token = await OAuth2ConfigManager.getValidTokenForTenantName('MIDPORT_DEM');

// Use token in API calls
const headers = {
  'Authorization': OAuth2ConfigManager.getAuthorizationHeader(token)
};
```

### 2. Tenant Selection UI

```tsx
import { CredentialSelector, useCredentialSelector } from '@/components/credentials/CredentialSelector';

function MyComponent() {
  const { selectedCredentialId, selectedCredential, handleCredentialChange } = useCredentialSelector();

  return (
    <div>
      <CredentialSelector
        selectedCredentialId={selectedCredentialId}
        onCredentialChange={handleCredentialChange}
      />
      
      {selectedCredential && (
        <p>Selected: {selectedCredential.displayName}</p>
      )}
    </div>
  );
}
```

### 3. Direct Tenant Configuration Access

```typescript
import { TenantConfigManager } from '@/lib/TenantConfigManager';

// Get all tenants
const tenants = await TenantConfigManager.getAllTenants();

// Get tenant by ID
const tenant = await TenantConfigManager.getTenantById(tenantId);

// Create new tenant
const newTenant = await TenantConfigManager.createTenant({
  tenantName: 'CUSTOMER_XYZ',
  displayName: 'Customer XYZ',
  ionConfig: { /* ION configuration */ }
});

// Record health check
await TenantConfigManager.recordHealthCheck(
  tenantId, 
  'connected', 
  responseTime
);
```

## Database Schema

The system uses three main tables:

### `tenant_configs`

- `id` - Unique tenant identifier
- `tenant_name` - Unique tenant name (e.g., "MIDPORT_DEM")  
- `display_name` - Human-readable name
- `encrypted_ion_config` - Encrypted JSON of ION API credentials
- `is_active` - Whether tenant is active
- `created_at`, `updated_at` - Timestamps

### `tenant_health_checks`

- Stores connection test results and status history
- Links to `tenant_configs` via foreign key

### `tenant_oauth_tokens`  

- Caches OAuth2 tokens per tenant
- Automatically managed by OAuth2ConfigManager

## Security Features

### Encryption

- All sensitive credentials are encrypted using AES-256-GCM
- Encryption key must be provided via `TENANT_ENCRYPTION_KEY` environment variable
- Each piece of encrypted data includes IV and authentication tag

### Access Control

- Tenant configurations include sensitive data - restrict API access appropriately
- Use `GET /api/tenants` (without `detailed=true`) for non-sensitive tenant lists
- Consider implementing authentication middleware for tenant management endpoints

## Migration from Environment Variables

### Before (Single Tenant)

```typescript
// Old way - from environment variables
const config = OAuth2ConfigManager.loadConfigFromEnv();
const token = await OAuth2ConfigManager.getAccessToken(config);
```

### After (Multi-Tenant)

```typescript
// New way - tenant-specific
const token = await OAuth2ConfigManager.getValidTokenForTenantName('MIDPORT_DEM');

// Or by tenant ID
const token = await OAuth2ConfigManager.getValidTokenForTenant(tenantId);
```

### Backward Compatibility

The old `loadConfigFromEnv()` method still works but is deprecated. The system will automatically create a default tenant from your current environment variables.

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Add `TENANT_ENCRYPTION_KEY` to `.env.local`
   - Ensure ION_* variables are still present for initial setup

2. **"Failed to decrypt tenant configuration"**
   - Encryption key may have changed
   - Database may be corrupted - reinitialize if needed

3. **"Tenant configuration not found"**
   - Run `npm run init-tenants` to initialize database
   - Check tenant ID/name spelling

4. **Connection test failures**
   - Verify ION API credentials are correct
   - Check network connectivity to ION endpoints
   - Review tenant configuration for missing fields

### Logging

The system logs important events:

- Token acquisition attempts
- Health check results  
- Configuration errors

Enable debug logging by setting `NODE_ENV=development`.

## Production Deployment

### Security Checklist

- [ ] Generate strong `TENANT_ENCRYPTION_KEY` (64 hex characters)
- [ ] Store encryption key securely (not in source code)
- [ ] Implement authentication for tenant management APIs
- [ ] Use HTTPS for all API communications
- [ ] Regular backup of tenant database
- [ ] Monitor failed authentication attempts

### Performance Considerations

- OAuth2 tokens are cached automatically
- Health checks run on-demand, not automatically
- Consider implementing token refresh background job for high-traffic scenarios
- SQLite is suitable for moderate loads; consider PostgreSQL for high-scale deployments

## Example: Adding a New Tenant via API

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "CUSTOMER_XYZ",
    "displayName": "Customer XYZ Production",
    "environmentVersion": "V2024001",
    "ionConfig": {
      "clientId": "CUSTOMER_XYZ~abcdef123456",
      "clientSecret": "secret_value_here",
      "identityUrl": "https://xyz-ionapi.eu1.inforcloudsuite.com",
      "portalUrl": "https://xyz-sso.eu1.inforcloudsuite.com:443/CUSTOMER_XYZ/as/",
      "tenantId": "CUSTOMER_XYZ",
      "tokenEndpoint": "token.oauth2",
      "authorizationEndpoint": "authorization.oauth2", 
      "revokeEndpoint": "revoke_token.oauth2",
      "serviceAccountAccessKey": "CUSTOMER_XYZ#key_here",
      "serviceAccountSecretKey": "secret_key_here",
      "scope": "read write",
      "version": "1.0",
      "clientName": "Customer_XYZ_Client",
      "dataType": "12"
    }
  }'
```

Test the connection:

```bash
curl -X POST http://localhost:3000/api/tenants/[tenant_id]/test-connection
```

This completes the multi-tenant ION API credential management setup. You can now manage multiple tenant configurations securely and switch between them dynamically in your application
