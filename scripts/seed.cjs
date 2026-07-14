/**
 * seed.js — Inserts default data from database/seed.sql
 * Usage: npm run db:seed
 * Idempotent: safe to run multiple times (seed.sql uses INSERT IGNORE)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'ahnajak_topup';

async function main() {
  console.log('── MySQL Seed ──');
  console.log(`DB: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);

  const pool = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  const seedPath = path.resolve(__dirname, '..', 'database', 'seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✓ Seed data inserted successfully');
    console.log('  - Default admin user: admin@ahnajak.com / admin123');
    console.log('  - Payment gateways (disabled)');
    console.log('  - Default site settings');
    console.log('  - Game verification configs');
    console.log('');
    console.log('⚠  CHANGE the admin password immediately after first login!');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
