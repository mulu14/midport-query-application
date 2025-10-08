const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./midport_query_platform.db');

console.log('Restoring MIDPORT_DEM database with correct table structure...');

// Insert the ServiceCall_v2 table with endpoint
db.run(`
  INSERT INTO remote_api_tables (database_id, name, endpoint)
  SELECT id, 'ServiceCall_v2', 'ServiceCall_v2'
  FROM remote_api_databases
  WHERE tenant_name = 'MIDPORT_DEM'
`, function(err) {
  if (err) {
    console.error('Error inserting table:', err);
    return;
  }
  
  console.log('✅ Inserted ServiceCall_v2 table with endpoint');

  // Verify the data
  db.all(`
    SELECT 
      rdb.id as db_id,
      rdb.tenant_name,
      rdb.name as db_name,
      rt.name as table_name,
      rt.endpoint
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
      console.log(`${i + 1}. ${row.tenant_name} (${row.db_name}) -> ${row.table_name || 'No tables'} (endpoint: ${row.endpoint || 'N/A'})`);
    });

    db.close();
  });
});
