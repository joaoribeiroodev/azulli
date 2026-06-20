'use strict';

const db = require('../config/database');

const STATUS = ['novo', 'qualificado', 'contatado', 'em_negociacao', 'assinante', 'descartado'];
const SEGMENTOS = [
  'alimentacao', 'beleza', 'automotivo', 'saude', 'servicos',
  'varejo', 'educacao', 'tech', 'construcao', 'outros'
];

const SORTABLE = new Set(['icp_score', 'created_at', 'updated_at', 'avaliacao', 'nome']);

const LEAD_COLUMNS = `
  l.id, l.search_id, l.nome, l.telefone, l.whatsapp, l.email,
  l.endereco, l.cidade, l.uf, l.cep, l.cnpj,
  l.avaliacao, l.total_avaliacoes, l.maps_url, l.website,
  l.segmento, l.porte, l.icp_score, l.pitch_whatsapp, l.pitch_email,
  l.validado, l.enriquecido_em,
  l.status, l.responsavel_id, l.notas,
  l.azulli_account_id, l.plano_contratado, l.data_assinatura,
  l.created_at, l.updated_at,
  u.nome AS responsavel_nome,
  u.email AS responsavel_email
`;

function isValidStatus(s) { return STATUS.includes(s); }

function normalizeEndereco(endereco) {
  return (endereco || '').toString().trim();
}

/**
 * Upsert por (lower(nome), lower(endereço normalizado)).
 * Quando há conflito, faz merge dos campos mais ricos (não sobrescreve com null).
 */
async function upsertFromScrape({ searchId, nome, telefone, endereco, avaliacao, mapsUrl }) {
  const enderecoNorm = normalizeEndereco(endereco);
  const { rows } = await db.query(
    `INSERT INTO leads (search_id, nome, telefone, endereco, avaliacao, maps_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (lower(nome), lower(coalesce(endereco, '')))
     DO UPDATE SET
       telefone     = COALESCE(EXCLUDED.telefone,  leads.telefone),
       avaliacao    = COALESCE(EXCLUDED.avaliacao, leads.avaliacao),
       maps_url     = COALESCE(EXCLUDED.maps_url,  leads.maps_url),
       updated_at   = NOW()
     RETURNING *`,
    [searchId, nome, telefone || null, enderecoNorm || null, avaliacao || null, mapsUrl || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${LEAD_COLUMNS}
       FROM leads l
       LEFT JOIN users u ON u.id = l.responsavel_id
      WHERE l.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function list({
  status, segmento, uf, cidade, scoreMin, responsavel, q,
  sort = 'icp_score', dir = 'desc',
  skip = 0, limit = 50
} = {}) {
  const where = ['1=1'];
  const params = [];

  if (status) {
    const arr = Array.isArray(status) ? status : String(status).split(',');
    params.push(arr);
    where.push(`l.status = ANY($${params.length}::text[])`);
  }
  if (segmento) {
    const arr = Array.isArray(segmento) ? segmento : String(segmento).split(',');
    params.push(arr);
    where.push(`l.segmento = ANY($${params.length}::text[])`);
  }
  if (uf)        { params.push(String(uf).toUpperCase()); where.push(`l.uf = $${params.length}`); }
  if (cidade)    { params.push(`%${cidade}%`);             where.push(`l.cidade ILIKE $${params.length}`); }
  if (responsavel === 'sem_responsavel') {
    where.push('l.responsavel_id IS NULL');
  } else if (responsavel) {
    params.push(responsavel);
    where.push(`l.responsavel_id = $${params.length}`);
  }
  if (scoreMin != null && scoreMin !== '') {
    params.push(Number(scoreMin));
    where.push(`COALESCE(l.icp_score, 0) >= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(l.nome ILIKE $${params.length} OR l.endereco ILIKE $${params.length})`);
  }

  const sortCol = SORTABLE.has(sort) ? sort : 'icp_score';
  const sortDir = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  params.push(Number(limit), Number(skip));

  const sql = `
    SELECT ${LEAD_COLUMNS}
      FROM leads l
      LEFT JOIN users u ON u.id = l.responsavel_id
     WHERE ${where.join(' AND ')}
     ORDER BY l.${sortCol} ${sortDir} NULLS LAST, l.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const countSql = `SELECT COUNT(*)::int AS total FROM leads l WHERE ${where.join(' AND ')}`;
  const countParams = params.slice(0, params.length - 2);

  const [leadsRes, countRes] = await Promise.all([
    db.query(sql, params),
    db.query(countSql, countParams)
  ]);

  return {
    leads: leadsRes.rows,
    total: countRes.rows[0].total,
    limit: Number(limit),
    skip: Number(skip)
  };
}

async function update(id, patch = {}) {
  const allowed = [
    'telefone', 'whatsapp', 'email', 'endereco', 'cidade', 'uf', 'cep', 'cnpj',
    'website', 'segmento', 'porte', 'notas'
  ];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      params.push(patch[key] === '' ? null : patch[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return findById(id);
  params.push(id);
  await db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
}

async function assign(id, responsavelId) {
  await db.query('UPDATE leads SET responsavel_id = $1 WHERE id = $2', [responsavelId || null, id]);
  return findById(id);
}

async function changeStatus(id, novoStatus, { userId, motivo = null } = {}) {
  if (!isValidStatus(novoStatus)) {
    throw new Error(`Status inválido: ${novoStatus}. Permitidos: ${STATUS.join(', ')}`);
  }
  return db.transaction(async (tx) => {
    const cur = await tx.query('SELECT status FROM leads WHERE id = $1 FOR UPDATE', [id]);
    if (cur.rows.length === 0) throw new Error('Lead não encontrado');
    const anterior = cur.rows[0].status;

    if (anterior === novoStatus) {
      return (await tx.query('SELECT * FROM leads WHERE id = $1', [id])).rows[0];
    }

    await tx.query('UPDATE leads SET status = $1 WHERE id = $2', [novoStatus, id]);
    await tx.query(
      `INSERT INTO lead_status_history (lead_id, user_id, status_anterior, status_novo, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId || null, anterior, novoStatus, motivo]
    );
    const after = await tx.query('SELECT * FROM leads WHERE id = $1', [id]);
    return after.rows[0];
  });
}

