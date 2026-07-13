const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  console.log('Executed query', { text, duration: Date.now() - start, rows: res.rowCount });
  return res;
}

module.exports = { query, pool };
