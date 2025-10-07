/**
 * Test script to validate the database fix for multiple services per tenant
 */

const { SQLiteManager } = require('./lib/sqlite.ts');

async function testDatabaseFix() {
  console.log('🧪 Testing database fix for multiple services per tenant...');
  
  try {
    // Test data for MIDPORT_DEM tenant
    const testData1 = {
      name: 'MIDPORT_DEM - BusinessPartner',
      fullUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/BusinessPartner_v3',
      baseUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
      tenantName: 'MIDPORT_DEM',
      services: 'LN/c4ws/services',
      tables: ['BusinessPartner_v3']
    };
    
    const testData2 = {
      name: 'MIDPORT_DEM - ATPService',
      fullUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/MIDPORT_DEM/LN/c4ws/services/ATPService_WT',
      baseUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
      tenantName: 'MIDPORT_DEM',
      services: 'LN/c4ws/services',
      tables: ['ATPService_WT', 'SalesOrder', 'ServiceCall_v2']
    };
    
    console.log('📦 Creating first entry for MIDPORT_DEM...');
    const result1 = await SQLiteManager.createRemoteAPIDatabase(testData1);
    console.log('✅ Result 1:', result1.message);
    
    console.log('📦 Adding more services to MIDPORT_DEM...');
    const result2 = await SQLiteManager.createRemoteAPIDatabase(testData2);
    console.log('✅ Result 2:', result2.message);
    
    console.log('📋 Final database state:');
    const allDatabases = await SQLiteManager.getRemoteAPIDatabases();
    allDatabases.forEach(db => {
      console.log(`- ${db.name} (${db.tenantName}): ${db.tables.length} services`);
      db.tables.forEach(table => console.log(`  * ${table.name}`));
    });
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDatabaseFix();