'use strict';

const env = require('../config/env');

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FINDER_SCRAPE_SERVERLESS === '1'
  );
}

function isPlacesConfigured() {
  return Boolean(env.googlePlaces?.apiKey);
}

function searchProvider() {
  if (isPlacesConfigured()) return 'places';
  if (isServerlessRuntime()) return 'none';
  return 'puppeteer';
}

function isSearchConfigured() {
  return isPlacesConfigured() || !isServerlessRuntime();
}

module.exports = {
  isServerlessRuntime,
  isPlacesConfigured,
  searchProvider,
  isSearchConfigured,
};
