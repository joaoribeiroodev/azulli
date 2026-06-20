'use strict';

const env = require('../config/env');

function notFound(_req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  console.error(`[err ${status}] ${req.method} ${req.originalUrl || req.path}: ${err.message}`);
  if (env.nodeEnv !== 'production') {
    console.error(err.stack);
  }
  res.status(status).json({
    erro: err.publicMessage || err.message || 'Erro inesperado',
    detalhe: env.nodeEnv === 'production' ? undefined : err.stack
  });
}

module.exports = { notFound, errorHandler };
