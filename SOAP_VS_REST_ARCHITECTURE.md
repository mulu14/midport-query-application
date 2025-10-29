# SOAP vs REST Architecture Documentation

## ⚠️ CRITICAL: API Type Separation

This application supports **TWO COMPLETELY SEPARATE** API types for Infor ION integration:

1. **SOAP APIs** - XML-based web services
2. **REST/OData APIs** - RESTful services with JSON

**THESE MUST NEVER BE MIXED IN THE SAME FILE OR CLASS.**

---

## 📁 File Structure & Responsibilities

### **SOAP API Files (XML-based)**

#### `lib/RemoteAPIManager.ts`
- **Purpose**: Handles ALL SOAP API operations
- **Format**: XML envelopes (SOAP 1.1/1.2)
- **Operations**: List, Create, Update, Delete actions
- **Query Format**: `<FilterExpression>` and `<ComparisonExpression>`
- **DO NOT**: Add OData or REST logic here
- **Use For**: 
  - Address services
  - Customer services
  - Legacy ION services without OData support

**Example SOAP Request:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <vrt:List>
      <FilterExpression>
        <ComparisonExpression>
          <comparisonOperator>eq</comparisonOperator>
          <attributeName>Status</attributeName>
          <instanceValue>Active</instanceValue>
        </ComparisonExpression>
      </FilterExpression>
    </vrt:List>
  </soapenv:Body>
</soapenv:Envelope>
```

---

### **REST/OData API Files (JSON-based)**

#### `lib/RestAPIManager.ts`
- **Purpose**: Handles ALL REST/OData API operations
- **Format**: HTTP requests with JSON payloads
- **Operations**: GET, POST, PUT, DELETE
- **Query Format**: OData v4 (`$filter`, `$expand`, `$orderby`, `$top`, `$skip`)
- **DO NOT**: Add SOAP XML logic here
- **Use For**:
  - Sales Orders (tdapi.slsSalesOrder)
  - Purchase Orders (tdapi.tpOrder)
  - Items (tdapi.tcItem)
  - All modern ION OData services

**Example REST Request:**
```
GET https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/lnapi/odata/tdapi.slsSalesOrder/Orders?$filter=Status eq 'Active' and Country eq 'Norway'&$expand=LineRefs,CustomerRef&$orderby=OrderDate desc
```

---

### **Shared Utility (API-Agnostic)**

#### `lib/SQLParser.ts`
- **Purpose**: Parses SQL WHERE clauses into parameter objects
- **Important**: Only extracts data, does NOT generate SOAP or REST requests
- **Used By**: Both SOAP and REST API managers
- **Output**: Generic parameter object with field/operator/value

**Flow:**
```
SQL Query
    ↓
SQLParser.parseSQL()
    ↓
Generic Parameters Object
    ├→ RemoteAPIManager.generateSOAPEnvelope() → SOAP XML
    └→ RestAPIManager.generateODataQuery() → OData URL
```

---

## 🔄 Request Flow Comparison

### **SOAP Flow:**
```
1. User writes SQL: SELECT * FROM Addresses WHERE City = 'Oslo'
2. SQLParser extracts: { City: 'Oslo', City_operator: 'eq' }
3. RemoteAPIManager.generateSOAPEnvelope() creates:
   <ComparisonExpression>
     <comparisonOperator>eq</comparisonOperator>
     <attributeName>City</attributeName>
     <instanceValue>Oslo</instanceValue>
   </ComparisonExpression>
4. POST to: https://.../services/Address_v3
5. Response: XML → Parsed to JSON
```

### **REST Flow:**
```
1. User writes SQL: SELECT * FROM Orders WHERE Status = 'Open'
2. SQLParser extracts: { Status: 'Open', Status_operator: 'eq' }
3. RestAPIManager.generateODataQuery() creates:
   $filter=Status eq 'Open'
