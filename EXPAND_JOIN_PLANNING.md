# JOIN to $expand Conversion Planning Document

**Author:** Mulugeta Forsido
**Company:** Midport Scandinavia
**Date:** October 2025
**Status:** Planning Phase

## Objective

Design SQL JOIN syntax in `QueryEditor.tsx` that gets converted to OData `$expand` parameters for REST API queries. Users write familiar JOIN statements that represent relationship traversal, which the system converts to appropriate OData expand operations.

## Current State Analysis

### How Expand Currently Works

**Configuration-Based (Current):**
```javascript
// In table/service configuration
{
  name: "Orders",
  endpoint: "Orders",
  expandFields: ["SoldToBPRef", "LineRefs", "ShipToBPRef"]
}

// Results in: $expand=SoldToBPRef,LineRefs,ShipToBPRef
```

**Backend Processing:**
- `expandFields` from table config passed to `RestAPIManager.generateODataQuery()`
- Converted to `$expand=SoldToBPRef,LineRefs,ShipToBPRef`
- Applied automatically based on service metadata

## Proposed JOIN Syntax Design

### JOIN as Relationship Declaration

Since OData doesn't support true JOINs but does support `$expand` for related data, we interpret JOIN syntax as "expand these related entities":

#### **SQL JOIN → OData $expand Mapping**
```sql
-- User writes standard JOIN syntax
SELECT o.*, c.Name, ol.Quantity
FROM Orders o
JOIN Customers c ON o.CustomerId = c.Id
JOIN OrderLines ol ON o.Id = ol.OrderId
WHERE o.Status = 'Active'

-- System converts to OData expand
$filter=Status eq 'Active'&$expand=Customers,OrderLines
$select=*,Customers/Name,OrderLines/Quantity
```

#### **Supported JOIN Patterns**

**1. Simple JOIN (expand single level):**
```sql
SELECT * FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
```
**→** `$expand=Customers`

**2. Multiple JOINs (expand multiple entities):**
```sql
SELECT * FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
JOIN Addresses a ON o.ShipToAddress = a.Id
```
**→** `$expand=Customers,Addresses`

**3. Nested JOINs (expand with sub-expands):**
```sql
SELECT * FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
  JOIN Addresses a ON c.AddressId = a.Id
```
**→** `$expand=Customers($expand=Addresses)`

**4. Self-joins and aliases:**
```sql
SELECT * FROM Employees e
JOIN Employees m ON e.ManagerId = m.Id
```
**→** `$expand=Manager` (assuming navigation property exists)

### Implementation Strategy

#### **Phase 1: Basic JOIN Recognition**

Parse JOIN clauses and extract relationship names:

```typescript
// In SQLParser.ts - extend parseSQL method
const joinMatches = sqlQuery.match(/JOIN\s+(\w+)(?:\s+\w+)?\s+ON\s+[^,;\n]+/gi);
if (joinMatches) {
  const expandEntities = joinMatches.map(join => {
    const entityMatch = join.match(/JOIN\s+(\w+)/i);
    return entityMatch ? entityMatch[1] : null;
  }).filter(Boolean);

  parameters.expandArray = expandEntities;
  parameters.expand = expandEntities.join(',');
}
```

#### **Phase 2: Relationship Path Analysis**

Analyze ON clauses to understand relationship paths:

```sql
// Parse: JOIN Customers c ON o.SoldToCustomer = c.Id
// Extract: relationship = "SoldToCustomer", targetTable = "Customers"
const relationshipPattern = /JOIN\s+(\w+)\s+\w+\s+ON\s+\w+\.(\w+)\s*=\s*\w+\.Id/i;
```

#### **Phase 3: Navigation Property Mapping**

Map relationships to OData navigation properties:

```typescript
const navigationMap: Record<string, string> = {
  'SoldToCustomer': 'SoldToBPRef',
  'ShipToAddress': 'ShipToBPRef',
  'OrderLines': 'LineRefs',
  'Customer': 'SoldToBPRef'
};

// Convert relationship names to navigation properties
parameters.expand = expandEntities
  .map(entity => navigationMap[entity] || entity)
  .join(',');
```

### Key Design Decisions

#### **1. JOIN Interpretation**
- **Not actual JOINs:** OData doesn't support JOINs, so we treat JOIN as "expand this related data"
- **Relationship focus:** The ON clause declares the relationship type, not actual filtering
- **Navigation properties:** Map logical relationships to OData navigation property names

