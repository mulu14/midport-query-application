/**
 * Script to update MIDPORT_DEM tenant with multiple ION API services
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function updateMidportServices() {
  console.log('🔄 Updating MIDPORT_DEM tenant with multiple ION API services...');
  
  const dbPath = path.join(process.cwd(), 'midport_query_platform.db');
  console.log('📁 Database path:', dbPath);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Services to add to MIDPORT_DEM
  const servicesToAdd = [
    'BusinessPartner_v3',
    'ATPService_WT', 
    'SalesOrder',
    'ServiceCall_v2'
  ];

  try {
    // Step 1: Find MIDPORT_DEM tenant ID
    const getTenant = () => {
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM remote_api_databases WHERE tenant_name = ?',
          ['MIDPORT_DEM'],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    };

    const tenant = await getTenant();
    
    if (!tenant) {
      console.log('🔍 MIDPORT_DEM tenant not found. Creating new tenant...');
      
      // Create new tenant
      const createTenant = () => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO remote_api_databases (name, base_url, tenant_name, services, full_url, status) VALUES (?, ?, ?, ?, ?, ?)',
            [
              'MIDPORT_DEM - ION API Services',
              'https://mingle-ionapi.eu1.inforcloudsuite.com',
              'MIDPORT_DEM',
              'LN/c4ws/services',
              'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services',
              'active'
            ],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      };

      const tenantId = await createTenant();
      console.log(`✅ Created MIDPORT_DEM tenant with ID: ${tenantId}`);
      
      // Add all services to new tenant
      for (const service of servicesToAdd) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO remote_api_tables (database_id, name, endpoint) VALUES (?, ?, ?)',
            [tenantId, service, service],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`➕ Added service: ${service}`);
                resolve();
              }
            }
          );
        });
      }
      
    } else {
      console.log(`🔍 Found MIDPORT_DEM tenant with ID: ${tenant.id}`);
      
      // Step 2: Get existing services
      const getExistingServices = () => {
        return new Promise((resolve, reject) => {
          db.all(
            'SELECT name FROM remote_api_tables WHERE database_id = ?',
            [tenant.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });
      };

      const existingServices = await getExistingServices();
      const existingServiceNames = existingServices.map(s => s.name);
      
      console.log('📋 Existing services:', existingServiceNames);
      
      // Step 3: Add new services that don't already exist
      const newServices = servicesToAdd.filter(service => !existingServiceNames.includes(service));
      
      if (newServices.length === 0) {
        console.log('ℹ️ All services already exist in MIDPORT_DEM tenant');
      } else {
        console.log(`➕ Adding ${newServices.length} new services:`, newServices);
        
        for (const service of newServices) {
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO remote_api_tables (database_id, name, endpoint) VALUES (?, ?, ?)',
              [tenant.id, service, service],
              (err) => {
                if (err) reject(err);
                else {
                  console.log(`✅ Added service: ${service}`);
                  resolve();
                }
              }
            );
          });
        }
      }
    }

    // Step 4: Display final result
    const getFinalServices = () => {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT rad.name as tenant_name, rad.tenant_name as tenant_id, rat.name as service_name
          FROM remote_api_databases rad
          LEFT JOIN remote_api_tables rat ON rad.id = rat.database_id
          WHERE rad.tenant_name = 'MIDPORT_DEM'
          ORDER BY rat.name
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const finalServices = await getFinalServices();
    
    console.log('\n🎉 MIDPORT_DEM tenant updated successfully!');
    console.log('📋 Final services in MIDPORT_DEM:');
    finalServices.forEach(row => {
      if (row.service_name) {
        console.log(`   • ${row.service_name}`);
      }
    });
    
    console.log(`\n🔗 Total services: ${finalServices.filter(r => r.service_name).length}`);

  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  }
}

updateMidportServices();