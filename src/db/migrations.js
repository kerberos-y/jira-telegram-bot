const pool = require('./index');

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      telegram_username VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      jira_account_id VARCHAR(255),
      jira_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('[DB] Migrations done');
}

module.exports = runMigrations;