#### **2. SELECT Field Handling**
For JOIN queries with specific field selection:
```sql
SELECT o.Id, c.Name, ol.Quantity
FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
JOIN OrderLines ol ON o.Id = ol.OrderId
```
**→** `$select=Id,Customers/Name,OrderLines/Quantity&$expand=Customers,OrderLines`

#### **3. WHERE Clause Integration**
JOIN conditions don't affect filtering - they're just relationship declarations:
```sql
SELECT * FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
WHERE o.Status = 'Active' AND c.Country = 'US'
```
**→** `$filter=Status eq 'Active' and Customers/Country eq 'US'&$expand=Customers`

### Parsing Logic Design

#### **1. JOIN Clause Detection**

```typescript
function parseJoinsFromSQL(sqlQuery: string): ExpandItem[] {
  const joins: ExpandItem[] = [];

  // Match all JOIN clauses
  const joinRegex = /JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([^,;\n]+)(?=JOIN|WHERE|ORDER|LIMIT|$)/gi;
  let match;

  while ((match = joinRegex.exec(sqlQuery)) !== null) {
    const [, tableName, alias, onClause] = match;

    joins.push({
      table: tableName,
      alias: alias || null,
      relationship: extractRelationshipFromOnClause(onClause),
      navigationProperty: mapToNavigationProperty(tableName, onClause)
    });
  }

  return joins;
}
```

#### **2. Relationship Extraction**

```typescript
function extractRelationshipFromOnClause(onClause: string): string {
  // Parse: "o.SoldToCustomer = c.Id" → "SoldToCustomer"
  const relationMatch = onClause.match(/(\w+)\.\w+\s*=\s*\w+\.Id/i);
  return relationMatch ? relationMatch[1] : null;
}

function mapToNavigationProperty(tableName: string, onClause: string): string {
  // Map logical relationships to OData navigation properties
  const relationship = extractRelationshipFromOnClause(onClause);

  const navigationMappings: Record<string, Record<string, string>> = {
    'Customers': { 'SoldToCustomer': 'SoldToBPRef', 'BillToCustomer': 'BillToBPRef' },
    'Addresses': { 'ShipToAddress': 'ShipToBPRef', 'BillToAddress': 'BillToBPRef' },
    'OrderLines': { 'Id': 'LineRefs' },
    'Contacts': { 'PrimaryContact': 'PrimaryContactRef' }
  };

  return navigationMappings[tableName]?.[relationship] || relationship || tableName;
}
```

#### **3. Nested JOIN Processing**

```typescript
function buildNestedExpand(joins: ExpandItem[]): string {
  // Group JOINs by nesting level
  const rootExpands = new Map<string, ExpandItem[]>();

  joins.forEach(join => {
    const rootTable = join.table;
    if (!rootExpands.has(rootTable)) {
      rootExpands.set(rootTable, []);
    }

    // Find child JOINs that reference this table
    const childJoins = joins.filter(j =>
      j.relationship && j.onClause?.includes(`${join.alias || join.table}.`)
    );

    join.children = childJoins;
  });

  // Convert to OData expand syntax
  return Array.from(rootExpands.entries())
    .map(([root, children]) => {
      if (children.length === 0) {
        return root;
      }
      const childExpand = children.map(c => c.navigationProperty).join(',');
      return `${root}($expand=${childExpand})`;
    })
    .join(',');
}
```

### Integration Points

#### **1. SQLParser Enhancement**

```typescript
// In parseSQL method - add JOIN processing
const joins = parseJoinsFromSQL(sqlQuery);
if (joins.length > 0) {
  parameters.expandArray = joins;
  parameters.expand = buildNestedExpand(joins);

  // Remove JOIN clauses from the query for WHERE parsing
  const queryWithoutJoins = sqlQuery.replace(/JOIN\s+.+?ON\s+.+?(?=JOIN|WHERE|ORDER|LIMIT|$)/gi, '');
  // Continue with WHERE parsing on queryWithoutJoins
}
```

#### **2. RestAPIManager Enhancement**

```typescript
// In generateODataQuery - handle JOIN-based expands
if (parameters.expandArray && Array.isArray(parameters.expandArray)) {
  const expandString = buildNestedExpand(parameters.expandArray);
  if (expandString) {
    queryParts.push(`$expand=${encodeURIComponent(expandString)}`);
  }
} else if (parameters.expand) {
  // Fallback to legacy expand string
  queryParts.push(`$expand=${encodeURIComponent(parameters.expand)}`);
}
```

