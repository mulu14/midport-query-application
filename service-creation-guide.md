# Service Creation Guide - REST & SOAP APIs

## 📋 **Overview**

This guide provides step-by-step instructions for creating, configuring, and testing both REST and SOAP API services within the Midport SQL Platform.

## 🌐 **REST API Service Creation**

### **Step 1: Identify ION OData Service**

First, determine the ION OData service details from the ION API documentation:

```
Service Pattern: [namespace].[module][entityType]
Entity Pattern: [EntityName] (usually plural)

Examples:
- tdapi.slsSalesOrder/Orders (Trade - Sales Orders)  
- tsapi.socServiceOrder/ServiceOrders (Service - Service Orders)
- hrapi.empEmployee/Employees (HR - Employees)
- finapi.accAccount/Accounts (Finance - Accounts)
```

### **Step 2: Add Service to Database**

Add the service to your SQLite database (`midport_query_platform.db`):

```sql
-- REST API Service Registration
INSERT INTO tables (
    name,                    -- Business-friendly display name
    endpoint,               -- Technical service endpoint  
    apiType,                -- 'rest' for REST APIs
    oDataService,           -- OData service namespace
    entityName,             -- OData entity name
    description            -- Optional description
) VALUES (
    'Sales Orders',                    -- Display name
    'tdapi.slsSalesOrder/Orders',     -- Endpoint  
    'rest',                           -- API type
    'tdapi.slsSalesOrder',           -- OData service
    'Orders',                        -- Entity name
    'Trade module sales order data'  -- Description
);
```

### **Step 3: Verify Service Configuration**

Check the service appears correctly:

```sql
SELECT * FROM tables WHERE apiType = 'rest' AND name = 'Sales Orders';
```

### **Step 4: Test REST API Service**

#### **A. Basic Query**
```sql
SELECT * FROM "Sales Orders";
```

#### **B. Filtered Query**
```sql
SELECT * FROM "Sales Orders" 
WHERE Status = 'Active' 
  AND Country = 'Norway' 
LIMIT 10;
```

#### **C. Generated Request Details**

**URL Construction:**
```
Base: https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi
Path: /odata/tdapi.slsSalesOrder/Orders
Query: ?company=2405&$filter=Status eq 'Active' and Country eq 'Norway'
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
Content-Type: application/json
OData-Version: 4.0
OData-MaxVersion: 4.0
X-Infor-LnCompany: 2405
Content-Language: en-US
```

**Expected Response:**
```json
{
  "@odata.context": "https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/tdapi.slsSalesOrder/$metadata#Orders",
  "value": [
    {
      "OrderNumber": "SO001234",
      "CustomerCode": "CUST001", 
      "Status": "Active",
      "Country": "Norway",
      "OrderDate": "2024-10-01T00:00:00Z",
      "TotalAmount": 15000.00
    }
  ]
}
```

## 🧼 **SOAP API Service Creation**

### **Step 1: Identify ION SOAP Service**

Determine the SOAP service details from ION documentation:

```
Service Pattern: [ModuleName]_[Version]
Examples:
- BusinessPartner_v3 (Business Partner service v3)
- ServiceCall_v2 (Service Call service v2)
- Customer_v1 (Customer service v1)
- SalesOrder_v1 (Sales Order service v1)
```

### **Step 2: Add Service to Database**

```sql
-- SOAP API Service Registration
INSERT INTO tables (
    name,                    -- Business-friendly display name
    endpoint,               -- SOAP service name
    apiType,                -- 'soap' for SOAP APIs  
    description            -- Optional description
) VALUES (
    'Business Partners',           -- Display name
    'BusinessPartner_v3',         -- SOAP service name
    'soap',                       -- API type
    'Business partner master data' -- Description
);
```

### **Step 3: Test SOAP API Service**

#### **A. Basic Query**
```sql
SELECT * FROM "Business Partners";
```

#### **B. Filtered Query** 
```sql
SELECT * FROM "Business Partners" 
WHERE Type = 'Customer' 
  AND Status = 'Active' 
LIMIT 15;
```

