'use strict';

const env = require('../config/env');
const placesApi = require('./placesApi');
const { buscarLeadsGoogleMaps } = require('./googleMaps');
const { isServerlessRuntime } = require('./browser');

function searchProvider() {
  if (placesApi.isConfigured()) return 'places';
  if (isServerlessRuntime()) return 'none';
  return 'puppeteer';
}

function isSearchConfigured() {
  return placesApi.isConfigured() || !isServerlessRuntime();
}

/**
 * Orquestra a busca de leads: Places API (preferencial) ou Puppeteer (dev local).
 */
async function buscarLeads(termo, localizacao) {
  if (placesApi.isConfigured()) {
    return placesApi.buscarLeadsPlacesApi(termo, localizacao);
  }

  if (isServerlessRuntime()) {
    const err = new Error('Busca sem Places API em serverless');
    err.status = 503;
    err.publicMessage =
      'A busca no Finder em produção exige GOOGLE_PLACES_API_KEY. ' +
      'Adicione a variável na Vercel e ative "Places API (New)" no Google Cloud. ' +
      'O scraping direto do Google Maps não funciona de forma confiável na Vercel.';
    throw err;
  }

  if (env.googlePlaces.allowPuppeteerFallback !== false) {
    return buscarLeadsGoogleMaps(termo, localizacao);
  }

  const err = new Error('Nenhum provedor de busca configurado');
  err.status = 503;
  err.publicMessage = 'Configure GOOGLE_PLACES_API_KEY para habilitar buscas.';
  throw err;
}

module.exports = {
  buscarLeads,
  searchProvider,
  isSearchConfigured
};
