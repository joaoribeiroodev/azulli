'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getApplied() {
  const { rows } = await db.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(rows.map((r) => r.filename));
}

function listSqlFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function applyMigration(filename) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
  await db.transaction(async (tx) => {
    await tx.query(sql);
    await tx.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
      [filename]
    );
  });
}

async function main() {
  console.log('[migrate] Iniciando…');
  try {
    await ensureMigrationsTable();
    const applied = await getApplied();
    const files = listSqlFiles();

    let novas = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate]   já aplicada: ${file}`);
        continue;
      }
      console.log(`[migrate] >> aplicando: ${file}`);
      await applyMigration(file);
      novas += 1;
    }

    console.log(`[migrate] Concluído. Novas migrations aplicadas: ${novas}`);
  } catch (err) {
    console.error('[migrate] ERRO:', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();
