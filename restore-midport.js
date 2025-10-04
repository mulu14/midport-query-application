const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./midport_query_platform.db');

console.log('Restoring MIDPORT_DEM database...');

// Insert the MIDPORT_DEM database
db.run(`
  INSERT INTO remote_api_databases (name, base_url, tenant_name, services, full_url, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`, [
  'Midport',
  'https://mingle-ionapi.eu1.inforcloudsuite.com',
  'MIDPORT_DEM',
  'LN/c4ws/services',
  'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ServiceCall_v2',
  'connected',
  new Date().toISOString(),
  new Date().toISOString()
], function(err) {
  if (err) {
    console.error('Error inserting database:', err);
    return;
  }
  
  const databaseId = this.lastID;
  console.log('✅ Inserted MIDPORT_DEM database with ID:', databaseId);

  // Insert the ServiceCall_v2 table
  db.run(`
    INSERT INTO remote_api_tables (database_id, name)
    VALUES (?, ?)
  `, [databaseId, 'ServiceCall_v2'], function(err) {
    if (err) {
      console.error('Error inserting table:', err);
      return;
    }
    
    console.log('✅ Inserted ServiceCall_v2 table');

    // Verify the data
    db.all(`
      SELECT 
        rdb.id as db_id,
        rdb.tenant_name,
        rdb.name as db_name,
        rt.name as table_name
      FROM remote_api_databases rdb
      LEFT JOIN remote_api_tables rt ON rdb.id = rt.database_id
      ORDER BY rdb.tenant_name, rt.name
    `, [], (err, rows) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      
      console.log('\nFinal Database-Table relationships:');
      rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.tenant_name} (${row.db_name}) -> ${row.table_name || 'No tables'}`);
      });

      db.close();
    });
  });
});
