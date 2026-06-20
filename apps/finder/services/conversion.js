'use strict';

const env = require('./env');
const azulliCore = require('./azulliCore');

/**
 * Converte lead no núcleo Azulli.
 * No monorepo unificado (Next.js), usa callback in-process registrada em register-conversion.
 * Fallback HTTP apenas se AZULLI_CORE_URL estiver definido (legado).
 */
async function convertLead(payload) {
  if (typeof globalThis.__AZULLI_FINDER_CONVERT__ === 'function') {
    return globalThis.__AZULLI_FINDER_CONVERT__(payload);
  }
  if (azulliCore.isConfigured()) {
    return azulliCore.converterLead(payload);
  }
  const err = new Error(
    'Conversão indisponível: rode via Next.js unificado ou configure AZULLI_CORE_URL.'
  );
  err.status = 503;
  throw err;
}

module.exports = { convertLead };
