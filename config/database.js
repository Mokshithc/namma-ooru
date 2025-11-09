const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'moki27',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nammaooru',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  max: 50, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error(' Error connecting to database:', err.stack);
    return;
  }
  console.log(' Connected to PostgreSQL database');
  release();
});
module.exports = pool;

