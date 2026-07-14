/**
 * db.cjs — MySQL connection pool (shared by all route modules)
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ahnajak_topup',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

/**
 * Run a parameterized query. Returns [rows, fields].
 */
async function query(sql, params = []) {
  return pool.query(sql, params);
}

/**
 * Run a query and return the first row (or null).
 */
async function queryOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

/**
 * Generate a new UUID (MySQL compatible).
 */
function uuid() {
  // Use MySQL's UUID() via a helper — but for app-level we can use crypto.randomUUID
  return (require('crypto').randomUUID());
}

module.exports = { pool, query, queryOne, uuid };
