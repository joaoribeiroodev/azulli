'use strict';

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  options: '-c search_path=finder,public'
});

pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (env.nodeEnv === 'development') {
      const ms = Date.now() - start;
      const preview = text.replace(/\s+/g, ' ').slice(0, 120);
      console.log(`[db] (${ms}ms, rows=${result.rowCount ?? 0}) ${preview}`);
    }
    return result;
  } catch (err) {
    console.error('[db] Erro em query:', err.message);
    console.error('[db] SQL:', text);
    throw err;
  }
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (text, params) => client.query(text, params)
    };
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function healthcheck() {
  const { rows } = await pool.query('SELECT NOW() as now');
  return rows[0];
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, transaction, healthcheck, close };
