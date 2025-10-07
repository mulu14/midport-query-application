/**
 * Check the actual database schema
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  const dbPath = path.join(process.cwd(), 'midport_query_platform.db');
  const db = new sqlite3.Database(dbPath);

  try {
    // Check remote_api_tables schema
    const getSchema = () => {
      return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(remote_api_tables)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const schema = await getSchema();
    console.log('📋 remote_api_tables schema:');
    schema.forEach(column => {
      console.log(`   ${column.name} (${column.type}${column.notnull ? ', NOT NULL' : ''}${column.dflt_value ? `, DEFAULT ${column.dflt_value}` : ''})`);
    });

    // Check existing data
    const getData = () => {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT rad.tenant_name, rat.name as service_name, rat.*
          FROM remote_api_databases rad
          LEFT JOIN remote_api_tables rat ON rad.id = rat.database_id
          WHERE rad.tenant_name = 'MIDPORT_DEM'
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const data = await getData();
    console.log('\n📋 Current MIDPORT_DEM data:');
    data.forEach(row => {
      console.log(`   Service: ${row.service_name || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

checkSchema();