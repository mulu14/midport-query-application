# Midport SQL Query Platform

A modern web application for querying remote API databases with SQL-like syntax, built with Next.js, React, and SQLite.

## 📋 Project Information

- **Company**: Midport Scandinavia
- **Developer**: Mulugeta Forsido
- **Date**: October 2025
- **Version**: 1.0.0

## 🚀 Features

### Core Functionality
- **Remote API Database Management**: Add, configure, and manage remote API connections
- **SQL Query Interface**: Write SQL queries that are automatically converted to SOAP requests
- **Real-time Query Execution**: Execute queries against remote APIs with live results
- **Database Sidebar**: Navigate between local SQLite databases and remote API databases
- **Table Management**: View and select tables from connected databases

### Technical Features
- **SQLite Integration**: Local database for storing configuration and metadata
- **SOAP API Support**: Automatic conversion of SQL queries to SOAP envelopes
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Error Handling**: Comprehensive error handling and user feedback
- **Type Safety**: Full TypeScript implementation with strict typing

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

### Adding Remote API Databases

1. Click the **"Add New Remote Database"** button in the sidebar
2. Fill in the required fields:
   - **Database Name**: Friendly name for identification
   - **Base URL**: API base URL (e.g., `https://mingle-ionapi.eu1.inforcloudsuite.com`)
   - **Tenant**: Tenant name (e.g., `MIDPORT_DEM`)
   - **Services Path**: Services path (e.g., `LN/c4ws/services`)
   - **Tables**: Comma-separated table names
3. Click **"Add Database"** to save

### Writing SQL Queries

1. Select a database and table from the sidebar
2. Write SQL queries in the query editor:
   ```sql
   SELECT * FROM ServiceCall_v2 ;
   ```
3. Click **"Run Query"** to execute

### Supported SQL Operations

- **SELECT**: Read data from tables
- **INSERT**: Create new records (planned)
- **UPDATE**: Modify existing records (planned)
- **DELETE**: Remove records (planned)

## 🔧 API Reference

### Remote Database API

#### `GET /api/remote-databases`
Fetches all configured remote API databases.

**Response:**
```json
{
  "databases": [
    {
      "id": "1",
      "name": "MIDPORT_DEM",
      "tenantName": "MIDPORT_DEM",
      "baseUrl": "https://mingle-ionapi.eu1.inforcloudsuite.com",
      "services": "LN/c4ws/services",
      "tables": [
        {
          "name": "ServiceCall_v2",
          "endpoint": "ServiceCall_v2"
        }
      ],
      "status": "active"
    }
  ]
}
```

#### `POST /api/remote-databases`
Creates a new remote API database.

**Request Body:**
```json
{
  "name": "My Database",
  "base_url": "https://api.example.com",
  "tenant_name": "TENANT_1",
  "services": "api/v1",
  "tables": ["Table1", "Table2"]
}
```

**Response:**
```json
{
  "success": true,
  "database": { ... },
  "isExisting": false,
  "message": "Database created successfully"
}
```

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