#### **C. Generated Request Details**

**URL Construction:**
```
https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/SOAP/LN/services/BusinessPartner_v3
```

**SOAP Envelope:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="http://schemas.infor.com/businesspartner/v3">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:BinarySecurityToken EncodingType="Base64Binary">
        eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
      </wsse:BinarySecurityToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <tns:List>
      <tns:Parameters>
        <tns:Tenant>MIDPORT_DEM</tns:Tenant>
        <tns:Company>2405</tns:Company>
        <tns:Type>Customer</tns:Type>
        <tns:Status>Active</tns:Status>
      </tns:Parameters>
    </tns:List>
  </soap:Body>
</soap:Envelope>
```

**Expected Response:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:ListResponse xmlns:tns="http://schemas.infor.com/businesspartner/v3">
      <tns:BusinessPartners>
        <tns:BusinessPartner>
          <tns:Code>BP001</tns:Code>
          <tns:Name>Acme Corporation</tns:Name>
          <tns:Type>Customer</tns:Type>
          <tns:Status>Active</tns:Status>
        </tns:BusinessPartner>
      </tns:BusinessPartners>
    </tns:ListResponse>
  </soap:Body>
</soap:Envelope>
```

## 🔧 **Advanced Service Configuration**

### **Business-Friendly Name Mapping**

Update `RemoteAPIContext.tsx` to add business-friendly mappings:

```typescript
const businessNameMap: Record<string, string> = {
  // REST Services  
  'tdapi.slsSalesOrder/Orders': 'Sales Orders',
  'tsapi.socServiceOrder/ServiceOrders': 'Service Orders',
  'hrapi.empEmployee/Employees': 'Employees',
  'finapi.accAccount/Accounts': 'Accounts',
  
  // SOAP Services
  'BusinessPartner_v3': 'Business Partners',
  'ServiceCall_v2': 'Service Calls',
  'Customer_v1': 'Customers',
  'SalesOrder_v1': 'Sales Orders (SOAP)'
};
```

### **Custom Parameter Mapping**

For services with specific parameter requirements, update the parameter extraction logic:

```typescript
// In parseParametersFromQuery method
if (table.endpoint.includes('ServiceCall')) {
  parameters.serviceType = 'ServiceCall';
  parameters.priority = parameters.priority || 'Normal';
} else if (table.endpoint.includes('BusinessPartner')) {
  parameters.entityType = 'BusinessPartner';
  parameters.classification = parameters.classification || 'All';
}
```

## 📊 **Service Testing & Validation**

### **1. URL Validation Test**

Create a test script to validate URL construction:

```javascript
// test-service-urls.js
const services = [
  {
    name: 'Sales Orders (REST)',
    type: 'rest',
    tenant: 'MIDPORT_DEM',
    oDataService: 'tdapi.slsSalesOrder',
    entityName: 'Orders',
    expectedUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/tdapi.slsSalesOrder/Orders'
  },
  {
    name: 'Business Partners (SOAP)', 
    type: 'soap',
    tenant: 'MIDPORT_DEM',
    service: 'BusinessPartner_v3',
    expectedUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/SOAP/LN/services/BusinessPartner_v3'
  }
];

services.forEach(service => {
  console.log(`Testing: ${service.name}`);
  // URL validation logic here
});
```

### **2. Authentication Test**

Test OAuth2 token acquisition:

```bash
# Test OAuth2 endpoint
curl -X POST https://mingle-sso.eu1.inforcloudsuite.com:443/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET"
```

### **3. Service Connectivity Test**

Test actual service connectivity:

