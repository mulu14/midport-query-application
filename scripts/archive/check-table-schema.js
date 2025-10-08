const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./midport_query_platform.db');

db.all('PRAGMA table_info(remote_api_tables)', [], (err, columns) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('remote_api_tables schema:');
  columns.forEach(col => {
    console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  db.close();
});
