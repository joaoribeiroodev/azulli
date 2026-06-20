# Implementation Plan — Azulli Finder

**Projeto**: Azulli Finder — ferramenta interna de **prospecção de assinantes** do SaaS **Azulli** (gestão financeira e operacional para MEIs e pequenas empresas).
**Quem usa**: time comercial do Azulli (SDR, BDR, closer, ops).
**O que descobre**: MEIs e pequenas empresas brasileiras com fit de ICP para se tornarem assinantes.
**Stack**: Node.js + Express + Puppeteer → PostgreSQL + JWT → OpenAI → React + Recharts → Integração com núcleo do Azulli.
**Status**: MVP (Fase 0) concluído. Fase 1 (persistência + auth do time interno) em desenvolvimento.
**Última atualização**: 2026-06-19

---

## Visão geral do roadmap

```
FASE 0 (CONCLUÍDA)
└─ MVP com Google Maps Scraping
   ├─ Backend Express + Puppeteer
   ├─ Frontend HTML + Tailwind
   └─ Exportação Excel (SheetJS)

FASE 1 (EM ANDAMENTO)
└─ Persistência e autenticação do time interno
   ├─ PostgreSQL (single-org, multi-usuário)
   ├─ JWT + roles (admin/sdr/closer/ops)
   ├─ CRUD de leads, ownership por SDR
   └─ Histórico de buscas auditável

FASE 2 (PLANEJADA)
└─ IA: qualificação e abordagem
   ├─ Classificação por segmento
   ├─ ICP score (fit do lead com perfil de assinante Azulli)
   ├─ Pitch de venda Azulli (WhatsApp/Email)
   └─ Validação de dados

FASE 3 (PLANEJADA)
└─ Dashboard comercial em React
   ├─ Pipeline em Kanban (novo → qualificado → contatado → negociação → assinante → descartado)
   ├─ Filtros (segmento, score, UF/cidade, status, responsável)
   ├─ Gráficos (Recharts) de funil, conversão, segmento, geografia
   └─ Exportações em lote

FASE 4 (PLANEJADA)
└─ Integração com o núcleo do Azulli
   ├─ Provisionar workspace + owner ao virar assinante
   ├─ SSO entre Finder e Azulli admin
   ├─ Webhooks de eventos comerciais
   └─ Sync reverso de status (cancelamento, upgrade)

FASE 5 (PLANEJADA)
└─ Enriquecimento e produção
   ├─ Google Places API (substitui scraping)
   ├─ Enriquecimento por CNPJ (BrasilAPI / Receita)
   ├─ Site e redes sociais
   └─ Rate limit, fila de jobs, observabilidade
```

---

## Princípios de design

1. **Single-org, multi-usuário**: existe **uma** organização (Azulli) e vários usuários internos com `role`. Não é multi-tenant.
2. **Ownership de lead**: todo lead tem um **responsável** (SDR/closer). Visibilidade é da empresa toda; edição é do dono ou de admin.
3. **ICP score é o eixo central**: prioriza pipeline, ordena listas, alimenta dashboards.
4. **Conversão = virar assinante**: o evento de sucesso comercial é o lead virar conta paga no Azulli (não virar cliente do MEI).
5. **Provider de busca atrás de interface**: trocar scraping ↔ Places API por env var.
6. **Auditoria mínima**: cada busca, edição e conversão registra `user_id` e timestamp.

---

## Fase 1 — Persistência e autenticação do time interno

### Objetivo

Sair do MVP em memória para um backend persistente, com autenticação dos usuários do time comercial, ownership de leads e histórico auditável.

### Tasks

#### Task 1.1 — PostgreSQL e migrations

**Arquivos**:
- `config/env.js`
- `config/database.js`
- `migrations/001_initial_schema.sql`
- `models/User.js`, `models/Lead.js`, `models/Search.js`
- Atualizar `package.json` com `pg`, `knex`, `dotenv`

