'use strict';

const env = require('../config/env');

const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.websiteUri'
].join(',');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey() {
  return env.googlePlaces.apiKey;
}

function isConfigured() {
  return Boolean(getApiKey());
}

function mapPlace(place) {
  const nome = place.displayName?.text || '';
  const endereco = place.formattedAddress || null;
  const telefone = place.nationalPhoneNumber || null;

  if (!nome || (!telefone && !endereco)) return null;

  return {
    nome,
    telefone,
    endereco,
    avaliacao: place.rating ?? null,
    totalAvaliacoes: place.userRatingCount ?? null,
    mapsUrl: place.googleMapsUri || null,
    website: place.websiteUri || null
  };
}

/**
 * Busca leads via Google Places API (New) — Text Search.
 * Recomendado para produção (Vercel); não depende de Puppeteer.
 */
async function buscarLeadsPlacesApi(termo, localizacao) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('GOOGLE_PLACES_API_KEY não configurada');
    err.status = 503;
    err.publicMessage =
      'Busca indisponível: configure GOOGLE_PLACES_API_KEY na Vercel (Places API New). ' +
      'Veja .env.example para instruções.';
    throw err;
  }

  const textQuery = `${termo} ${localizacao}`.replace(/\s+/g, ' ').trim();
  const all = [];
  let pageToken;

  for (let page = 0; page < 3; page += 1) {
    const body = {
      textQuery,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      pageSize: 20
    };
    if (pageToken) body.pageToken = pageToken;

    console.log(`[places] >> page ${page + 1}: "${textQuery}"`);

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify(body)
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const msg = data.error?.message || data.message || `HTTP ${res.status}`;
      console.error('[places] ERRO:', msg);
      const err = new Error(`Places API: ${msg}`);
      err.status = res.status === 403 || res.status === 401 ? 503 : 502;
      err.publicMessage =
        res.status === 403
          ? 'Chave Google Places sem permissão. Ative "Places API (New)" no Google Cloud Console.'
          : `Erro na Google Places API: ${msg}`;
      throw err;
    }

    for (const place of data.places || []) {
      const mapped = mapPlace(place);
      if (mapped) all.push(mapped);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    await sleep(300);
  }

  const seen = new Set();
  const unique = [];
  for (const l of all) {
    const key = `${l.nome.toLowerCase()}|${(l.endereco || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(l);
  }

  console.log(`[places] << ${unique.length} leads únicos`);
  return unique;
}

module.exports = { buscarLeadsPlacesApi, isConfigured, getApiKey };
