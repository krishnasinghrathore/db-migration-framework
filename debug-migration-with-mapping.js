// Debug script to test migration with column mapping
import { config } from 'dotenv';
import { VerticaAdapter } from './dist/adapters/vertica/vertica-adapter.js';
import { PostgreSQLAdapter } from './dist/adapters/postgresql/postgresql-adapter.js';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

// Load environment variables
config();

// Load column mappings
function loadColumnMappings() {
  try {
    const mappingContent = readFileSync('./schemas/mappings/vertica-to-postgresql/column-mappings.yaml', 'utf8');
    const mappings = load(mappingContent);
    return mappings.column_mappings || {};
  } catch (error) {
    console.error('Error loading column mappings:', error.message);
    return {};
  }
}

// Apply column mappings to data
function applyColumnMappings(data, tableName, columnMappings) {
  const tableMapping = columnMappings[tableName.toLowerCase()];
  if (!tableMapping) {
    console.log(`⚠️  No column mappings found for table: ${tableName}`);
    return data;
  }

  return data.map((row) => {
    const mappedRow = {};

    // Apply each column mapping
    tableMapping.forEach((mapping) => {
      const sourceCol = mapping.source_column;
      const targetCol = mapping.target_column;
      const transformation = mapping.transformation;

      if (row.hasOwnProperty(sourceCol)) {
        let value = row[sourceCol];

        // Apply transformations
        if (transformation === 'integer_to_boolean' && value !== null) {
          value = value === 1 || value === '1';
        }

        mappedRow[targetCol] = value;
      }
    });

    return mappedRow;
  });
}

async function debugMigration() {
  console.log('🔧 Debug Migration Test with Column Mapping\n');

  // Load column mappings
  const columnMappings = loadColumnMappings();
  console.log('📋 Loaded column mappings');

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
    console.log('\n🔌 Connecting to Vertica...');
    await sourceAdapter.connect();
    console.log('✅ Connected to Vertica');

    console.log('\n🔌 Connecting to PostgreSQL...');
    await targetAdapter.connect();
    console.log('✅ Connected to PostgreSQL');

    // Get one row from Vertica
    console.log('\n📊 Fetching one row from Vertica MODULES table...');
    const sourceData = await sourceAdapter.getBatchData('MODULES', 0, 1, 'DPWTANBEEH');

    if (sourceData.length > 0) {
      console.log('✅ Retrieved data from Vertica:');
      console.log('   Original columns:', Object.keys(sourceData[0]));

      // Apply column mappings
      console.log('\n🔄 Applying column mappings...');
      const mappedData = applyColumnMappings(sourceData, 'modules', columnMappings);

      console.log('✅ Mapped data structure:');
      console.log('   Mapped columns:', Object.keys(mappedData[0]));
      console.log('   Mapped data:', JSON.stringify(mappedData[0], null, 2));

      // Try to insert into PostgreSQL
      console.log('\n🔄 Attempting to insert into PostgreSQL...');
      try {
        const result = await targetAdapter.insertBatch('modules', mappedData, 'dpwtanbeeh');
        if (result.success) {
          console.log('✅ Insert successful!');
          console.log(`   Processed rows: ${result.processedRows}`);
        } else {
          console.log('❌ Insert failed with errors:');
          result.errors.forEach((error, index) => {
            console.error(`\n   Error ${index + 1}:`);
            console.error(`   Message: ${error.message}`);
          });
        }
      } catch (insertError) {
        console.error('❌ Insert exception:', insertError.message);
      }
    } else {
      console.log('❌ No data retrieved from Vertica');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
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
