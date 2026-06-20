'use strict';

const SEGMENTOS_VALIDOS = new Set([
  'alimentacao', 'beleza', 'automotivo', 'saude', 'servicos',
  'varejo', 'educacao', 'tech', 'construcao', 'outros'
]);

/** Prioridade: termo da busca do SDR (mais confiável que o nome isolado). */
const REGRAS_TERMO_BUSCA = [
  {
    segmento: 'construcao',
    pattern: /material(es)?\s*(de\s+)?constru|constru(cao|ção)|ferragem|ferreiro|cimento|tijolo|telha|madeira|hidraul|hidrául|el[eé]tric(a|o).*?(material|loja)|loja\s+de\s+constru|casas?\s+e?\s*constru|dep[oó]sito\s+de\s+constru|areia\s+e\s+pedra|gesso|drywall|revestimento|porcelanato|ceramica|cerâmica|argamassa|tintas?\s+(e|&)\s+verniz|impermeabiliz/i
  },
  {
    segmento: 'alimentacao',
    pattern: /padaria|restaurante|pizzaria|lanchonete|caf[eé]|a[cç][aá]i|hamburguer|food|bar\s+e\s+restaurante|doceria|confeitaria|sorvete|marmita|delivery\s+de\s+comida/i
  },
  {
    segmento: 'beleza',
    pattern: /sal[aã]o|barbearia|cabeleireir|est[eé]tica|manicure|nail|sobrancelha|depila/i
  },
  {
    segmento: 'automotivo',
    pattern: /oficina|mec[aâ]nic|auto\s*center|borracharia|funilaria|autope[cç]as|lava\s*jato|lavajato/i
  },
  {
    segmento: 'saude',
    pattern: /cl[ií]nica|consult[oó]rio|odont|fisioterap|psicolog|nutricion|farm[aá]cia|laborat[oó]rio\s+de\s+anal/i
  },
  {
    segmento: 'educacao',
    pattern: /escola|curso|col[eé]gio|idiomas|refor[cç]o|creche|faculdade/i
  },
  {
    segmento: 'tech',
    pattern: /software|inform[aá]tica|ti\s|desenvolvimento|saas|hosting|datacenter/i
  },
  {
    segmento: 'servicos',
    pattern: /advocacia|contabil|consultoria|marketing|design|fotograf|lavanderia|dedetiz|limpeza|seguran[cç]a|guincho|transportadora/i
  },
  {
    segmento: 'varejo',
    pattern: /pet\s*shop|loja\s+de\s+roupa|moda|mercadinho|mercado|mini\s*mercado|presentes|papelaria|inform[aá]tica\s+(loja|store)/i
  }
];

const REGRAS_NOME_NEGOCIO = [
  { segmento: 'construcao', pattern: /constru(cao|ção)|material|ferragem|ferreiro|cimento|telha|madeira|hidraul|hidrául|tintas?|ceramica|cerâmica|porcelanato|gesso|areia|pedra|dep[oó]sito|telhanorte|cacau\s*piso|sodimac|leroy|tigre|amanco|decacolor/i },
  { segmento: 'alimentacao', pattern: /padaria|restaurante|pizzaria|lanchonete|caf[eé]|a[cç][aá]i|bar\b|boteco|grill|burger|sushi|marmitaria/i },
  { segmento: 'beleza', pattern: /sal[aã]o|barbearia|beauty|hair|nails|est[eé]tica|visag/i },
  { segmento: 'automotivo', pattern: /oficina|mec[aâ]nic|auto\s*center|borracharia|funilaria|autope[cç]as|lava\s*jato/i },
  { segmento: 'saude', pattern: /cl[ií]nica|consult[oó]rio|odont|fisio|psico|nutri|farm[aá]cia/i },
  { segmento: 'varejo', pattern: /pet\s*shop|moda|boutique|mercado|mini\s*mercado|presentes|papelaria/i }
];

function normalizarTexto(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchRegras(texto, regras) {
  if (!texto) return null;
  const norm = normalizarTexto(texto);
  for (const regra of regras) {
    if (regra.pattern.test(norm)) {
      return { segmento: regra.segmento, confianca: 'alta', fonte: 'termo_busca' };
    }
  }
  return null;
}

/**
 * Classifica segmento por regras determinísticas (termo da busca > nome do negócio).
 * Retorna null se não houver match confiável.
 */
function classificarPorHeuristica(lead, searchContext = {}) {
  const termo = searchContext.termo || lead.search_termo || '';
  const nome = lead.nome || '';

  const porTermo = matchRegras(termo, REGRAS_TERMO_BUSCA);
  if (porTermo) {
    return { ...porTermo, fonte: 'termo_busca' };
  }

  const porNome = matchRegras(nome, REGRAS_NOME_NEGOCIO);
  if (porNome) {
    return { ...porNome, confianca: 'media', fonte: 'nome_negocio' };
  }

  return null;
}

function segmentoSugeridoBusca(searchContext = {}) {
  const hit = matchRegras(searchContext.termo, REGRAS_TERMO_BUSCA);
  return hit ? hit.segmento : null;
}

/**
 * ICP heurístico quando a OpenAI falha ou em lote rápido.
 */
function calcularIcpHeuristic(lead, segmento, searchContext = {}) {
  let score = 42;

  if (lead.telefone) score += 12;
  if (lead.website) score += 4;

  const av = lead.avaliacao != null ? Number(lead.avaliacao) : null;
  if (av != null && !Number.isNaN(av)) {
    if (av >= 4.5) score += 14;
    else if (av >= 4) score += 10;
    else if (av >= 3.5) score += 4;
    else score -= 6;
  }

  const total = lead.total_avaliacoes != null ? Number(lead.total_avaliacoes) : null;
  if (total >= 30) score += 8;
  else if (total >= 10) score += 5;
  else if (total >= 3) score += 2;

  if (lead.endereco) score += 4;

  const sugerido = segmentoSugeridoBusca(searchContext);
  if (sugerido && segmento === sugerido) score += 12;

  const heuristica = classificarPorHeuristica(lead, searchContext);
  if (heuristica && heuristica.segmento === segmento) score += 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isSegmentoValido(s) {
  return SEGMENTOS_VALIDOS.has(s);
}

module.exports = {
  SEGMENTOS_VALIDOS,
  classificarPorHeuristica,
  segmentoSugeridoBusca,
  calcularIcpHeuristic,
  isSegmentoValido
};
