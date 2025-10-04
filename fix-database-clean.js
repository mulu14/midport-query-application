const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./midport_query_platform.db');

console.log('Cleaning up and fixing database...');

db.serialize(() => {
  // Drop any existing temporary tables
  db.run(`DROP TABLE IF EXISTS remote_api_databases_fixed`);
  
  // Create new table with correct schema
  db.run(`
    CREATE TABLE remote_api_databases_fixed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      tenant_name TEXT NOT NULL UNIQUE,
      services TEXT NOT NULL,
      full_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Copy data from old table to new table
  db.run(`
    INSERT INTO remote_api_databases_fixed (name, base_url, tenant_name, services, full_url, status, created_at, updated_at)
    SELECT name, base_url, tenant_name, services, full_url, status, created_at, updated_at
    FROM remote_api_databases
  `, function(err) {
    if (err) {
      console.error('Error copying data:', err);
      return;
    }
    console.log('✅ Copied data to new table');

    // Drop old table and rename new table
    db.run(`DROP TABLE remote_api_databases`, (err) => {
      if (err) {
        console.error('Error dropping old table:', err);
        return;
      }
      console.log('✅ Dropped old table');

      db.run(`ALTER TABLE remote_api_databases_fixed RENAME TO remote_api_databases`, (err) => {
        if (err) {
          console.error('Error renaming table:', err);
          return;
        }
        console.log('✅ Renamed new table');

        // Now add the missing tables
        console.log('\nAdding missing tables...');
        
        // Add ServiceCall_v2 table to MIDPORT_DEM
        db.run(`
          INSERT INTO remote_api_tables (database_id, name)
          SELECT id, 'ServiceCall_v2'
          FROM remote_api_databases
          WHERE tenant_name = 'MIDPORT_DEM'
        `, function(err) {
          if (err) {
            console.error('Error adding ServiceCall_v2 table:', err);
          } else {
            console.log('✅ Added ServiceCall_v2 table to MIDPORT_DEM');
          }

          // Check final results
          db.all(`
            SELECT 
              rdb.id as db_id,
              rdb.tenant_name,
              rdb.name as db_name,
              rt.name as table_name
            FROM remote_api_databases rdb
            LEFT JOIN remote_api_tables rt ON rdb.id = rt.database_id
            ORDER BY rdb.tenant_name, rt.name
          `, [], (err, relationRows) => {
            if (err) {
              console.error('Error:', err);
              return;
            }
            console.log('\nFinal Database-Table relationships:');
            relationRows.forEach((row, i) => {
              console.log(`${i + 1}. ${row.tenant_name} (${row.db_name}) -> ${row.table_name || 'No tables'}`);
            });

            db.close();
          });
        });
      });
    });
  });
});
