'use strict';

const { Pool } = require('pg');
const env = require('./env');

const GLOBAL_POOL_KEY = '__azulli_finder_pg_pool';

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function normalizeConnectionString(url) {
  if (!url) return url;
  let connectionString = String(url);

  // Transaction pooler (porta 6543) + node-pg exige pgbouncer=true
  if (
    connectionString.includes('pooler.supabase.com:6543') &&
    !/pgbouncer=true/i.test(connectionString)
  ) {
    connectionString += connectionString.includes('?') ? '&' : '?';
    connectionString += 'pgbouncer=true';
  }

  return connectionString;
}

function warnIfSessionPoolerOnServerless(connectionString) {
  if (!isServerlessRuntime()) return;
  if (
    connectionString.includes('pooler.supabase.com:5432') ||
    (connectionString.includes('pooler.supabase.com') && !connectionString.includes(':6543'))
  ) {
    console.warn(
      '[db] Session pooler (5432) esgota com ~15 conexões totais no serverless. ' +
        'Troque DATABASE_URL para Transaction pooler (porta 6543) no Supabase → Connect → URI.'
    );
  }
}

function createPool() {
  const isProduction = env.nodeEnv === 'production';
  const serverless = isServerlessRuntime();
  const connectionString = normalizeConnectionString(env.databaseUrl);

  warnIfSessionPoolerOnServerless(connectionString);

  const needsSsl =
    isProduction ||
    /supabase\.co/i.test(connectionString) ||
    /sslmode=require/i.test(connectionString);

  // Cada instância serverless = 1 conexão no máximo (evita EMAXCONNSESSION)
  const maxConnections = serverless ? 1 : isProduction ? 5 : 10;

  return new Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: serverless ? 20_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: serverless,
    options: '-c search_path=finder,public',
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });
}

function getPool() {
  if (!global[GLOBAL_POOL_KEY]) {
    const pool = createPool();
    pool.on('error', (err) => {
      console.error('[db] Erro inesperado no pool:', err.message);
    });
    global[GLOBAL_POOL_KEY] = pool;
  }
  return global[GLOBAL_POOL_KEY];
}

const pool = getPool();

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
    if (/max clients reached|EMAXCONNSESSION/i.test(err.message)) {
      console.error(
        '[db] Pool Supabase esgotado. Use Transaction pooler (6543) na DATABASE_URL da Vercel.'
      );
    }
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
  if (global[GLOBAL_POOL_KEY]) {
    await global[GLOBAL_POOL_KEY].end();
    delete global[GLOBAL_POOL_KEY];
  }
}

module.exports = { pool, query, transaction, healthcheck, close };
