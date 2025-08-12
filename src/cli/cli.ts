#!/usr/bin/env node

import { config } from 'dotenv';
import { Command } from 'commander';
import { ConfigManager } from '../core/config-manager.js';
import { VerticaAdapter } from '../adapters/vertica/vertica-adapter.js';
import { PostgreSQLAdapter } from '../adapters/postgresql/postgresql-adapter.js';

// Load environment variables from .env file
config();

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
  MODULES: {
    MOD_REC_ID: 'id',
    SHORT_CODE: 'code',
    NAME: 'name',
    DESCRIPTION: 'description',
    TRITON_MODEL_NAME: 'triton_model_name',
    END_POINT_HTTP_URL: 'end_point_http_url',
    END_POINT_GRPC_URL: 'end_point_grpc_url',
    MAX_QUEUE_SIZE: 'max_queue_size',
    MAX_BATCH_SIZE: 'max_batch_size',
    SORT_ORDER: 'sort_order',
    IS_VALID: 'is_valid',
    BIZ_CODE: 'biz_code',
    RGN_CODE: 'rgn_code',
    SRC_SYS: 'src_sys',
    CREATED_BY: 'created_by',
    CREATED_DATE: 'created_at',
    MODIFIED_BY: 'modified_by',
    MODIFIED_DATE: 'updated_at',
    END_POINT_NAME: 'end_point_name',
  },
  CATEGORY: {
    CATEGORY_ID: 'id',
    SHORT_CODE: 'code',
    NAME: 'name',
    DESCRIPTION: 'description',
    SORT_ORDER: 'sort_order',
    PARENT_ID: 'parent_id',
    IS_VALID: 'is_valid',
    BIZ_CODE: 'biz_code',
    RGN_CODE: 'rgn_code',
    SRC_SYS: 'src_sys',
    CREATED_BY: 'created_by',
    CREATED_DATE: 'created_date',
    MODIFIED_BY: 'modified_by',
    MODIFIED_DATE: 'modified_date',
  },
};
// Helper function to sort categories hierarchically (parents before children)
function sortCategoriesHierarchically(categories: any[]): any[] {
  // Create a map of id to category for quick lookup
  const categoryMap = new Map<number, any>();
  categories.forEach((category) => {
    categoryMap.set(category.id, category);
  });

  // Separate root categories (parent_id is null) from child categories
  const rootCategories: any[] = [];
  const childCategories: any[] = [];

  categories.forEach((category) => {
    if (category.parent_id === null || category.parent_id === undefined) {
      rootCategories.push(category);
    } else {
      childCategories.push(category);
    }
  });

  // Sort child categories by parent_id to ensure parents are processed first
  childCategories.sort((a, b) => {
    // If a's parent is b, then a should come after b
    if (a.parent_id === b.id) return 1;
    // If b's parent is a, then b should come after a
    if (b.parent_id === a.id) return -1;
    // Otherwise, sort by parent_id
    return a.parent_id - b.parent_id;
  });

  // Combine root categories with sorted child categories
  return [...rootCategories, ...childCategories];
}
// Specialized function to migrate CATEGORY table with hierarchical sorting
async function migrateCategoryTable(
  sourceAdapter: VerticaAdapter,
  targetAdapter: PostgreSQLAdapter,
  sourceTable: string,
  targetTable: string,
  targetColumnNames: Set<string>,
  options: MigrationOptions,
  totalRows: number
) {
  console.log(`📦 Processing all ${totalRows} rows for hierarchical sorting`);

  // Get all data from source
  const sourceData = await sourceAdapter.getBatchData(sourceTable, 0, totalRows, 'DPWTANBEEH');

  // Transform data based on column mappings
  const transformedData = sourceData.map((row) => {
    const newRow: any = {};
    const columnMapping = COLUMN_MAPPINGS[sourceTable] || {};

    for (const [sourceCol, value] of Object.entries(row)) {
      const targetCol = columnMapping[sourceCol] || sourceCol.toLowerCase();
      console.log(`🔍 Processing column: ${sourceCol} -> ${targetCol}`);

      // Skip columns that don't exist in the target table
      if (!targetColumnNames.has(targetCol)) {
        console.log(`⚠️  Skipping column '${sourceCol}' -> '${targetCol}' (not found in target table)`);
        continue;
      }
      console.log(`✅ Including column '${sourceCol}' -> '${targetCol}' (found in target table)`);

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
          // Check if there's a transformation rule for this column in the YAML files
          if (sourceTable === 'CATEGORY' && sourceCol === 'SHORT_CODE' && targetCol === 'code') {
            // Apply varchar_truncate transformation for CATEGORY.SHORT_CODE -> code
            const strValue = String(value).trim();
            const maxLength = 10; // VARCHAR(10) constraint
            newRow[targetCol] = strValue.length > maxLength ? strValue.substring(0, maxLength) : strValue;
          } else {
            newRow[targetCol] = value;
          }
        }
      } else {
        // Handle null values for timestamp columns with NOT NULL constraints
        if ((targetCol === 'updated_at' || targetCol === 'modified_date') && targetColumnNames.has('created_at')) {
          // For updated_at columns, use created_at as fallback if available, otherwise use current timestamp
          const createdAtValue =
            row[columnMapping['CREATED_DATE'] || 'CREATED_DATE'] || row['CREATED_DATE'] || row['created_date'];
          if (createdAtValue !== null && createdAtValue !== undefined) {
            newRow[targetCol] =
              createdAtValue instanceof Date ? createdAtValue : new Date(createdAtValue as string | number);
          } else {
            newRow[targetCol] = new Date();
          }
        } else if (targetCol === 'updated_at' || targetCol.includes('_at')) {
          // For other timestamp columns with NOT NULL constraints, use current timestamp as fallback
          newRow[targetCol] = new Date();
        } else if (targetCol === 'code' && sourceTable === 'CATEGORY') {
          // For code column in CATEGORY table, use a default value if null
          newRow[targetCol] = 'UNKNOWN';
        } else {
          newRow[targetCol] = null;
        }
      }
    }

    return newRow;
  });

  // Sort data to ensure parents are inserted before children
  console.log(`📦 Sorting ${transformedData.length} rows for hierarchical order`);
  const sortedData = sortCategoriesHierarchically(transformedData);

  // Debug: Log the transformed data structure
  console.log(`🔍 Transformed data sample (first row):`, JSON.stringify(sortedData[0], null, 2));
  console.log(`🔍 Target table columns: ${Array.from(targetColumnNames).join(', ')}`);

  // Insert all data at once
  console.log(`📦 Inserting all ${sortedData.length} rows`);
  const result = await targetAdapter.insertBatch(targetTable, sortedData, 'dpwtanbeeh');

  if (result.success) {
    console.log(`✅ Migrated ${result.processedRows} rows (Total: ${result.processedRows}/${totalRows})`);
    return result.processedRows;
  } else {
    console.error(`❌ Batch failed: ${result.errors.length} errors`);
    // Always show first few errors to help debugging
    const errorsToShow = options.verbose ? result.errors : result.errors.slice(0, 3);
    errorsToShow.forEach((error, index) => {
      console.error(`   Error ${index + 1}: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    });
    if (!options.verbose && result.errors.length > 3) {
      console.error(`   ... and ${result.errors.length - 3} more errors. Use --verbose to see all.`);
    }
    return 0;
  }
}

async function migrateTable(
  sourceAdapter: VerticaAdapter,
  targetAdapter: PostgreSQLAdapter,
  sourceTable: string,
  targetTable: string,
  options: MigrationOptions
) {
  console.log(`\n🚀 Starting migration: ${sourceTable} → ${targetTable}`);

  try {
    // Get target table schema to know which columns exist
    console.log(`🔍 Getting target table schema for: ${targetTable}`);
    const targetTableSchema = await targetAdapter.getTableSchema(targetTable, 'dpwtanbeeh');
    const targetColumnNames = new Set(targetTableSchema.columns.map((col) => col.name));
    console.log(`🔍 Target table columns: ${Array.from(targetColumnNames).join(', ')}`);

    // Get row count
    console.log(`🔍 Getting row count for table: ${sourceTable} in schema: DPWTANBEEH`);

    let totalRows: number;
    try {
      totalRows = await sourceAdapter.getRowCount(sourceTable, 'DPWTANBEEH');
      console.log(`📊 Total rows to migrate: ${totalRows}`);
      console.log(`🔍 Row count type: ${typeof totalRows}, value: ${totalRows}`);
    } catch (rowCountError) {
      console.error(`❌ Exception in getRowCount:`, rowCountError);
      console.error(`❌ Error stack:`, rowCountError instanceof Error ? rowCountError.stack : 'No stack');
      throw rowCountError;
    }

    if (options.dryRun) {
      console.log(`✅ Dry run completed for ${sourceTable}`);
      return;
    }

    let migratedRows = 0;
    // Special handling for CATEGORY table to sort hierarchical data
    if (sourceTable === 'CATEGORY') {
      migratedRows = await migrateCategoryTable(
        sourceAdapter,
        targetAdapter,
        sourceTable,
        targetTable,
        targetColumnNames,
        options,
        totalRows
      );
    } else {
      const batchSize = options.batchSize || 1000;
      let offset = 0;

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
            console.log(`🔍 Processing column: ${sourceCol} -> ${targetCol}`);

            // Skip columns that don't exist in the target table
            if (!targetColumnNames.has(targetCol)) {
              console.log(`⚠️  Skipping column '${sourceCol}' -> '${targetCol}' (not found in target table)`);
              continue;
            }
            console.log(`✅ Including column '${sourceCol}' -> '${targetCol}' (found in target table)`);

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
                // Check if there's a transformation rule for this column in the YAML files
                if (sourceTable === 'CATEGORY' && sourceCol === 'SHORT_CODE' && targetCol === 'code') {
                  // Apply varchar_truncate transformation for CATEGORY.SHORT_CODE -> code
                  const strValue = String(value).trim();
                  const maxLength = 10; // VARCHAR(10) constraint
                  newRow[targetCol] = strValue.length > maxLength ? strValue.substring(0, maxLength) : strValue;
                } else {
                  newRow[targetCol] = value;
                }
              }
            } else {
              // Handle null values for timestamp columns with NOT NULL constraints
              if (
                (targetCol === 'updated_at' || targetCol === 'modified_date') &&
                targetColumnNames.has('created_at')
              ) {
                // For updated_at columns, use created_at as fallback if available, otherwise use current timestamp
                const createdAtValue =
                  row[columnMapping['CREATED_DATE'] || 'CREATED_DATE'] || row['CREATED_DATE'] || row['created_date'];
                if (createdAtValue !== null && createdAtValue !== undefined) {
                  newRow[targetCol] =
                    createdAtValue instanceof Date ? createdAtValue : new Date(createdAtValue as string | number);
                } else {
                  newRow[targetCol] = new Date();
                }
              } else if (targetCol === 'updated_at' || targetCol.includes('_at')) {
                // For other timestamp columns with NOT NULL constraints, use current timestamp as fallback
                newRow[targetCol] = new Date();
              } else if (targetCol === 'code' && sourceTable === 'CATEGORY') {
                // For code column in CATEGORY table, use a default value if null
                newRow[targetCol] = 'UNKNOWN';
              } else {
                newRow[targetCol] = null;
              }
            }
          }

          return newRow;
        });

        // Debug: Log the transformed data structure
        console.log(`🔍 Transformed data sample (first row):`, JSON.stringify(transformedData[0], null, 2));
        console.log(`🔍 Target table columns: ${Array.from(targetColumnNames).join(', ')}`);

        // Insert batch into target
        const result = await targetAdapter.insertBatch(targetTable, transformedData, 'dpwtanbeeh');

        if (result.success) {
          migratedRows += result.processedRows;
          console.log(`✅ Migrated ${result.processedRows} rows (Total: ${migratedRows}/${totalRows})`);
        } else {
          console.error(`❌ Batch failed: ${result.errors.length} errors`);
          // Always show first few errors to help debugging
          const errorsToShow = options.verbose ? result.errors : result.errors.slice(0, 3);
          errorsToShow.forEach((error, index) => {
            console.error(`   Error ${index + 1}: ${error.message}`);
            if (options.verbose && error.stack) {
              console.error(`   Stack: ${error.stack}`);
            }
          });
          if (!options.verbose && result.errors.length > 3) {
            console.error(`   ... and ${result.errors.length - 3} more errors. Use --verbose to see all.`);
          }
        }

        offset += batchSize;
      }
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
  .action(async (_options) => {
    console.log('📋 Available tables for migration:\n');

    Object.entries(TABLE_MAPPINGS).forEach(([source, target], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${source.padEnd(25)} -> ${target}`);
    });

    console.log(`\n💡 Usage options:`);
    console.log(`   • Specific scripts: npm run migrate:collections, npm run migrate:modules, etc.`);
    console.log(`   • General command: npm run migrate migrate-table -- --table <table_name>`);
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