#### **3. QueryEditor.tsx UI Enhancement**

```typescript
const placeholder = isRemoteAPI && apiType === 'rest'
  ? `Write your SQL query here...

For REST APIs, use JOIN to expand related data:
SELECT * FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
WHERE o.Status = 'Active'

Examples:
Basic: SELECT * FROM Orders JOIN Customers ON Orders.SoldToCustomer = Customers.Id
Nested: SELECT * FROM Orders o JOIN Customers c ON o.SoldToCustomer = c.Id
        JOIN Addresses a ON c.AddressId = a.Id`
  : "Write your SQL query here...\n\nExample: SELECT * FROM TableName WHERE condition;";
```

### Advanced Features

#### **1. JOIN with Field Selection**

```sql
SELECT o.Id, o.Date, c.Name, c.Email
FROM Orders o
JOIN Customers c ON o.SoldToCustomer = c.Id
```

**→** `$select=Id,Date,Customers/Name,Customers/Email&$expand=Customers`

#### **2. Multiple Path JOINs**

```sql
SELECT * FROM SalesOrders so
JOIN Customers c ON so.SoldToCustomer = c.Id
JOIN Addresses sa ON so.ShipToAddress = sa.Id
JOIN Addresses ba ON c.BillToAddress = ba.Id
```

**→** `$expand=Customers($expand=BillToAddress),ShipToAddress`

#### **3. Conditional JOINs (Future)**

```sql
SELECT * FROM Orders o
LEFT JOIN Customers c ON o.SoldToCustomer = c.Id AND c.Status = 'Active'
```

### Testing Strategy

#### **Unit Tests**
```typescript
const joinTestCases = [
  {
    sql: `SELECT * FROM Orders o JOIN Customers c ON o.SoldToCustomer = c.Id`,
    expected: { expand: 'SoldToBPRef' }
  },
  {
    sql: `SELECT * FROM Orders o
          JOIN Customers c ON o.SoldToCustomer = c.Id
          JOIN OrderLines ol ON o.Id = ol.OrderId`,
    expected: { expand: 'SoldToBPRef,LineRefs' }
  },
  {
    sql: `SELECT * FROM Orders o
          JOIN Customers c ON o.SoldToCustomer = c.Id
            JOIN Addresses a ON c.AddressId = a.Id`,
    expected: { expand: 'SoldToBPRef($expand=Addresses)' }
  }
];
```

### Benefits

#### **For Users**
- **Familiar syntax:** Use standard SQL JOIN syntax they already know
- **Intuitive relationships:** JOIN clearly expresses "include related data"
- **No OData knowledge required:** Write SQL, get OData expand automatically
- **Backward compatible:** Existing queries continue working

#### **For System**
- **Clean abstraction:** Hide OData complexity behind SQL interface
- **Flexible mapping:** Can map any logical JOIN to appropriate navigation property
- **Extensible:** Easy to add support for different relationship types
- **Maintainable:** Clear separation between SQL parsing and OData generation

### Implementation Phases

#### **Phase 1: Basic JOIN Support**
- [ ] Parse simple `JOIN Table ON relationship` syntax
- [ ] Map to basic navigation properties
- [ ] Generate simple `$expand=Property1,Property2`

#### **Phase 2: Nested JOINs**
- [ ] Handle indented JOINs for nesting
- [ ] Generate `$expand=Parent($expand=Child)`
- [ ] Support multiple nesting levels

#### **Phase 3: Field Selection in JOINs**
- [ ] Parse `SELECT parent.field, joined.field`
- [ ] Generate `$select=field1,Joined/field2`
- [ ] Optimize payload size

#### **Phase 4: Advanced JOIN Features**
- [ ] LEFT/RIGHT/INNER JOIN semantics
- [ ] JOIN with WHERE conditions
- [ ] Self-joins and aliases

### Success Criteria

- [ ] Users can write `JOIN Customers ON Orders.SoldToCustomer = Customers.Id`
- [ ] Correctly converts to appropriate `$expand` parameter
- [ ] Works with existing WHERE clause filtering
- [ ] Supports nested relationships
- [ ] Maintains backward compatibility
- [ ] Clear error messages for unsupported JOIN patterns

## Related Documentation

- `FILTER_SUPPORT_PLAN.md` - WHERE clause to $filter conversion
- `QUERY_WORKFLOW.md` - Complete query processing flow
- Microsoft OData Documentation - $expand and navigation properties

