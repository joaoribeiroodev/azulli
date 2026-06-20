'use strict';

const express = require('express');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', ctrl.login);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
