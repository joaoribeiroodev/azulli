'use strict';

const UF_MAP = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
  BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
  PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

/**
 * Extrai (cidade, uf) de uma string de endereço brasileiro.
 * Heurística simples — funciona para formatos comuns do Google Maps:
 *   "Rua X, 123 - Bairro, São Paulo - SP, 01000-000"
 *   "Rua X, 123 - Vila Madalena, São Paulo - SP"
 *   "Av Brasil, 100 - Centro, Rio de Janeiro - RJ"
 */
function parseEndereco(endereco) {
  if (!endereco || typeof endereco !== 'string') return { cidade: null, uf: null, cep: null };

  const cepMatch = endereco.match(/\b(\d{5}-?\d{3})\b/);
  const cep = cepMatch ? cepMatch[1].replace(/(\d{5})(\d{3})/, '$1-$2') : null;

  // procurar padrão "Cidade - UF"
  let uf = null;
  let cidade = null;

  const ufMatch = endereco.match(/-\s*([A-Z]{2})(?=[,\s\b\d-]|$)/);
  if (ufMatch && UF_MAP[ufMatch[1]]) {
    uf = ufMatch[1];
    // pega o trecho antes do "- UF"
    const idx = ufMatch.index;
    const antes = endereco.slice(0, idx).trim().replace(/,\s*$/, '');
    // cidade é o último token entre vírgulas
    const tokens = antes.split(',').map((t) => t.trim()).filter(Boolean);
    if (tokens.length > 0) {
      cidade = tokens[tokens.length - 1];
    }
  }

  return { cidade: cidade || null, uf: uf || null, cep };
}

/**
 * Normaliza telefone para formato apenas com dígitos com DDD.
 * Mantém + se for internacional.
 */
function normalizarTelefone(tel) {
  if (!tel) return null;
  const limpo = String(tel).trim();
  const onlyDigits = limpo.replace(/\D/g, '');
  if (onlyDigits.length === 0) return null;
  return onlyDigits;
}

/**
 * Gera URL de WhatsApp a partir de um telefone brasileiro.
 */
function whatsappLink(tel) {
  const digits = normalizarTelefone(tel);
  if (!digits) return null;
  const comDdi = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${comDdi}`;
}

module.exports = { parseEndereco, normalizarTelefone, whatsappLink, UF_MAP };
