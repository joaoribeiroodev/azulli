'use strict';

const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const db = require('./config/database');
const aiService = require('./services/aiService');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/searches');
const leadRoutes = require('./routes/leads');
const configRoutes = require('./routes/config');

const app = express();

// ---------- middlewares base ----------
const corsOrigins = [
  env.urls.finderPublic,
  env.urls.admin,
  env.urls.app
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.nodeEnv !== 'production') return callback(null, true);
    if (corsOrigins.some((allowed) => origin.startsWith(allowed.replace(/\/$/, '')))) {
      return callback(null, true);
    }
    return callback(null, true);
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ---------- healthcheck ----------
app.get('/api/health', async (_req, res) => {
  try {
    const dbInfo = await db.healthcheck();
    res.json({
      status: 'ok',
      time: dbInfo.now,
      env: env.nodeEnv,
      ai: aiService.isEnabled() ? 'on' : 'off'
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', erro: err.message });
  }
});

// ---------- APIs ----------
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/searches', searchRoutes);
app.use('/api/leads', leadRoutes);

// ---------- Compatibilidade: endpoint antigo /api/buscar ----------
app.post('/api/buscar', (req, res, next) => {
  req.url = '/';
  searchRoutes.handle(req, res, next);
});

// ---------- 404 + error handler ----------
app.use('/api', notFound);
app.use(errorHandler);

// ---------- bootstrap ----------
async function bootstrap() {
  try {
    await db.healthcheck();
    console.log('[db] conexão ok');
  } catch (err) {
    console.error('[db] FALHA na conexão:', err.message);
    console.error('     verifique DATABASE_URL no .env e se o PostgreSQL está rodando.');
    process.exit(1);
  }

  const PORT = env.port;
  app.listen(PORT, () => {
    const ambiente = (env.nodeEnv || 'development').padEnd(20, ' ');
    const ai = aiService.isEnabled() ? 'ON ' : 'OFF';
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Azulli Finder — Prospecção de Assinantes do Azulli       ║
║   Ferramenta interna do time comercial (SDR/BDR/closer)    ║
║                                                            ║
║   Servidor:  http://localhost:${String(PORT).padEnd(5, ' ')}                       ║
║   Ambiente:  ${ambiente}                          ║
║   IA:        ${ai}                                          ║
╚════════════════════════════════════════════════════════════╝
`);
  });

  process.on('SIGINT', async () => {
    console.log('\n[app] encerrando…');
    await db.close().catch(() => {});
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
}

bootstrap();
