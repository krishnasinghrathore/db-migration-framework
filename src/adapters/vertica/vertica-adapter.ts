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

// Try to import vertica package, fall back to mock if not available
let vertica: any = null;

// Use dynamic import for ESM compatibility
async function loadVertica() {
  if (vertica !== null) return vertica;
  try {
    vertica = (await import('vertica')).default || (await import('vertica'));
    console.log('✅ Vertica driver loaded successfully');
    return vertica;
  } catch (error) {
    console.warn('⚠️  Vertica driver not available, using mock implementation');
    console.warn('⚠️  Install vertica package: npm install vertica');
    console.warn('⚠️  Mock data will be used instead of real Vertica data!');
    // Mock implementation for development/testing
    vertica = {
      connect: (config: any, callback: (err: any, connection?: any) => void) => {
        console.log('🔧 Mock Vertica connection - using sample data');
        console.log('🔧 Connection config:', {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
        });
        const mockConnection = {
          connect: (cb: (err: any) => void) => {
            setTimeout(() => cb(null), 100);
          },
          disconnect: () => {
            console.log('🔌 Mock Vertica disconnected');
          },
          query: (sql: string, paramsOrCallback?: any, callback?: any) => {
            const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
            const params = typeof paramsOrCallback === 'function' ? [] : paramsOrCallback;

            console.log(`🔍 Mock Vertica query: ${sql.substring(0, 50)}...`);
            if (params && params.length > 0) {
              console.log(`🔍 Mock Vertica params:`, params.slice(0, 3));
            }

            // Mock responses for common queries
            setTimeout(() => {
              if (sql.includes('SELECT 1 as test')) {
                cb(null, { rows: [{ test: 1 }], rowCount: 1 });
              } else if (sql.includes('COUNT(*)')) {
                console.log('⚠️  MOCK COUNT - Using sample count of 1000');
                cb(null, { rows: [{ count: '1000' }], rowCount: 1 });
              } else if (sql.includes('SELECT *')) {
                // Mock table data
                console.log('⚠️  MOCK SELECT - Using sample data instead of real Vertica data!');
                const mockData = Array.from({ length: 10 }, (_, i) => ({
                  id: i + 1,
                  name: `Sample Record ${i + 1}`,
                  created_date: new Date(),
                  is_valid: 1,
                }));
                cb(null, { rows: mockData, rowCount: mockData.length });
              } else {
                cb(null, { rows: [], rowCount: 0 });
              }
            }, 50);
          },
        };
        callback(null, mockConnection);
      },
    };
    return vertica;
  }
}

interface VerticaConnection {
  connect(callback: (err: any) => void): void;
  disconnect(): void;
  query(sql: string, callback: (err: any, result: any) => void): void;
  query(sql: string, params: any[], callback: (err: any, result: any) => void): void;
}

export class VerticaAdapter extends DatabaseAdapter {
  protected override connection: VerticaConnection | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    const verticaDriver = await loadVertica();
    return new Promise((resolve, reject) => {
      const connectionConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl || false,
        connectionTimeout: this.config.connectionTimeout || 30000,
        queryTimeout: this.config.queryTimeout || 60000,
      };

      verticaDriver.connect(connectionConfig, (err: any, connection: any) => {
        if (err) {
          this.emitError(err);
          reject(err);
          return;
        }

        this.connection = connection!;
        this.connection!.connect((connectErr: any) => {
          if (connectErr) {
            this.emitError(connectErr);
            reject(connectErr);
            return;
          }

          this.isConnected = true;
          this.emitInfo('Connected to Vertica database');
          resolve();
        });
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
      this.isConnected = false;
      this.emitInfo('Disconnected from Vertica database');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.connection) {
        await this.connect();
      }
      const result = await this.executeQuery('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      this.emitError(error as Error);
      return false;
    }
  }

  async getSchemas(): Promise<string[]> {
    const query = `
      SELECT schema_name 
      FROM v_catalog.schemata 
      WHERE schema_name NOT IN ('v_catalog', 'v_monitor', 'v_internal')
      ORDER BY schema_name
    `;
    const result = await this.executeQuery(query);
    return result.rows.map((row) => row.schema_name);
  }

  async getTables(schema: string = 'public'): Promise<string[]> {
    const query = `
      SELECT table_name
      FROM v_catalog.tables
      WHERE table_schema = ? AND table_type = 'TABLE'
      ORDER BY table_name
    `;
    const result = await this.executeQuery(query, [schema]);

    // Handle both array and object row formats
    return result.rows.map((row) => {
      if (Array.isArray(row)) {
        return row[0]; // table_name is the first column
      }
      return row.table_name;
    });
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
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        CASE WHEN data_type = 'identity' THEN true ELSE false END as is_auto_increment,
        false as is_unique
      FROM v_catalog.columns
      WHERE table_name = ? AND table_schema = ?
      ORDER BY ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === 't',
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
      SELECT column_name
      FROM v_catalog.primary_keys
      WHERE table_name = ? AND table_schema = ?
      ORDER BY ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => row.column_name);
  }

