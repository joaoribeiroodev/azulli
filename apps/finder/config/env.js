'use strict';

require('dotenv').config();

function required(name, fallbacks = []) {
  const keys = [name, ...fallbacks];
  for (const key of keys) {
    const v = process.env[key];
    if (v && String(v).trim() !== '') return v;
  }
  throw new Error(`[config] Variável de ambiente obrigatória ausente: ${keys.join(' ou ')}`);
}

function optional(name, fallback) {
  const v = process.env[name];
  return v == null || String(v).trim() === '' ? fallback : v;
}

function bool(name, fallback) {
  const v = process.env[name];
  if (v == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function int(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const host = optional('DB_HOST', 'localhost');
  const port = optional('DB_PORT', '5432');
  const name = optional('DB_NAME', 'postgres');
  const user = optional('DB_USER', 'postgres');
  const pass = optional('DB_PASSWORD', 'postgres');
  return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

const env = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  port: int('PORT', 3000),
  logLevel: optional('LOG_LEVEL', 'info'),

  databaseUrl: buildDatabaseUrl(),

  jwt: Object.freeze({
    get secret() {
      return required('FINDER_JWT_SECRET', ['JWT_SECRET']);
    },
    expiresIn: optional('FINDER_JWT_EXPIRES_IN', optional('JWT_EXPIRES_IN', '7d'))
  }),

  admin: Object.freeze({
    email: optional('FINDER_ADMIN_EMAIL', optional('ADMIN_EMAIL', 'admin@azulli.local')),
    password: optional('FINDER_ADMIN_PASSWORD', optional('ADMIN_PASSWORD', null)),
    nome: optional('FINDER_ADMIN_NOME', optional('ADMIN_NOME', 'Admin Azulli'))
  }),

  openai: Object.freeze({
    apiKey: optional('OPENAI_API_KEY', null),
    model: optional('OPENAI_MODEL', 'gpt-4o-mini')
  }),

  scrape: Object.freeze({
    headless: bool('PUPPETEER_HEADLESS', true),
    timeoutMs: int('SCRAPE_TIMEOUT_MS', 30000)
  }),

  azulliCore: Object.freeze({
    url: optional('AZULLI_CORE_URL', null),
    apiKey: optional('AZULLI_CORE_API_KEY', null)
  }),

  urls: Object.freeze({
    finderPublic: optional('NEXT_PUBLIC_FINDER_URL', null),
    admin: optional('NEXT_PUBLIC_ADMIN_URL', null),
    app: optional('NEXT_PUBLIC_APP_URL', null)
  }),

  platformAdminEmails: optional('PLATFORM_ADMIN_EMAILS', '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
});

module.exports = env;
