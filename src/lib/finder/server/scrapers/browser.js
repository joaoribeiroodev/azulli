'use strict';

const env = require('../config/env');

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
  '--single-process',
  '--lang=pt-BR'
];

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FINDER_SCRAPE_SERVERLESS === '1'
  );
}

/**
 * Lança browser compatível com Vercel (Chromium serverless) ou dev local (Puppeteer full).
 */
async function launchBrowser() {
  if (isServerlessRuntime()) {
    const chromium = require('@sparticuz/chromium-min');
    const puppeteer = require('puppeteer-core');

    chromium.setGraphicsMode = false;

    const packUrl =
      process.env.CHROMIUM_REMOTE_URL ||
      'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar';

    const executablePath = await chromium.executablePath(packUrl);

    return puppeteer.launch({
      args: [...chromium.args, ...LAUNCH_ARGS],
      defaultViewport: { width: 1366, height: 900 },
      executablePath,
      headless: chromium.headless
    });
  }

  const puppeteer = require('puppeteer');
  return puppeteer.launch({
    headless: env.scrape.headless ? 'new' : false,
    args: LAUNCH_ARGS
  });
}

module.exports = { launchBrowser, isServerlessRuntime, LAUNCH_ARGS };
