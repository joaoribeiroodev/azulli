'use strict';

const { buscarLeads } = require('../scrapers/searchLeads');
const Search = require('../models/Search');
const Lead = require('../models/Lead');
const enrichment = require('../services/leadEnrichment');
const icpQualification = require('../services/icpQualification');

async function buscar(req, res, next) {
  const { termo, localizacao } = req.body || {};
  const userId = req.auth?.sub || null;

  if (!termo || !localizacao || termo.trim().length < 2 || localizacao.trim().length < 2) {
    return res.status(400).json({ erro: 'termo e localizacao são obrigatórios (mín. 2 caracteres)' });
  }

  let search = null;
  const inicio = Date.now();
  try {
    search = await Search.create({ userId, termo: termo.trim(), localizacao: localizacao.trim() });

    const scraped = await buscarLeads(termo.trim(), localizacao.trim());
    const { aceitos, excluidos } = icpQualification.filtrarLeadsParaIcp(scraped);

    const persisted = [];
    for (const l of aceitos) {
      try {
        const lead = await Lead.upsertFromScrape({
          searchId: search.id,
          nome: l.nome,
          telefone: l.telefone,
          endereco: l.endereco,
          avaliacao: l.avaliacao,
          totalAvaliacoes: l.totalAvaliacoes,
          mapsUrl: l.mapsUrl,
          website: l.website
        });
        persisted.push(lead);
      } catch (e) {
        console.warn('[search] falha ao persistir lead:', e.message);
      }
    }

    await Search.finalize(search.id, {
      totalResults: persisted.length,
      duracaoMs: Date.now() - inicio
    });

    // dispara enriquecimento em background (não bloqueia resposta)
    if (persisted.length > 0) {
      enrichment.enriquecerEmBackground(persisted, {
        userId,
        searchContext: { termo: termo.trim(), localizacao: localizacao.trim() }
      });
    }

    res.json({
      sucesso: true,
      searchId: search.id,
      total: persisted.length,
      excluidos_icp: excluidos.length,
      foco: 'MEI e pequenas empresas (Simples Nacional) — redes nacionais filtradas',
      dados: persisted
    });
  } catch (err) {
    if (search) {
      await Search.finalize(search.id, {
        totalResults: 0,
        duracaoMs: Date.now() - inicio,
        erro: err.message
      }).catch(() => {});
    }
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { mine, limit = 50, skip = 0 } = req.query;
    const userId = mine === '1' ? req.auth.sub : undefined;
    const searches = await Search.list({ userId, limit: +limit, skip: +skip });
    res.json({ searches });
  } catch (err) {
    next(err);
  }
}

module.exports = { buscar, listar };
