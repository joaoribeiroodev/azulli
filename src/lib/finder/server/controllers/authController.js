'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      nome: user.nome,
      email: user.email
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ erro: 'email e password obrigatórios' });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const ok = await User.verifyPassword(user, password);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    await User.touchLogin(user.id);
    const token = signToken(user);

    res.json({
      sucesso: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
