# Database Migration Framework

An enterprise-grade, reusable database migration framework supporting multiple database types with comprehensive validation, monitoring, and rollback capabilities.

## 🚀 Features

- **Multi-Database Support**: Vertica, PostgreSQL, MSSQL, MySQL, Oracle
- **Plugin Architecture**: Easy to extend with new database adapters
- **Configuration-Driven**: YAML/JSON configuration files for flexibility
- **Schema Mapping**: Comprehensive table, column, and data type mappings
- **Batch Processing**: Parallel workers for efficient data transfer
- **Validation Framework**: Pre/post migration validation with data integrity checks
- **Progress Monitoring**: Real-time progress tracking with web dashboard
- **Error Handling**: Automatic retry mechanisms and rollback capabilities
- **Incremental Migration**: Support for delta synchronization
- **Template System**: Reusable transformation rules and templates

## 📁 Project Structure

```
db-migration-framework/
├── src/                           # Source code
│   ├── core/                      # Core migration engine
│   ├── adapters/                  # Database-specific adapters
│   │   ├── base/                  # Abstract base adapter
│   │   ├── vertica/               # Vertica adapter
│   │   ├── postgresql/            # PostgreSQL adapter
│   │   └── mssql/                 # MSSQL adapter
│   ├── validation/                # Validation framework
│   ├── transformation/            # Data transformation engine
│   ├── monitoring/                # Progress monitoring
│   ├── cli/                       # Command-line interface
│   └── dashboard/                 # Web dashboard
├── schemas/                       # DDL and mapping files
│   ├── source/                    # Source database schemas
│   │   ├── vertica/               # Vertica DDL files
│   │   │   ├── tables/            # Table definitions
│   │   │   ├── views/             # View definitions
│   │   │   ├── indexes/           # Index definitions
│   │   │   └── constraints/       # Constraint definitions
│   │   └── mssql/                 # MSSQL DDL files
│   ├── target/                    # Target database schemas
│   │   ├── postgresql/            # PostgreSQL DDL files
│   │   └── mysql/                 # MySQL DDL files
│   └── mappings/                  # Schema mapping configurations
│       └── vertica-to-postgresql/ # Vertica to PostgreSQL mappings
│           ├── table-mappings.yaml
│           ├── column-mappings.yaml
│           ├── data-type-mappings.yaml
│           └── transformation-rules.yaml
├── config/                        # Configuration files
│   ├── migrations/                # Migration configurations
│   ├── templates/                 # Migration templates
│   └── examples/                  # Example configurations
├── tests/                         # Test files
├── docs/                          # Documentation
└── package.json                   # Project dependencies
```

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/krishnasinghrathore/db-migration-framework.git
   cd db-migration-framework
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Install database drivers** (as needed):

   ```bash
   # PostgreSQL
   npm install pg @types/pg

   # Vertica
   npm install vertica

   # MSSQL
   npm install mssql @types/mssql

   # Additional packages
   npm install @types/node yaml
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## 📋 Quick Start

### 1. Set up your DDL files

**Place your Vertica DDL files in:**

```
schemas/source/vertica/tables/
├── users.sql
├── cameras.sql
├── roles.sql
└── ...
```

**Place your PostgreSQL DDL files in:**

```
schemas/target/postgresql/tables/
├── users.sql
├── cameras.sql
├── roles.sql
└── ...
```

### 2. Configure your migration

Edit `config/migrations/vertica-to-postgresql.yaml`:

```yaml
migration:
  name: 'vertica-to-postgresql-migration'
  source:
    type: 'vertica'
    host: 'your-vertica-host'
    port: 5433
    database: 'your_source_db'
    username: '${VERTICA_USERNAME}'
    password: '${VERTICA_PASSWORD}'
  target:
    type: 'postgresql'
    host: 'your-postgres-host'
    port: 5432
    database: 'your_target_db'
    username: '${POSTGRES_USERNAME}'
    password: '${POSTGRES_PASSWORD}'
    default_schema: 'dpwtanbeeh'
  settings:
    batch_size: 10000
    parallel_workers: 4
    validation_enabled: true
```

### 3. Set up environment variables

Create a `.env` file:

```bash
VERTICA_USERNAME=your_vertica_user
VERTICA_PASSWORD=your_vertica_password
POSTGRES_USERNAME=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
```

### 4. Configure table and column mappings

Edit the mapping files in `schemas/mappings/vertica-to-postgresql/`:

- `table-mappings.yaml` - Map source tables to target tables
- `column-mappings.yaml` - Map columns between tables
- `data-type-mappings.yaml` - Define data type conversions
- `transformation-rules.yaml` - Custom transformation logic

### 5. Run the migration

```bash
# Validate configuration
npm run validate