  private async getForeignKeys(tableName: string, schema: string): Promise<ForeignKeyDefinition[]> {
    const query = `
      SELECT 
        constraint_name,
        column_name,
        reference_table_name as referenced_table,
        reference_column_name as referenced_column
      FROM v_catalog.foreign_keys
      WHERE table_name = ? AND table_schema = ?
      ORDER BY constraint_name, ordinal_position
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
          onDelete: 'RESTRICT',
          onUpdate: 'RESTRICT',
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
        index_name,
        column_name,
        is_unique
      FROM v_catalog.table_constraints tc
      JOIN v_catalog.constraint_columns cc ON tc.constraint_id = cc.constraint_id
      WHERE tc.table_name = ? AND tc.table_schema = ? AND tc.constraint_type = 'u'
      ORDER BY index_name, ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    const indexMap = new Map<string, IndexDefinition>();

    result.rows.forEach((row) => {
      if (!indexMap.has(row.index_name)) {
        indexMap.set(row.index_name, {
          name: row.index_name,
          columns: [],
          isUnique: row.is_unique === 't',
          type: 'BTREE',
        });
      }
      indexMap.get(row.index_name)!.columns.push(row.column_name);
    });

    return Array.from(indexMap.values());
  }

  private async getConstraints(tableName: string, schema: string): Promise<ConstraintDefinition[]> {
    const query = `
      SELECT 
        constraint_name,
        constraint_type
      FROM v_catalog.table_constraints
      WHERE table_name = ? AND table_schema = ?
    `;

    const result = await this.executeQuery(query, [tableName, schema]);
    return result.rows.map((row) => ({
      name: row.constraint_name,
      type: this.mapConstraintType(row.constraint_type),
      definition: '',
    }));
  }

  private mapConstraintType(verticaType: string): 'CHECK' | 'UNIQUE' | 'PRIMARY KEY' | 'FOREIGN KEY' {
    switch (verticaType.toLowerCase()) {
      case 'c':
        return 'CHECK';
      case 'u':
        return 'UNIQUE';
      case 'p':
        return 'PRIMARY KEY';
      case 'f':
        return 'FOREIGN KEY';
      default:
        return 'CHECK';
    }
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
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const callback = (err: any, result: any) => {
        if (err) {
          this.emitError(err);
          reject(err);
          return;
        }

        resolve({
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          fields: result.fields,
        });
      };

      if (params && params.length > 0) {
        this.connection!.query(query, params, callback);
      } else {
        this.connection!.query(query, callback);
      }
    });
  }

  async getBatchData(tableName: string, offset: number, limit: number, schema: string = 'public'): Promise<any[]> {
    const fullTableName = this.escapeIdentifier(schema) + '.' + this.escapeIdentifier(tableName);

    // First, get column names for this table
    const columnsQuery = `
      SELECT column_name
      FROM v_catalog.columns
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ordinal_position
    `;
    const columnsResult = await this.executeQuery(columnsQuery, [schema, tableName]);
    const columnNames = columnsResult.rows.map((row) => (Array.isArray(row) ? row[0] : row.column_name));

    // Now get the data
    const query = `SELECT * FROM ${fullTableName} LIMIT ${limit} OFFSET ${offset}`;
    const result = await this.executeQuery(query);

    // Convert array rows to objects if needed
    if (result.rows.length > 0 && Array.isArray(result.rows[0])) {
      return result.rows.map((row) => {
        const obj: any = {};
        columnNames.forEach((colName, index) => {
          obj[colName] = row[index];
        });
        return obj;
      });
    }

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

      await this.executeQuery('BEGIN');

      for (const row of data) {
        try {
          const values = columns.map((col) => row[col]);
          await this.executeQuery(query, values);
          processedRows++;
        } catch (error) {
          errors.push(error as Error);
        }
      }

      await this.executeQuery('COMMIT');

      return {
        success: errors.length === 0,
        processedRows,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.executeQuery('ROLLBACK');
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
    console.log(`🔍 [getRowCount] Starting - table: ${tableName}, schema: ${schema}`);

    try {
      const fullTableName = this.escapeIdentifier(schema) + '.' + this.escapeIdentifier(tableName);
      const query = `SELECT COUNT(*) as count FROM ${fullTableName}`;

      console.log(`🔍 [getRowCount] Executing count query: ${query}`);
      console.log(`🔍 [getRowCount] Connection status: ${this.isConnected}`);
      console.log(`🔍 [getRowCount] Connection object:`, !!this.connection);

      const result = await this.executeQuery(query);
      console.log(`🔍 [getRowCount] Query result:`, JSON.stringify(result, null, 2));

      if (!result.rows || result.rows.length === 0) {
        console.warn('⚠️  [getRowCount] No rows returned from count query');
        return 0;
      }

      const firstRow = result.rows[0];
      console.log(`🔍 [getRowCount] First row:`, JSON.stringify(firstRow, null, 2));

      // Handle both array and object formats from Vertica driver
      let countValue: any;

      if (Array.isArray(firstRow)) {
        // Vertica returns rows as arrays
        console.log(`🔍 [getRowCount] Row is an array with ${firstRow.length} elements`);
        countValue = firstRow[0]; // COUNT(*) is the first column
      } else if (firstRow && typeof firstRow === 'object') {
        // Handle object format
        console.log(`🔍 [getRowCount] Row is an object with keys:`, Object.keys(firstRow));
        const keys = Object.keys(firstRow);
        if (keys.length === 0) {
          console.warn('⚠️  [getRowCount] No columns returned from count query');
          return 0;
        }
        const countKey = keys[0];
        countValue = firstRow[countKey as keyof typeof firstRow];
      } else {
        console.warn('⚠️  [getRowCount] Invalid row structure returned from count query');
        return 0;
      }

      console.log(`🔍 [getRowCount] Extracted count value:`, countValue, `(type: ${typeof countValue})`);

      // Handle different return types from Vertica driver
      if (typeof countValue === 'number') {
        console.log(`✅ [getRowCount] Returning number: ${countValue}`);
        return countValue;
      } else if (typeof countValue === 'string') {
        const parsed = parseInt(countValue, 10);
        const result = isNaN(parsed) ? 0 : parsed;
        console.log(`✅ [getRowCount] Returning parsed string: ${result}`);
        return result;
      } else if (typeof countValue === 'bigint') {
        const result = Number(countValue);
        console.log(`✅ [getRowCount] Returning bigint as number: ${result}`);
        return result;
      } else if (countValue === undefined || countValue === null) {
        console.warn('⚠️  [getRowCount] Count value is undefined or null');
        return 0;
      }

      console.warn('⚠️  [getRowCount] Unexpected count type:', typeof countValue, countValue);
      return 0;
    } catch (error) {
      console.error('❌ [getRowCount] Exception occurred:', error);
      console.error('❌ [getRowCount] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return 0;
    }
  }

  getDataTypeMapping(): DataTypeMapping[] {
    return [
      { sourceType: 'VARCHAR', targetType: 'VARCHAR', requiresTransformation: false },
      { sourceType: 'CHAR', targetType: 'CHAR', requiresTransformation: false },
      { sourceType: 'INTEGER', targetType: 'INTEGER', requiresTransformation: false },
      { sourceType: 'BIGINT', targetType: 'BIGINT', requiresTransformation: false },
      { sourceType: 'NUMERIC', targetType: 'DECIMAL', requiresTransformation: false },
      { sourceType: 'FLOAT', targetType: 'REAL', requiresTransformation: false },
      { sourceType: 'DOUBLE PRECISION', targetType: 'DOUBLE PRECISION', requiresTransformation: false },
      { sourceType: 'TIMESTAMP', targetType: 'TIMESTAMP', requiresTransformation: false },
      { sourceType: 'TIMESTAMPTZ', targetType: 'TIMESTAMP WITH TIME ZONE', requiresTransformation: false },
      { sourceType: 'DATE', targetType: 'DATE', requiresTransformation: false },
      { sourceType: 'TIME', targetType: 'TIME', requiresTransformation: false },
      { sourceType: 'BOOLEAN', targetType: 'BOOLEAN', requiresTransformation: false },
      { sourceType: 'BINARY', targetType: 'BYTEA', requiresTransformation: true },
      { sourceType: 'VARBINARY', targetType: 'BYTEA', requiresTransformation: true },
      { sourceType: 'LONG VARCHAR', targetType: 'TEXT', requiresTransformation: false },
      { sourceType: 'LONG VARBINARY', targetType: 'BYTEA', requiresTransformation: true },
    ];
  }

  mapDataType(sourceType: string): string {
    const mapping = this.getDataTypeMapping().find((m) => m.sourceType === sourceType.toUpperCase());
    return mapping ? mapping.targetType : sourceType;
  }

  transformValue(value: any, sourceType: string, _targetType: string): any {
    // Vertica-specific value transformations
    if (value === null || value === undefined) {
      return null;
    }

    switch (sourceType.toUpperCase()) {
      case 'BINARY':
      case 'VARBINARY':
      case 'LONG VARBINARY':
        // Convert binary data to PostgreSQL bytea format
        // Convert binary data to PostgreSQL bytea format
        if (value && typeof value === 'object' && value.toString) {
          return '\\x' + value.toString('hex');
        }
        return value;
      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        return value instanceof Date ? value.toISOString() : value;
      case 'BOOLEAN':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === 't' || value === '1';
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
    const placeholders = columns.map(() => '?').join(', ');
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

export default VerticaAdapter;
