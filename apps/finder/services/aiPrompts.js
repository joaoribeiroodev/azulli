'use strict';

const { parseEndereco } = require('../utils/endereco');

const AZULLI_PRODUTO = `
O Azulli é um SaaS brasileiro de gestão financeira e operacional para MEIs e pequenas empresas.
Posicionamento: substituir planilha + WhatsApp + caderno por um painel simples, sem complexidade de ERP fiscal.

Principais funcionalidades (cite só o que fizer sentido pro segmento):
- Lançamentos, fluxo de caixa, clientes, fornecedores, produtos e funcionários
- Importação de extrato bancário (OFX) com categorização por IA
- Detector de despesas recorrentes e assinaturas
- Metas, lembretes e dashboard com gráficos
- Exportação Excel formatada e área do contador (acesso read-only)
- Plano Empresarial: assistente IA conversacional, previsão de fluxo de caixa, régua de cobrança

Oferta comercial:
- Trial gratuito de 7 dias, sem cartão
- Planos a partir de R$ 29,99/mês (Pro) — não invente preços diferentes
- Tom: consultivo, próximo, sem jargão de enterprise
`.trim();

const ICP_DESCRICAO = `
Perfil ideal de assinante do Azulli:
- MEI, ME ou pequena empresa brasileira (até ~30 funcionários)
- Operação com cobrança recorrente, controle manual ou planilha
- Segmentos prioritários: serviços, beleza, automotivo, alimentação local,
  saúde de bairro, varejo de bairro, pet, cowork, oficinas
- Sinais positivos: avaliações Google ≥ 3.8, telefone visível, presença local
- Anti-perfil: grandes redes, franquias nacionais, multinacionais
`.trim();

const META_WHATSAPP_DIRETRIZES = `
Diretrizes Meta / WhatsApp Business (OBRIGATÓRIO — violação gera bloqueio de número):

Contexto: o lead foi captado em dados públicos (Google Maps). NÃO há opt-in prévio no WhatsApp.
Mensagens proativas exigem cuidado extremo com a política de mensagens comerciais da Meta.

=== PRIMEIRO CONTATO (campo "mensagem") ===
Deve ser conversacional e utilitária — NÃO um anúncio ou template de marketing.

PROIBIDO no 1º contato:
- Pitch comercial longo, preço, desconto, cupom ou link de cadastro/trial
- Múltiplos links, links encurtados ou "clique aqui"
- CAPS LOCK, spam, emojis em excesso, urgência falsa ("última chance", "só hoje")
- Texto genérico que serviria para qualquer empresa
- Coletar dados sensíveis (CPF, cartão, senha)
- Linguagem de broadcast ("Prezado cliente", "Caro empreendedor")
- Enviar conteúdo promocional antes de o destinatário demonstrar interesse

OBRIGATÓRIO no 1º contato:
- Identificar remetente: "Sou do time comercial do Azulli" (gestão financeira para MEIs/pequenas empresas)
- Motivo personalizado e factual do contato (use dados captados: nome, bairro, cidade, segmento, avaliação)
- Pedir PERMISSÃO antes de explicar o produto: "Posso te contar em 2 linhas?" / "Faz sentido eu te explicar?"
- Opt-out claro e respeitoso: "Se preferir não receber mensagens, me avisa sem problemas"
- Mensagem curta (2–4 linhas), tom 1:1 humano, sem parecer disparo em massa

=== APÓS RESPOSTA POSITIVA (campo "mensagem_pos_optin") ===
Só enviar se o lead responder sim, "pode", "manda" ou equivalente.
Aí sim: apresentar Azulli, 1 benefício do segmento, trial 7 dias.
- Máximo 1 link (azulli.app.br) se realmente necessário
- Ainda sem pressão agressiva

=== FOLLOW-UP (campo "follow_up") ===
- No máximo 1 lembrete leve, sem repetir pitch comercial
- Se não houver resposta, orientar o vendedor a NÃO insistir em loop (risco de denúncia/spam)
- Nunca reenviar bloco promocional completo

=== WABA (API oficial) ===
- Fora da janela de 24h, mensagens business-initiated precisam de template aprovado
- 1º contato frio: preferir categoria utility/conversational, não marketing template
- Registrar opt-in se o lead responder positivamente
`.trim();

