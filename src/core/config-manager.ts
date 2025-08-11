// Note: Install required packages: npm install yaml @types/node
// import * as fs from 'fs';
// import * as path from 'path';
// import * as yaml from 'yaml';

// Temporary placeholders until packages are installed
const fs = {
  promises: {
    readFile: async (path: string, encoding: string) => {
      throw new Error('fs module not available. Install @types/node');
    },
    writeFile: async (path: string, content: string, encoding: string) => {
      throw new Error('fs module not available. Install @types/node');
    },
    access: async (path: string) => {
      throw new Error('fs module not available. Install @types/node');
    },
  },
};

const path = {
  dirname: (p: string) => p,
  resolve: (...paths: string[]) => paths.join('/'),
  join: (...paths: string[]) => paths.join('/'),
};

const yaml = {
  parse: (content: string) => JSON.parse(content),
  stringify: (obj: any) => JSON.stringify(obj, null, 2),
};

// Mock process for environment variables
const process = {
  env: {} as { [key: string]: string | undefined },
};

export interface MigrationConfig {
  migration: {
    name: string;
    description?: string;
    source: DatabaseConfig;
    target: DatabaseConfig;
    mappings: MappingConfig;
    settings: MigrationSettings;
  };
}

export interface DatabaseConfig {
  type: 'vertica' | 'postgresql' | 'mssql' | 'mysql' | 'oracle';
  connection_string?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  schema_path?: string;
  default_schema?: string;
}

export interface MappingConfig {
  path: string;
  table_mappings?: string;
  column_mappings?: string;
  data_type_mappings?: string;
  transformation_rules?: string;
}

export interface MigrationSettings {
  batch_size: number;
  parallel_workers: number;
  validation_enabled: boolean;
  rollback_enabled: boolean;
  continue_on_error?: boolean;
  max_retries?: number;
  retry_delay?: number;
  log_level?: 'debug' | 'info' | 'warn' | 'error';
  progress_reporting?: boolean;
}

export interface TableMapping {
  source_table: string;
  target_table: string;
  target_schema?: string;
  enabled?: boolean;
  where_clause?: string;
  order_by?: string;
}

export interface ColumnMapping {
  [tableName: string]: {
    source_column: string;
    target_column: string;
    transformation?: string;
    default_value?: any;
    nullable?: boolean;
  }[];
}

export interface DataTypeMapping {
  source_type: string;
  target_type: string;
  transformation?: string;
  requires_length?: boolean;
  requires_precision?: boolean;
  requires_scale?: boolean;
}

export interface TransformationRule {
  name: string;
  description?: string;
  source_type: string;
  target_type: string;
  transformer: string; // JavaScript function as string
  validator?: string; // JavaScript function as string
}

