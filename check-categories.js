import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Database clients
import pg from 'pg';
const { Client } = pg;

// Vertica client (using generic client)
import { createConnection } from 'vertica';

async function checkCategories() {
  let pgClient;
  let verticaClient;

  try {
    // Connect to PostgreSQL
    pgClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
    });

    await pgClient.connect();
    console.log('Connected to PostgreSQL database');

    // Query to get all category IDs in PostgreSQL
    const pgResult = await pgClient.query('SELECT id, code, name FROM dpwtanbeeh.categories ORDER BY id');
    console.log('Categories in PostgreSQL database:');
    console.log('ID\tCode\t\tName');
    console.log('----------------------------------------');
    pgResult.rows.forEach((row) => {
      console.log(`${row.id}\t${row.code}\t\t${row.name}`);
    });

    // Check what category IDs are referenced in cameras table (if any)
    console.log('\nChecking cameras table for category_id references:');
    const cameraResult = await pgClient.query(
      'SELECT DISTINCT category_id FROM dpwtanbeeh.cameras WHERE category_id IS NOT NULL'
    );
    if (cameraResult.rows.length > 0) {
      console.log('Category IDs referenced in cameras table:');
      cameraResult.rows.forEach((row) => {
        console.log(`category_id: ${row.category_id}`);
      });
    } else {
      console.log('No camera records found in PostgreSQL database');
    }

    // Connect to Vertica to check what category IDs exist there
    console.log('\nConnecting to Vertica database...');
    verticaClient = createConnection({
      host: process.env.VERTICA_HOST || 'localhost',
      port: process.env.VERTICA_PORT || 5433,
      database: process.env.VERTICA_DATABASE,
      user: process.env.VERTICA_USERNAME,
      password: process.env.VERTICA_PASSWORD,
    });

    await new Promise((resolve, reject) => {
      verticaClient.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Connected to Vertica database');

    // Query to get all category IDs in Vertica
    const verticaResult = await new Promise((resolve, reject) => {
      verticaClient.query(
        'SELECT DISTINCT CATEGORY_ID FROM DPWTANBEEH.CAMERA WHERE CATEGORY_ID IS NOT NULL',
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    console.log('\nCategory IDs referenced in Vertica CAMERA table:');
    verticaResult.rows.forEach((row) => {
      console.log(`category_id: ${row.CATEGORY_ID}`);
    });

    // Also check what categories exist in Vertica
    const categoryResult = await new Promise((resolve, reject) => {
      verticaClient.query(
        'SELECT CATEGORY_ID, SHORT_CODE, NAME FROM DPWTANBEEH.CATEGORY ORDER BY CATEGORY_ID',
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    console.log('\nCategories in Vertica database:');
    console.log('ID\tCode\t\tName');
    console.log('----------------------------------------');
    categoryResult.rows.forEach((row) => {
      console.log(`${row.CATEGORY_ID}\t${row.SHORT_CODE}\t\t${row.NAME}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pgClient) {
      await pgClient.end();
      console.log('Disconnected from PostgreSQL database');
    }
    if (verticaClient) {
      verticaClient.end();
      console.log('Disconnected from Vertica database');
    }
  }
}

checkCategories();