**Schema SQL** (single-org, multi-usuário):

```sql
-- Usuários internos do time comercial Azulli
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'sdr',
    -- admin, sdr, bdr, closer, ops, viewer
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buscas executadas pelos SDRs
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  termo VARCHAR(255) NOT NULL,
  localizacao VARCHAR(255) NOT NULL,
  fonte VARCHAR(50) NOT NULL DEFAULT 'google_maps',
    -- google_maps, places_api, manual, import
  total_results INT,
  duracao_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads = MEIs/pequenas empresas candidatos a virarem assinantes do Azulli
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,

  -- Dados do negócio
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(32),
  whatsapp VARCHAR(32),
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(120),
  uf CHAR(2),
  cep VARCHAR(10),
  cnpj VARCHAR(20),

  -- Sinais do Google Maps
  avaliacao DECIMAL(3,1),
  total_avaliacoes INT,
  maps_url TEXT,
  website TEXT,

  -- Inteligência (Fase 2)
  segmento VARCHAR(100),
    -- alimentacao, beleza, automotivo, saude, servicos, varejo, educacao, tech, construcao, outros
  porte VARCHAR(20),
    -- mei, me, pequena, outra
  icp_score INT,
    -- 0–100, fit com perfil ideal de assinante Azulli
  pitch_whatsapp TEXT,
  pitch_email TEXT,
  validado BOOLEAN NOT NULL DEFAULT false,

  -- Pipeline comercial
  status VARCHAR(40) NOT NULL DEFAULT 'novo',
    -- novo, qualificado, contatado, em_negociacao, assinante, descartado
  responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notas TEXT,

  -- Conversão (Fase 4)
  azulli_account_id UUID,    -- preenchido quando vira assinante
  plano_contratado VARCHAR(40),
  data_assinatura TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status        ON leads(status);
CREATE INDEX idx_leads_segmento      ON leads(segmento);
CREATE INDEX idx_leads_uf_cidade     ON leads(uf, cidade);
CREATE INDEX idx_leads_responsavel   ON leads(responsavel_id);
CREATE INDEX idx_leads_icp_score     ON leads(icp_score DESC);
CREATE INDEX idx_searches_user_date  ON searches(user_id, created_at DESC);

-- Dedup robusto: mesmo nome + endereço normalizado = mesmo lead
CREATE UNIQUE INDEX idx_leads_dedup
  ON leads (lower(nome), lower(coalesce(endereco, '')));

-- Histórico de mudanças de status (auditoria)
CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status_anterior VARCHAR(40),
  status_novo VARCHAR(40) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lsh_lead_id ON lead_status_history(lead_id, created_at DESC);
```

**Estimativa**: 6–8 horas.

---

#### Task 1.2 — Autenticação JWT do time interno

**Arquivos**:
- `routes/auth.js`
- `controllers/authController.js`
- `middleware/auth.js`
- `middleware/requireRole.js`
- Adicionar `jsonwebtoken`, `bcryptjs`

**Login do SDR**:

```js
// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1 AND ativo = true',
    [email]
  );
  if (rows.length === 0) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const token = jwt.sign(
    { sub: user.id, role: user.role, nome: user.nome },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    sucesso: true,
    token,
    user: { id: user.id, email: user.email, nome: user.nome, role: user.role }
  });
});

// Cadastro só por admin (sem registro público)
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, nome, role = 'sdr', password } = req.body;
  if (!email || !nome || !password || password.length < 8) {
    return res.status(400).json({ erro: 'email, nome e senha (8+) obrigatórios' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, nome, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nome, role`,
      [email.toLowerCase(), nome, role, hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Email já cadastrado' });
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
```

**Middleware de role**:

```js
// middleware/requireRole.js
module.exports = (...roles) => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ erro: 'Não autenticado' });
  if (!roles.includes(req.auth.role)) {
    return res.status(403).json({ erro: 'Sem permissão' });
  }
  next();
};
```

**Estimativa**: 4–5 horas.

---

#### Task 1.3 — Persistir busca e leads

**Arquivos**:
- `controllers/searchController.js`
- `scrapers/googleMaps.js` (extrair do `server.js`)
- `server.js` (montar routers)

**Lógica**:

```js
// controllers/searchController.js
const db = require('../config/database');
const { buscarLeadsGoogleMaps } = require('../scrapers/googleMaps');

