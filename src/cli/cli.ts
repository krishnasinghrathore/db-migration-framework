#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from '../core/config-manager.js';
import { VerticaAdapter } from '../adapters/vertica/vertica-adapter.js';
import { PostgreSQLAdapter } from '../adapters/postgresql/postgresql-adapter.js';

const program = new Command();

interface MigrationOptions {
  config: string;
  table?: string;
  batchSize?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

// Table mapping based on your schemas
const TABLE_MAPPINGS = {
  // Vertica -> PostgreSQL table mappings
  COLLECTIONS: 'collections',
  MESSAGES: 'messages',
  MODULES: 'modules',
  ROLES: 'roles',
  STREAMING_USERS: 'streaming_users',
  TNB_AUDIT_TRAILS: 'audit_trails',
  TNB_REFDATA: 'configurations',
  USER_ACCESS: 'users',
  USER_ROLE_MAP: 'user_to_roles',
  ROLES_CAMERA_MAP: 'role_to_cameras',
  ROLE_MENU_CONFIG_MAP: 'role_to_menu_configs',
  CATEGORY: 'categories',
  FACES_DETAILS: 'face_details',
  INCIDENCE_DETAILS: 'incident_details',
  MENU_CONFIG: 'menu_configs',
  NOTIFICATION: 'notifications',
  NOTIFICATION_TRIGGER: 'notification_triggers',
  NOTIFICATION_LOG: 'notification_logs',
  PPE_DETAILS: 'ppe_details',
  TRAFFIC_DETAILS: 'traffic_details',
  CAMERA: 'cameras',
  CAMERA_COLLECTION_MAP: 'camera_to_collections',
  CAMERA_MODULE_MAP: 'camera_to_modules',
  ROLES_CAMERA_ACCESS: 'role_camera_accesses',
};

// Column mappings for key tables
const COLUMN_MAPPINGS: { [key: string]: { [key: string]: string } } = {
  USER_ACCESS: {
    US_REC_ID: 'id',
    USER_TYPE: 'type',
    USER_CODE: 'code',
    USER_DESC: 'description',
    USER_REMARKS: 'remarks',
    IS_VALID: 'is_valid',
    BIZ_CODE: 'biz_code',
    RGN_CODE: 'region_code',
    SRC_SYS: 'source_system',
    CREATED_BY: 'created_by',
    CREATED_DATE: 'created_at',
    MODIFIED_BY: 'modified_by',
    MODIFIED_DATE: 'updated_at',
  },
  CAMERA: {
    CAM_REC_ID: 'id',
    CAM_ID: 'code',
    NAME: 'name',
    DESCRIPTION: 'description',
    HTTP_URI: 'http_uri',
    RTSP_URI: 'rtsp_uri',
    FPS_TARGET: 'fps_target',
    RCIS_LANE_ID: 'rcis_lane_id',
    LOCATION: 'location',
    SORT_ORDER: 'sort_order',
    CATEGORY_ID: 'category_id',
    IS_VALID: 'is_valid',
    BIZ_CODE: 'biz_code',
    RGN_CODE: 'rgn_code',
    SRC_SYS: 'src_sys',
    CREATED_BY: 'created_by',
    CREATED_DATE: 'created_at',
    MODIFIED_BY: 'modified_by',
    MODIFIED_DATE: 'modified_date',
    SERVER: 'server',
    streaming: 'streaming',
  },
  ROLES: {
    ROLE_REC_ID: 'id',
    NAME: 'code',
    DESCRIPTION: 'description',
    IS_VALID: 'is_valid',
    BIZ_CODE: 'biz_code',
    RGN_CODE: 'rgn_code',
    SRC_SYS: 'src_sys',
    CREATED_BY: 'created_by',
    CREATED_DATE: 'created_at',
    MODIFIED_BY: 'modified_by',
    MODIFIED_DATE: 'updated_at',
  },
};

async function migrateTable(
  sourceAdapter: VerticaAdapter,
  targetAdapter: PostgreSQLAdapter,
  sourceTable: string,
  targetTable: string,
  options: MigrationOptions
) {
  console.log(`\n🚀 Starting migration: ${sourceTable} → ${targetTable}`);

  try {
    // Get row count
    const totalRows = await sourceAdapter.getRowCount(sourceTable, 'DPWTANBEEH');
    console.log(`📊 Total rows to migrate: ${totalRows}`);

    if (options.dryRun) {
      console.log(`✅ Dry run completed for ${sourceTable}`);
      return;
    }

    const batchSize = options.batchSize || 1000;
    let offset = 0;
    let migratedRows = 0;

    while (offset < totalRows) {
      console.log(`📦 Processing batch: ${offset + 1} - ${Math.min(offset + batchSize, totalRows)}`);

      // Get batch data from source
      const sourceData = await sourceAdapter.getBatchData(sourceTable, offset, batchSize, 'DPWTANBEEH');

      if (sourceData.length === 0) break;

      // Transform data based on column mappings
      const transformedData = sourceData.map((row) => {
        const newRow: any = {};
        const columnMapping = COLUMN_MAPPINGS[sourceTable] || {};

        for (const [sourceCol, value] of Object.entries(row)) {
          const targetCol = columnMapping[sourceCol] || sourceCol.toLowerCase();

          // Transform specific data types
          if (value !== null && value !== undefined) {
            // Convert IS_VALID (0/1) to boolean
            if (targetCol === 'is_valid' && typeof value === 'number') {
              newRow[targetCol] = value === 1;
            }
            // Convert timestamps
            else if (targetCol.includes('_at') || targetCol.includes('_date')) {
              newRow[targetCol] = value instanceof Date ? value : new Date(value as string | number);
            }
            // Convert streaming boolean
            else if (targetCol === 'streaming' && typeof value === 'number') {
              newRow[targetCol] = value === 1;
            } else {
              newRow[targetCol] = value;
            }
          } else {
            newRow[targetCol] = null;
          }
        }

        return newRow;
      });

      // Insert batch into target
      const result = await targetAdapter.insertBatch(targetTable, transformedData, 'dpwtanbeeh');

      if (result.success) {
        migratedRows += result.processedRows;
        console.log(`✅ Migrated ${result.processedRows} rows (Total: ${migratedRows}/${totalRows})`);
      } else {
        console.error(`❌ Batch failed: ${result.errors.length} errors`);
        if (options.verbose) {
          result.errors.forEach((error) => console.error(`   - ${error.message}`));
        }
      }

      offset += batchSize;
    }

    console.log(`🎉 Migration completed: ${migratedRows}/${totalRows} rows migrated`);
  } catch (error) {
    console.error(`❌ Migration failed for ${sourceTable}:`, error);
    throw error;
  }
}

// CLI Commands
program.name('db-migrate').description('Database Migration Tool - Vertica to PostgreSQL').version('1.0.0');

program
  .command('list-tables')
  .description('List all available tables for migration')
  .option('-c, --config <path>', 'Configuration file path', 'config/migrations/vertica-to-postgresql.yaml')
  .action(async (options) => {
    console.log('📋 Available tables for migration:\n');

    Object.entries(TABLE_MAPPINGS).forEach(([source, target], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${source.padEnd(25)} -> ${target}`);
    });

    console.log(`\n💡 Use: npm run migrate -- migrate-table --table <table_name>`);
  });

program
  .command('migrate-table')
  .description('Migrate a specific table from Vertica to PostgreSQL')
  .requiredOption('-t, --table <name>', 'Table name to migrate (Vertica table name)')
  .option('-c, --config <path>', 'Configuration file path', 'config/migrations/vertica-to-postgresql.yaml')
  .option('-b, --batch-size <number>', 'Batch size for data migration', '1000')
  .option('-d, --dry-run', 'Perform a dry run without actual data migration')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options: MigrationOptions) => {
    try {
      const sourceTable = options.table!.toUpperCase();
      const targetTable = TABLE_MAPPINGS[sourceTable as keyof typeof TABLE_MAPPINGS];

      if (!targetTable) {
        console.error(`❌ Table '${sourceTable}' not found in mapping. Available tables:`);
        Object.keys(TABLE_MAPPINGS).forEach((table) => console.log(`   - ${table}`));
        process.exit(1);
      }

      console.log('🔧 Loading configuration...');
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig();

      console.log('🔌 Connecting to databases...');

      // Create adapters
      const sourceAdapter = new VerticaAdapter({
        host: config.migration.source.host || 'localhost',
        port: config.migration.source.port || 5433,
        database: config.migration.source.database || 'vertica_db',
        username: process.env['VERTICA_USERNAME'] || config.migration.source.username || '',
        password: process.env['VERTICA_PASSWORD'] || config.migration.source.password || '',
      });

      const targetAdapter = new PostgreSQLAdapter({
        host: config.migration.target.host || 'localhost',
        port: config.migration.target.port || 5432,
        database: config.migration.target.database || 'postgres_db',
        username: process.env['POSTGRES_USERNAME'] || config.migration.target.username || '',
        password: process.env['POSTGRES_PASSWORD'] || config.migration.target.password || '',
      });

      // Connect to databases
      await sourceAdapter.connect();
      await targetAdapter.connect();

      console.log('✅ Connected to both databases');

      // Migrate table
      await migrateTable(sourceAdapter, targetAdapter, sourceTable, targetTable, {
        ...options,
        batchSize: parseInt(String(options.batchSize || '1000')),
      });

      // Disconnect
      await sourceAdapter.disconnect();
      await targetAdapter.disconnect();

      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

program
  .command('migrate-all')
  .description('Migrate all tables from Vertica to PostgreSQL')
  .option('-c, --config <path>', 'Configuration file path', 'config/migrations/vertica-to-postgresql.yaml')
  .option('-b, --batch-size <number>', 'Batch size for data migration', '1000')
  .option('-d, --dry-run', 'Perform a dry run without actual data migration')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options: MigrationOptions) => {
    try {
      console.log('🔧 Loading configuration...');
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig();

      console.log('🔌 Connecting to databases...');

      // Create adapters
      const sourceAdapter = new VerticaAdapter({
        host: config.migration.source.host || 'localhost',
        port: config.migration.source.port || 5433,
        database: config.migration.source.database || 'vertica_db',
        username: process.env['VERTICA_USERNAME'] || config.migration.source.username || '',
        password: process.env['VERTICA_PASSWORD'] || config.migration.source.password || '',
      });

      const targetAdapter = new PostgreSQLAdapter({
        host: config.migration.target.host || 'localhost',
        port: config.migration.target.port || 5432,
        database: config.migration.target.database || 'postgres_db',
        username: process.env['POSTGRES_USERNAME'] || config.migration.target.username || '',
        password: process.env['POSTGRES_PASSWORD'] || config.migration.target.password || '',
      });

      // Connect to databases
      await sourceAdapter.connect();
      await targetAdapter.connect();

      console.log('✅ Connected to both databases');
      console.log(`🚀 Starting migration of ${Object.keys(TABLE_MAPPINGS).length} tables...\n`);

      let successCount = 0;
      let failureCount = 0;

      // Migrate all tables
      for (const [sourceTable, targetTable] of Object.entries(TABLE_MAPPINGS)) {
        try {
          await migrateTable(sourceAdapter, targetAdapter, sourceTable, targetTable, {
            ...options,
            batchSize: parseInt(String(options.batchSize || '1000')),
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to migrate ${sourceTable}:`, error);
          failureCount++;
        }
      }

      // Disconnect
      await sourceAdapter.disconnect();
      await targetAdapter.disconnect();

      console.log('\n📊 Migration Summary:');
      console.log(`✅ Successful: ${successCount} tables`);
      console.log(`❌ Failed: ${failureCount} tables`);
      console.log(`📋 Total: ${Object.keys(TABLE_MAPPINGS).length} tables`);

      if (failureCount === 0) {
        console.log('🎉 All migrations completed successfully!');
      } else {
        console.log('⚠️  Some migrations failed. Check the logs above.');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate migration configuration and database connections')
  .option('-c, --config <path>', 'Configuration file path', 'config/migrations/vertica-to-postgresql.yaml')
  .action(async (options) => {
    try {
      console.log('🔧 Validating configuration...');
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig();

      const validation = configManager.validateConfig();
      if (!validation.isValid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach((error) => console.error(`   - ${error}`));
        process.exit(1);
      }

      console.log('✅ Configuration is valid');

      console.log('🔌 Testing database connections...');

      // Test Vertica connection
      const sourceAdapter = new VerticaAdapter({
        host: config.migration.source.host || 'localhost',
        port: config.migration.source.port || 5433,
        database: config.migration.source.database || 'vertica_db',
        username: process.env['VERTICA_USERNAME'] || config.migration.source.username || '',
        password: process.env['VERTICA_PASSWORD'] || config.migration.source.password || '',
      });

      const sourceConnected = await sourceAdapter.testConnection();
      if (sourceConnected) {
        console.log('✅ Vertica connection successful');
        await sourceAdapter.disconnect();
      } else {
        console.error('❌ Vertica connection failed');
      }

      // Test PostgreSQL connection
      const targetAdapter = new PostgreSQLAdapter({
        host: config.migration.target.host || 'localhost',
        port: config.migration.target.port || 5432,
        database: config.migration.target.database || 'postgres_db',
        username: process.env['POSTGRES_USERNAME'] || config.migration.target.username || '',
        password: process.env['POSTGRES_PASSWORD'] || config.migration.target.password || '',
      });

      const targetConnected = await targetAdapter.testConnection();
      if (targetConnected) {
        console.log('✅ PostgreSQL connection successful');
        await targetAdapter.disconnect();
      } else {
        console.error('❌ PostgreSQL connection failed');
      }

      if (sourceConnected && targetConnected) {
        console.log('🎉 All validations passed!');
      } else {
        console.error('❌ Some validations failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