const SEGMENTO_BENEFICIOS = {
  alimentacao: [
    'fechamento de caixa diário sem planilha',
    'visão clara de margem e despesas recorrentes',
    'controle de fornecedores e fluxo de caixa da semana'
  ],
  beleza: [
    'comissionamento e controle de insumos',
    'pacotes e cobranças recorrentes organizadas',
    'agenda financeira sem misturar pessoal e negócio'
  ],
  automotivo: [
    'ordens de serviço traduzidas em fluxo de caixa',
    'controle de peças, fornecedores e recebimentos',
    'previsibilidade de caixa para oficina de bairro'
  ],
  saude: [
    'organização de receitas por procedimento/consulta',
    'controle de despesas fixas da clínica/consultório',
    'relatórios simples para o contador'
  ],
  servicos: [
    'cobrança de projetos e recorrência sem planilha',
    'visão de quem pagou e quem está atrasado',
    'simulação de margem antes de fechar um job'
  ],
  varejo: [
    'estoque + caixa integrados de forma simples',
    'detector de despesas recorrentes (aluguel, taxas, sistemas)',
    'exportação para fechamento mensal'
  ],
  educacao: [
    'mensalidades e receitas recorrentes organizadas',
    'controle de despesas fixas da operação',
    'metas de faturamento por turma/período'
  ],
  tech: [
    'fluxo de caixa para PJ pequena sem ERP pesado',
    'categorização automática de extrato bancário',
    'visão de MRR e despesas recorrentes'
  ],
  construcao: [
    'controle de recebimentos por obra/etapa',
    'fornecedores e despesas de obra em um lugar',
    'previsão de caixa para evitar aperto entre entregas'
  ],
  outros: [
    'organização financeira sem planilha',
    'fluxo de caixa claro para MEI/pequena empresa',
    'trial de 7 dias para testar sem compromisso'
  ]
};

const SEGMENTOS_VALIDOS = new Set([
  'alimentacao', 'beleza', 'automotivo', 'saude', 'servicos',
  'varejo', 'educacao', 'tech', 'construcao', 'outros'
]);

const REGRAS_COPY = `
Regras gerais de copy:
- Português brasileiro, tom humano de SDR consultivo (não robótico)
- Personalize SEMPRE com dados reais da ficha em "personalizacao.ganchos_obrigatorios" (mínimo 2 referências factuais)
- Trate o negócio pelo nome captado (ex.: "a [Nome no Google Maps]" ou "o time da [Nome]")
- NÃO mencione nota fiscal, emissão de NF ou integração fiscal
- NÃO use hype ("revolucionário", "único no mercado") nem pressão agressiva
- Nunca invente dados (faturamento, nº de funcionários, problemas internos)
- CTA como pergunta aberta ou convite gentil — nunca "compre agora"
`.trim();

function extrairBairro(endereco, cidade) {
  if (!endereco) return null;
  const ufMatch = endereco.match(/-\s*([A-Z]{2})(?=[,\s\b\d-]|$)/);
  if (!ufMatch) return null;
  const antes = endereco.slice(0, ufMatch.index).trim().replace(/,\s*$/, '');
  const tokens = antes.split(',').map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2) return null;
  const ultimo = tokens[tokens.length - 1];
  let candidato = ultimo;
  if (cidade && ultimo.toLowerCase() === String(cidade).toLowerCase()) {
    candidato = tokens[tokens.length - 2] || null;
  }
  if (!candidato) return null;
  const bairroInline = candidato.match(/\d+\s*-\s*(.+)$/);
  return bairroInline ? bairroInline[1].trim() : candidato;
}

function icpNivel(score) {
  if (score == null || Number.isNaN(Number(score))) return 'indefinido';
  const n = Number(score);
  if (n >= 75) return 'alto';
  if (n >= 50) return 'medio';
  return 'baixo';
}

