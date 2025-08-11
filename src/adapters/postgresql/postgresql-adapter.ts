// Try to import pg package, fall back to mock if not available
let Pool: any;
try {
  const pg = require('pg');
  Pool = pg.Pool;
  console.log('✅ PostgreSQL driver loaded successfully');
} catch (error) {
  console.warn('⚠️  PostgreSQL driver not available, using mock implementation');
  console.warn('⚠️  Install pg package: npm install pg');
  console.warn('⚠️  No actual data will be inserted into PostgreSQL!');

  // Mock implementation for development/testing
  Pool = class {
    constructor(config: any) {
      console.log('🔧 Mock PostgreSQL connection - using sample responses');
      console.log('🔧 Connection config:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
      });
    }
    async connect(): Promise<any> {
      return {
        query: async (text: string, params?: any[]) => {
          console.log(`🔍 Mock PostgreSQL query: ${text.substring(0, 50)}...`);
          if (params && params.length > 0) {
            console.log(`🔍 Mock PostgreSQL params:`, params.slice(0, 3));
          }
          // Mock responses for common queries
          if (text.includes('SELECT 1')) {
            return { rows: [{ test: 1 }], rowCount: 1 };
          } else if (text.includes('COUNT(*)')) {
            return { rows: [{ count: '500' }], rowCount: 1 };
          } else if (text.includes('INSERT INTO')) {
            console.log('⚠️  MOCK INSERT - No actual data inserted into PostgreSQL!');
            return { rows: [], rowCount: 1 };
          } else if (text.includes('BEGIN') || text.includes('COMMIT') || text.includes('ROLLBACK')) {
            return { rows: [], rowCount: 0 };
          } else {
            return { rows: [], rowCount: 0 };
          }
        },
        release: () => {
          console.log('🔌 Mock PostgreSQL client released');
        },
      };
    }
    async end(): Promise<void> {
      console.log('🔌 Mock PostgreSQL pool ended');
    }
  };
}

interface PoolClient {
  query(text: string, params?: any[]): Promise<any>;
  release(): void;
}
import {
  DatabaseAdapter,
  ConnectionConfig,
  TableSchema,
  ColumnDefinition,
  ForeignKeyDefinition,
  IndexDefinition,
  ConstraintDefinition,
  QueryResult,
  BatchResult,
  DataTypeMapping,
} from '../base/database-adapter.js';

