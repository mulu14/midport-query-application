# OData $filter Support Implementation Plan

**Author:** Mulugeta Forsido
**Company:** Midport Scandinavia
**Date:** October 2025
**Status:** Analysis & Planning

## Executive Summary

This document outlines the current state of WHERE clause to OData `$filter` conversion and provides recommendations for enhancements. The system currently supports basic SQL WHERE clause conversion to OData `$filter` syntax, but may need improvements for complex boolean logic and edge cases.

## Current Implementation Overview

### Architecture Flow

```
User SQL Query → SQLParser.parseSQL() → Parameters Object → RestAPIManager.generateODataQuery() → OData $filter
```

### Current Capabilities

#### ✅ **Supported SQL Operators**
- `=` → `eq` (equal)
- `!=`, `<>` → `ne` (not equal)
- `>` → `gt` (greater than)
- `<` → `lt` (less than)
- `>=` → `ge` (greater or equal)
- `<=` → `le` (less or equal)
- `LIKE` → `contains` (substring search)
- `IN` → Multiple OR conditions

#### ✅ **WHERE Clause Parsing**
- Extracts WHERE clause from SQL queries
- Splits conditions by AND/OR operators
- Parses individual field-operator-value triplets
- Handles quoted strings and numeric values

#### ✅ **OData Generation**
- Converts parameters to `$filter=field eq 'value' and field2 gt 100`
- Properly escapes single quotes in string values
- URL-encodes filter parameters
- Handles array values for IN operations

### Example Conversion

**User Input:**
```sql
SELECT * FROM Customers
WHERE BuyFromBusinessPartner = "SUP000340" and ShipToAdress = "XXX" and Amount > 1000
```

**Parsed Parameters:**
```javascript
{
  BuyFromBusinessPartner: "SUP000340",
  "BuyFromBusinessPartner_operator": "eq",
  ShipToAdress: "XXX",
  "ShipToAdress_operator": "eq",
  Amount: 1000,
  "Amount_operator": "gt"
}
```

**Generated OData:**
```
$filter=BuyFromBusinessPartner%20eq%20%27SUP000340%27%20and%20ShipToAdress%20eq%20%27XXX%27%20and%20Amount%20gt%201000
```

**Final URL:**
```
/MIDPORT_DEM/api/v2/tdapi.slsSalesOrder/Customers?$filter=BuyFromBusinessPartner%20eq%20%27SUP000340%27%20and%20ShipToAdress%20eq%20%27XXX%27%20and%20Amount%20gt%201000
```

## Current Limitations & Potential Issues

### 1. **Complex Boolean Logic**
**Current Issue:** Simple AND/OR splitting doesn't handle parentheses or nested logic
**Example Problem:**
```sql
WHERE (Status = 'Active' AND Amount > 1000) OR (Status = 'Pending' AND Amount > 500)
```
**Current Output:** May not preserve logical grouping
**Expected:** `$filter=(Status eq 'Active' and Amount gt 1000) or (Status eq 'Pending' and Amount gt 500)`

### 2. **Operator Precedence**
**Issue:** AND/OR precedence not properly handled
**Example:** `A AND B OR C` should be `(A AND B) OR C`, not `A AND (B OR C)`

### 3. **Advanced SQL Features**
**Not Currently Supported:**
- `BETWEEN` operator
- `IS NULL` / `IS NOT NULL`
- Case-insensitive searches (`ILIKE`, `UPPER()`, `LOWER()`)
- Substring operations
- Mathematical expressions in WHERE clauses

### 4. **String Handling**
**Potential Issues:**
- Unicode characters in field names/values
- Special characters in strings
- Very long string values

## Recommended Enhancements

### Phase 1: Core Logic Improvements (High Priority)

#### **Enhanced Boolean Logic Parser**
**Objective:** Properly handle parentheses and operator precedence

