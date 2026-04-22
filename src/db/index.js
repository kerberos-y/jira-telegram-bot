const { Pool } = require('pg');

console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL || 'UNDEFINED');
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV || 'UNDEFINED');
console.log('[DEBUG] All env keys:', Object.keys(process.env).join(', '));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;