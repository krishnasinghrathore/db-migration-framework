// Debug script to test migration with detailed error logging
import { config } from 'dotenv';
import { VerticaAdapter } from './dist/adapters/vertica/vertica-adapter.js';
import { PostgreSQLAdapter } from './dist/adapters/postgresql/postgresql-adapter.js';

// Load environment variables
config();

async function debugMigration() {
  console.log('🔧 Debug Migration Test\n');

  // Create adapters
  const sourceAdapter = new VerticaAdapter({
    host: process.env.VERTICA_HOST || 'localhost',
    port: parseInt(process.env.VERTICA_PORT || '5433'),
    database: process.env.VERTICA_DATABASE || 'vertica_db',
    username: process.env.VERTICA_USERNAME || '',
    password: process.env.VERTICA_PASSWORD || '',
  });

  const targetAdapter = new PostgreSQLAdapter({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres_db',
    username: process.env.POSTGRES_USERNAME || '',
    password: process.env.POSTGRES_PASSWORD || '',
  });

  try {
    // Connect to both databases
    console.log('🔌 Connecting to Vertica...');
    await sourceAdapter.connect();
    console.log('✅ Connected to Vertica');

    console.log('\n🔌 Connecting to PostgreSQL...');
    try {
      await targetAdapter.connect();
      console.log('✅ Connected to PostgreSQL');
    } catch (pgError) {
      console.error('❌ PostgreSQL connection failed:', pgError.message);
      console.error('   Check your PostgreSQL credentials and ensure the server is running');
      return;
    }

    // Test PostgreSQL connection
    console.log('\n🔍 Testing PostgreSQL connection...');
    const pgTest = await targetAdapter.testConnection();
    console.log(`✅ PostgreSQL test result: ${pgTest}`);

    // Check if target table exists
    console.log('\n📋 Checking if target table exists...');
    try {
      const tables = await targetAdapter.getTables('dpwtanbeeh');
      console.log(`✅ Found ${tables.length} tables in dpwtanbeeh schema`);
      if (tables.includes('modules')) {
        console.log('✅ Target table "modules" exists');
      } else {
        console.log('❌ Target table "modules" does not exist');
        console.log('   Available tables:', tables.join(', '));
      }
    } catch (tableError) {
      console.error('❌ Error checking tables:', tableError.message);
    }

    // Get one row from Vertica
    console.log('\n📊 Fetching one row from Vertica MODULES table...');
    const sourceData = await sourceAdapter.getBatchData('MODULES', 0, 1, 'DPWTANBEEH');

    if (sourceData.length > 0) {
      console.log('✅ Retrieved data from Vertica:');
      console.log('   Row structure:', JSON.stringify(sourceData[0], null, 2));
      console.log('   Column count:', Object.keys(sourceData[0]).length);
      console.log('   Column names:', Object.keys(sourceData[0]));

      // Try to insert into PostgreSQL
      console.log('\n🔄 Attempting to insert into PostgreSQL...');
      try {
        const result = await targetAdapter.insertBatch('modules', sourceData, 'dpwtanbeeh');
        if (result.success) {
          console.log('✅ Insert successful!');
        } else {
          console.log('❌ Insert failed with errors:');
          result.errors.forEach((error, index) => {
            console.error(`\n   Error ${index + 1}:`);
            console.error(`   Message: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
          });
        }
      } catch (insertError) {
        console.error('❌ Insert exception:', insertError.message);
        console.error('   Stack:', insertError.stack);
      }
    } else {
      console.log('❌ No data retrieved from Vertica');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    // Disconnect
    console.log('\n🔌 Disconnecting...');
    await sourceAdapter.disconnect();
    await targetAdapter.disconnect();
    console.log('✅ Disconnected');
  }
}

// Run the debug
debugMigration().catch(console.error);
