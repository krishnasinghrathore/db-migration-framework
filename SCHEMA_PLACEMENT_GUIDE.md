# 📋 Schema Placement Guide

## 🎯 Where to Place Your Database Schemas

### 📁 **Complete Schema Dumps** (Recommended)

#### **Vertica Schema**

**File Location**: [`schemas/source/vertica/full-schema.sql`](schemas/source/vertica/full-schema.sql)

**How to Generate**:

```bash
# Method 1: Using vsql
vsql -h your-vertica-host -U username -d database_name -c "\d+" > schemas/source/vertica/full-schema.sql

# Method 2: Using vsql with custom query
vsql -h your-vertica-host -U username -d database_name -f export_schema.sql > schemas/source/vertica/full-schema.sql

# Method 3: Using Vertica Management Console
# 1. Connect to Vertica through MC
# 2. Navigate to schema section
# 3. Export schema as SQL script
# 4. Save to schemas/source/vertica/full-schema.sql
```

#### **PostgreSQL Schema**

**File Location**: [`schemas/target/postgresql/full-schema.sql`](schemas/target/postgresql/full-schema.sql)

**How to Generate**:

```bash
# Method 1: Using pg_dump (recommended)
pg_dump -h your-postgres-host -U username -d database_name --schema-only --schema=dpwtanbeeh > schemas/target/postgresql/full-schema.sql

# Method 2: All schemas
pg_dump -h your-postgres-host -U username -d database_name --schema-only > schemas/target/postgresql/full-schema.sql

# Method 3: From your existing Drizzle setup
npx drizzle-kit introspect:pg --config=drizzle.config.ts
# Then convert the generated schema to SQL format
```

---

### 📂 **Individual Table Files** (Optional - for organization)

#### **Vertica Individual Tables**

**Directory**: `schemas/source/vertica/tables/`

```
schemas/source/vertica/tables/
├── users.sql          ← Individual table DDL
├── cameras.sql
├── roles.sql
├── categories.sql
├── collections.sql
├── modules.sql
├── notifications.sql
├── audit_logs.sql
├── incidents.sql
└── user_roles.sql
```

#### **PostgreSQL Individual Tables**

**Directory**: `schemas/target/postgresql/tables/`

```
schemas/target/postgresql/tables/
├── users.sql          ← Individual table DDL
├── cameras.sql
├── role.sql           ← Note: singular form as per your Drizzle schema
├── category.sql
├── collection.sql
├── module.sql
├── notification.sql
├── auditTrail.sql     ← Note: camelCase as per your Drizzle schema
├── incidentDetail.sql
└── user_to_role.sql   ← Note: underscore format as per your Drizzle schema
```

---

## 🚀 **Quick Start Steps**

### **Step 1: Place Your Schemas**

1. **Copy your complete Vertica schema** → [`schemas/source/vertica/full-schema.sql`](schemas/source/vertica/full-schema.sql)
2. **Copy your complete PostgreSQL schema** → [`schemas/target/postgresql/full-schema.sql`](schemas/target/postgresql/full-schema.sql)

### **Step 2: Update Configuration**

Edit [`config/migrations/vertica-to-postgresql.yaml`](config/migrations/vertica-to-postgresql.yaml):

```yaml
source:
  host: 'your-vertica-host'
  port: 5433
  database: 'your_vertica_db'
  username: '${VERTICA_USERNAME}'
  password: '${VERTICA_PASSWORD}'

target:
  host: 'your-postgres-host'
  port: 5432
  database: 'your_postgres_db'
  username: '${POSTGRES_USERNAME}'
  password: '${POSTGRES_PASSWORD}'
  default_schema: 'dpwtanbeeh' # or your target schema
```

### **Step 3: Set Environment Variables**

Create `.env` file in project root:

```bash
VERTICA_USERNAME=your_vertica_user
VERTICA_PASSWORD=your_vertica_password
POSTGRES_USERNAME=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
```

### **Step 4: Customize Mappings**

Update mapping files in [`schemas/mappings/vertica-to-postgresql/`](schemas/mappings/vertica-to-postgresql/):

- [`table-mappings.yaml`](schemas/mappings/vertica-to-postgresql/table-mappings.yaml) - Map your source tables to target tables
- [`column-mappings.yaml`](schemas/mappings/vertica-to-postgresql/column-mappings.yaml) - Map columns between tables
- [`data-type-mappings.yaml`](schemas/mappings/vertica-to-postgresql/data-type-mappings.yaml) - Already configured for Vertica → PostgreSQL
- [`transformation-rules.yaml`](schemas/mappings/vertica-to-postgresql/transformation-rules.yaml) - Already configured with common transformations

---

## 📝 **Schema File Format Examples**

### **Vertica Schema Format**

```sql
-- schemas/source/vertica/full-schema.sql
CREATE TABLE public.users (
    user_id IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON public.users(username);
ALTER TABLE public.users ADD CONSTRAINT uk_users_username UNIQUE (username);
```

### **PostgreSQL Schema Format**

```sql
-- schemas/target/postgresql/full-schema.sql
CREATE TABLE dpwtanbeeh.users (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    is_valid BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX users_type_code_unique_idx ON dpwtanbeeh.users(type, code);
```

---

## ⚡ **Pro Tips**

### **For Vertica Schema Export**

- Use `\d+ table_name` in vsql for detailed table info
- Include all constraints, indexes, and foreign keys
- Export views separately if needed

### **For PostgreSQL Schema Export**

- Use `--schema-only` flag to exclude data
- Specify `--schema=dpwtanbeeh` to export only your target schema
- Include sequences and functions if used

### **Schema Validation**

- Ensure both schemas have the same logical structure
- Check data types compatibility using the provided mappings
- Verify foreign key relationships are maintained

---

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Missing Tables**: Ensure all tables from source are mapped in `table-mappings.yaml`
2. **Data Type Conflicts**: Check `data-type-mappings.yaml` for unsupported types
3. **Schema Differences**: Update `column-mappings.yaml` for column name differences
4. **Connection Issues**: Verify database credentials in `.env` file

### **Getting Help**

- Check the main [`README.md`](README.md) for detailed documentation
- Review example configurations in `config/examples/`
- Examine the transformation rules for data conversion logic

---

**🎉 You're all set! Place your schemas in the designated files and start your migration journey!**