async function buscarLeads(req, res) {
  const { termo, localizacao } = req.body;
  const userId = req.auth.sub;

  if (!termo || !localizacao) {
    return res.status(400).json({ erro: 'termo e localizacao obrigatórios' });
  }

  const inicio = Date.now();
  try {
    const leads = await buscarLeadsGoogleMaps(termo, localizacao);

    const search = await db.query(
      `INSERT INTO searches (user_id, termo, localizacao, total_results, duracao_ms)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, termo, localizacao, leads.length, Date.now() - inicio]
    );
    const searchId = search.rows[0].id;

    // Upsert por (nome, endereço) — não cria duplicado se já existir
    for (const l of leads) {
      await db.query(
        `INSERT INTO leads (search_id, nome, telefone, endereco, avaliacao, maps_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (lower(nome), lower(coalesce(endereco, '')))
         DO UPDATE SET
           telefone   = COALESCE(EXCLUDED.telefone, leads.telefone),
           avaliacao  = COALESCE(EXCLUDED.avaliacao, leads.avaliacao),
           maps_url   = COALESCE(EXCLUDED.maps_url, leads.maps_url),
           updated_at = NOW()`,
        [searchId, l.nome, l.telefone, l.endereco, l.avaliacao, l.maps_url || null]
      );
    }

    res.json({ sucesso: true, searchId, total: leads.length, dados: leads });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { buscarLeads };
```

**Estimativa**: 5–6 horas.

---

#### Task 1.4 — CRUD de leads e ownership

**Endpoints**:
- `GET    /api/leads` — listar com filtros (status, segmento, score mínimo, UF/cidade, responsável, texto)
- `GET    /api/leads/:id`
- `PATCH  /api/leads/:id` — atualizar status, notas, segmento, telefone, email
- `POST   /api/leads/:id/atribuir` — definir responsável (admin pode atribuir a qualquer SDR; SDR pode "pegar" pra si)
- `POST   /api/leads/:id/status` — mudar status + grava histórico em `lead_status_history`
- `DELETE /api/leads/:id` — admin only, soft delete recomendado
- `GET    /api/searches` — minhas buscas / todas (admin)

```js
// routes/leads.js — exemplo de listagem
router.get('/api/leads', requireAuth, async (req, res) => {
  const {
    status, segmento, uf, cidade,
    scoreMin = 0, responsavel, q,
    sort = 'icp_score', dir = 'desc',
    skip = 0, limit = 50
  } = req.query;

  const params = [];
  const where = ['1=1'];

  if (status)     { params.push(status);     where.push(`status = $${params.length}`); }
  if (segmento)   { params.push(segmento);   where.push(`segmento = $${params.length}`); }
  if (uf)         { params.push(uf);         where.push(`uf = $${params.length}`); }
  if (cidade)     { params.push(cidade);     where.push(`cidade ILIKE $${params.length}`); }
  if (responsavel){ params.push(responsavel);where.push(`responsavel_id = $${params.length}`); }
  if (scoreMin)   { params.push(Number(scoreMin)); where.push(`coalesce(icp_score,0) >= $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(nome ILIKE $${params.length} OR endereco ILIKE $${params.length})`);
  }

  const sortable = ['icp_score', 'created_at', 'updated_at', 'avaliacao'];
  const sortCol = sortable.includes(sort) ? sort : 'icp_score';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  params.push(Number(limit), Number(skip));
  const sql = `
    SELECT * FROM leads
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortCol} ${sortDir} NULLS LAST, created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await db.query(sql, params);
  res.json({ leads: rows });
});
```

**Estimativa**: 6–8 horas.

### Subtotal Fase 1: **21–27 horas**

---

## Fase 2 — IA: qualificação e abordagem

### Objetivo

Para cada lead, decidir **se vale a pena abordar** (ICP score) e **como abordar** (pitch personalizado vendendo o Azulli).

### Tasks

#### Task 2.1 — Cliente OpenAI e prompts base

**Arquivos**:
- `config/openai.js`
- `services/aiService.js`
- Adicionar `openai`

```js
// config/openai.js
const OpenAI = require('openai');
module.exports = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

```js
// services/aiService.js
const openai = require('../config/openai');
const MODELO = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const ICP_DESCRICAO = `
Perfil ideal de assinante do Azulli (SaaS de gestão financeira e operacional):
- MEI, ME ou pequena empresa brasileira (até ~30 funcionários)
- Operação simples mas com fluxo recorrente de cobrança/notas
- Geralmente faz controle no papel, planilha ou WhatsApp
- Segmentos prioritários: serviços, beleza, automotivo, alimentação local,
  saúde de bairro, varejo de bairro, pet, cowork, oficinas
- Sinais positivos: avaliações Google ≥ 3.8, telefone visível,
  presença local consistente
- Anti-perfil: grandes redes, franquias nacionais, multinacionais,
  empresas sem operação local
`;

async function classificarSegmento(lead) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0.2,
    max_tokens: 20,
    messages: [
      { role: 'system', content:
        'Você classifica negócios brasileiros em UMA categoria. Responda APENAS a categoria. ' +
        'Possíveis: alimentacao, beleza, automotivo, saude, servicos, varejo, educacao, tech, construcao, outros.'
      },
      { role: 'user', content: `Nome: ${lead.nome}\nEndereço: ${lead.endereco}\nAvaliação: ${lead.avaliacao}` }
    ]
  });
  return r.choices[0].message.content.trim().toLowerCase();
}

async function calcularIcpScore(lead) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0,
    max_tokens: 10,
    messages: [
      { role: 'system', content:
        'Você é analista de aquisição B2B do Azulli. ' +
        'Dada a ficha de um negócio, retorne APENAS um inteiro de 0 a 100 ' +
        'representando o fit do negócio com o ICP do Azulli abaixo.\n\n' + ICP_DESCRICAO
      },
      { role: 'user', content: JSON.stringify(lead) }
    ]
  });
  const n = parseInt(r.choices[0].message.content.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 50 : Math.max(0, Math.min(100, n));
}

async function gerarPitchWhatsApp(lead) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0.7,
    max_tokens: 220,
    messages: [
      { role: 'system', content:
        'Você é SDR do Azulli (SaaS de gestão financeira e operacional para MEIs e pequenas empresas). ' +
        'Escreva uma abordagem CURTA (até 4 linhas) por WhatsApp, em português brasileiro, ' +
        'natural e personalizada, oferecendo o Azulli para este negócio. ' +
        'Cite UM benefício concreto relevante ao segmento (ex.: cobrança recorrente, ' +
        'controle de fluxo de caixa, emissão de nota, agendamento, comissionamento). ' +
        'Termine com convite gentil para conversar — sem CTAs agressivos.'
      },
      { role: 'user', content: JSON.stringify(lead) }
    ]
  });
  return r.choices[0].message.content.trim();
}

async function gerarPitchEmail(lead) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0.6,
    max_tokens: 350,
    messages: [
      { role: 'system', content:
        'Você é SDR do Azulli. Escreva um email curto (assunto + corpo) em pt-BR ' +
        'oferecendo o Azulli para este negócio. Formato:\n' +
        'Assunto: ...\n\nOlá <nome do negócio>,\n<corpo, 4–6 linhas>\n\n<assinatura> Time Azulli'
      },
      { role: 'user', content: JSON.stringify(lead) }
    ]
  });
  return r.choices[0].message.content.trim();
}

async function validarDados(lead) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0,
    max_tokens: 10,
    messages: [
      { role: 'system', content: 'Responda apenas "valido" ou "invalido" se a ficha parece um negócio real e abordável.' },
      { role: 'user', content: JSON.stringify(lead) }
    ]
  });
  return r.choices[0].message.content.trim().toLowerCase() === 'valido';
}

module.exports = {
  classificarSegmento, calcularIcpScore,
  gerarPitchWhatsApp, gerarPitchEmail, validarDados
};
```

**Estimativa**: 4–5 horas.

---

#### Task 2.2 — Pipeline de enriquecimento por IA

Após cada busca, processar leads em **background**:

1. Para cada lead novo: `validarDados` → `classificarSegmento` → `calcularIcpScore` → `gerarPitchWhatsApp` (email é gerado sob demanda).
2. `UPDATE leads SET segmento, icp_score, pitch_whatsapp, validado WHERE id = ...`.
3. Persistir uso de tokens em `ai_usage` para acompanhar custo.

**Schema adicional**:

```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  acao VARCHAR(40) NOT NULL,
    -- segmento, icp_score, pitch_whatsapp, pitch_email, validacao
  modelo VARCHAR(40) NOT NULL,
  tokens_in INT,
  tokens_out INT,
  custo_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_lead_date ON ai_usage(lead_id, created_at DESC);
```

Em produção (Fase 5) isso vira fila `bullmq`. Até lá, um worker simples in-memory (fila com debounce + retry) basta.

**Estimativa**: 5–6 horas.

---

#### Task 2.3 — Endpoints sob demanda

- `POST /api/leads/:id/regerar-pitch?canal=whatsapp|email`
- `POST /api/leads/:id/reavaliar-icp` — recalcula score (ex.: depois que enriqueceu CNPJ)

**Estimativa**: 2–3 horas.

### Subtotal Fase 2: **11–14 horas**

---

## Fase 3 — Dashboard comercial em React

### Objetivo

Substituir o HTML estático por um SPA dedicado ao **dia a dia do time comercial**: pipeline em Kanban, busca rápida, filtros e métricas de funil.

### Stack

- **React 18 + Vite + TypeScript**
- **Tailwind**
- **TanStack Query** (cache do server state)
- **React Router**
- **Recharts** (gráficos)
- **dnd-kit** (Kanban)

### Tasks

#### Task 3.1 — Bootstrap do frontend

```
frontend/
├── src/
│   ├── api/             # cliente axios + interceptors JWT
│   ├── components/      # SearchForm, LeadsTable, LeadCard,
│   │                    # KanbanBoard, FunnelChart, FilterBar
│   ├── pages/           # Login, Buscar, Pipeline, Leads, LeadDetail, Equipe
│   ├── hooks/           # useAuth, useLeads, useSearches
│   └── App.tsx
├── index.html
├── vite.config.ts
└── package.json
```

**Estimativa**: 12–16 horas.

#### Task 3.2 — Pipeline em Kanban

- Colunas: **novo → qualificado → contatado → em_negociacao → assinante → descartado**
- Drag-and-drop atualiza `status` via `POST /api/leads/:id/status` (grava histórico).
- Card mostra: nome, segmento, ICP score (badge colorida), telefone (`tel:`), WhatsApp (`wa.me`), responsável.
- Atalhos: copiar pitch WhatsApp, abrir Maps, atribuir/pegar lead.

**Estimativa**: 8–10 horas.

#### Task 3.3 — Filtros e busca

- Filtros: status (multi), segmento (multi), UF, cidade, score mínimo (slider 0–100), responsável, texto.
- Filtros persistidos na URL (queryString).
- Salvar filtros favoritos por usuário (Fase 3.5).

**Estimativa**: 5–7 horas.

#### Task 3.4 — Gráficos

- **Funil**: novo → ... → assinante (taxas entre etapas).
- **Conversão por segmento** (barras).
- **Conversão por UF/cidade** (barras horizontais top 10).
- **Score médio** por segmento (radar ou barras).
- **Performance por responsável** (tabela + barra de progresso).

**Estimativa**: 6–8 horas.

#### Task 3.5 — Exportação em lote

- Seleção via checkbox.
- Botão **Exportar selecionados** (Excel / CSV / JSON).
- Inclui (opcional): pitch, score, histórico.

**Estimativa**: 3–4 horas.

### Subtotal Fase 3: **34–45 horas**

---

## Fase 4 — Integração com o núcleo do Azulli

### Objetivo

Quando um lead vira **assinante**, o Finder dispara automaticamente a criação da conta no Azulli (workspace + owner + plano), e o time comercial passa a ver no Finder o que está acontecendo com aquele cliente.

> A camada de cobrança/financeiro está fora do escopo deste módulo — o Azulli tem seu próprio módulo financeiro no núcleo do produto.

### Tasks

#### Task 4.1 — Cliente HTTP para o Azulli core

**Arquivos**:
- `services/azulliCore.js`
- `config/azulli.js`

```js
// services/azulliCore.js
const axios = require('axios');

const client = axios.create({
  baseURL: process.env.AZULLI_CORE_URL,
  timeout: 10_000,
  headers: { 'X-API-Key': process.env.AZULLI_CORE_API_KEY }
});

async function provisionarAssinante({ lead, plano, ownerEmail }) {
  const payload = {
    workspace: {
      nome: lead.nome,
      cnpj: lead.cnpj || null,
      endereco: lead.endereco,
      cidade: lead.cidade,
      uf: lead.uf,
      cep: lead.cep
    },
    owner: {
      nome: lead.responsavel_nome_contato || lead.nome,
      email: ownerEmail,
      telefone: lead.telefone || lead.whatsapp
    },
    plano,
    origem: 'azulli-finder',
    metadata: {
      lead_id: lead.id,
      icp_score: lead.icp_score,
      segmento: lead.segmento,
      sdr_id: lead.responsavel_id
    }
  };
  const { data } = await client.post('/v1/workspaces/provisionar', payload);
  return data; // { workspace_id, owner_user_id }
}

module.exports = { provisionarAssinante };
```

**Estimativa**: 4–6 horas.

#### Task 4.2 — Endpoint "converter lead em assinante"

`POST /api/leads/:id/converter`

```js
router.post('/api/leads/:id/converter', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { plano, ownerEmail } = req.body;
  if (!plano || !ownerEmail) return res.status(400).json({ erro: 'plano e ownerEmail obrigatórios' });

  const { rows } = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Lead não encontrado' });
  const lead = rows[0];

  const result = await provisionarAssinante({ lead, plano, ownerEmail });

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE leads
       SET azulli_account_id = $1,
           plano_contratado  = $2,
           data_assinatura   = NOW(),
           status            = 'assinante',
           updated_at        = NOW()
       WHERE id = $3`,
      [result.workspace_id, plano, id]
    );
    await tx.query(
      `INSERT INTO lead_status_history (lead_id, user_id, status_anterior, status_novo, motivo)
       VALUES ($1, $2, $3, 'assinante', $4)`,
      [id, req.auth.sub, lead.status, `Convertido pelo SDR — plano ${plano}`]
    );
  });

  await emit('lead.subscribed', { leadId: id, workspaceId: result.workspace_id });
  res.json({ sucesso: true, workspaceId: result.workspace_id });
});
```

**Estimativa**: 4–5 horas.

#### Task 4.3 — SSO entre Finder e Azulli admin

- Aceitar JWT emitido pelo Azulli admin (mesma `JWT_SECRET` ou chave assimétrica).
- Mapear `role` do Azulli admin para `role` do Finder (admin → admin, comercial → sdr/closer).
- Logout único.

**Estimativa**: 4–6 horas.

#### Task 4.4 — Webhooks e eventos comerciais

Tabela:

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  evento VARCHAR(60) NOT NULL,
    -- lead.created, lead.qualified, lead.contacted, lead.subscribed, lead.churned
  secret VARCHAR(120),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Worker emite POST assinado (HMAC-SHA256, header `X-Azulli-Signature`).
- Retry exponencial (3 tentativas, base 2s).
- Casos de uso: alimentar email marketing, retargeting, BI, alerts no Slack do time.

**Estimativa**: 6–8 horas.

#### Task 4.5 — Sync reverso de status

Webhook receptor `POST /api/webhooks/azulli-core` para eventos vindos do núcleo Azulli:
- `workspace.upgraded` → atualiza `plano_contratado`.
- `workspace.churned` → marca o lead como `descartado` com motivo `churn` (e dispara evento `lead.churned`).

**Estimativa**: 3–4 horas.

### Subtotal Fase 4: **21–29 horas**

---

## Fase 5 — Enriquecimento e produção

### Objetivo

Sair do scraping puro e ganhar robustez para escalar.

### Tasks

#### Task 5.1 — Adapter Google Places API

- `scrapers/places.js` com o mesmo contrato de `googleMaps.js`.
- Feature flag `SEARCH_PROVIDER=places|scrape`.
- Mais campos: `place_id`, `website`, `horario`, `tipos`, `fotos`.

**Estimativa**: 6–8 horas.

#### Task 5.2 — Enriquecimento por CNPJ (BrasilAPI/Receita)

- Quando o lead expõe CNPJ (no site, no Maps, no Insta), buscar:
  - razão social, capital social, situação, CNAE principal, sócios, data de abertura.
- Persistir em `leads.cnpj_data` (JSONB) e re-rodar `calcularIcpScore`.

**Estimativa**: 5–7 horas.

#### Task 5.3 — Site e redes sociais

- A partir de nome + cidade, descobrir:
  - site oficial (via SERP)
  - Instagram e Facebook business
- Persistir em `leads.web` (JSONB).

**Estimativa**: 4–6 horas.

#### Task 5.4 — Rate limit, fila de jobs e observabilidade

- `express-rate-limit` por IP/usuário.
- `bullmq` + Redis para scraping/IA em background.
- Logging com `pino`.
- Métricas Prometheus (`/metrics`).
- Healthcheck `/health`.

**Estimativa**: 8–10 horas.

### Subtotal Fase 5: **23–31 horas**

---

## Estrutura final do projeto

```
azulli-finder/
├── config/
│   ├── env.js
│   ├── database.js
│   ├── openai.js
│   └── azulli.js
├── controllers/
│   ├── authController.js
│   ├── searchController.js
│   ├── leadController.js
│   └── conversionController.js
├── middleware/
│   ├── auth.js
│   ├── requireRole.js
│   └── rateLimit.js
├── models/
│   ├── User.js
│   ├── Search.js
│   └── Lead.js
├── routes/
│   ├── auth.js
│   ├── searches.js
│   ├── leads.js
│   └── webhooks.js
├── scrapers/
│   ├── googleMaps.js
│   └── places.js
├── services/
│   ├── aiService.js
│   ├── azulliCore.js
│   ├── events.js
│   └── webhooks.js
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_ai_usage.sql
│   └── 003_webhooks.sql
├── frontend/                  # SPA React (Fase 3)
├── tests/
├── server.js
├── package.json
└── .env
```

---

## Variáveis de ambiente

`.env.example`:

```env
# App
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/azulli_finder

