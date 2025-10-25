# Midport Query Platform - Client User Guide

## Overview

The Midport Query Platform is a powerful multi-tenant SaaS application designed to query Infor LN ERP business data through ION API endpoints. This platform enables authorized users to execute queries against remote Infor systems using both SOAP and REST API interfaces.

## Key Features

- **Multi-Tenant Support**: Secure, isolated data access per tenant
- **ION API Integration**: Direct connection to Infor LN systems via SOAP and REST
- **OAuth2 Authentication**: Secure service account-based authentication
- **Real-time Query Execution**: Execute queries and view results instantly
- **Service Discovery**: Automatic discovery of available API endpoints
- **Credential Management**: Secure storage and management of tenant credentials

## Getting Started

### Prerequisites

- Valid Infor ION API credentials
- Service account access keys
- Portal URL and tenant configuration
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Initial Setup

1. **Access the Platform**: Navigate to `http://localhost:3000`
2. **Configure Credentials**: Go to the Credentials section to set up your tenant
3. **Add Remote Database**: Configure your ION API connection
4. **Start Querying**: Select services and execute queries

## Credential Configuration

### Required Information

To connect to your Infor LN system, you'll need:

#### Basic Information

- **Tenant Name**: Unique identifier for your tenant (e.g., `MIDPORT_DEM`)
- **Environment Version**: Your Infor environment version
- **Active Status**: Enable/disable the credential

#### OAuth2 Configuration

- **Client ID**: Your ION API client identifier
- **Client Secret**: Your ION API client secret
- **Portal URL**: Your Infor portal URL (e.g., `https://mingle-sso.eu1.inforcloudsuite.com:443/MIDPORT_DEM/as/`)
- **Identity URL**: Your ION API identity URL
- **Tenant ID**: Your tenant identifier

#### Service Account Keys

- **Service Account Access Key**: Your service account access key
- **Service Account Secret Key**: Your service account secret key

#### Optional Configuration

- **Client Name**: Your application name
- **OAuth2 Endpoints**: Token, authorization, and revoke endpoints
- **Scope**: OAuth2 scope permissions
- **Version**: API version
- **Data Type**: Data type identifier
- **X-Infor-LnCompany**: Company identifier for LN API requests
- **X-Infor-LnIdentity**: Identity for LN API authentication

### Adding Credentials

1. Click "Add New Remote Database" in the sidebar
2. Fill in the required fields marked with red asterisks (*)
3. Use the "Show/Hide sensitive fields" toggle to manage password visibility
4. Click "Create Credentials" to save

### Editing Credentials

1. Navigate to the Credentials section
2. Click the edit icon next to your tenant
3. Modify the necessary fields
4. Click "Update Credentials" to save changes

## Query Interface

### Service Selection

The platform automatically discovers available services for each tenant:

#### SOAP Services

- **ServiceCall_v2**: Service call management
- **Customer_v1**: Customer data management
- **WarehouseOrder_v2**: Warehouse order processing
- **Order_v1**: Order management
- And many more...

#### REST Services

- **Purchase Order**: Purchase order management
- **Sales Order**: Sales order processing
- **Employee Master Data**: Employee information
- And other REST endpoints...

### Executing Queries

1. **Select Tenant**: Choose your tenant from the sidebar
2. **Expand Services**: Click to expand SOAP or REST services
3. **Select Service**: Click on a specific service (e.g., "Purchase Order")
4. **Query Interface**: The platform will automatically navigate to the query interface
5. **Execute Query**: Use the query editor to run your queries

### Query Types

#### List Queries

- Retrieve all records from a service
- Apply filters and sorting
- Paginate results

#### Filtered Queries

- Use SQL-like syntax for filtering
- Support for comparison operators (eq, in, etc.)
- Complex filter conditions

#### Custom Queries

- Direct API calls with custom parameters
- SOAP envelope customization
- REST endpoint configuration

## Navigation

### Sidebar Navigation

- **Remote API**: Main query interface
- **Credentials**: Manage tenant configurations
- **Add Database**: Quick access to add new connections

### Responsive Design

The platform is fully responsive and optimized for all device types:

#### Desktop Experience (1024px+)

- **Full Sidebar**: Complete service tree with expandable sections
- **Multi-column Layout**: Efficient use of screen real estate
- **Hover Interactions**: Rich hover effects and tooltips
- **Keyboard Navigation**: Full keyboard support for power users
- **Large Query Editor**: Spacious interface for complex queries

