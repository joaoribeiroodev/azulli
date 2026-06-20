'use strict';

const path = require('path');
const { createRequire } = require('module');

/** Carrega módulos CommonJS de apps/finder via process.cwd() (Vercel/serverless). */
module.exports = function loadFinderModule(relativePath) {
  const root = process.cwd();
  const req = createRequire(path.join(root, 'package.json'));
  return req(path.join(root, 'apps/finder', relativePath));
};
