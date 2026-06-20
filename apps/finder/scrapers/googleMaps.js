'use strict';

const puppeteer = require('puppeteer');
const env = require('../config/env');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-extensions',
  '--lang=pt-BR'
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca leads no Google Maps a partir de termo + localização.
 * Retorna array de { nome, telefone, endereco, avaliacao, totalAvaliacoes, mapsUrl }.
 */
async function buscarLeadsGoogleMaps(termo, localizacao) {
  if (!termo || !localizacao) {
    throw new Error('termo e localizacao são obrigatórios');
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: env.scrape.headless ? 'new' : false,
      args: LAUNCH_ARGS
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1366, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' });

    const searchQuery = encodeURIComponent(`${termo} ${localizacao}`);
    const mapsUrl = `https://www.google.com/maps/search/${searchQuery}?hl=pt-BR`;

    console.log(`[scraper] >> ${mapsUrl}`);

    await page.goto(mapsUrl, {
      waitUntil: 'domcontentloaded',
      timeout: env.scrape.timeoutMs
    });

    // Aguardar o feed lateral
    await page
      .waitForSelector('div[role="feed"], [role="main"]', { timeout: 15_000 })
      .catch(() => console.warn('[scraper] feed lateral não detectado, seguindo assim mesmo'));

    // Scroll para carregar mais resultados (lazy loading)
    for (let i = 0; i < 6; i += 1) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, 1200);
        else window.scrollBy(0, 1200);
      });
      await sleep(900);
    }

    const leads = await page.evaluate(() => {
      const TELEFONE_REGEX =
        /(\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4})/;

      const items = Array.from(document.querySelectorAll('div[role="feed"] > div'))
        .filter((el) => el.querySelector('a[href*="/maps/place/"]'));

      const out = [];
      for (const el of items) {
        try {
          const link = el.querySelector('a[href*="/maps/place/"]');
          const nome =
            (link && (link.getAttribute('aria-label') || link.textContent || '').trim()) || '';
          if (!nome) continue;

          const mapsUrl = link ? new URL(link.href, location.origin).toString() : null;

          // avaliação
          let avaliacao = null;
          let totalAvaliacoes = null;
          const ratingNode = el.querySelector('span[role="img"][aria-label*="estrela"]');
          if (ratingNode) {
            const m = ratingNode.getAttribute('aria-label').match(/([\d,]+)\s*estrela/i);
            if (m) avaliacao = parseFloat(m[1].replace(',', '.'));
            const txt = el.textContent || '';
            const totalM = txt.match(/\((\d{1,6})\)/);
            if (totalM) totalAvaliacoes = parseInt(totalM[1], 10);
          }

          const texto = (el.innerText || el.textContent || '');
          const linhas = texto
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

          let telefone = null;
          let endereco = null;
          for (const linha of linhas) {
            if (!telefone) {
              const m = linha.match(TELEFONE_REGEX);
              if (m) telefone = m[0];
            }
            if (
              !endereco &&
              /(rua|av\.?|avenida|travessa|alameda|praça|rod\.?)/i.test(linha) &&
              linha.length > 5 &&
              linha.length < 200
            ) {
              endereco = linha;
            }
          }

          if (!endereco) {
            // fallback: penúltima linha textual longa
            const candidatos = linhas.filter((l) => l.length > 8 && !/\d+\s*(avaliações|reviews)/i.test(l));
            if (candidatos.length > 1) endereco = candidatos[1];
          }

          if (nome && (telefone || endereco)) {
            out.push({
              nome,
              telefone: telefone || null,
              endereco: endereco || null,
              avaliacao,
              totalAvaliacoes,
              mapsUrl
            });
          }
        } catch (e) {
          // ignora item com erro pontual
        }
      }
      return out;
    });

    // Dedup por nome+endereço normalizado
    const seen = new Set();
    const unique = [];
    for (const l of leads) {
      const key = `${(l.nome || '').toLowerCase()}|${(l.endereco || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(l);
    }

    console.log(`[scraper] << ${unique.length} leads únicos`);
    return unique;
  } catch (err) {
    console.error('[scraper] ERRO:', err.message);
    throw new Error(`Falha no scraping do Google Maps: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { buscarLeadsGoogleMaps };