function gerarGanchosPersonalizacao(lead) {
  const ganchos = [];
  const nome = lead.nome ? String(lead.nome).trim() : null;
  const cidade = lead.cidade || parseEndereco(lead.endereco).cidade;
  const uf = lead.uf || parseEndereco(lead.endereco).uf;
  const bairro = extrairBairro(lead.endereco, cidade);

  if (nome) {
    ganchos.push(`Estabelecimento: "${nome}" — use o nome exato na abertura`);
  }
  if (bairro && bairro !== cidade) {
    ganchos.push(`Bairro/região: ${bairro}${cidade ? ` (${cidade})` : ''}`);
  } else if (cidade) {
    ganchos.push(`Cidade: ${cidade}${uf ? `/${uf}` : ''} — referência local natural`);
  }
  if (lead.endereco) {
    ganchos.push(`Endereço captado: ${lead.endereco}`);
  }

  const av = lead.avaliacao != null ? Number(lead.avaliacao) : null;
  const totalAv = lead.total_avaliacoes != null ? Number(lead.total_avaliacoes) : null;
  if (av != null && !Number.isNaN(av)) {
    if (av >= 4.5 && totalAv >= 10) {
      ganchos.push(`Reputação Google: ${av}★ com ${totalAv} avaliações — elogie com parcimônia (1 frase)`);
    } else if (av >= 4) {
      ganchos.push(`Avaliação Google: ${av}★${totalAv ? ` (${totalAv} avaliações)` : ''}`);
    } else {
      ganchos.push(`Avaliação Google: ${av}★ — não elogie a nota; foque na operação local`);
    }
  } else if (totalAv >= 5) {
    ganchos.push(`${totalAv} avaliações no Google — sinal de movimento local`);
  }

  if (lead.website) {
    ganchos.push('Possui site — perfil com presença digital');
  } else {
    ganchos.push('Sem site listado — provável controle manual/planilha (dor provável)');
  }

  if (lead.segmento && lead.segmento !== 'outros') {
    ganchos.push(`Segmento: ${lead.segmento} — adapte benefício e linguagem`);
  }

  if (lead.maps_url) {
    ganchos.push('Encontrado via Google Maps — pode mencionar de forma natural (sem link na 1ª msg)');
  }

  if (lead.notas && String(lead.notas).trim()) {
    ganchos.push(`Notas internas do time (contexto extra): ${String(lead.notas).trim().slice(0, 200)}`);
  }

  return ganchos;
}

function beneficiosSegmento(segmento) {
  const key = SEGMENTOS_VALIDOS.has(segmento) ? segmento : 'outros';
  return SEGMENTO_BENEFICIOS[key];
}

function leadContexto(lead) {
  const parsed = parseEndereco(lead.endereco);
  const cidade = lead.cidade || parsed.cidade;
  const uf = lead.uf || parsed.uf;
  const cep = lead.cep || parsed.cep;
  const segmento = lead.segmento || 'outros';
  const icpScore = lead.icp_score ?? lead.icpScore ?? null;
  const enriched = { ...lead, cidade, uf, segmento };

  return {
    negocio: {
      nome: lead.nome || null,
      endereco: lead.endereco || null,
      bairro: extrairBairro(lead.endereco, cidade),
      cidade: cidade || null,
      uf: uf || null,
      cep: cep || null,
      telefone: lead.telefone || null,
      email: lead.email || null,
      website: lead.website || null,
      avaliacao_google: lead.avaliacao ?? null,
      total_avaliacoes: lead.total_avaliacoes ?? null,
      maps_url: lead.maps_url || null
    },
    qualificacao: {
      segmento,
      icp_score: icpScore,
      icp_nivel: icpNivel(icpScore)
    },
    personalizacao: {
      ganchos_obrigatorios: gerarGanchosPersonalizacao(enriched),
      instrucao:
        'Use NO MÍNIMO 2 ganchos factuais da lista acima na mensagem. ' +
        'Cada pitch deve ser único para este negócio — nunca reutilize frases genéricas.'
    },
    beneficios_sugeridos: beneficiosSegmento(segmento)
  };
}

const PROMPT_SEGMENTO = `
Você classifica negócios brasileiros em UMA categoria.
Responda APENAS a categoria (sem pontuação, sem aspas).
Possíveis: alimentacao, beleza, automotivo, saude, servicos, varejo, educacao, tech, construcao, outros.
`.trim();

