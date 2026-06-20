'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function extractToken(req) {
  const headers = req.headers;
  const h =
    headers.authorization ||
    (typeof headers.get === 'function' ? headers.get('authorization') : null);
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  if (req.query && req.query.token) return req.query.token;
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente' });
  }
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.auth = {
      sub: decoded.sub,
      role: decoded.role,
      nome: decoded.nome,
      email: decoded.email
    };
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.auth = {
      sub: decoded.sub,
      role: decoded.role,
      nome: decoded.nome,
      email: decoded.email
    };
  } catch {
    /* segue sem auth */
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
