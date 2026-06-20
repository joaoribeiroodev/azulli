'use strict';

const express = require('express');
const ctrl = require('../controllers/searchController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', ctrl.buscar);
router.get('/', ctrl.listar);

module.exports = router;
