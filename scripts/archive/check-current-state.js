const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./midport_query_platform.db');

console.log('Checking current database state...');

db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, tables) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Available tables:', tables.map(t => t.name));

  db.all('SELECT * FROM remote_api_databases', [], (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('Databases found:', rows.length);
    rows.forEach(row => console.log(row));

    db.all('SELECT * FROM remote_api_tables', [], (err, tableRows) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      console.log('Tables found:', tableRows.length);
      tableRows.forEach(row => console.log(row));

      db.close();
    });
  });
});
