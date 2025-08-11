# Vertica Connection Setup Guide

This guide will help you set up and test the Vertica connection on your workstation before running the full migration.

## Prerequisites

1. **Vertica Database Access**

   - Ensure you have network access to the Vertica server
   - Verify the hostname/IP can be resolved from your workstation
   - Confirm firewall allows connection to Vertica port (usually 5433)

2. **Database Credentials**
   - Vertica username and password
   - Database name
   - Schema name (DPWTANBEEH)

## Step 1: Configure Environment Variables

1. Copy the `.env.example` file to `.env` if not already done:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual Vertica connection details:
   ```env
   # Vertica Database Configuration
   VERTICA_HOST=your-vertica-host-or-ip
   VERTICA_PORT=5433
   VERTICA_DATABASE=DPWDAD
   VERTICA_USERNAME=DPW_TANBEEH
   VERTICA_PASSWORD=your-actual-password
   ```

## Step 2: Test Network Connectivity

Before running the migration, verify you can reach the Vertica server:

```bash
# Test if the host is reachable
ping your-vertica-host

# Test if the port is open (Windows)
Test-NetConnection -ComputerName your-vertica-host -Port 5433

# Or use telnet
telnet your-vertica-host 5433
```

## Step 3: Install Dependencies

Ensure all dependencies are installed:

```bash
npm install
```

## Step 4: Build the Project

Build the TypeScript files:

```bash
npm run build
```

## Step 5: Test Vertica Connection

Run the test script to verify Vertica connection:

```bash
node test-vertica-connection.js
```

This script will:

- Test the connection to Vertica
- Check if MODULES table exists
- Display row count
- Show sample data
- List all tables in the schema

## Step 6: Troubleshooting Connection Issues

### Issue: "getaddrinfo ENOTFOUND"

- **Cause**: Hostname cannot be resolved
- **Solution**:
  - Use IP address instead of hostname
  - Check DNS settings
  - Add hostname to hosts file if needed

### Issue: "Connection timeout"

- **Cause**: Network/firewall blocking connection
- **Solution**:
  - Verify firewall rules
  - Check VPN connection if required
  - Confirm correct port number

### Issue: "Authentication failed"

- **Cause**: Invalid credentials
- **Solution**:
  - Verify username/password
  - Check if user has permissions for the schema
  - Ensure password doesn't contain special characters that need escaping

## Step 7: Verify MODULES Table

Once connected, verify the MODULES table structure:

```sql
-- Check if MODULES table exists
SELECT table_name
FROM v_catalog.tables
WHERE table_schema = 'DPWTANBEEH'
AND table_name = 'MODULES';

-- Get column information
SELECT column_name, data_type, is_nullable
FROM v_catalog.columns
WHERE table_schema = 'DPWTANBEEH'
AND table_name = 'MODULES'
ORDER BY ordinal_position;

-- Get row count
SELECT COUNT(*) as count
FROM "DPWTANBEEH"."MODULES";
```

## Step 8: Run Migration

After successful testing, run the migration:

```bash
# For MODULES table specifically
npm run migrate:modules

# Or use the general command
npm run migrate migrate-table -- --table MODULES
```

## Additional Commands

```bash
# Validate configuration
npm run migrate validate

# List all available tables
npm run migrate list-tables

# Run with verbose output
npm run migrate migrate-table -- --table MODULES --verbose
```

## Expected Output

When everything is working correctly, you should see:

```
🔧 Loading configuration...
🔌 Connecting to databases...
✅ Vertica driver loaded successfully
✅ PostgreSQL driver loaded successfully
✅ Connected to both databases

🚀 Starting migration: MODULES → modules
📊 Total rows to migrate: [actual count]
📦 Processing batch: 1 - 1000
✅ Migrated 1000 rows (Total: 1000/[total])
...
🎉 Migration completed successfully!
```

## Notes

- The migration uses batches of 1000 rows by default
- Progress is displayed in real-time
- Any errors will be logged with details
- The framework handles data type conversions automatically