```typescript
// Test service availability
const testServiceConnectivity = async (serviceConfig) => {
  try {
    const response = await fetch(serviceConfig.url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Service ${serviceConfig.name}: ${response.status} ${response.statusText}`);
    return response.ok;
  } catch (error) {
    console.error(`Service ${serviceConfig.name} failed:`, error.message);
    return false;
  }
};
```

## 🔍 **Troubleshooting Common Issues**

### **REST API Issues**

#### **1. 404 Not Found**
```
Error: ION OData API Error 404: Not Found
```
**Solutions:**
- Verify OData service name is correct
- Check entity name spelling and capitalization
- Confirm service is enabled in ION

#### **2. Identity Mapping Failed** 
```
Error: Identity Switch failed: Failed to find associated LN Identity
```
**Solutions:**
- Verify user exists in LN system
- Check company number (2405) is correct
- Ensure user has access to specified company
- Add X-Infor-LnIdentity header

#### **3. Invalid OData Query**
```
Error: The query specified is not valid
```
**Solutions:**
- Check OData filter syntax
- Verify field names exist in entity
- Ensure proper escaping of string values

### **SOAP API Issues**

#### **1. SOAP Fault**
```
Error: soap:Server - Invalid operation
```
**Solutions:**
- Verify SOAP action is correct
- Check service version (v1, v2, v3)
- Ensure all required parameters are provided

#### **2. Authentication Failed**
```
Error: Authentication failed for user
```
**Solutions:**
- Check OAuth2 token format in SOAP header
- Verify token has not expired
- Ensure proper WSSE security header format

#### **3. Missing Parameters**
```
Error: Required parameter missing
```
**Solutions:**
- Add all mandatory parameters to SOAP body
- Check parameter names and types
- Verify tenant and company are included

## 📚 **Service Registry Management**

### **View All Services**
```sql
SELECT 
    name as "Service Name",
    endpoint as "Endpoint", 
    apiType as "Type",
    oDataService as "OData Service",
    entityName as "Entity",
    description as "Description"
FROM tables 
ORDER BY apiType, name;
```

### **Update Service Configuration**
```sql
UPDATE tables 
SET description = 'Updated description',
    oDataService = 'new.service.name'
WHERE name = 'Sales Orders';
```

### **Remove Service**
```sql
DELETE FROM tables WHERE name = 'Service Name';
```

### **Backup Service Registry**
```bash
# Export current services
sqlite3 midport_query_platform.db ".dump tables" > services_backup.sql

# Restore from backup
sqlite3 midport_query_platform.db < services_backup.sql
```

## 🎯 **Best Practices**

### **Service Naming**
- Use clear, business-friendly names
- Include service type if ambiguous (e.g., "Sales Orders (SOAP)")
- Follow consistent naming conventions

### **Error Handling**
- Implement proper error messages
- Log detailed error information for debugging
- Provide user-friendly error descriptions

### **Performance**
- Use client-side limiting (15 records default)
- Implement appropriate caching strategies
- Monitor API response times

### **Security**
- Store OAuth2 credentials in environment variables
- Use HTTPS for all API communications
- Implement proper token refresh mechanisms

### **Testing**
- Test services after each configuration change
- Validate both successful and error scenarios
- Document expected API behaviors

---

## 📖 **Quick Reference**

### **Common ION Services**
| Module | REST Service | SOAP Service | Entity Type |
|--------|--------------|--------------|-------------|
| Trade | tdapi.slsSalesOrder | SalesOrder_v1 | Orders |
| Service | tsapi.socServiceOrder | ServiceCall_v2 | Service Orders |
| HR | hrapi.empEmployee | Employee_v1 | Employees |
| Finance | finapi.accAccount | Account_v1 | Accounts |
| Inventory | invapi.wmsItem | Item_v1 | Items |

### **Standard URL Patterns**
```
REST:  https://mingle-ionapi.eu1.inforcloudsuite.com/TENANT/LN/lnapi/odata/SERVICE/ENTITY
SOAP:  https://mingle-ionapi.eu1.inforcloudsuite.com/TENANT/SOAP/LN/services/SERVICE
OAuth: https://mingle-sso.eu1.inforcloudsuite.com/oauth2/token
```

### **Required Headers**
```
REST:  Authorization, Accept, OData-Version, X-Infor-LnCompany
SOAP:  Content-Type, SOAPAction, Authorization (in WSSE header)
```

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Author:** Mulugeta Forsido  
**Company:** Midport Scandinavia