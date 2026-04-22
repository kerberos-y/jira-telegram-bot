const { Pool } = require('pg');

console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL || 'UNDEFINED');
console.log('[DEBUG] All env keys:', Object.keys(process.env).join(', '));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set!');
}