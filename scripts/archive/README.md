# Archive - Debug and Migration Scripts

This directory contains debugging and database migration scripts that were used during development. These scripts have been archived as they contain console.log statements and temporary fixes that are not needed in production.

## Scripts Overview

- `check-current-state.js` - Database state inspection script
- `check-db-schema.js` - Schema validation script  
- `check-table-schema.js` - Table structure verification
- `fix-database-*.js` - Database repair and deduplication utilities
- `fix-tables*.js` - Table structure fixes
- `restore-*.js` - Data restoration utilities
- `update-midport-services.js` - Service configuration updates

## Status

These scripts are **archived** and should not be used in production. They were created for one-time database fixes and debugging during development.

## Note

If you need to perform database maintenance, consider creating new production-ready scripts with proper error handling and logging instead of using these archived debug scripts.