'use strict';

const express = require('express');
const ctrl = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('admin'), ctrl.create);
router.patch('/:id', requireRole('admin'), ctrl.update);

module.exports = router;
