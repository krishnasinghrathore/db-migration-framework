import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// PostgreSQL client
import pg from 'pg';
const { Client } = pg;

// Create a PostgreSQL client
const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
});

async function checkCategories() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Query to get all category IDs
    const result = await client.query('SELECT id, code, name FROM dpwtanbeeh.categories ORDER BY id');
    console.log('Categories in PostgreSQL database:');
    console.log('ID\tCode\t\tName');
    console.log('----------------------------------------');
    result.rows.forEach((row) => {
      console.log(`${row.id}\t${row.code}\t\t${row.name}`);
    });

    // Also check what category IDs are referenced in cameras table
    console.log('\nChecking cameras table for category_id references:');
    const cameraResult = await client.query('SELECT DISTINCT category_id FROM dpwtanbeeh.cameras');
    console.log('Category IDs referenced in cameras table:');
    cameraResult.rows.forEach((row) => {
      console.log(`category_id: ${row.category_id}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from PostgreSQL database');
  }
}

checkCategories();
