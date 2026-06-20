'use strict';

const User = require('../models/User');

async function list(_req, res, next) {
  try {
    const users = await User.list({ ativo: null });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { email, password, nome, role } = req.body || {};
    const user = await User.create({ email, password, nome, role });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }
    if (/inválida|obrigatórios|caracteres/.test(err.message)) {
      return res.status(400).json({ erro: err.message });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, role, ativo, password } = req.body || {};
    const user = await User.update(id, { nome, role, ativo, password });
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ user });
  } catch (err) {
    if (/inválida|caracteres/.test(err.message)) {
      return res.status(400).json({ erro: err.message });
    }
    next(err);
  }
}

module.exports = { list, create, update };
