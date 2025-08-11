// Test script to verify Vertica connection and query MODULES table
import { config } from 'dotenv';
import { VerticaAdapter } from './dist/adapters/vertica/vertica-adapter.js';

// Load environment variables
config();

async function testVerticaConnection() {
  console.log('🔧 Testing Vertica Connection...\n');

  // Display connection details (without password)
  console.log('📋 Connection Configuration:');
  console.log(`   Host: ${process.env.VERTICA_HOST || 'not set'}`);
  console.log(`   Port: ${process.env.VERTICA_PORT || 'not set'}`);
  console.log(`   Database: ${process.env.VERTICA_DATABASE || 'not set'}`);
  console.log(`   Username: ${process.env.VERTICA_USERNAME || 'not set'}`);
  console.log(`   Password: ${process.env.VERTICA_PASSWORD ? '***' : 'not set'}\n`);

  // Create adapter
  const adapter = new VerticaAdapter({
    host: process.env.VERTICA_HOST || 'localhost',
    port: parseInt(process.env.VERTICA_PORT || '5433'),
    database: process.env.VERTICA_DATABASE || 'vertica_db',
    username: process.env.VERTICA_USERNAME || '',
    password: process.env.VERTICA_PASSWORD || '',
  });

  try {
    // Test connection
    console.log('🔌 Attempting to connect to Vertica...');
    await adapter.connect();
    console.log('✅ Successfully connected to Vertica!\n');

    // Test basic query
    console.log('🔍 Testing basic query...');
    const testResult = await adapter.executeQuery('SELECT 1 as test');
    console.log('✅ Basic query successful:', testResult.rows[0]);

    // Get row count for MODULES table
    console.log('\n📊 Checking MODULES table row count...');
    const rowCount = await adapter.getRowCount('MODULES', 'DPWTANBEEH');
    console.log(`✅ MODULES table has ${rowCount} rows`);

    // Get sample data from MODULES table
    if (rowCount > 0) {
      console.log('\n📋 Fetching sample data from MODULES table...');
      const sampleQuery = `
        SELECT * 
        FROM "DPWTANBEEH"."MODULES" 
        LIMIT 5
      `;
      const sampleResult = await adapter.executeQuery(sampleQuery);
      console.log(`✅ Retrieved ${sampleResult.rows.length} sample rows:`);

      // Display column names
      if (sampleResult.rows.length > 0) {
        console.log('\n📌 Column names:');
        Object.keys(sampleResult.rows[0]).forEach((col) => {
          console.log(`   - ${col}`);
        });

        console.log('\n📄 First row data:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      }
    }

    // List all tables in DPWTANBEEH schema
    console.log('\n📂 Listing all tables in DPWTANBEEH schema...');
    const tables = await adapter.getTables('DPWTANBEEH');
    console.log(`✅ Found ${tables.length} tables:`);
    tables.slice(0, 10).forEach((table) => {
      console.log(`   - ${table}`);
    });
    if (tables.length > 10) {
      console.log(`   ... and ${tables.length - 10} more`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
  } finally {
    // Disconnect
    console.log('\n🔌 Disconnecting from Vertica...');
    await adapter.disconnect();
    console.log('✅ Disconnected successfully');
  }
}

// Run the test
testVerticaConnection().catch(console.error);
