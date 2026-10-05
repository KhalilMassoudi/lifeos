import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings. By default pg turns them
// into JS Dates at local midnight, and toISOString() then shifts them to the
// previous day in any timezone east of UTC.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lifeos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
