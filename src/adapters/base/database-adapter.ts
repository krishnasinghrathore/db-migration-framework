export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
}

export interface TableSchema {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isAutoIncrement?: boolean;
  isUnique?: boolean;
}

export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  isUnique: boolean;
  type?: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
}

export interface ConstraintDefinition {
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'PRIMARY KEY' | 'FOREIGN KEY';
  definition: string;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields?: any[];
}

export interface BatchResult {
  success: boolean;
  processedRows: number;
  errors: Error[];
  duration: number;
}

export interface DataTypeMapping {
  sourceType: string;
  targetType: string;
  requiresTransformation: boolean;
  transformer?: (value: any) => any;
}

export type EventCallback = (data: any) => void;

export abstract class DatabaseAdapter {
  protected config: ConnectionConfig;
  protected connection: any;
  protected isConnected: boolean = false;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  // Simple event system
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // Connection Management
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;

  // Schema Operations
  abstract getSchemas(): Promise<string[]>;
  abstract getTables(schema?: string): Promise<string[]>;
  abstract getTableSchema(tableName: string, schema?: string): Promise<TableSchema>;
  abstract introspectDatabase(schema?: string): Promise<TableSchema[]>;

  // Data Operations
  abstract executeQuery(query: string, params?: any[]): Promise<QueryResult>;
  abstract getBatchData(tableName: string, offset: number, limit: number, schema?: string): Promise<any[]>;
  abstract insertBatch(tableName: string, data: any[], schema?: string): Promise<BatchResult>;
  abstract getRowCount(tableName: string, schema?: string): Promise<number>;

  // Data Type Operations
  abstract getDataTypeMapping(): DataTypeMapping[];
  abstract mapDataType(sourceType: string): string;
  abstract transformValue(value: any, sourceType: string, targetType: string): any;

  // Utility Methods
  abstract escapeIdentifier(identifier: string): string;
  abstract escapeLiteral(literal: string): string;
  abstract buildInsertQuery(tableName: string, columns: string[], schema?: string): string;

  // Connection Status
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  // Event Handlers
  protected emitProgress(event: string, data: any): void {
    this.emit('progress', { event, data, timestamp: new Date() });
  }

  protected emitError(error: Error): void {
    this.emit('error', { error, timestamp: new Date() });
  }

  protected emitInfo(message: string, data?: any): void {
    this.emit('info', { message, data, timestamp: new Date() });
  }
}

export default DatabaseAdapter;
