import pkg from 'pg';
const { Pool } = pkg;
import { config } from './env.js';

if (!config.dbUrl) {
  console.error('❌ ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: config.dbUrl,
  ssl: { rejectUnauthorized: false }
});

export const query = (text, params) => pool.query(text, params);
export const end = () => pool.end();