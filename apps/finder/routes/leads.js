'use strict';

const express = require('express');
const ctrl = require('../controllers/leadController');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);
router.patch('/:id', ctrl.atualizar);
router.delete('/:id', requireRole('admin'), ctrl.excluir);

router.post('/:id/status', ctrl.trocarStatus);
router.post('/:id/atribuir', ctrl.atribuir);
router.post('/:id/pegar', ctrl.pegarParaMim);
router.post('/:id/enriquecer', ctrl.reEnriquecer);
router.post('/:id/pitch', ctrl.regerarPitch);
router.post('/:id/converter', requireRole('admin', 'closer'), ctrl.converter);

module.exports = router;