export class ConfigManager {
  private configPath: string;
  private config: MigrationConfig | null = null;
  private tableMappings: TableMapping[] = [];
  private columnMappings: ColumnMapping = {};
  private dataTypeMappings: DataTypeMapping[] = [];
  private transformationRules: TransformationRule[] = [];

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async loadConfig(): Promise<MigrationConfig> {
    try {
      const configContent = await fs.promises.readFile(this.configPath, 'utf-8');

      if (this.configPath.endsWith('.yaml') || this.configPath.endsWith('.yml')) {
        this.config = yaml.parse(configContent) as MigrationConfig;
      } else if (this.configPath.endsWith('.json')) {
        this.config = JSON.parse(configContent) as MigrationConfig;
      } else {
        throw new Error('Unsupported config file format. Use .yaml, .yml, or .json');
      }

      await this.loadMappings();
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  private async loadMappings(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const mappingsPath = this.config.migration.mappings.path;
    const basePath = path.dirname(this.configPath);
    const fullMappingsPath = path.resolve(basePath, mappingsPath);

    // Load table mappings
    const tableMappingsFile = path.join(fullMappingsPath, 'table-mappings.yaml');
    if (await this.fileExists(tableMappingsFile)) {
      const content = await fs.promises.readFile(tableMappingsFile, 'utf-8');
      const data = yaml.parse(content);
      this.tableMappings = data.tables || [];
    }

    // Load column mappings
    const columnMappingsFile = path.join(fullMappingsPath, 'column-mappings.yaml');
    if (await this.fileExists(columnMappingsFile)) {
      const content = await fs.promises.readFile(columnMappingsFile, 'utf-8');
      const data = yaml.parse(content);
      this.columnMappings = data.column_mappings || {};
    }

    // Load data type mappings
    const dataTypeMappingsFile = path.join(fullMappingsPath, 'data-type-mappings.yaml');
    if (await this.fileExists(dataTypeMappingsFile)) {
      const content = await fs.promises.readFile(dataTypeMappingsFile, 'utf-8');
      const data = yaml.parse(content);
      this.dataTypeMappings = data.type_mappings || [];
    }

    // Load transformation rules
    const transformationRulesFile = path.join(fullMappingsPath, 'transformation-rules.yaml');
    if (await this.fileExists(transformationRulesFile)) {
      const content = await fs.promises.readFile(transformationRulesFile, 'utf-8');
      const data = yaml.parse(content);
      this.transformationRules = data.transformation_rules || [];
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getConfig(): MigrationConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  getTableMappings(): TableMapping[] {
    return this.tableMappings;
  }

  getColumnMappings(tableName: string): ColumnMapping[string] | undefined {
    return this.columnMappings[tableName];
  }

  getDataTypeMappings(): DataTypeMapping[] {
    return this.dataTypeMappings;
  }

  getTransformationRules(): TransformationRule[] {
    return this.transformationRules;
  }

  findTableMapping(sourceTable: string): TableMapping | undefined {
    return this.tableMappings.find((mapping) => mapping.source_table === sourceTable);
  }

  findDataTypeMapping(sourceType: string): DataTypeMapping | undefined {
    return this.dataTypeMappings.find((mapping) => mapping.source_type.toLowerCase() === sourceType.toLowerCase());
  }

  findTransformationRule(name: string): TransformationRule | undefined {
    return this.transformationRules.find((rule) => rule.name === name);
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Configuration not loaded');
      return { isValid: false, errors };
    }

    // Validate required fields
    if (!this.config.migration.name) {
      errors.push('Migration name is required');
    }

    if (!this.config.migration.source.type) {
      errors.push('Source database type is required');
    }

    if (!this.config.migration.target.type) {
      errors.push('Target database type is required');
    }

    // Validate connection information
    const sourceConfig = this.config.migration.source;
    if (!sourceConfig.connection_string && (!sourceConfig.host || !sourceConfig.database)) {
      errors.push('Source database connection information is incomplete');
    }

    const targetConfig = this.config.migration.target;
    if (!targetConfig.connection_string && (!targetConfig.host || !targetConfig.database)) {
      errors.push('Target database connection information is incomplete');
    }

    // Validate settings
    const settings = this.config.migration.settings;
    if (settings.batch_size <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (settings.parallel_workers <= 0) {
      errors.push('Parallel workers must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async saveConfig(config: MigrationConfig): Promise<void> {
    try {
      let content: string;

      if (this.configPath.endsWith('.yaml') || this.configPath.endsWith('.yml')) {
        content = yaml.stringify(config);
      } else if (this.configPath.endsWith('.json')) {
        content = JSON.stringify(config, null, 2);
      } else {
        throw new Error('Unsupported config file format. Use .yaml, .yml, or .json');
      }

      await fs.promises.writeFile(this.configPath, content, 'utf-8');
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  async createDefaultConfig(
    sourceDatabaseType: string,
    targetDatabaseType: string,
    outputPath: string
  ): Promise<MigrationConfig> {
    const defaultConfig: MigrationConfig = {
      migration: {
        name: `${sourceDatabaseType}-to-${targetDatabaseType}-migration`,
        description: `Migration from ${sourceDatabaseType} to ${targetDatabaseType}`,
        source: {
          type: sourceDatabaseType as any,
          host: 'localhost',
          port: this.getDefaultPort(sourceDatabaseType),
          database: 'source_db',
          username: 'username',
          password: 'password',
          ssl: false,
          schema_path: `schemas/source/${sourceDatabaseType}`,
          default_schema: 'public',
        },
        target: {
          type: targetDatabaseType as any,
          host: 'localhost',
          port: this.getDefaultPort(targetDatabaseType),
          database: 'target_db',
          username: 'username',
          password: 'password',
          ssl: false,
          schema_path: `schemas/target/${targetDatabaseType}`,
          default_schema: 'public',
        },
        mappings: {
          path: `schemas/mappings/${sourceDatabaseType}-to-${targetDatabaseType}`,
        },
        settings: {
          batch_size: 10000,
          parallel_workers: 4,
          validation_enabled: true,
          rollback_enabled: true,
          continue_on_error: false,
          max_retries: 3,
          retry_delay: 1000,
          log_level: 'info',
          progress_reporting: true,
        },
      },
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  private getDefaultPort(databaseType: string): number {
    switch (databaseType.toLowerCase()) {
      case 'postgresql':
        return 5432;
      case 'vertica':
        return 5433;
      case 'mssql':
        return 1433;
      case 'mysql':
        return 3306;
      case 'oracle':
        return 1521;
      default:
        return 5432;
    }
  }

  getEnvironmentVariables(): { [key: string]: string } {
    const env: { [key: string]: string } = {};

    if (!this.config) {
      return env;
    }

    // Extract environment variables from connection strings
    const sourceConnStr = this.config.migration.source.connection_string;
    if (sourceConnStr && sourceConnStr.includes('${')) {
      const matches = sourceConnStr.match(/\$\{([^}]+)\}/g);
      matches?.forEach((match) => {
        const varName = match.slice(2, -1);
        env[varName] = process.env[varName] || '';
      });
    }

    const targetConnStr = this.config.migration.target.connection_string;
    if (targetConnStr && targetConnStr.includes('${')) {
      const matches = targetConnStr.match(/\$\{([^}]+)\}/g);
      matches?.forEach((match) => {
        const varName = match.slice(2, -1);
        env[varName] = process.env[varName] || '';
      });
    }

    return env;
  }

  resolveConnectionString(connectionString: string): string {
    return connectionString.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  }
}

export default ConfigManager;
