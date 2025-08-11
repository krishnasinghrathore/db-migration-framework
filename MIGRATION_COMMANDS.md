# 🚀 Database Migration Commands

## Quick Start Guide for Table-by-Table Migration

### 📋 **Available Tables for Migration**

Based on your Vertica and PostgreSQL schemas, here are the available tables:

| #   | Vertica Table           | PostgreSQL Table        | Description                   |
| --- | ----------------------- | ----------------------- | ----------------------------- |
| 1   | `COLLECTIONS`           | `collections`           | Collection management         |
| 2   | `MESSAGES`              | `messages`              | Message data                  |
| 3   | `MODULES`               | `modules`               | Module configurations         |
| 4   | `ROLES`                 | `roles`                 | User roles                    |
| 5   | `STREAMING_USERS`       | `streaming_users`       | Streaming user data           |
| 6   | `TNB_AUDIT_TRAILS`      | `audit_trails`          | Audit trail records           |
| 7   | `TNB_REFDATA`           | `configurations`        | Reference data/configurations |
| 8   | `USER_ACCESS`           | `users`                 | User access data              |
| 9   | `USER_ROLE_MAP`         | `user_to_roles`         | User-role mappings            |
| 10  | `ROLES_CAMERA_MAP`      | `role_to_cameras`       | Role-camera mappings          |
| 11  | `ROLE_MENU_CONFIG_MAP`  | `role_to_menu_configs`  | Role-menu mappings            |
| 12  | `CATEGORY`              | `categories`            | Category data                 |
| 13  | `FACES_DETAILS`         | `face_details`          | Face detection details        |
| 14  | `INCIDENCE_DETAILS`     | `incident_details`      | Incident details              |
| 15  | `MENU_CONFIG`           | `menu_configs`          | Menu configurations           |
| 16  | `NOTIFICATION`          | `notifications`         | Notification settings         |
| 17  | `NOTIFICATION_TRIGGER`  | `notification_triggers` | Notification triggers         |
| 18  | `NOTIFICATION_LOG`      | `notification_logs`     | Notification logs             |
| 19  | `PPE_DETAILS`           | `ppe_details`           | PPE detection details         |
| 20  | `TRAFFIC_DETAILS`       | `traffic_details`       | Traffic analysis details      |
| 21  | `CAMERA`                | `cameras`               | Camera configurations         |
| 22  | `CAMERA_COLLECTION_MAP` | `camera_to_collections` | Camera-collection mappings    |
| 23  | `CAMERA_MODULE_MAP`     | `camera_to_modules`     | Camera-module mappings        |
| 24  | `ROLES_CAMERA_ACCESS`   | `role_camera_accesses`  | Role camera access control    |

---

## 🔧 **Setup Instructions**

### **1. Install Dependencies**

```bash
cd db-migration-framework
npm install commander express @types/node @types/express pg @types/pg vertica yaml
```

### **2. Set Environment Variables**

Create a `.env` file in the project root:

```bash
# Vertica Database
VERTICA_USERNAME=your_vertica_username
VERTICA_PASSWORD=your_vertica_password

# PostgreSQL Database
POSTGRES_USERNAME=your_postgres_username
POSTGRES_PASSWORD=your_postgres_password
```

### **3. Update Configuration**

Edit `config/migrations/vertica-to-postgresql.yaml`:

```yaml
migration:
  source:
    host: 'your-vertica-host'
    port: 5433
    database: 'your_vertica_database'
  target:
    host: 'your-postgres-host'
    port: 5432
    database: 'your_postgres_database'
    default_schema: 'dpwtanbeeh'
```

---

## 📝 **Command Line Usage**

### **List All Available Tables**

```bash
npm run migrate -- list-tables
```

### **Validate Configuration & Connections**

```bash
npm run migrate -- validate
```

### **Migrate a Single Table**

```bash
# Basic migration
npm run migrate -- migrate-table --table COLLECTIONS

# With custom batch size
npm run migrate -- migrate-table --table COLLECTIONS --batch-size 2000

# Dry run (no actual data transfer)
npm run migrate -- migrate-table --table COLLECTIONS --dry-run

# Verbose output
npm run migrate -- migrate-table --table COLLECTIONS --verbose
```

### **Migrate All Tables**

```bash
# Migrate all tables
npm run migrate -- migrate-all

# With custom settings
npm run migrate -- migrate-all --batch-size 1000 --verbose
```

