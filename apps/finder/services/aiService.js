'use strict';

const openaiConfig = require('../config/openai');
const db = require('../config/database');
const prompts = require('./aiPrompts');

const PITCH_VERSION = 3;

async function registrarUso({ leadId, userId, acao, modelo, usage, erro = null }) {
  try {
    await db.query(
      `INSERT INTO ai_usage (lead_id, user_id, acao, modelo, tokens_in, tokens_out, custo_usd, erro)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
      [
        leadId || null,
        userId || null,
        acao,
        modelo,
        usage?.prompt_tokens || null,
        usage?.completion_tokens || null,
        erro
      ]
    );
  } catch (e) {
    console.warn('[ai] não foi possível registrar ai_usage:', e.message);
  }
}

function ensureEnabled() {
  if (!openaiConfig.isEnabled()) {
    const err = new Error(
      'OpenAI não configurada. Defina OPENAI_API_KEY no .env para usar funcionalidades de IA.'
    );
    err.status = 503;
    throw err;
  }
}

async function chat(messages, { temperature = 0.3, max_tokens = 200, json = false } = {}) {
  ensureEnabled();
  const client = openaiConfig.getClient();
  const body = {
    model: openaiConfig.model,
    temperature,
    max_tokens,
    messages
  };
  if (json) body.response_format = { type: 'json_object' };
  return client.chat.completions.create(body);
}

function extractJsonContent(completion) {
  const raw = (completion.choices?.[0]?.message?.content || '').trim();
  if (!raw) throw new Error('Resposta vazia da OpenAI');
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('JSON inválido na resposta da OpenAI');
  }
}

function wrapPitch(canal, data) {
  return JSON.stringify({ v: PITCH_VERSION, canal, ...data });
}

function parsePitchStored(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const trimmed = stored.trim();
  if (!trimmed.startsWith('{')) {
    return {
      v: 1,
      legacy: true,
      canal: 'whatsapp',
      mensagem: trimmed,
      corpo: trimmed
    };
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return { v: 1, legacy: true, canal: 'whatsapp', mensagem: trimmed, corpo: trimmed };
  }
}

function getPitchCopyText(stored, canal = 'whatsapp') {
  const parsed = parsePitchStored(stored);
  if (!parsed) return '';
  if (canal === 'email') {
    if (parsed.assunto && parsed.corpo) {
      return `Assunto: ${parsed.assunto}\n\n${parsed.corpo}`;
    }
    return parsed.corpo || parsed.mensagem || stored;
  }
  return parsed.mensagem || parsed.corpo || stored;
}

function normalizeWhatsappPitch(data) {
  const estrutura = data.estrutura || {};
  const mensagem = String(data.mensagem || '').trim();
  const mensagemPosOptin = String(data.mensagem_pos_optin || '').trim();
  const fallback = [estrutura.gancho, estrutura.contexto, estrutura.permissao, estrutura.opt_out]
    .filter(Boolean)
    .join('\n\n');

  return {
    mensagem: mensagem || fallback,
    mensagem_pos_optin: mensagemPosOptin,
    estrutura: {
      gancho: estrutura.gancho || '',
      contexto: estrutura.contexto || estrutura.dor || '',
      permissao: estrutura.permissao || estrutura.beneficio || '',
      opt_out: estrutura.opt_out || estrutura.cta || '',
      prova: estrutura.prova || ''
    },
    follow_up: data.follow_up || '',
    objecoes: Array.isArray(data.objecoes) ? data.objecoes.slice(0, 3) : [],
    personalizacao_usada: Array.isArray(data.personalizacao_usada) ? data.personalizacao_usada : [],
    dicas_vendedor: Array.isArray(data.dicas_vendedor) ? data.dicas_vendedor.slice(0, 5) : [],
    conformidade_meta: data.conformidade_meta || null
  };
}

function normalizeEmailPitch(data) {
  const estrutura = data.estrutura || {};
  const assunto = String(data.assunto || '').trim();
  let corpo = String(data.corpo || '').trim();

  if (!corpo && estrutura.abertura) {
    const partes = [
      estrutura.abertura,
      estrutura.contexto,
      estrutura.problema,
      estrutura.solucao,
      Array.isArray(estrutura.beneficios) ? estrutura.beneficios.map((b) => `• ${b}`).join('\n') : null,
      estrutura.cta,
      estrutura.fechamento || 'Abraços,\nTime Azulli'
    ].filter(Boolean);
    corpo = partes.join('\n\n');
  }

  if (data.ps && !corpo.includes('P.S.')) {
    corpo += `\n\nP.S. ${data.ps}`;
  }

  return {
    assunto,
    assunto_alternativo: data.assunto_alternativo || '',
    corpo,
    estrutura: {
      abertura: estrutura.abertura || '',
      contexto: estrutura.contexto || '',
      problema: estrutura.problema || '',
      solucao: estrutura.solucao || '',
      beneficios: Array.isArray(estrutura.beneficios) ? estrutura.beneficios : [],
      cta: estrutura.cta || '',
      fechamento: estrutura.fechamento || 'Abraços,\nTime Azulli'
    },
    personalizacao_usada: Array.isArray(data.personalizacao_usada) ? data.personalizacao_usada : [],
    ps: data.ps || null
  };
}

// ------------------------------------------------------------------
// 1. Classificar segmento
// ------------------------------------------------------------------
async function classificarSegmento(lead, { userId } = {}) {
  const completion = await chat(
    [
      { role: 'system', content: prompts.PROMPT_SEGMENTO },
      { role: 'user', content: JSON.stringify(prompts.leadContexto(lead).negocio) }
    ],
    { temperature: 0.2, max_tokens: 15 }
  );

  const raw = (completion.choices?.[0]?.message?.content || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const segmento = prompts.SEGMENTOS_VALIDOS.has(raw) ? raw : 'outros';
  await registrarUso({
    leadId: lead.id,
    userId,
    acao: 'segmento',
    modelo: openaiConfig.model,
    usage: completion.usage
  });
  return segmento;
}

// ------------------------------------------------------------------
// 2. ICP score (0–100)
// ------------------------------------------------------------------
async function calcularIcpScore(lead, { userId } = {}) {
  const completion = await chat(
    [
      { role: 'system', content: prompts.PROMPT_ICP },
      { role: 'user', content: JSON.stringify(prompts.leadContexto(lead)) }
    ],
    { temperature: 0, max_tokens: 6 }
  );

  const raw = completion.choices?.[0]?.message?.content || '';
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  const score = Number.isNaN(n) ? 50 : Math.max(0, Math.min(100, n));

  await registrarUso({
    leadId: lead.id,
    userId,
    acao: 'icp_score',
    modelo: openaiConfig.model,
    usage: completion.usage
  });
  return score;
}

// ------------------------------------------------------------------
// 3. Pitch WhatsApp estruturado
// ------------------------------------------------------------------
async function gerarPitchWhatsapp(lead, { userId } = {}) {
  const completion = await chat(
    [
      { role: 'system', content: prompts.PROMPT_WHATSAPP_JSON },
      { role: 'user', content: JSON.stringify(prompts.leadContexto(lead)) }
    ],
    { temperature: 0.65, max_tokens: 900, json: true }
  );

  const normalized = normalizeWhatsappPitch(extractJsonContent(completion));
  const pitch = wrapPitch('whatsapp', normalized);

  await registrarUso({
    leadId: lead.id,
    userId,
    acao: 'pitch_whatsapp',
    modelo: openaiConfig.model,
    usage: completion.usage
  });
  return pitch;
}

// ------------------------------------------------------------------
// 4. Pitch e-mail estruturado
// ------------------------------------------------------------------
async function gerarPitchEmail(lead, { userId } = {}) {
  const completion = await chat(
    [
      { role: 'system', content: prompts.PROMPT_EMAIL_JSON },
      { role: 'user', content: JSON.stringify(prompts.leadContexto(lead)) }
    ],
    { temperature: 0.55, max_tokens: 1100, json: true }
  );

  const normalized = normalizeEmailPitch(extractJsonContent(completion));
  const pitch = wrapPitch('email', normalized);

  await registrarUso({
    leadId: lead.id,
    userId,
    acao: 'pitch_email',
    modelo: openaiConfig.model,
    usage: completion.usage
  });
  return pitch;
}

// ------------------------------------------------------------------
// 5. Validação leve dos dados
// ------------------------------------------------------------------
async function validarDados(lead, { userId } = {}) {
  const completion = await chat(
    [
      { role: 'system', content: prompts.PROMPT_VALIDACAO },
      { role: 'user', content: JSON.stringify(prompts.leadContexto(lead).negocio) }
    ],
    { temperature: 0, max_tokens: 6 }
  );
  const raw = (completion.choices?.[0]?.message?.content || '').trim().toLowerCase();
  await registrarUso({
    leadId: lead.id,
    userId,
    acao: 'validacao',
    modelo: openaiConfig.model,
    usage: completion.usage
  });
  return raw.startsWith('val');
}

// ------------------------------------------------------------------
// Pipeline completo
// ------------------------------------------------------------------
async function enriquecerLead(lead, { userId, gerarPitch = true } = {}) {
  ensureEnabled();

  const result = {};
  try {
    result.validado = await validarDados(lead, { userId });
  } catch (e) {
    console.warn('[ai] validarDados falhou:', e.message);
    result.validado = false;
  }

  try {
    result.segmento = await classificarSegmento(lead, { userId });
  } catch (e) {
    console.warn('[ai] classificarSegmento falhou:', e.message);
    result.segmento = 'outros';
  }

  const enriched = { ...lead, segmento: result.segmento, icp_score: lead.icp_score };

  try {
    result.icpScore = await calcularIcpScore(enriched, { userId });
    enriched.icp_score = result.icpScore;
  } catch (e) {
    console.warn('[ai] calcularIcpScore falhou:', e.message);
    result.icpScore = null;
  }

  if (gerarPitch) {
    try {
      result.pitchWhatsapp = await gerarPitchWhatsapp(enriched, { userId });
    } catch (e) {
      console.warn('[ai] gerarPitchWhatsapp falhou:', e.message);
      result.pitchWhatsapp = null;
    }

    try {
      result.pitchEmail = await gerarPitchEmail(enriched, { userId });
    } catch (e) {
      console.warn('[ai] gerarPitchEmail falhou:', e.message);
      result.pitchEmail = null;
    }
  }

  return result;
}

module.exports = {
  isEnabled: openaiConfig.isEnabled,
  classificarSegmento,
  calcularIcpScore,
  gerarPitchWhatsapp,
  gerarPitchEmail,
  validarDados,
  enriquecerLead,
  parsePitchStored,
  getPitchCopyText
};
