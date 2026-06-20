'use strict';

const db = require('../config/database');

async function create({ userId, termo, localizacao, fonte = 'google_maps' }) {
  const { rows } = await db.query(
    `INSERT INTO searches (user_id, termo, localizacao, fonte)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, termo, localizacao, fonte]
  );
  return rows[0];
}

async function finalize(id, { totalResults, duracaoMs, erro = null }) {
  const { rows } = await db.query(
    `UPDATE searches
        SET total_results = $1,
            duracao_ms    = $2,
            erro          = $3
      WHERE id = $4
      RETURNING *`,
    [totalResults, duracaoMs, erro, id]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM searches WHERE id = $1', [id]);
  return rows[0] || null;
}

async function list({ userId, limit = 50, skip = 0 } = {}) {
  const params = [];
  let sql = `
    SELECT s.*,
           u.nome AS user_nome,
           u.email AS user_email
      FROM searches s
      LEFT JOIN users u ON u.id = s.user_id
  `;
  if (userId) {
    params.push(userId);
    sql += ` WHERE s.user_id = $${params.length}`;
  }
  params.push(Number(limit), Number(skip));
  sql += ` ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await db.query(sql, params);
  return rows;
}

module.exports = { create, finalize, findById, list };