#### Tablet Experience (768px - 1023px)

- **Adaptive Sidebar**: Collapsible sidebar with touch-friendly controls
- **Responsive Forms**: Optimized form layouts for touch input
- **Gesture Support**: Swipe navigation and touch interactions
- **Optimized Dialogs**: Full-screen modals for better usability
- **Touch-friendly Buttons**: Larger tap targets for easier interaction

#### Mobile Experience (320px - 767px)

- **Mobile-first Navigation**: Hamburger menu with slide-out sidebar
- **Stacked Layouts**: Single-column layouts for optimal readability
- **Touch-optimized Controls**: Large buttons and touch-friendly inputs
- **Simplified Interface**: Streamlined UI focusing on core functionality
- **Portrait Orientation**: Optimized for vertical screen usage
- **Thumb-friendly Design**: Controls positioned for easy thumb access

#### Key Mobile Features

- **Responsive Credential Forms**: Forms adapt to screen size with appropriate input types
- **Mobile Query Interface**: Simplified query editor with mobile keyboard support
- **Touch Gestures**: Swipe to navigate between services and results
- **Offline Capability**: Basic functionality works without constant internet connection
- **Fast Loading**: Optimized for mobile networks and slower connections
- **Accessibility**: Full screen reader support and accessibility compliance

#### Cross-Platform Compatibility

- **iOS Safari**: Fully supported with Safari-specific optimizations
- **Android Chrome**: Optimized for Android devices and Chrome browser
- **Windows Mobile**: Compatible with Windows mobile browsers
- **Progressive Web App**: Can be installed as a PWA on mobile devices
- **Offline Support**: Basic functionality available offline

## Security Features

### Data Protection

- All credentials are securely stored
- Sensitive fields are masked by default
- OAuth2 token management
- Secure API communication

### Access Control

- Tenant-based data isolation
- Service account authentication
- Encrypted credential storage

## Troubleshooting

### Common Issues

#### Connection Problems

- Verify portal URL format
- Check service account keys
- Ensure tenant ID is correct
- Validate OAuth2 configuration

#### Query Errors

- Check service availability
- Verify API permissions
- Review query syntax
- Check tenant status

#### Authentication Issues

- Refresh service account tokens
- Verify client credentials
- Check OAuth2 endpoints
- Review scope permissions

### Error Messages

The platform provides detailed error messages for:

- Validation errors
- Connection failures
- Authentication problems
- Query execution errors

## Best Practices

### Credential Management

- Regularly rotate service account keys
- Use descriptive tenant names
- Keep credentials up to date
- Monitor active status

### Query Optimization

- Use appropriate filters
- Limit result sets when possible
- Test queries on small datasets first
- Use pagination for large results

### Security

- Never share credentials
- Use strong, unique passwords
- Regularly review access logs
- Keep the platform updated

## Support

### Getting Help

- Check the troubleshooting section
- Review error messages carefully
- Contact your system administrator
- Refer to Infor ION API documentation

### Platform Information

- **Version**: Current platform version
- **Last Updated**: Platform update information
- **Supported APIs**: List of supported ION API versions

## API Reference

### Supported ION API Services

#### SOAP Services

- ServiceCall_v2
- Customer_v1
- WarehouseOrder_v2
- Order_v1
- Product_v1
- And many more...

#### REST Services

- Purchase Order Management
- Sales Order Processing
- Employee Master Data
- Customer Management
- And other REST endpoints...

### Query Syntax

#### Basic List Query

```
SELECT * FROM ServiceCall_v2
```

#### Filtered Query

```
SELECT * FROM Customer_v1 WHERE customerId = 'CUST001'
```

#### Complex Filter

```
SELECT * FROM Order_v1 WHERE status IN ('OPEN', 'PENDING') AND amount > 1000
```

## Conclusion

The Midport Query Platform provides a powerful, secure, and user-friendly interface for querying Infor LN data through ION APIs. With its multi-tenant architecture and comprehensive credential management, it enables efficient data access while maintaining security and compliance standards.

For additional support or questions, please contact your system administrator or refer to the Infor ION API documentation.

---

**Midport Scandinavia**  
*Empowering business intelligence through innovative query solutions*
