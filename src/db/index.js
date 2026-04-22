const { Pool } = require('pg');

let _pool = null;

function getPool() {
  if (_pool) return _pool;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set!');
  }

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Railway требует SSL
  });

  _pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });

  return _pool;
}

module.exports = new Proxy({}, {
  get(_target, prop) {
    return getPool()[prop];
  },
});