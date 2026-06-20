'use strict';

/**
 * Qualificação ICP Azulli: foco em MEI, ME e pequenas empresas no Simples Nacional.
 * O Google Maps/Places não informa regime tributário — usamos heurísticas de porte local.
 */

const REDES_NACIONAIS = [
  'leroy merlin', 'telhanorte', 'sodimac', 'tigre', 'carrefour', 'extra hiper',
  'pao de acucar', 'assai', 'atacadao', 'sam\'s club', 'makro', 'obramax',
  'cacol', 'dicico', 'comercial estrela', 'marisa', 'renner', 'riachuelo',
  'magazine luiza', 'magalu', 'casas bahia', 'americanas', 'submarino',
  'mcdonald', 'burger king', 'subway', 'habib', 'giraffas', 'outback',
  'starbucks', 'banco do brasil', 'bradesco', 'itau', 'caixa economica',
  'nubank', 'rede d\'or', 'hapvida', 'amil', 'drogasil', 'drogaraia',
  'pacheco', 'panvel', 'petz', 'cobasi', 'polishop', 'havan', 'centauro',
  'nike store', 'adidas', 'zara', 'c&a', 'pernambucanas', 'fast shop',
  'kalunga', 'petrobras', 'shell select', 'ipiranga', 'br mania'
];

const FRANQUIA_NACIONAL = [
  'o boticario', 'boticario', 'natura', 'avon', 'sephora', 'mc donald',
  'pizza hut', 'kfc', 'domino', 'bobs', 'china in box'
];

const SINAIS_PEQUENO_NEGOCIO = [
  'mei', 'me ', ' eireli', ' ltda', ' comercio', 'comércio', 'servicos', 'serviços',
  'de bairro', 'do bairro', ' & ', ' e ', ' - ', 'loja ', 'depósito', 'deposito'
];

function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchLista(nome, lista) {
  const n = normalizar(nome);
  return lista.some((item) => n.includes(normalizar(item)));
}

/**
 * Porte estimado com base em sinais públicos (nome, avaliações).
 * Valores alinhados ao schema: mei | me | pequena | rede | outra
 */
function inferirPorte(lead) {
  const nome = lead.nome || '';
  const n = normalizar(nome);
  const totalAv = lead.total_avaliacoes != null ? Number(lead.total_avaliacoes) : null;

  if (matchLista(nome, REDES_NACIONAIS)) {
    return { porte: 'rede', confianca: 'alta', motivo: 'Rede ou franqueadora nacional conhecida' };
  }

  if (matchLista(nome, FRANQUIA_NACIONAL) && totalAv != null && totalAv > 80) {
    return { porte: 'rede', confianca: 'media', motivo: 'Franquia nacional com volume alto de avaliações' };
  }

  if (totalAv != null && totalAv > 400) {
    return { porte: 'rede', confianca: 'media', motivo: 'Volume de avaliações típico de rede/unidade de grande marca' };
  }

  if (/\bmei\b/.test(n) || n.includes('microempreendedor')) {
    return { porte: 'mei', confianca: 'alta', motivo: 'Nome menciona MEI' };
  }

  if (totalAv != null && totalAv <= 80) {
    const sinaisLocal = SINAIS_PEQUENO_NEGOCIO.some((s) => n.includes(normalizar(s)));
    if (sinaisLocal || totalAv <= 25) {
      return {
        porte: totalAv <= 15 ? 'mei' : 'pequena',
        confianca: 'media',
        motivo: 'Operação local de bairro (típica MEI ou pequena empresa no Simples)'
      };
    }
  }

  if (totalAv != null && totalAv <= 150) {
    return { porte: 'pequena', confianca: 'baixa', motivo: 'Escala compatível com pequena empresa local' };
  }

  return { porte: 'outra', confianca: 'baixa', motivo: 'Porte não identificado — validar manualmente' };
}

/**
 * Regime tributário provável (inferência, não dado fiscal).
 */
function inferirRegimeProvavel(lead, porteInfo) {
  const porte = porteInfo?.porte || inferirPorte(lead).porte;

  if (porte === 'rede') {
    return {
      regime: 'fora_simples',
      confianca: 'alta',
      motivo: 'Redes nacionais geralmente não operam como MEI/Simples no perfil Azulli'
    };
  }

  if (porte === 'mei') {
    return {
      regime: 'mei',
      confianca: 'media',
      motivo: 'Perfil compatível com Microempreendedor Individual'
    };
  }

  if (porte === 'pequena' || porte === 'me') {
    return {
      regime: 'simples_nacional',
      confianca: 'media',
      motivo: 'Pequena empresa local — candidata típica ao Simples Nacional'
    };
  }

  return {
    regime: 'mei_ou_simples_provavel',
    confianca: 'baixa',
    motivo: 'Sem sinais de rede; pode ser MEI ou Simples — confirmar na abordagem'
  };
}

function qualificarLead(lead) {
  const porteInfo = inferirPorte(lead);
  const regimeInfo = inferirRegimeProvavel(lead, porteInfo);
  const excluir = porteInfo.porte === 'rede' && porteInfo.confianca !== 'baixa';

  let ajusteIcp = 0;
  if (porteInfo.porte === 'mei') ajusteIcp += 12;
  else if (porteInfo.porte === 'pequena' || porteInfo.porte === 'me') ajusteIcp += 8;
  else if (porteInfo.porte === 'rede') ajusteIcp -= 40;

  if (regimeInfo.regime === 'mei') ajusteIcp += 5;
  else if (regimeInfo.regime === 'simples_nacional') ajusteIcp += 4;
  else if (regimeInfo.regime === 'fora_simples') ajusteIcp -= 25;

  return {
    porte: porteInfo.porte,
    porte_motivo: porteInfo.motivo,
    regime_provavel: regimeInfo.regime,
    regime_motivo: regimeInfo.motivo,
    excluir,
    ajuste_icp: ajusteIcp,
    foco_azulli: !excluir && ['mei', 'pequena', 'me', 'outra'].includes(porteInfo.porte)
  };
}

function filtrarLeadsParaIcp(leads) {
  const aceitos = [];
  const excluidos = [];

  for (const lead of leads) {
    const q = qualificarLead(lead);
    const enriched = { ...lead, ...q };
    if (q.excluir) {
      excluidos.push({ ...enriched, motivo_exclusao: q.porte_motivo });
    } else {
      aceitos.push(enriched);
    }
  }

  return { aceitos, excluidos };
}

module.exports = {
  inferirPorte,
  inferirRegimeProvavel,
  qualificarLead,
  filtrarLeadsParaIcp
};