**Implementation:**
```typescript
// In SQLParser.ts - replace simple split with AST-based parsing
private static parseBooleanLogic(whereClause: string): FilterExpression {
  // Build abstract syntax tree for boolean expressions
  // Handle parentheses, AND/OR precedence, nested conditions
}
```

**Benefits:**
- Correct handling of complex WHERE clauses
- Maintains logical grouping with parentheses
- Supports nested AND/OR combinations

#### **Advanced Operator Support**
**Add Support For:**
- `BETWEEN value1 AND value2` → `(field ge value1 and field le value2)`
- `IS NULL` → `field eq null`
- `IS NOT NULL` → `field ne null`
- `NOT condition` → `not(condition)`

### Phase 2: String & Data Type Handling (Medium Priority)

#### **Enhanced String Processing**
- Unicode character support
- Special character escaping
- Case-insensitive search functions
- String length and substring operations

#### **Data Type Validation**
- Date/time format validation and conversion
- Numeric type checking
- Boolean value handling

### Phase 3: Performance & Edge Cases (Low Priority)

#### **Query Optimization**
- Filter condition reordering for API performance
- Duplicate condition detection and removal
- Query complexity validation

#### **Error Handling**
- Invalid WHERE clause detection
- Unsupported operator warnings
- Fallback to simpler parsing for complex cases

## Implementation Strategy

### **Non-Breaking Approach**
All enhancements should be backward compatible:
- Current simple WHERE clauses continue to work
- Complex clauses get better parsing
- Graceful fallback for unsupported syntax

### **Testing Strategy**
```typescript
// Test cases for WHERE clause parsing
const testCases = [
  // Simple cases (current functionality)
  "Status = 'Active'",
  "Amount > 1000 AND Status = 'Active'",

  // Complex cases (enhanced functionality)
  "(Status = 'Active' AND Amount > 1000) OR (Status = 'Pending' AND Amount > 500)",
  "Name LIKE '%John%' AND Age BETWEEN 18 AND 65",
  "CreatedDate >= '2024-01-01T00:00:00Z' AND IsActive = true"
];
```

### **Error Recovery**
- Parse what we can, ignore unsupported parts
- Log warnings for complex syntax
- Provide user feedback for syntax errors

## Expand Functionality Status

**Current State:** ✅ **Working via table/service configuration**
- Expand relationships configured at table level
- Not exposed in user SQL syntax
- Automatically applied based on service metadata

**Recommendation:** Keep expand as table configuration - do not expose in SQL textarea to maintain simplicity.

## Success Criteria

### **Functional Requirements**
- [ ] Simple WHERE clauses work correctly
- [ ] Complex boolean logic with parentheses
- [ ] All standard SQL operators supported
- [ ] Proper OData syntax generation
- [ ] Error handling for invalid syntax

### **Non-Functional Requirements**
- [ ] Backward compatibility maintained
- [ ] Performance impact minimal
- [ ] Error messages helpful to users
- [ ] Code maintainable and well-documented

## Risk Assessment

### **Low Risk**
- Simple WHERE clause enhancements
- Additional operator support
- Better error messages

### **Medium Risk**
- Complex boolean logic parsing
- AST-based parsing implementation
- Performance impact on very complex queries

### **High Risk**
- Major parser rewrite
- Breaking changes to existing functionality

## Next Steps

1. **Phase 1 Implementation:** Enhanced boolean logic parsing
2. **Testing:** Comprehensive test suite for WHERE clause variations
3. **User Validation:** Ensure complex queries work as expected
4. **Performance Monitoring:** Track impact on query execution time
5. **Documentation Update:** Update user guides with supported syntax

## Related Documentation

- `QUERY_WORKFLOW.md` - Complete query processing flow
- `MULTI_TENANT_SETUP.md` - Tenant and service configuration
- Microsoft OData Documentation - Filter expression reference

---

**Document Version:** 1.0
**Review Date:** October 2025
**Next Review:** November 2025
**Owner:** Midport Development Team
