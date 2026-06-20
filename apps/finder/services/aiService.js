'use strict';

const openaiConfig = require('../config/openai');
const db = require('../config/database');

const ICP_DESCRICAO = `
Perfil ideal de assinante do Azulli (SaaS de gestão financeira e operacional):
- MEI, ME ou pequena empresa brasileira (até ~30 funcionários)
- Operação simples mas com fluxo recorrente de cobrança/notas/recibos
- Geralmente faz controle no papel, planilha ou WhatsApp (muito a ganhar com automação)
- Segmentos prioritários: serviços, beleza, automotivo, alimentação local,
  saúde de bairro, varejo de bairro, pet, cowork, oficinas
- Sinais positivos: avaliações Google ≥ 3.8, telefone visível,
  presença local consistente, atende público local
- Anti-perfil: grandes redes, franquias nacionais, multinacionais,
  empresas sem operação local
`;

const SEGMENTOS_VALIDOS = new Set([
  'alimentacao', 'beleza', 'automotivo', 'saude', 'servicos',
  'varejo', 'educacao', 'tech', 'construcao', 'outros'
]);

function leadFicha(lead) {
  return {
    nome: lead.nome,
    endereco: lead.endereco,
    cidade: lead.cidade,
    uf: lead.uf,
    telefone: lead.telefone,
    avaliacao: lead.avaliacao,
    total_avaliacoes: lead.total_avaliacoes,
    website: lead.website
  };
}

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

async function chat(messages, { temperature = 0.3, max_tokens = 200 } = {}) {
  ensureEnabled();
  const client = openaiConfig.getClient();
  return client.chat.completions.create({
    model: openaiConfig.model,
    temperature,
    max_tokens,
    messages
  });
}

// ------------------------------------------------------------------
// 1. Classificar segmento
// ------------------------------------------------------------------
async function classificarSegmento(lead, { userId } = {}) {
  const completion = await chat(
    [
      {
        role: 'system',
        content:
          'Você classifica negócios brasileiros em UMA categoria. ' +
          'Responda APENAS a categoria (sem pontuação, sem aspas). ' +
          'Possíveis: alimentacao, beleza, automotivo, saude, servicos, ' +
          'varejo, educacao, tech, construcao, outros.'
      },
      { role: 'user', content: JSON.stringify(leadFicha(lead)) }
    ],
    { temperature: 0.2, max_tokens: 15 }
  );

  const raw = (completion.choices?.[0]?.message?.content || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const segmento = SEGMENTOS_VALIDOS.has(raw) ? raw : 'outros';
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
      {
        role: 'system',
        content:
          'Você é analista de aquisição B2B do Azulli. Dada a ficha de um negócio, retorne ' +
          'APENAS um inteiro entre 0 e 100 representando o fit do negócio com o ICP abaixo. ' +
          'Sem texto, sem explicação.\n\n' +
          ICP_DESCRICAO
      },
      { role: 'user', content: JSON.stringify(leadFicha(lead)) }
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
// 3. Pitch de venda do Azulli — WhatsApp
// ------------------------------------------------------------------
async function gerarPitchWhatsapp(lead, { userId } = {}) {
  const completion = await chat(
    [
      {
        role: 'system',
        content:
          'Você é SDR do Azulli (SaaS de gestão financeira e operacional para MEIs e pequenas empresas). ' +
          'Escreva uma abordagem CURTA por WhatsApp (3 a 4 linhas) em português brasileiro, ' +
          'natural e personalizada, oferecendo o Azulli para este negócio. ' +
          'Cite UM benefício concreto relevante ao segmento (ex.: cobrança recorrente, controle de fluxo de caixa, ' +
          'emissão de nota, agendamento, comissionamento). ' +
          'Termine com convite gentil para conversar. Nada de CTA agressivo, sem emojis em excesso.'
      },
      { role: 'user', content: JSON.stringify(leadFicha(lead)) }
    ],
    { temperature: 0.7, max_tokens: 220 }
  );

  const pitch = (completion.choices?.[0]?.message?.content || '').trim();
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
// 4. Pitch de venda do Azulli — Email
// ------------------------------------------------------------------
async function gerarPitchEmail(lead, { userId } = {}) {
  const completion = await chat(
    [
      {
        role: 'system',
        content:
          'Você é SDR do Azulli. Escreva um email curto em pt-BR oferecendo o Azulli para este negócio. ' +
          'Formato exato:\n' +
          'Assunto: <linha curta>\n\nOlá <nome do negócio>,\n<corpo de 4 a 6 linhas>\n\nAbraços, Time Azulli.'
      },
      { role: 'user', content: JSON.stringify(leadFicha(lead)) }
    ],
    { temperature: 0.6, max_tokens: 350 }
  );

  const pitch = (completion.choices?.[0]?.message?.content || '').trim();
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
      {
        role: 'system',
        content:
          'Responda apenas "valido" ou "invalido" se a ficha parece de um negócio real e abordável comercialmente.'
      },
      { role: 'user', content: JSON.stringify(leadFicha(lead)) }
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
// Pipeline completo (chama as 4 etapas em sequência tolerante a falhas)
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

  try {
    result.icpScore = await calcularIcpScore({ ...lead, segmento: result.segmento }, { userId });
  } catch (e) {
    console.warn('[ai] calcularIcpScore falhou:', e.message);
    result.icpScore = null;
  }

  if (gerarPitch) {
    try {
      result.pitchWhatsapp = await gerarPitchWhatsapp(
        { ...lead, segmento: result.segmento },
        { userId }
      );
    } catch (e) {
      console.warn('[ai] gerarPitchWhatsapp falhou:', e.message);
      result.pitchWhatsapp = null;
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
  enriquecerLead
};