export class PostgreSQLAdapter extends DatabaseAdapter {
  private pool: any | null = null;
  private client: PoolClient | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        connectionTimeoutMillis: this.config.connectionTimeout || 30000,
        query_timeout: this.config.queryTimeout || 60000,
        max: 20,
        idleTimeoutMillis: 30000,
      });

      this.client = await this.pool!.connect();
      this.isConnected = true;
      this.emitInfo('Connected to PostgreSQL database');
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.isConnected = false;
      this.emitInfo('Disconnected from PostgreSQL database');
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      const result = await this.client!.query('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      this.emitError(error as Error);
      return false;
    }
  }

  async getSchemas(): Promise<string[]> {
    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;
    const result = await this.executeQuery(query);
    return result.rows.map((row) => row.schema_name);
  }

  async getTables(schema: string = 'public'): Promise<string[]> {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const result = await this.executeQuery(query, [schema]);
    return result.rows.map((row) => row.table_name);
  }

  async getTableSchema(tableName: string, schema: string = 'public'): Promise<TableSchema> {
    const columns = await this.getTableColumns(tableName, schema);
    const primaryKeys = await this.getPrimaryKeys(tableName, schema);
    const foreignKeys = await this.getForeignKeys(tableName, schema);
    const indexes = await this.getIndexes(tableName, schema);
    const constraints = await this.getConstraints(tableName, schema);

    return {
      name: tableName,
      schema,
      columns,
      primaryKeys,
      foreignKeys,
      indexes,
      constraints,
    };
  }

  private async getTableColumns(tableName: string, schema: string): Promise<ColumnDefinition[]> {
    const query = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        CASE WHEN c.column_default LIKE 'nextval%' THEN true ELSE false END as is_auto_increment,
        CASE WHEN tc.constraint_type = 'UNIQUE' THEN true ELSE false END as is_unique
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name 
        AND c.table_schema = kcu.table_schema
      LEFT JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name 
        AND tc.constraint_type = 'UNIQUE'
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale,
      isAutoIncrement: row.is_auto_increment,
      isUnique: row.is_unique,
    }));
  }

  private async getPrimaryKeys(tableName: string, schema: string): Promise<string[]> {
    const query = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 
        AND tc.table_schema = $2 
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => row.column_name);
  }

  private async getForeignKeys(tableName: string, schema: string): Promise<ForeignKeyDefinition[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = $1 
        AND tc.table_schema = $2 
        AND tc.constraint_type = 'FOREIGN KEY'
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    const fkMap = new Map<string, ForeignKeyDefinition>();

    result.rows.forEach((row) => {
      if (!fkMap.has(row.constraint_name)) {
        fkMap.set(row.constraint_name, {
          name: row.constraint_name,
          columns: [],
          referencedTable: row.referenced_table,
          referencedColumns: [],
          onDelete: row.delete_rule?.toUpperCase() as any,
          onUpdate: row.update_rule?.toUpperCase() as any,
        });
      }
      const fk = fkMap.get(row.constraint_name)!;
      fk.columns.push(row.column_name);
      fk.referencedColumns.push(row.referenced_column);
    });

    return Array.from(fkMap.values());
  }

  private async getIndexes(tableName: string, schema: string): Promise<IndexDefinition[]> {
    const query = `
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        am.amname as index_type
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = $1 AND n.nspname = $2
      ORDER BY i.relname, a.attnum
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    const indexMap = new Map<string, IndexDefinition>();

    result.rows.forEach((row) => {
      if (!indexMap.has(row.index_name)) {
        indexMap.set(row.index_name, {
          name: row.index_name,
          columns: [],
          isUnique: row.is_unique,
          type: row.index_type?.toUpperCase() as any,
        });
      }
      indexMap.get(row.index_name)!.columns.push(row.column_name);
    });

    return Array.from(indexMap.values());
  }

  private async getConstraints(tableName: string, schema: string): Promise<ConstraintDefinition[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => ({
      name: row.constraint_name,
      type: row.constraint_type as any,
      definition: row.check_clause || '',
    }));
  }

  async introspectDatabase(schema: string = 'public'): Promise<TableSchema[]> {
    const tables = await this.getTables(schema);
    const schemas: TableSchema[] = [];

    for (const tableName of tables) {
      const tableSchema = await this.getTableSchema(tableName, schema);
      schemas.push(tableSchema);
      this.emitProgress('introspection', { table: tableName, completed: schemas.length, total: tables.length });
    }

    return schemas;
  }

  async executeQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields,
      };
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }

  async getBatchData(tableName: string, offset: number, limit: number, schema: string = 'public'): Promise<any[]> {
    const fullTableName = this.escapeIdentifier(schema) + '.' + this.escapeIdentifier(tableName);
    const query = `SELECT * FROM ${fullTableName} LIMIT $1 OFFSET $2`;
    const result = await this.executeQuery(query, [limit, offset]);
    return result.rows;
  }

  async insertBatch(tableName: string, data: any[], schema: string = 'public'): Promise<BatchResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let processedRows = 0;

    if (data.length === 0) {
      return { success: true, processedRows: 0, errors: [], duration: 0 };
    }

    try {
      const columns = Object.keys(data[0]);
      const query = this.buildInsertQuery(tableName, columns, schema);

      if (!this.client) {
        throw new Error('Database not connected');
      }

      await this.client.query('BEGIN');

      for (const row of data) {
        try {
          const values = columns.map((col) => row[col]);
          await this.client.query(query, values);
          processedRows++;
        } catch (error) {
          errors.push(error as Error);
        }
      }

      await this.client.query('COMMIT');

      return {
        success: errors.length === 0,
        processedRows,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (this.client) {
        await this.client.query('ROLLBACK');
      }
      errors.push(error as Error);
      return {
        success: false,
        processedRows,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  async getRowCount(tableName: string, schema: string = 'public'): Promise<number> {
    const fullTableName = this.escapeIdentifier(schema) + '.' + this.escapeIdentifier(tableName);
    const query = `SELECT COUNT(*) as count FROM ${fullTableName}`;
    const result = await this.executeQuery(query);
    return parseInt(result.rows[0].count);
  }

  getDataTypeMapping(): DataTypeMapping[] {
    return [
      { sourceType: 'VARCHAR', targetType: 'VARCHAR', requiresTransformation: false },
      { sourceType: 'INTEGER', targetType: 'INTEGER', requiresTransformation: false },
      { sourceType: 'BIGINT', targetType: 'BIGINT', requiresTransformation: false },
      { sourceType: 'DECIMAL', targetType: 'DECIMAL', requiresTransformation: false },
      { sourceType: 'TIMESTAMP', targetType: 'TIMESTAMP', requiresTransformation: false },
      { sourceType: 'BOOLEAN', targetType: 'BOOLEAN', requiresTransformation: false },
      { sourceType: 'TEXT', targetType: 'TEXT', requiresTransformation: false },
    ];
  }

  mapDataType(sourceType: string): string {
    const mapping = this.getDataTypeMapping().find((m) => m.sourceType === sourceType.toUpperCase());
    return mapping ? mapping.targetType : sourceType;
  }

  transformValue(value: any, _sourceType: string, targetType: string): any {
    // PostgreSQL-specific value transformations
    if (value === null || value === undefined) {
      return null;
    }

    switch (targetType.toUpperCase()) {
      case 'TIMESTAMP':
        return value instanceof Date ? value.toISOString() : value;
      case 'BOOLEAN':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      default:
        return value;
    }
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  escapeLiteral(literal: string): string {
    return `'${literal.replace(/'/g, "''")}'`;
  }

  buildInsertQuery(tableName: string, columns: string[], schema: string = 'public'): string {
    const fullTableName = this.escapeIdentifier(schema) + '.' + this.escapeIdentifier(tableName);
    const columnList = columns.map((col) => this.escapeIdentifier(col)).join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    return `INSERT INTO ${fullTableName} (${columnList}) VALUES (${placeholders})`;
  }

  // Event Handlers
  protected override emitProgress(event: string, data: any): void {
    this.emit('progress', { event, data, timestamp: new Date() });
  }

  protected override emitError(error: Error): void {
    this.emit('error', { error, timestamp: new Date() });
  }

  protected override emitInfo(message: string, data?: any): void {
    this.emit('info', { message, data, timestamp: new Date() });
  }
}

export default PostgreSQLAdapter;
