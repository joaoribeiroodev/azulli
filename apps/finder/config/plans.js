'use strict';

/**
 * Planos do Azulli — espelho de src/lib/billing/plans.ts (fonte de verdade no SaaS).
 * Mantido em JS para o Express; atualizar manualmente quando preços mudarem.
 */
const PLANS = Object.freeze({
  pro: Object.freeze({
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    description: 'Pra MEI e pequenas empresas que querem organizar tudo.'
  }),
  enterprise: Object.freeze({
    id: 'enterprise',
    name: 'Empresarial',
    price: 47.99,
    highlight: true,
    description: 'Pra empresas com equipe e volume maior de operações.'
  })
});

const PLAN_IDS = Object.freeze(['pro', 'enterprise']);

function isValidPlanId(id) {
  return PLAN_IDS.includes(id);
}

function getPlan(id) {
  return PLANS[id] || null;
}

function formatPlanPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

module.exports = {
  PLANS,
  PLAN_IDS,
  isValidPlanId,
  getPlan,
  formatPlanPrice
};
