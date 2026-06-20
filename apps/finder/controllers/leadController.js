'use strict';

const Lead = require('../models/Lead');
const aiService = require('../services/aiService');
const enrichment = require('../services/leadEnrichment');
const azulliCore = require('../services/azulliCore');
const convertService = require('../services/conversion');
const { isValidPlanId } = require('../config/plans');

async function listar(req, res, next) {
  try {
    const { status, segmento, uf, cidade, scoreMin, responsavel, q, sort, dir, skip, limit } = req.query;
    const result = await Lead.list({
      status, segmento, uf, cidade, scoreMin, responsavel, q, sort, dir,
      skip: skip ? +skip : 0,
      limit: limit ? +limit : 50
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function obter(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ erro: 'Lead não encontrado' });
    const history = await Lead.history(req.params.id);
    res.json({ lead, history });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const lead = await Lead.update(req.params.id, req.body || {});
    if (!lead) return res.status(404).json({ erro: 'Lead não encontrado' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function trocarStatus(req, res, next) {
  try {
    const { status, motivo } = req.body || {};
    if (!status) return res.status(400).json({ erro: 'status obrigatório' });
    const lead = await Lead.changeStatus(req.params.id, status, {
      userId: req.auth.sub,
      motivo
    });
    res.json({ lead });
  } catch (err) {
    if (/inválido|não encontrado/.test(err.message)) {
      return res.status(400).json({ erro: err.message });
    }
    next(err);
  }
}

async function atribuir(req, res, next) {
  try {
    const { responsavelId } = req.body || {};
    const lead = await Lead.assign(req.params.id, responsavelId);
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function pegarParaMim(req, res, next) {
  try {
    const lead = await Lead.assign(req.params.id, req.auth.sub);
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    await Lead.destroy(req.params.id);
    res.json({ sucesso: true });
  } catch (err) {
    next(err);
  }
}

async function reEnriquecer(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ erro: 'Lead não encontrado' });
    const atualizado = await enrichment.enriquecerLead(lead, { userId: req.auth.sub });
    res.json({ lead: atualizado });
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ erro: err.message });
    next(err);
  }
}

async function regerarPitch(req, res, next) {
  try {
    const canal = req.query.canal === 'email' ? 'email' : 'whatsapp';
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ erro: 'Lead não encontrado' });

    const pitch =
      canal === 'email'
        ? await aiService.gerarPitchEmail(lead, { userId: req.auth.sub })
        : await aiService.gerarPitchWhatsapp(lead, { userId: req.auth.sub });

    const patch = canal === 'email' ? { pitchEmail: pitch } : { pitchWhatsapp: pitch };
    const atualizado = await Lead.applyEnrichment(lead.id, patch);
    res.json({
      lead: atualizado,
      pitch,
      pitchData: aiService.parsePitchStored(pitch),
      copyText: aiService.getPitchCopyText(pitch, canal)
    });
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ erro: err.message });
    next(err);
  }
}

async function stats(_req, res, next) {
  try {
    const [resumo, byStatus, bySegmento, byUf] = await Promise.all([
      Lead.statsResumo(),
      Lead.statsByStatus(),
      Lead.statsBySegmento(),
      Lead.statsByUf()
    ]);
    res.json({ resumo, byStatus, bySegmento, byUf });
  } catch (err) {
    next(err);
  }
}

async function converter(req, res, next) {
  try {
    const { plano } = req.body || {};
    if (!plano || !isValidPlanId(plano)) {
      return res.status(400).json({ erro: 'plano inválido — use pro ou enterprise' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ erro: 'Lead não encontrado' });

    if (lead.status === 'assinante' && lead.azulli_account_id) {
      return res.json({
        lead,
        conversao: {
          status: 'linked',
          tenantId: lead.azulli_account_id,
          message: 'Lead já vinculado a um tenant Azulli.'
        }
      });
    }

    const payloadRequest = {
      finderLeadId: lead.id,
      email: lead.email,
      nome: lead.nome,
      telefone: lead.telefone || lead.whatsapp,
      cnpj: lead.cnpj,
      plano
    };

    let coreResponse;
    try {
      coreResponse = await convertService.convertLead(payloadRequest);
    } catch (err) {
      await Lead.recordConversion({
        leadId: lead.id,
        userId: req.auth.sub,
        plano,
        statusResultado: 'error',
        payloadRequest,
        erro: err.message
      }).catch(() => {});
      if (err.status === 503) return res.status(503).json({ erro: err.message });
      throw err;
    }

    let atualizado = lead;

    if (coreResponse.status === 'linked' && coreResponse.tenantId) {
      atualizado = await Lead.markAsSubscriber(lead.id, {
        azulliAccountId: coreResponse.tenantId,
        plano,
        userId: req.auth.sub,
        motivo: `Conversão: plano ${plano}`
      });
    }

    await Lead.recordConversion({
      leadId: lead.id,
      userId: req.auth.sub,
      plano,
      statusResultado: coreResponse.status,
      azulliAccountId: coreResponse.tenantId || null,
      payloadRequest,
      payloadResponse: coreResponse
    });

    res.json({ lead: atualizado, conversao: coreResponse });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  obter,
  atualizar,
  trocarStatus,
  atribuir,
  pegarParaMim,
  excluir,
  reEnriquecer,
  regerarPitch,
  stats,
  converter
};
