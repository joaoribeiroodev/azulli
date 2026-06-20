'use strict';

const aiService = require('./aiService');
const Lead = require('../models/Lead');
const { parseEndereco, normalizarTelefone, whatsappLink } = require('../utils/endereco');

/**
 * Enriquecimento básico que não depende de IA (sempre roda).
 * Extrai cidade/UF do endereço e normaliza telefone/whatsapp.
 */
async function enriquecerBasico(lead) {
  const { cidade, uf, cep } = parseEndereco(lead.endereco);
  const telefone = normalizarTelefone(lead.telefone) || lead.telefone || null;
  const wa = whatsappLink(lead.telefone);

  const patch = {};
  if (cidade && !lead.cidade) patch.cidade = cidade;
  if (uf && !lead.uf) patch.uf = uf;
  if (cep && !lead.cep) patch.cep = cep;
  if (telefone && telefone !== lead.telefone) patch.telefone = telefone;
  if (wa && !lead.whatsapp) patch.whatsapp = wa;

  if (Object.keys(patch).length > 0) {
    return Lead.update(lead.id, patch);
  }
  return lead;
}

/**
 * Pipeline completo (básico + IA). Tolerante a falhas: se IA estiver desligada,
 * só faz o enriquecimento básico.
 */
async function enriquecerLead(lead, { userId } = {}) {
  let atual = await enriquecerBasico(lead);

  if (!aiService.isEnabled()) {
    return atual;
  }

  try {
    const ai = await aiService.enriquecerLead(atual, { userId });
    atual = await Lead.applyEnrichment(atual.id, {
      segmento: ai.segmento,
      icpScore: ai.icpScore,
      pitchWhatsapp: ai.pitchWhatsapp,
      validado: ai.validado
    });
  } catch (e) {
    console.warn(`[enrichment] IA falhou para lead ${lead.id}: ${e.message}`);
  }

  return atual;
}

/**
 * Processa uma lista de leads em background (sequencial, sem travar a resposta HTTP).
 */
function enriquecerEmBackground(leads, { userId } = {}) {
  // não esperar a Promise — o caller já respondeu ao HTTP
  setImmediate(async () => {
    for (const l of leads) {
      try {
        await enriquecerLead(l, { userId });
      } catch (e) {
        console.warn(`[enrichment] erro no lead ${l.id}:`, e.message);
      }
    }
  });
}

module.exports = { enriquecerBasico, enriquecerLead, enriquecerEmBackground };
