'use strict';

const OpenAI = require('openai');
const env = require('./env');

let client = null;

function getClient() {
  if (!env.openai.apiKey) return null;
  if (client) return client;
  client = new OpenAI({ apiKey: env.openai.apiKey });
  return client;
}

function isEnabled() {
  return Boolean(env.openai.apiKey);
}

module.exports = { getClient, isEnabled, model: env.openai.model };