async function applyEnrichment(id, { segmento, icpScore, pitchWhatsapp, pitchEmail, validado }) {
  const sets = ['enriquecido_em = NOW()'];
  const params = [];
  if (segmento !== undefined)      { params.push(segmento);       sets.push(`segmento = $${params.length}`); }
  if (icpScore !== undefined)      { params.push(icpScore);       sets.push(`icp_score = $${params.length}`); }
  if (pitchWhatsapp !== undefined) { params.push(pitchWhatsapp);  sets.push(`pitch_whatsapp = $${params.length}`); }
  if (pitchEmail !== undefined)    { params.push(pitchEmail);     sets.push(`pitch_email = $${params.length}`); }
  if (validado !== undefined)      { params.push(Boolean(validado)); sets.push(`validado = $${params.length}`); }
  params.push(id);
  await db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
}

async function destroy(id) {
  await db.query('DELETE FROM leads WHERE id = $1', [id]);
}

async function history(id) {
  const { rows } = await db.query(
    `SELECT h.*, u.nome AS user_nome
       FROM lead_status_history h
       LEFT JOIN users u ON u.id = h.user_id
      WHERE h.lead_id = $1
      ORDER BY h.created_at DESC`,
    [id]
  );
  return rows;
}

// --- estatísticas para dashboards ---

async function statsByStatus() {
  const { rows } = await db.query(
    `SELECT status, COUNT(*)::int AS total
       FROM leads
      GROUP BY status`
  );
  return rows;
}

async function statsBySegmento() {
  const { rows } = await db.query(
    `SELECT COALESCE(segmento, 'desconhecido') AS segmento, COUNT(*)::int AS total
       FROM leads
      GROUP BY 1
      ORDER BY total DESC`
  );
  return rows;
}

async function statsByUf() {
  const { rows } = await db.query(
    `SELECT COALESCE(uf, 'NA') AS uf, COUNT(*)::int AS total
       FROM leads
      GROUP BY 1
      ORDER BY total DESC
      LIMIT 15`
  );
  return rows;
}

async function statsResumo() {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM leads)                                        AS total,
      (SELECT COUNT(*)::int FROM leads WHERE status = 'assinante')            AS assinantes,
      (SELECT COUNT(*)::int FROM leads WHERE status NOT IN ('assinante','descartado')) AS ativos,
      (SELECT COALESCE(AVG(icp_score), 0)::int FROM leads WHERE icp_score IS NOT NULL) AS icp_medio,
      (SELECT COUNT(*)::int FROM searches WHERE created_at > NOW() - INTERVAL '7 days') AS buscas_7d
  `);
  return rows[0];
}

async function findNonEnriched(limit = 20) {
  const { rows } = await db.query(
    `SELECT *
       FROM leads
      WHERE enriquecido_em IS NULL
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

async function recordConversion({
  leadId,
  userId,
  plano,
  statusResultado,
  azulliAccountId,
  payloadRequest,
  payloadResponse,
  erro
}) {
  await db.query(
    `INSERT INTO lead_conversions (
       lead_id, user_id, plano, status_resultado, azulli_account_id,
       payload_request, payload_response, erro
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      leadId,
      userId || null,
      plano,
      statusResultado,
      azulliAccountId || null,
      payloadRequest ? JSON.stringify(payloadRequest) : null,
      payloadResponse ? JSON.stringify(payloadResponse) : null,
      erro || null
    ]
  );
}

async function markAsSubscriber(id, { azulliAccountId, plano, userId, motivo }) {
  await db.transaction(async (tx) => {
    const cur = await tx.query('SELECT status FROM leads WHERE id = $1 FOR UPDATE', [id]);
    if (cur.rows.length === 0) throw new Error('Lead não encontrado');
    const anterior = cur.rows[0].status;

    await tx.query(
      `UPDATE leads
          SET status = 'assinante',
              azulli_account_id = $1,
              plano_contratado = $2,
              data_assinatura = COALESCE(data_assinatura, NOW())
        WHERE id = $3`,
      [azulliAccountId, plano, id]
    );

    if (anterior !== 'assinante') {
      await tx.query(
        `INSERT INTO lead_status_history (lead_id, user_id, status_anterior, status_novo, motivo)
         VALUES ($1, $2, $3, 'assinante', $4)`,
        [id, userId || null, anterior, motivo || 'Conversão vinculada ao tenant Azulli']
      );
    }
  });
  return findById(id);
}

module.exports = {
  STATUS,
  SEGMENTOS,
  upsertFromScrape,
  findById,
  list,
  update,
  assign,
  changeStatus,
  applyEnrichment,
  destroy,
  history,
  statsByStatus,
  statsBySegmento,
  statsByUf,
  statsResumo,
  findNonEnriched,
  recordConversion,
  markAsSubscriber
};