---

**Document Version:** 1.0
**Planning Date:** October 2025
**Estimated Implementation:** Phase 1 - November 2025
**Owner:** Midport Development Team

## Parsing Logic Design

### 1. EXPAND Clause Detection

**Input SQL:**
```sql
SELECT * FROM Orders
EXPAND Customers, OrderLines AS Lines, ShipToBPRef.LineRefs
WHERE Status = 'Active'
```

**Detection Regex:**
```typescript
const expandMatch = sqlQuery.match(/expand\s+(.+?)(?:\s+where|\s+order|\s+limit|\s*$)/i);
if (expandMatch) {
  const expandClause = expandMatch[1].trim();
  // Parse expandClause: "Customers, OrderLines AS Lines, ShipToBPRef.LineRefs"
}
```

### 2. Expand List Parsing

**Input:** `Customers, OrderLines AS Lines, ShipToBPRef.LineRefs`

**Parsing Logic:**
```typescript
function parseExpandList(expandClause: string): ExpandItem[] {
  return expandClause.split(',').map(item => {
    const trimmed = item.trim();
    const aliasMatch = trimmed.match(/^(.+?)\s+AS\s+(.+)$/i);

    if (aliasMatch) {
      return {
        field: aliasMatch[1].trim(),
        alias: aliasMatch[2].trim()
      };
    } else {
      return {
        field: trimmed,
        alias: null
      };
    }
  });
}

// Output: [
//   { field: "Customers", alias: null },
//   { field: "OrderLines", alias: "Lines" },
//   { field: "ShipToBPRef.LineRefs", alias: null }
// ]
```

### 3. OData Conversion

**Array of Expand Items → OData $expand:**
```typescript
function convertToODataExpand(expandItems: ExpandItem[]): string {
  const expandFields = expandItems.map(item => {
    // Handle nested expands: ShipToBPRef.LineRefs
    // OData supports: $expand=ShipToBPRef($expand=LineRefs)
    return convertNestedExpand(item.field);
  });

  return expandFields.join(',');
}

function convertNestedExpand(fieldPath: string): string {
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    return fieldPath;
  }

  // ShipToBPRef.LineRefs → ShipToBPRef($expand=LineRefs)
  const [parent, ...children] = parts;
  const childExpand = convertNestedExpand(children.join('.'));
  return `${parent}($expand=${childExpand})`;
}

// Examples:
// "Customers" → "Customers"
// "ShipToBPRef.LineRefs" → "ShipToBPRef($expand=LineRefs)"
// "Order.Lines.Items" → "Order($expand=Lines($expand=Items))"
```

## Integration Points

### 1. SQLParser Enhancement

**Add to `parseSQL` method:**
```typescript
// Extract EXPAND clause
const expandMatch = sqlQuery.match(/expand\s+(.+?)(?:\s+where|\s+order|\s+limit|\s*$)/i);
if (expandMatch) {
  const expandClause = expandMatch[1].trim();
  const expandItems = parseExpandList(expandClause);

  // Store as array for RestAPIManager
  parameters.expandArray = expandItems;

  // Also store legacy format for backward compatibility
  parameters.expand = expandItems.map(item => item.field).join(',');
}
```

### 2. RestAPIManager Enhancement

**Update `generateODataQuery`:**
```typescript
// Handle array-based expand (new JOIN syntax)
if (parameters.expandArray && Array.isArray(parameters.expandArray)) {
  const expandParts = parameters.expandArray.map((item: ExpandItem) => {
    return convertNestedExpand(item.field);
  });
  queryParts.push(`$expand=${encodeURIComponent(expandParts.join(','))}`);
}
// Fallback to legacy string-based expand
else if (parameters.expand) {
  queryParts.push(`$expand=${encodeURIComponent(parameters.expand)}`);
}
```

### 3. QueryEditor.tsx UI Enhancement

**Add contextual help:**
```typescript
const helpText = isRemoteAPI && apiType === 'rest'
  ? "For REST APIs, you can expand related data:\nEXPAND Customers, OrderLines AS Lines\n\nExample: SELECT * FROM Orders EXPAND Customers WHERE Status = 'Active'"
  : "Write your SQL query here...\n\nExample: SELECT * FROM TableName WHERE condition;";
```

## Advanced Features

### 1. Nested Expand with Filters

