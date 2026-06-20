'use strict';

const aiService = require('./aiService');
const Lead = require('../models/Lead');
const icpQualification = require('./icpQualification');
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
    const qual = icpQualification.qualificarLead(contextualizado);
    const ai = await aiService.enriquecerLead(
      { ...contextualizado, porte: qual.porte, regime_provavel: qual.regime_provavel },
      { userId, gerarPitch, searchContext }
    );
    const icpScore = ai.icpScore != null
      ? Math.max(0, Math.min(100, Math.round(ai.icpScore + (qual.ajuste_icp || 0))))
      : ai.icpScore;
    atual = await Lead.applyEnrichment(atual.id, {
      segmento: ai.segmento,
      icpScore,
      porte: qual.porte,
      pitchWhatsapp: ai.pitchWhatsapp,
      pitchEmail: ai.pitchEmail,
      validado: ai.validado && qual.foco_azulli
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
      const qual = icpQualification.qualificarLead(lead);
      const segmento = segmentos[lead.id] || lead.segmento || 'outros';
      const enriched = { ...lead, segmento, porte: qual.porte, regime_provavel: qual.regime_provavel };
      let icpScore = await aiService.calcularIcpScore(enriched, { userId, searchContext });
      icpScore = Math.max(0, Math.min(100, Math.round(icpScore + (qual.ajuste_icp || 0))));

      await Lead.applyEnrichment(lead.id, {
        segmento,
        icpScore,
        porte: qual.porte,
        validado: qual.foco_azulli
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
