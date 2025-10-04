const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), "midport_query_platform.db");
console.log('Testing database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Database connected successfully');
});

// Check current schema
console.log('\n=== Current remote_api_databases schema ===');
db.all("PRAGMA table_info(remote_api_databases)", [], (err, schema) => {
  if (err) {
    console.error('❌ Schema check failed:', err.message);
    return;
  }

  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  // Check current data
  console.log('\n=== Current data in remote_api_databases ===');
  db.all('SELECT * FROM remote_api_databases', [], (err, data) => {
    if (err) {
      console.error('❌ Data check failed:', err.message);
      return;
    }

    console.log('Found', data.length, 'records');
    data.forEach(row => {
      console.log('  ', row);
    });

    // Try to insert test data
    console.log('\n=== Testing insert ===');
    const testData = {
      name: 'Test Database',
      full_url: 'https://test.com/api',
      base_url: 'https://test.com',
      tenant_name: 'TEST_TENANT',
      services: 'test/services'
    };

    db.run(`
      INSERT INTO remote_api_databases (name, full_url, base_url, tenant_name, services)
      VALUES (?, ?, ?, ?, ?)
    `, [testData.name, testData.full_url, testData.base_url, testData.tenant_name, testData.services], function(err) {
      if (err) {
        console.error('❌ Insert failed:', err.message);
        return;
      }

      console.log('Inserted record with ID:', this.lastID);

      // Force a checkpoint to ensure data is written to the main database file
      console.log('\n=== Forcing database checkpoint ===');
      db.run('PRAGMA wal_checkpoint(RESTART)', [], function(err) {
        if (err) {
          console.error('❌ Checkpoint failed:', err.message);
        } else {
          console.log('✅ Checkpoint completed');
        }

        // Check data again
        console.log('\n=== Data after insert and checkpoint ===');
        db.all('SELECT * FROM remote_api_databases', [], (err, dataAfter) => {
          if (err) {
            console.error('❌ Data check after insert failed:', err.message);
            return;
          }

          console.log('Found', dataAfter.length, 'records');
          dataAfter.forEach(row => {
            console.log('  ', row);
          });

          db.close();
          console.log('\n✅ Database test completed successfully');
        });
      });
    });
  });
});
