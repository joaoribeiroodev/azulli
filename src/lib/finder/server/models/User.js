'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/database');

const ROLES = ['admin', 'sdr', 'bdr', 'closer', 'ops', 'viewer'];

const PUBLIC_COLUMNS = `
  id, email, nome, role, ativo, ultimo_login, created_at, updated_at
`;

function ensureRole(role) {
  if (!ROLES.includes(role)) {
    throw new Error(`Role inválida: ${role}. Permitidas: ${ROLES.join(', ')}`);
  }
}

async function create({ email, password, nome, role = 'sdr' }) {
  ensureRole(role);
  if (!email || !password || password.length < 8 || !nome) {
    throw new Error('email, nome e senha (8+ caracteres) obrigatórios');
  }
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, nome, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [String(email).toLowerCase().trim(), hash, nome.trim(), role]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [String(email).toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function list({ ativo = true } = {}) {
  const params = [];
  let sql = `SELECT ${PUBLIC_COLUMNS} FROM users`;
  if (ativo != null) {
    params.push(ativo);
    sql += ` WHERE ativo = $${params.length}`;
  }
  sql += ' ORDER BY nome ASC';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function update(id, { nome, role, ativo, password }) {
  const sets = [];
  const params = [];

  if (nome != null) {
    params.push(nome);
    sets.push(`nome = $${params.length}`);
  }
  if (role != null) {
    ensureRole(role);
    params.push(role);
    sets.push(`role = $${params.length}`);
  }
  if (ativo != null) {
    params.push(Boolean(ativo));
    sets.push(`ativo = $${params.length}`);
  }
  if (password) {
    if (password.length < 8) throw new Error('Senha deve ter 8+ caracteres');
    const hash = await bcrypt.hash(password, 10);
    params.push(hash);
    sets.push(`password_hash = $${params.length}`);
  }

  if (sets.length === 0) return findById(id);

  params.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING ${PUBLIC_COLUMNS}`,
    params
  );
  return rows[0] || null;
}

async function touchLogin(id) {
  await db.query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [id]);
}

async function verifyPassword(user, password) {
  if (!user || !user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

module.exports = {
  ROLES,
  create,
  findById,
  findByEmail,
  list,
  update,
  touchLogin,
  verifyPassword
};
