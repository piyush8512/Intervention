import pkg from 'pg';
const { Pool } = pkg;
import { config } from './env.js';

if (!config.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file');
  console.error('Please add it to your .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

export default pool;