**Future Enhancement:**
```sql
SELECT * FROM Orders
EXPAND Customers WHERE Status = 'Active', OrderLines WHERE Quantity > 0
```

**OData Output:**
```
$expand=Customers($filter=Status eq 'Active'),OrderLines($filter=Quantity gt 0)
```

### 2. Expand with Select

**Future Enhancement:**
```sql
SELECT o.Id, o.Date FROM Orders o
EXPAND Customers (Id, Name), OrderLines (ProductId, Quantity)
```

**OData Output:**
```
$select=Id,Date&$expand=Customers($select=Id,Name),OrderLines($select=ProductId,Quantity)
```

### 3. Multiple Table JOIN-like Syntax

**Complex Example:**
```sql
SELECT * FROM SalesOrders so
EXPAND
  SoldToCustomer (Id, Name, Address),
  ShipToAddress (Street, City, Country),
  OrderLines (ProductId, Quantity, Price)
    EXPAND Product (Name, Category)
WHERE so.Status = 'Open' AND so.TotalAmount > 1000
```

**OData Output:**
```
$filter=Status eq 'Open' and TotalAmount gt 1000&$expand=SoldToCustomer($select=Id,Name,Address),ShipToAddress($select=Street,City,Country),OrderLines($select=ProductId,Quantity,Price;$expand=Product($select=Name,Category))
```

## Implementation Strategy

### Phase 1: Basic EXPAND Support
- [ ] Parse `EXPAND field1, field2` syntax
- [ ] Convert to `$expand=field1,field2`
- [ ] Update UI placeholder text
- [ ] Backward compatibility with existing expand configuration

### Phase 2: Alias Support
- [ ] Parse `EXPAND field1 AS alias1, field2 AS alias2`
- [ ] Handle alias in result processing (future feature)
- [ ] Update help text

### Phase 3: Nested Expand
- [ ] Parse `EXPAND Parent.Child.GrandChild`
- [ ] Convert to `Parent($expand=Child($expand=GrandChild))`
- [ ] Test with complex ION API structures

### Phase 4: Advanced Features
- [ ] Filtered expands
- [ ] Selected fields in expands
- [ ] Performance optimization

## Benefits

### For Users
- **Intuitive:** SQL-like syntax they already know
- **Powerful:** Access to related data without OData knowledge
- **Flexible:** Supports complex nested relationships
- **Compatible:** Works alongside existing WHERE clauses

### For System
- **Non-breaking:** Current expand configuration still works
- **Extensible:** Easy to add advanced features later
- **Performant:** Selective expand reduces payload size
- **Maintainable:** Clear separation between SQL parsing and OData generation

## Risk Assessment

### Low Risk
- Basic EXPAND clause parsing
- Simple field list conversion
- UI placeholder updates

### Medium Risk
- Nested expand syntax parsing
- Complex boolean logic with expands
- Integration with existing expand configuration

### High Risk
- Advanced features (filtered/select expands)
- Performance impact on large datasets
- Complex nested parsing logic

## Testing Strategy

### Unit Tests
```typescript
const testCases = [
  // Basic expand
  "SELECT * FROM Orders EXPAND Customers",
  // → $expand=Customers

  // Multiple expands
  "SELECT * FROM Orders EXPAND Customers, OrderLines",
  // → $expand=Customers,OrderLines

  // Nested expand
  "SELECT * FROM Orders EXPAND Customer.Address",
  // → $expand=Customer($expand=Address)

  // With WHERE clause
  "SELECT * FROM Orders EXPAND Customers WHERE Status = 'Active'",
  // → $expand=Customers&$filter=Status eq 'Active'
];
```

### Integration Tests
- End-to-end query execution with expand
- Result parsing and display
- Performance comparison with/without expand
- Error handling for invalid expand syntax

## Success Criteria

- [ ] Users can write `EXPAND field1, field2` syntax
- [ ] Correctly converts to OData `$expand` parameters
- [ ] Works with existing WHERE clause filtering
- [ ] Maintains backward compatibility
- [ ] Clear error messages for invalid syntax
- [ ] Performance acceptable for complex expands

## Related Documentation

- `FILTER_SUPPORT_PLAN.md` - WHERE clause to $filter conversion
- `QUERY_WORKFLOW.md` - Complete query processing flow
- Microsoft OData Documentation - $expand parameter reference

---

**Document Version:** 1.0
**Planning Date:** October 2025
**Estimated Implementation:** Phase 1 - November 2025
**Owner:** Midport Development Team