4. GET: https://.../odata/tdapi.slsSalesOrder/Orders?$filter=Status eq 'Open'
5. Response: JSON (already in correct format)
```

---

## 🚫 Parameter Filtering

Both API managers filter out internal metadata before making API calls:

### **Filtered Parameters (Never Sent to APIs):**
- `baseTable` - Used for client-side query validation
- `baseEndpoint` - Used for client-side routing
- `_operator` - Suffix storing SQL operator type (e.g., `Status_operator: 'eq'`)
- `_value2` - Second value for BETWEEN operator (e.g., `Amount_value2: 5000`)
- `limit`, `offset`, `timestamp` - Handled separately or client-side
- `orderBy`, `orderDirection` - Converted to API-specific format

**Why?** These are internal helper values for parsing and validation. The APIs only need the actual filter conditions.

---

## 🎯 Feature Support Matrix

| Feature | SOAP API | REST/OData API |
|---------|----------|----------------|
| **Basic Operators** (=, !=, >, <, >=, <=) | ✅ Yes | ✅ Yes |
| **LIKE** | ⚠️ Limited | ✅ Yes (as `contains`) |
| **IN** | ✅ Yes | ✅ Yes (as OR conditions) |
| **BETWEEN** | ❌ No | ✅ Yes (`field ge X and field le Y`) |
| **IS NULL / IS NOT NULL** | ❌ No | ✅ Yes (`field eq null` / `field ne null`) |
| **NOT** | ❌ No | ✅ Yes (`not(condition)`) |
| **JOIN / $expand** | ❌ No | ✅ Yes (navigation properties) |
| **ORDER BY** | ✅ Yes | ✅ Yes (`$orderby`) |
| **LIMIT** | ✅ Yes (client-side) | ✅ Yes (client-side) |

---

## 📋 Code Examples

### **Adding a New SOAP Operation**

**❌ WRONG** - Mixing SOAP and REST:
```typescript
// DON'T DO THIS in RestAPIManager.ts
static generateSOAPEnvelope() { ... }  // ❌ Wrong file!
```

**✅ CORRECT** - Keep in RemoteAPIManager.ts:
```typescript
// lib/RemoteAPIManager.ts
static generateSOAPEnvelope(action: string, parameters: Record<string, any>): string {
  // Filter out internal parameters
  const filterConditions = Object.entries(parameters)
    .filter(([key]) => 
      key !== 'baseTable' && 
      key !== 'baseEndpoint' &&
      !key.endsWith('_operator') &&
      !key.endsWith('_value2')
    )
    .map(([key, value]) => `
      <ComparisonExpression>
        <comparisonOperator>eq</comparisonOperator>
        <attributeName>${key}</attributeName>
        <instanceValue>${value}</instanceValue>
      </ComparisonExpression>
    `);
    
  return `<soapenv:Envelope>...${filterConditions}...</soapenv:Envelope>`;
}
```

### **Adding a New OData Feature**

**❌ WRONG** - Mixing REST and SOAP:
```typescript
// DON'T DO THIS in RemoteAPIManager.ts
static generateODataQuery() { ... }  // ❌ Wrong file!
```

**✅ CORRECT** - Keep in RestAPIManager.ts:
```typescript
// lib/RestAPIManager.ts
static generateODataQuery(parameters: Record<string, any>): string {
  // Filter out internal parameters
  const filterConditions: string[] = [];
  
  Object.entries(parameters).forEach(([key, value]) => {
    if (['baseTable', 'baseEndpoint', 'limit', 'offset'].includes(key)) {
      return; // Skip internal parameters
    }
    if (key.endsWith('_operator') || key.endsWith('_value2')) {
      return; // Skip metadata
    }
    
    // Convert to OData format
    filterConditions.push(`${key} eq '${value}'`);
  });
  
  return `$filter=${filterConditions.join(' and ')}`;
}
```

---

## 🔍 How to Identify API Type

### **In the UI:**
- Look at the service name or table metadata
- SOAP services typically have version suffixes: `Address_v3`, `Customer_v1`
- REST services use OData paths: `tdapi.slsSalesOrder`, `tdapi.tcItem`

### **In the Code:**
```typescript
// Check apiType property
if (table.apiType === 'soap') {
  // Use RemoteAPIManager
  const soapEnvelope = RemoteAPIManager.generateSOAPEnvelope(...);
} else if (table.apiType === 'rest') {
  // Use RestAPIManager
  const odataQuery = RestAPIManager.generateODataQuery(...);
}
```

---

## ⚠️ Common Mistakes to Avoid

### **1. Mixing SOAP and REST in Same File**
```typescript
// ❌ WRONG
class APIManager {
  static generateSOAPEnvelope() { ... }
  static generateODataQuery() { ... }  // Don't mix!
}
```

### **2. Sending Internal Parameters to APIs**
```typescript
// ❌ WRONG
const parameters = {
  Status: 'Active',
  baseTable: 'Orders',        // ❌ Don't send this!
  Status_operator: 'eq',      // ❌ Don't send this!
  _value2: 5000               // ❌ Don't send this!
};
```

### **3. Using REST Features in SOAP**
```typescript
// ❌ WRONG - SOAP doesn't support $expand
const soapUrl = buildSOAPUrl() + '?$expand=Customer';  // ❌ Invalid!
```

### **4. Using SOAP Features in REST**
```typescript
// ❌ WRONG - REST doesn't use XML envelopes
const restRequest = generateSOAPEnvelope();  // ❌ Wrong format!
```

---

## 📚 Key Takeaways

1. **SOAP** = `RemoteAPIManager.ts` = XML envelopes = Action-based
2. **REST** = `RestAPIManager.ts` = OData URLs = Resource-based
3. **SQLParser** = Shared utility = API-agnostic parsing
4. **Never mix** SOAP and REST logic in the same file
5. **Always filter** internal parameters (`baseTable`, `_operator`, etc.)
6. **Check `apiType`** to determine which manager to use
7. **SOAP is limited** - Use REST for advanced features (BETWEEN, IS NULL, $expand)

---

## 🛠️ Troubleshooting

### **Error: "No valid filterAttributes received"**
- **Cause**: Internal parameters (like `baseTable`) were sent to SOAP API
- **Solution**: Verify parameter filtering in `RemoteAPIManager.generateSOAPEnvelope()`

### **Error: "Invalid OData query syntax"**
- **Cause**: SOAP-style filters used in REST request
- **Solution**: Use `RestAPIManager.generateODataQuery()` for REST APIs

### **Advanced operator not working (BETWEEN, IS NULL)**
- **Cause**: Using SOAP API (doesn't support these)
- **Solution**: Switch to REST/OData API if available

---

## 📖 Related Documentation

- [FILTER_SUPPORT_PLAN.md](./FILTER_SUPPORT_PLAN.md) - Advanced WHERE clause features (REST only)
- [EXPAND_JOIN_PLANNING.md](./EXPAND_JOIN_PLANNING.md) - JOIN support via $expand (REST only)
- [QUERY_WORKFLOW.md](./QUERY_WORKFLOW.md) - Complete query execution flow

---

**Last Updated**: October 2025  
**Maintainer**: Mulugeta Forsido, Midport Scandinavia

