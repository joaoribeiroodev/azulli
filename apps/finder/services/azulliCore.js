'use strict';

const env = require('../config/env');

function isConfigured() {
  return Boolean(env.azulliCore.url && env.azulliCore.apiKey);
}

/**
 * Vincula lead qualificado a um tenant existente no SaaS Azulli.
 * @returns {Promise<object>} resposta da API interna
 */
async function converterLead({ finderLeadId, email, nome, telefone, cnpj, plano }) {
  if (!isConfigured()) {
    const err = new Error(
      'Integração com o Azulli não configurada. Defina AZULLI_CORE_URL e AZULLI_CORE_API_KEY.'
    );
    err.status = 503;
    throw err;
  }

  const base = env.azulliCore.url.replace(/\/$/, '');
  const url = `${base}/api/internal/finder/convert-lead`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.azulliCore.apiKey}`
    },
    body: JSON.stringify({
      finderLeadId,
      email: email || null,
      nome,
      telefone: telefone || null,
      cnpj: cnpj || null,
      plano
    })
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!res.ok) {
    const err = new Error(payload?.erro || payload?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

module.exports = {
  isConfigured,
  converterLead
};