# Run migration
npm run migrate

# Monitor progress via web dashboard
npm run dashboard
```

## 🔧 Configuration

### Migration Configuration

The main migration configuration file defines:

- **Source/Target Databases**: Connection details and schemas
- **Mappings**: Path to mapping configuration files
- **Settings**: Batch size, parallel workers, validation options

### Table Mappings

Map source tables to target tables:

```yaml
tables:
  - source_table: 'users'
    target_table: 'users'
    target_schema: 'dpwtanbeeh'
    enabled: true
    where_clause: 'is_active = true'
    order_by: 'created_date'
```

### Column Mappings

Map columns between source and target tables:

```yaml
column_mappings:
  users:
    - source_column: 'user_id'
      target_column: 'id'
      transformation: 'identity_to_bigserial'
    - source_column: 'username'
      target_column: 'code'
      transformation: 'varchar_preserve'
```

### Data Type Mappings

Define how data types are converted:

```yaml
type_mappings:
  - vertica_type: 'INTEGER'
    postgresql_type: 'INTEGER'
    transformation: 'preserve'
  - vertica_type: 'IDENTITY'
    postgresql_type: 'BIGSERIAL'
    transformation: 'identity_to_serial'
```

### Transformation Rules

Custom transformation logic for complex data conversions:

```yaml
transformation_rules:
  - name: 'identity_to_serial'
    description: 'Convert Vertica IDENTITY to PostgreSQL SERIAL'
    source_type: 'IDENTITY'
    target_type: 'BIGSERIAL'
    transformer: |
      function(value) {
        return null; // Let PostgreSQL auto-generate
      }
```

## 🚀 Usage

### Command Line Interface

```bash
# Validate migration configuration
npm run validate -- --config config/migrations/vertica-to-postgresql.yaml

# Run full migration
npm run migrate -- --config config/migrations/vertica-to-postgresql.yaml

# Run incremental migration
npm run migrate -- --config config/migrations/vertica-to-postgresql.yaml --incremental

# Generate migration report
npm run migrate -- --config config/migrations/vertica-to-postgresql.yaml --report-only
```

### Web Dashboard

Start the web dashboard for real-time monitoring:

```bash
npm run dashboard
```

Access the dashboard at `http://localhost:3000`

### Programmatic Usage

```typescript
import { MigrationEngine } from './src/core/engine.js';
import { ConfigManager } from './src/core/config-manager.js';

const configManager = new ConfigManager('config/migrations/vertica-to-postgresql.yaml');
const config = await configManager.loadConfig();

const engine = new MigrationEngine(config);

// Set up event listeners
engine.on('progress', (data) => {
  console.log(`Progress: ${data.event}`, data.data);
});

engine.on('error', (error) => {
  console.error('Migration error:', error);
});

// Run migration
await engine.runMigration();
```

## 🔍 Validation

The framework includes comprehensive validation:

- **Pre-Migration**: Schema compatibility, connection validation
- **During Migration**: Data transformation validation, constraint checks
- **Post-Migration**: Row count verification, data integrity checks

## 📊 Monitoring

- **Progress Tracking**: Real-time progress with ETA calculations
- **Performance Metrics**: Throughput, bottleneck identification
- **Error Reporting**: Detailed error logs with troubleshooting guides
- **Web Dashboard**: Visual monitoring interface

## 🔄 Rollback

- **Automatic Rollback**: On critical errors
- **Manual Rollback**: Via CLI or dashboard
- **Checkpoint Recovery**: Resume from last successful checkpoint
- **Transaction Management**: Ensures data consistency

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=adapters
```

## 📚 Adding New Database Support

1. **Create adapter**: Extend `DatabaseAdapter` in `src/adapters/your-db/`
2. **Add DDL storage**: Create directories in `schemas/source/your-db/`
3. **Configure mappings**: Add mapping files for your database
4. **Update configuration**: Add database type to configuration schema
5. **Add tests**: Create test suite for your adapter

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Examples**: See `config/examples/` for sample configurations
- **Issues**: Report bugs and feature requests via GitHub issues

## 🔗 Related Projects

- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe ORM for TypeScript
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Flyway](https://flywaydb.org/) - Database migration tool

---

**Built with ❤️ for enterprise database migrations**