const PROMPT_ICP = `
Você é analista de aquisição B2B do Azulli.
Dada a ficha de um negócio, retorne APENAS um inteiro entre 0 e 100 representando o fit com o ICP abaixo.
Sem texto, sem explicação.

${ICP_DESCRICAO}
`.trim();

const PROMPT_VALIDACAO = `
Responda apenas "valido" ou "invalido" se a ficha parece de um negócio real e abordável comercialmente
(MEI, pequena empresa local). Considere inválido: dados vazios, nomes genéricos sem endereço, ou perfil claramente fora do ICP (rede nacional).
`.trim();

const PROMPT_WHATSAPP_JSON = `
Você é SDR sênior do Azulli, especialista em outbound para MEIs via WhatsApp Business API.

${AZULLI_PRODUTO}

${META_WHATSAPP_DIRETRIZES}

${REGRAS_COPY}

Você receberá a ficha completa do lead captado (Google Maps) em JSON.
Personalize CADA mensagem com os ganchos em "personalizacao.ganchos_obrigatorios".

Retorne APENAS JSON válido:
{
  "mensagem": "1º contato Meta-compliant (2–4 linhas, pede permissão, identifica Azulli, opt-out, SEM pitch comercial)",
  "mensagem_pos_optin": "só após resposta positiva do lead (apresenta Azulli + 1 benefício do segmento + trial 7 dias)",
  "estrutura": {
    "gancho": "abertura personalizada com dado captado",
    "contexto": "por que entrou em contato (factual)",
    "permissao": "pedido de permissão antes de vender",
    "opt_out": "frase de opt-out respeitoso"
  },
  "follow_up": "1 lembrete leve (1–2 linhas), sem pitch comercial repetido",
  "objecoes": [
    { "objecao": "objeção comum", "resposta": "resposta consultiva curta" }
  ],
  "personalizacao_usada": ["liste os ganchos factuais que você usou"],
  "dicas_vendedor": [
    "dica sobre opt-in / Meta",
    "dica sobre personalização deste lead"
  ],
  "conformidade_meta": {
    "identifica_empresa": true,
    "pede_permissao": true,
    "inclui_opt_out": true,
    "sem_links_promocionais_primeiro_contato": true,
    "observacao": "1 frase sobre quando enviar mensagem_pos_optin"
  }
}

Inclua 2 objeções típicas do segmento. "mensagem" NÃO pode conter link, preço ou CTA de cadastro.
`.trim();

const PROMPT_EMAIL_JSON = `
Você é SDR sênior do Azulli escrevendo e-mail frio para MEI/pequena empresa.

${AZULLI_PRODUTO}

${REGRAS_COPY}

Personalize com os ganchos em "personalizacao.ganchos_obrigatorios" (mínimo 2 referências factuais ao negócio captado).
Inclua opt-out no rodapé: "Se preferir não receber e-mails, responda pedindo remoção."

Retorne APENAS JSON válido:
{
  "assunto": "assunto personalizado com nome ou cidade (máx. 60 chars, sem clickbait)",
  "assunto_alternativo": "variante A/B",
  "corpo": "e-mail completo pronto (4–7 linhas, parágrafos com \\n\\n, referências ao negócio captado)",
  "estrutura": {
    "abertura": "saudação + gancho com dado captado",
    "contexto": "motivo do contato",
    "problema": "dor provável do segmento",
    "solucao": "como o Azulli ajuda",
    "beneficios": ["benefício 1", "benefício 2"],
    "cta": "convite gentil",
    "fechamento": "Abraços,\\nTime Azulli"
  },
  "personalizacao_usada": ["ganchos usados"],
  "ps": "P.S. trial 7 dias (1 linha) ou null"
}
`.trim();

module.exports = {
  AZULLI_PRODUTO,
  ICP_DESCRICAO,
  META_WHATSAPP_DIRETRIZES,
  SEGMENTOS_VALIDOS,
  SEGMENTO_BENEFICIOS,
  leadContexto,
  gerarGanchosPersonalizacao,
  PROMPT_SEGMENTO,
  PROMPT_ICP,
  PROMPT_VALIDACAO,
  PROMPT_WHATSAPP_JSON,
  PROMPT_EMAIL_JSON
};