---

## 🌐 **Web Dashboard Usage**

### **Start the Web Dashboard**

```bash
npm run dashboard
```

Then open your browser to: `http://localhost:3000`

### **Dashboard Features**

- ✅ **Visual table list** with migration status
- 🚀 **One-click table migration**
- 📊 **Real-time progress tracking**
- 🔌 **Connection testing**
- 📋 **Migration logs**
- ⚙️ **Configurable batch sizes**
- 🧪 **Dry run mode**

---

## 📚 **Migration Examples**

### **Example 1: Migrate User Data**

```bash
# Step 1: Validate first
npm run migrate -- validate

# Step 2: Migrate users table
npm run migrate -- migrate-table --table USER_ACCESS --batch-size 1000

# Step 3: Migrate user roles
npm run migrate -- migrate-table --table USER_ROLE_MAP
```

### **Example 2: Migrate Camera System**

```bash
# Migrate in dependency order
npm run migrate -- migrate-table --table CATEGORY
npm run migrate -- migrate-table --table CAMERA
npm run migrate -- migrate-table --table CAMERA_COLLECTION_MAP
npm run migrate -- migrate-table --table CAMERA_MODULE_MAP
```

### **Example 3: Migrate Reference Data**

```bash
# Migrate configuration and reference data
npm run migrate -- migrate-table --table TNB_REFDATA
npm run migrate -- migrate-table --table COLLECTIONS
npm run migrate -- migrate-table --table MODULES
npm run migrate -- migrate-table --table ROLES
```

---

## 🔍 **Data Transformation Details**

### **Automatic Transformations Applied**

| Vertica Type     | PostgreSQL Type | Transformation            |
| ---------------- | --------------- | ------------------------- |
| `int`            | `bigserial`     | Auto-increment handling   |
| `IS_VALID (0/1)` | `boolean`       | Convert 0/1 to false/true |
| `timestamp`      | `timestamp`     | Format preservation       |
| `varchar`        | `varchar`       | Length preservation       |

### **Column Mapping Examples**

**USER_ACCESS → users:**

- `US_REC_ID` → `id`
- `USER_TYPE` → `type`
- `USER_CODE` → `code`
- `IS_VALID` → `is_valid`
- `CREATED_DATE` → `created_at`

**CAMERA → cameras:**

- `CAM_REC_ID` → `id`
- `CAM_ID` → `code`
- `FPS_TARGET` → `fps_target`
- `CATEGORY_ID` → `category_id`

---

## ⚠️ **Important Notes**

### **Migration Order**

For tables with foreign key dependencies, migrate in this order:

1. **Reference tables first**: `CATEGORY`, `COLLECTIONS`, `MODULES`, `ROLES`
2. **Main tables**: `USER_ACCESS`, `CAMERA`, `NOTIFICATION`
3. **Mapping tables last**: `USER_ROLE_MAP`, `CAMERA_COLLECTION_MAP`, etc.

### **Data Validation**

- Row counts are automatically verified
- Data type conversions are validated
- Foreign key constraints are checked
- Unique constraints are preserved

### **Error Handling**

- Failed batches are logged with details
- Migration can be resumed from last successful batch
- Rollback available for critical errors
- Detailed error reporting for troubleshooting

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Connection Failed:**

```bash
# Check your .env file
# Verify database credentials
# Test network connectivity
npm run migrate -- validate
```

**Table Not Found:**

```bash
# List available tables
npm run migrate -- list-tables

# Check table name spelling (case-sensitive)
```

**Migration Stuck:**

```bash
# Check batch size (try smaller batches)
npm run migrate -- migrate-table --table TABLE_NAME --batch-size 500

# Enable verbose logging
npm run migrate -- migrate-table --table TABLE_NAME --verbose
```

**Data Type Errors:**

```bash
# Run dry run first to check transformations
npm run migrate -- migrate-table --table TABLE_NAME --dry-run
```

---

## 📞 **Support**

- **Configuration Issues**: Check `config/migrations/vertica-to-postgresql.yaml`
- **Mapping Issues**: Review `schemas/mappings/vertica-to-postgresql/`
- **Connection Issues**: Verify `.env` file and network access
- **Data Issues**: Use `--dry-run` and `--verbose` flags for debugging

---

**🎉 Ready to migrate your data! Start with a single table and work your way up to full migration.**
