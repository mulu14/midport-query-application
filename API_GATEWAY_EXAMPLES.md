# API Gateway Usage Examples

## Quick Start

The API Gateway is now available at:

GET <http://localhost:3000/api/gateway>

All examples assume you have a tenant configured (e.g., `MIDPORT_DEM`) with valid credentials stored in the database.

---

## 📋 SOAP API Examples

### Example 1: Basic SOAP Query (ServiceCall)

```bash
# Get all service calls
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap"
```

### Example 2: SOAP with Status Filter

```bash
# Get open service calls
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&Status=Open"
```

### Example 3: SOAP with Multiple Filters

```bash
# Get open service calls with high priority, limit to 10 results
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&Status=Open&Priority=High&limit=10"
```

### Example 4: SOAP Read Action (Get Specific Record)

```bash
# Read specific customer by ID
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Customer_v1&apiType=soap&action=Read&CustomerID=12345"
```

### Example 5: SOAP with Pagination

```bash
# Get service calls with pagination
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&limit=20&offset=0"

# Next page
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&limit=20&offset=20"
```

---

## 🌐 REST/OData API Examples

### Example 6: Basic REST Query (Orders)

```bash
# Get all orders
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders"
```

### Example 7: REST with Country Filter

```bash
# Get orders from Mexico
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&Country=Mexico"
```

### Example 8: REST with Multiple Filters

```bash
# Get open orders from Mexico
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&Country=Mexico&Status=Open"
```

### Example 9: REST with Expand (Get Related Data)

```bash
# Get orders with customer and line items expanded
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&expand=SoldToBPRef,LineRefs,ShipToBPRef"
```

### Example 10: REST with Select (Specific Fields Only)

```bash
# Get only OrderNumber, OrderDate, and Country fields
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&select=OrderNumber,OrderDate,Country&limit=20"
```

### Example 11: REST with OrderBy (Sorting)

```bash
# Get orders sorted by OrderDate descending
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&orderby=OrderDate desc"

# Multiple sort fields
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&orderby=Country asc,OrderDate desc"
```

### Example 12: REST with Comparison Operators

```bash
# Get orders after 2024-01-01
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&OrderDate_gt=2024-01-01"

# Get orders with amount less than or equal to 10000
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&Amount_le=10000"

# Multiple operators
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&OrderDate_gt=2024-01-01&OrderDate_lt=2024-12-31&Amount_ge=1000"
```

### Example 13: REST Complex Query (Everything Combined)

```bash
# Complex query: 
# - Filter by country and date range
# - Expand related entities
# - Select specific fields
# - Sort by date
# - Limit results
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&Country=Mexico&OrderDate_gt=2024-01-01&expand=SoldToBPRef,LineRefs&select=OrderNumber,OrderDate,TotalAmount&orderby=OrderDate desc&limit=50"
```

---

## 🎯 Real-World Use Cases

### Use Case 1: Dashboard - Recent Orders

```bash
# Get last 10 orders with customer info
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&expand=SoldToBPRef&orderby=OrderDate desc&limit=10"
```

### Use Case 2: Customer Portal - Order History

```bash
# Get customer's orders with full details
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&CustomerID=12345&expand=LineRefs,ShipToBPRef&orderby=OrderDate desc"
```

### Use Case 3: Analytics - Monthly Sales

```bash
# Get orders for specific month
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&OrderDate_gt=2024-10-01&OrderDate_lt=2024-11-01&select=OrderNumber,OrderDate,TotalAmount"
```

### Use Case 4: Service Management - Open Tickets

```bash
# Get all open service tickets assigned to technician
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=ServiceCall_v2&apiType=soap&Status=Open&AssignedTo=TECH123&limit=50"
```

### Use Case 5: Inventory Check - Low Stock Items

```bash
# Get items with stock below threshold (REST example)
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&table=Items&apiType=rest&service=tdapi.tcmcsItems&entity=Items&StockQuantity_lt=10&select=ItemNumber,ItemDescription,StockQuantity"
```

---

## 🧪 Testing the API Gateway

### Test 1: Health Check