# Auth (time interno)
JWT_SECRET=troque-este-valor-em-producao
JWT_EXPIRES_IN=7d

# OpenAI (Fase 2)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Integração com o núcleo do Azulli (Fase 4)
AZULLI_CORE_URL=https://api.azulli.local
AZULLI_CORE_API_KEY=troque-este-valor

# Provider de busca (Fase 5)
SEARCH_PROVIDER=scrape          # ou "places"
GOOGLE_PLACES_API_KEY=

# Redis (Fase 5)
REDIS_URL=redis://localhost:6379
```

---

## Estimativas totais

| Fase | Escopo | Horas | Semanas (1 dev) |
|---|---|---|---|
| 1 | Persistência + auth do time interno | 21–27 | 1–1.5 |
| 2 | IA (ICP score + pitch de venda Azulli) | 11–14 | 0.5–1 |
| 3 | Dashboard React + Kanban comercial | 34–45 | 2–2.5 |
| 4 | Integração com o núcleo Azulli (provisionar assinante) | 21–29 | 1–1.5 |
| 5 | Places API + enriquecimento + produção | 23–31 | 1–1.5 |
| **Total** | Ferramenta de aquisição pronta para produção | **110–146** | **6–8 semanas** |

---

## Notas técnicas

### Sobre scraping × Places API

O scraping atual é adequado para **MVP e validação**. Para produção estável e juridicamente segura, **a Fase 5 migra para a Google Places API**. Mantenha as duas implementações por trás do mesmo contrato (`buscarLeads(termo, localizacao)`) e troque por env.

### Custo de IA (Fase 2)

Estimativas com `gpt-4o-mini`:

| Ação | Tokens médios | Custo por 100 leads |
|---|---|---|
| Validar dados        | ~150 in / 5 out  | ~$0.005 |
| Classificar segmento | ~120 in / 10 out | ~$0.005 |
| ICP score            | ~250 in / 5 out  | ~$0.010 |
| Pitch WhatsApp       | ~250 in / 200 out| ~$0.060 |

→ Enriquecer **100 leads** completos (validar + segmento + score + pitch WhatsApp): **~$0.08**.

### Rate limit do scraping

- 1 busca a cada 5–10s por usuário/IP.
- Após Fase 5: fila com Redis + worker dedicado, evitando bloqueios.

---

## Workflow com Cursor

1. Abra este arquivo no Cursor.
2. Selecione **uma** task.
3. Use o template de prompt em [`CURSOR_WORKFLOW.md`](./CURSOR_WORKFLOW.md).
4. Revise, teste, commite.
5. Só então parta para a próxima.

Exemplo de prompt curto:

```
@file implementation_plan.md
Implemente a Task 1.1 (PostgreSQL e migrations).
Crie: config/env.js, config/database.js, migrations/001_initial_schema.sql,
models/User.js, models/Search.js, models/Lead.js.
Sem ORM pesado, use pg + knex. Single-org, multi-usuário (sem workspace_id).
Código completo, sem omissões.
```

---

## Checklist de produção

- [ ] `.env` com `JWT_SECRET` forte
- [ ] PostgreSQL com backup automático
- [ ] Migrations aplicadas e versionadas
- [ ] Rate limit ativo por usuário/IP
- [ ] Logs estruturados (`pino`) + agregação
- [ ] Healthcheck `/health` e métricas `/metrics`
- [ ] Integração com Azulli core validada em staging
- [ ] Migração para Google Places API concluída
- [ ] LGPD: política de prospecção B2B documentada, opt-out rápido
- [ ] Testes de carga cobrindo busca + enriquecimento

---

## Recursos

- **PostgreSQL**: https://www.postgresql.org/docs/
- **node-postgres**: https://node-postgres.com/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Google Places API**: https://developers.google.com/maps/documentation/places/web-service
- **BrasilAPI (CNPJ)**: https://brasilapi.com.br/docs#tag/CNPJ
- **bullmq**: https://docs.bullmq.io/
- **Recharts**: https://recharts.org/

---

**Mantido por**: time Azulli
**Stack**: Node.js + PostgreSQL + OpenAI + React
