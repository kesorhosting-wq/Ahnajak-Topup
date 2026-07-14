/**
 * migrate.js — Creates all MySQL tables from database/schema.sql
 * Usage: npm run db:migrate
 * Requires: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load .env
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'ahnajak_topup';

async function main() {
  console.log('── MySQL Migration ──');
  console.log(`Host: ${DB_HOST}:${DB_PORT}  DB: ${DB_NAME}  User: ${DB_USER}`);

  // Connect WITHOUT a database first (to create the DB if it doesn't exist)
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  // Create database if not exists
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✓ Database "${DB_NAME}" ready`);
  await conn.end();

  // Now connect to the actual database
  const pool = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  // Read and execute schema.sql
  const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✓ Schema applied successfully (24 tables + 1 view created)');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
