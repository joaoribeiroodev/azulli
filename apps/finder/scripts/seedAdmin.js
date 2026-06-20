'use strict';

const bcrypt = require('bcryptjs');
const env = require('../config/env');
const db = require('../config/database');

async function upsertAdmin(email, password, nome) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (rows.length > 0) {
    await db.query(
      `UPDATE users SET password_hash = $1, nome = $2, role = 'admin', ativo = true WHERE id = $3`,
      [hash, nome, rows[0].id]
    );
    console.log(`[seed:admin] Admin atualizado: ${email}`);
  } else {
    await db.query(
      `INSERT INTO users (email, password_hash, nome, role) VALUES ($1, $2, $3, 'admin')`,
      [email, hash, nome]
    );
    console.log(`[seed:admin] Admin criado: ${email}`);
  }
}

async function main() {
  if (!env.admin.password) {
    console.warn('[seed:admin] ADMIN_PASSWORD vazia — pulando.');
    await db.close();
    return;
  }

  try {
    await upsertAdmin(env.admin.email.toLowerCase(), env.admin.password, env.admin.nome);

    // Platform admins do SaaS recebem conta admin no Finder (mesmo email, mesma senha bootstrap).
    for (const email of env.platformAdminEmails) {
      if (email === env.admin.email.toLowerCase()) continue;
      await upsertAdmin(email, env.admin.password, email.split('@')[0]);
    }
  } catch (err) {
    console.error('[seed:admin] ERRO:', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();