```bash
# Verify the API Gateway is running
curl "http://localhost:3000/api/gateway"
```

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "Midport API Gateway",
  "version": "1.0.0",
  "timestamp": "2025-10-21T14:00:00.000Z",
  "features": {
    "soap": true,
    "rest": true,
    "multiTenant": true,
    "oDataSupport": true
  },
  "endpoints": {
    "query": "POST /api/gateway/query",
    "health": "GET /api/gateway/query",
    "tenants": "GET /api/tenants"
  }
}
```

### Test 2: List Available Tenants

```bash
# Get all configured tenants
curl "http://localhost:3000/api/tenants"
```

### Test 3: Test Invalid Tenant

```bash
# Should return 404
curl "http://localhost:3000/api/gateway?tenant=INVALID_TENANT&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders"
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Tenant not found: INVALID_TENANT",
  "requestId": "req_1234567890_abc123",
  "hint": "Check available tenants: GET /api/tenants"
}
```

### Test 4: Test Missing Parameters

```bash
# Should return 400
curl "http://localhost:3000/api/gateway?tenant=MIDPORT_DEM&apiType=rest"
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Missing required parameter: table",
  "requestId": "req_1234567890_xyz789",
  "hint": "SOAP example: &table=ServiceCall_v2 | REST example: &table=Orders"
}
```

---

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "requestId": "req_1729521234_abc123",
  "data": {
    "success": true,
    "serviceType": "Orders",
    "recordCount": 15,
    "records": [
      {
        "OrderNumber": "ORD-001",
        "OrderDate": "2024-10-15",
        "Country": "Mexico",
        "TotalAmount": 5000
      }
      // ... more records
    ]
  },
  "metadata": {
    "tenant": "MIDPORT_DEM",
    "service": "Orders",
    "apiType": "rest",
    "executionTime": 1234,
    "recordCount": 15,
    "timestamp": "2025-10-21T14:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Tenant not found: INVALID_TENANT",
  "requestId": "req_1729521234_xyz789",
  "hint": "Check available tenants: GET /api/tenants"
}
```

---

## 🔧 Integration Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Fetch orders from REST API
async function getOrders(tenant: string, country?: string) {
  const params = new URLSearchParams({
    tenant,
    table: 'Orders',
    apiType: 'rest',
    service: 'tdapi.slsSalesOrder',
    entity: 'Orders',
    expand: 'SoldToBPRef,LineRefs',
    limit: '50'
  });
  
  if (country) {
    params.append('Country', country);
  }
  
  const response = await fetch(`http://localhost:3000/api/gateway?${params}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data.records;
  } else {
    throw new Error(result.error);
  }
}

// Usage
const orders = await getOrders('MIDPORT_DEM', 'Mexico');
console.log(`Found ${orders.length} orders`);
```

### Python (Requests)

```python
import requests
from typing import Optional, List, Dict

def get_orders(tenant: str, country: Optional[str] = None) -> List[Dict]:
    """Get orders from ION API via gateway"""
    params = {
        'tenant': tenant,
        'table': 'Orders',
        'apiType': 'rest',
        'service': 'tdapi.slsSalesOrder',
        'entity': 'Orders',
        'expand': 'SoldToBPRef,LineRefs',
        'limit': '50'
    }
    
    if country:
        params['Country'] = country
    
    response = requests.get('http://localhost:3000/api/gateway', params=params)
    result = response.json()
    
    if result['success']:
        return result['data']['records']
    else:
        raise Exception(result['error'])

# Usage
orders = get_orders('MIDPORT_DEM', 'Mexico')
print(f"Found {len(orders)} orders")
```

### curl Script (Bash)

```bash
#!/bin/bash

# Configuration
GATEWAY_URL="http://localhost:3000/api/gateway"
TENANT="MIDPORT_DEM"

# Function to get orders
get_orders() {
    local country=$1
    local url="${GATEWAY_URL}?tenant=${TENANT}&table=Orders&apiType=rest&service=tdapi.slsSalesOrder&entity=Orders&expand=SoldToBPRef,LineRefs&limit=50"
    
    if [ -n "$country" ]; then
        url="${url}&Country=${country}"
    fi
    
    curl -s "$url" | jq '.data.records'
}

# Usage
get_orders "Mexico"
```

---

## 🔗 Next Steps

1. **Test the Gateway**: Start with the health check endpoint
2. **Verify Tenants**: Use `GET /api/tenants` to see configured tenants
3. **Try SOAP First**: Simple queries with `ServiceCall_v2`
4. **Explore REST**: More complex queries with OData features
5. **Build Integration**: Use the examples above in your application

For more information, see the main README.md file.
