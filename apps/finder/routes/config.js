'use strict';

const express = require('express');
const env = require('../config/env');
const aiService = require('../services/aiService');
const azulliCore = require('../services/azulliCore');
const { PLANS } = require('../config/plans');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (_req, res) => {
  res.json({
    app: 'Azulli Finder',
    plans: Object.values(PLANS),
    ai: aiService.isEnabled(),
    integration: {
      azulliCore: azulliCore.isConfigured()
    },
    urls: {
      admin: env.urls.admin,
      app: env.urls.app,
      finder: env.urls.finderPublic
    }
  });
});

module.exports = router;
