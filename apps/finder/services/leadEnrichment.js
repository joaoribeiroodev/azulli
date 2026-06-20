'use strict';

const aiService = require('./aiService');
const Lead = require('../models/Lead');
const { scheduleAfter } = require('../lib/afterScope');
const { parseEndereco, normalizarTelefone, whatsappLink } = require('../utils/endereco');

/**
 * Enriquecimento básico que não depende de IA (sempre roda).
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

function withSearchContext(lead, searchContext = {}) {
  return {
    ...lead,
    search_termo: searchContext.termo || lead.search_termo || null,
    search_localizacao: searchContext.localizacao || lead.search_localizacao || null
  };
}

/**
 * Pipeline completo (básico + IA).
 */
async function enriquecerLead(lead, { userId, gerarPitch = true, searchContext = {} } = {}) {
  let atual = await enriquecerBasico(lead);
  const contextualizado = withSearchContext(atual, searchContext);

  if (!aiService.isEnabled()) {
    return atual;
  }

  try {
    const ai = await aiService.enriquecerLead(contextualizado, { userId, gerarPitch, searchContext });
    atual = await Lead.applyEnrichment(atual.id, {
      segmento: ai.segmento,
      icpScore: ai.icpScore,
      pitchWhatsapp: ai.pitchWhatsapp,
      pitchEmail: ai.pitchEmail,
      validado: ai.validado
    });
  } catch (e) {
    console.warn(`[enrichment] IA falhou para lead ${lead.id}: ${e.message}`);
  }

  return atual;
}

/**
 * Enriquecimento otimizado pós-busca: segmento em lote + ICP por lead (sem pitches).
 */
async function enriquecerLeadsPosBusca(leads, { userId, searchContext = {} } = {}) {
  if (!leads?.length) return;

  const contextualizados = [];
  for (const lead of leads) {
    try {
      contextualizados.push(withSearchContext(await enriquecerBasico(lead), searchContext));
    } catch (e) {
      console.warn(`[enrichment] básico falhou lead ${lead.id}:`, e.message);
      contextualizados.push(withSearchContext(lead, searchContext));
    }
  }

  if (!aiService.isEnabled()) return;

  let segmentos = {};
  try {
    segmentos = await aiService.classificarSegmentosLote(contextualizados, { userId, searchContext });
  } catch (e) {
    console.warn('[enrichment] lote segmento falhou:', e.message);
  }

  for (const lead of contextualizados) {
    try {
      const segmento = segmentos[lead.id] || lead.segmento || 'outros';
      const enriched = { ...lead, segmento };
      const icpScore = await aiService.calcularIcpScore(enriched, { userId, searchContext });

      await Lead.applyEnrichment(lead.id, {
        segmento,
        icpScore,
        validado: true
      });
    } catch (e) {
      console.warn(`[enrichment] lead ${lead.id}:`, e.message);
    }
  }
}

function enriquecerEmBackground(leads, { userId, searchContext = {} } = {}) {
  scheduleAfter(async () => {
    try {
      await enriquecerLeadsPosBusca(leads, { userId, searchContext });
      console.log(`[enrichment] concluído para ${leads.length} leads`);
    } catch (e) {
      console.warn('[enrichment] batch falhou:', e.message);
    }
  });
}

module.exports = {
  enriquecerBasico,
  enriquecerLead,
  enriquecerLeadsPosBusca,
  enriquecerEmBackground
};
