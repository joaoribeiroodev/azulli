# Azulli

SaaS de gestão financeira e operacional para **MEIs e pequenas empresas** no Brasil. Um monorepo Next.js com landing, app do assinante, painel admin interno e ferramenta comercial de prospecção (Finder).

**Stack:** Next.js 16 · React 19 · Supabase (Postgres + Auth) · Tailwind CSS 4 · shadcn/ui · Vercel

---

## Índice

- [Superfícies do produto](#superfícies-do-produto)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Desenvolvimento local](#desenvolvimento-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Scripts npm](#scripts-npm)
- [Deploy](#deploy)
- [Documentação](#documentação)
- [Licença](#licença)

---

## Superfícies do produto

Tudo roda em **um único deploy** na Vercel. O roteamento por host é feito em `src/proxy.ts` e `src/lib/app/domain-hosts.ts`.

| Host | Público | Rotas principais |
|------|---------|------------------|
| `azulli.app.br` | Landing marketing | `/` |
| `use.azulli.app.br` | App do cliente (assinantes) | `/dashboard`, `/lancamentos`, `/billing`, … |
| `admin.azulli.app.br` | Painel operacional interno | `/admin`, `/admin/announcements` |
| `finder.azulli.app.br` | Prospecção comercial (SDR/closer) | `/finder/dashboard`, `/finder/leads`, … |
| `trial.azulli.app.br` | Cadastro trial 7 dias (captação) | `/register` → onboarding → app |

Em **localhost**, todas as superfícies ficam em `http://localhost:3000` (sem separação por subdomínio).

---

## Funcionalidades

### App do assinante (`use.azulli.app.br`)

- **Dashboard** — fluxo de caixa, runway, alertas de forecast, gráficos mensais
- **Lançamentos** — receitas/despesas, categorias, importação OFX com categorização por IA
- **Clientes, fornecedores, produtos, funcionários** — cadastros e KPIs por entidade
- **Contador** — visão consolidada para contabilidade
- **Metas e lembretes** — objetivos financeiros e cobranças
- **Assistente** — chat com Gemini (modo auto / rules / llm)
- **Billing** — assinaturas via Asaas (Pro / Enterprise)
- **Configurações** — empresa, equipe, notificações, export LGPD
- **PWA** — instalável no mobile (`public/sw.js`, ícones em `public/pwa/`)

### Admin (`admin.azulli.app.br`)

- Métricas de crescimento (MAU, DAU, MRR, trials)
- Export de tenants em Excel
- Avisos globais (sininho no app)
- Acesso restrito a e-mails em `PLATFORM_ADMIN_EMAILS`

### Finder (`finder.azulli.app.br`)

Ferramenta interna do time comercial para prospectar MEIs e pequenas empresas:

- Busca via **Google Places API**
- Qualificação ICP, kanban, histórico de buscas
- Pitch WhatsApp/e-mail com IA (OpenAI, conformidade Meta)
- Conversão de lead → assinante Azulli
- Schema Postgres isolado: `finder.*` (mesmo Supabase do SaaS)

---

## Arquitetura

```mermaid
flowchart TB
  subgraph vercel [Vercel — deploy único]
    Landing[Landing azulli.app.br]
    App[App use.azulli.app.br]
    Admin[Admin admin.azulli.app.br]
    FinderUI[Finder finder.azulli.app.br]
    API[/api/* — Route Handlers]
    FinderAPI[/api/finder/*]
  end

  subgraph external [Serviços externos]
    Supabase[(Supabase Postgres + Auth)]
    Asaas[Asaas — billing]
    Gemini[Google Gemini — assistente / OFX]
    Resend[Resend — e-mails]
    OpenAI[OpenAI — Finder pitches]
    Places[Google Places — busca leads]
  end

  Landing --> API
  App --> API
  Admin --> API
  FinderUI --> FinderAPI
  API --> Supabase
  FinderAPI --> Supabase
  API --> Asaas
  API --> Gemini
  API --> Resend
  FinderAPI --> OpenAI
  FinderAPI --> Places
```

**Banco de dados (Postgres / Supabase):**

| Schema | Uso |
|--------|-----|
| `public.*` | Multi-tenant do SaaS (RLS por `tenant_id`) |
| `finder.*` | CRM comercial (JWT próprio, sem Supabase Auth) |

**Finder — camadas:**

```
React UI (src/components/finder/)
    → fetch /api/finder/*
Next.js Route Handler (src/app/api/finder/[[...slug]]/)
    → http-bridge.ts (lazy load por rota)
src/lib/finder/server/ (controllers, models, scrapers, IA)
    → Postgres schema finder.*
```

---

## Estrutura do repositório

```
azulli/
├── src/
│   ├── app/                    # App Router (route groups)
│   │   ├── (app)/              # App autenticado do assinante
│   │   ├── (admin)/            # Painel admin
│   │   ├── (finder)/           # Finder comercial
│   │   ├── (auth)/             # Login, registro, reset
│   │   ├── (legal)/            # Termos, privacidade
│   │   └── api/                # Route Handlers (REST, crons, webhooks)
│   ├── components/             # UI compartilhada (shadcn, app, finder, admin)
│   ├── lib/                    # Domínio: billing, financial, email, finder, …
│   └── proxy.ts                # Middleware de hosts / sessão Supabase
├── supabase/migrations/        # SQL versionado (00001 … 00027)
├── scripts/                    # Seeds, testes, PWA, utilitários
├── docs/                       # Guias de deploy e integração
├── public/                     # PWA, service worker, assets estáticos
├── .env.example                # Template de variáveis
├── vercel.json                 # Crons + limites Finder API
└── next.config.ts
```

---

## Pré-requisitos

- **Node.js** 20+ (recomendado LTS)
- **npm** 10+
- Conta **Supabase** (projeto Postgres + Auth)
- Contas opcionais conforme features: Asaas, Resend, Google Gemini, OpenAI, Google Places

---

## Desenvolvimento local

### 1. Clonar e instalar

```bash
git clone https://github.com/joaoribeiroodev/azulli.git
cd azulli
npm install --legacy-peer-deps
```

### 2. Configurar ambiente

```bash
cp .env.example .env.local
```

Preencha pelo menos Supabase e URLs locais. Detalhes na [seção de variáveis](#variáveis-de-ambiente) e em [`.env.example`](.env.example).

### 3. Aplicar migrations no Supabase

Execute os arquivos em `supabase/migrations/` **em ordem numérica** no SQL Editor do Supabase (ou via CLI, se configurado).

Para o Finder, aplique também:

- `00026_finder_schema.sql`
- `00027_finder_perf_indexes.sql`

### 4. Seed do admin Finder (opcional)

```bash
npm run finder:seed
```

Requer `DATABASE_URL`, `FINDER_ADMIN_EMAIL` e `FINDER_ADMIN_PASSWORD` no `.env.local`.

### 5. Subir o servidor

```bash
npm run dev
```

| URL local | Descrição |
|-----------|-----------|
| http://localhost:3000 | Landing + app (conforme rota) |
| http://localhost:3000/login | Login do app |
| http://localhost:3000/dashboard | Dashboard (após login) |
| http://localhost:3000/finder/login | Login do Finder |
| http://localhost:3000/api/finder/health | Healthcheck da API Finder |

**Problemas com cache do Next?**

```bash
npm run dev:clean    # limpa .next e inicia
npm run dev:reset    # mata processos na 3000 + limpa + inicia
```

### 6. Build de produção

```bash
npm run build
npm start
```

---

## Variáveis de ambiente

Copie [`.env.example`](.env.example) para `.env.local`. Resumo das principais:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role — **só servidor** |
| `NEXT_PUBLIC_APP_URL` | Sim | Ex.: `https://use.azulli.app.br` |
| `NEXT_PUBLIC_ADMIN_URL` | Admin | Ex.: `https://admin.azulli.app.br` |
| `NEXT_PUBLIC_FINDER_URL` | Finder | Ex.: `https://finder.azulli.app.br` |
| `NEXT_PUBLIC_TRIAL_URL` | Captação trial | Ex.: `https://trial.azulli.app.br` |
| `ASAAS_API_KEY` | Billing | API Asaas (sem `$` no valor) |
| `ASAAS_BASE_URL` | Billing | Sandbox ou produção |
| `ASAAS_WEBHOOK_TOKEN` | Billing | Token do webhook Asaas |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Assistente/OFX | Gemini |
| `RESEND_API_KEY` | E-mail | Insights semanais, alertas |
| `RESEND_FROM_EMAIL` | E-mail | Remetente verificado |
| `CRON_SECRET` | Crons | `npm run generate:secret` |
| `PLATFORM_ADMIN_EMAILS` | Admin | E-mails com acesso admin |
| `DATABASE_URL` | Finder | Postgres — **porta 6543** (Transaction pooler) na Vercel |
| `FINDER_JWT_SECRET` | Finder | Secret JWT do time comercial |
| `GOOGLE_PLACES_API_KEY` | Finder | Busca de leads em produção |
| `OPENAI_API_KEY` | Finder | Pitches e enriquecimento IA (opcional) |

\* Necessária para admin, conversão de leads e jobs server-side.

**Produção (Vercel):** guia completo em [docs/VERCEL_ENV.md](docs/VERCEL_ENV.md).

**Finder + Postgres serverless:** use o **Transaction pooler** (porta **6543**), não Session pooler (5432), para evitar esgotamento de conexões na Vercel.

---

## Banco de dados e migrations

Migrations versionadas em `supabase/migrations/`:

| Faixa | Conteúdo |
|-------|----------|
| `00001`–`00004` | Schema base, tabelas, RLS |
| `00005`–`00016` | Auth, transações, produtos, OFX |
| `00017`–`00018` | Assistente, forecast |
| `00019`–`00024` | E-mail, onboarding, LGPD, contador |
| `00025` | Admin + avisos globais |
| `00026`–`00027` | Schema Finder + índices de performance |

Políticas **RLS** isolam dados por tenant no schema `public`. O schema `finder` usa autenticação JWT própria.

---

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run dev:clean` | Limpa `.next` e inicia dev |
| `npm run dev:reset` | Mata porta 3000, limpa cache, inicia dev |
| `npm run build` | Build de produção (webpack) |
| `npm start` | Servidor após build |
| `npm run lint` | ESLint |
| `npm run finder:seed` | Cria/atualiza admin do Finder |
| `npm run generate:secret` | Gera secret para crons / JWT |
| `npm run generate:pwa-icons` | Gera ícones PWA a partir do logo |
| `npm run validate:pwa` | Valida assets PWA |
| `npm run test:production` | Smoke test de URLs de produção |
| `npm run test:weekly-insights` | Testa job de insights (dry-run) |
| `npm run test:asaas` | Testa integração Asaas |
| `npm run test:asaas-webhook` | Simula webhook Asaas |

---

## Deploy

**Um projeto Vercel** serve landing, app, admin e Finder.

1. Conectar repositório GitHub à Vercel (Framework: Next.js)
2. Configurar variáveis de ambiente (Production) — ver [docs/VERCEL_ENV.md](docs/VERCEL_ENV.md)
3. Adicionar domínios: `azulli.app.br`, `use.azulli.app.br`, `admin.azulli.app.br`, `finder.azulli.app.br`
4. Aplicar migrations no Supabase
5. Configurar webhook Asaas → `https://use.azulli.app.br/api/webhooks/asaas`
6. Configurar Redirect URLs no Supabase Auth
7. Rodar `npm run finder:seed` (local ou CI) após migration `00026`

**Crons agendados** (`vercel.json`):

| Job | Schedule | Rota |
|-----|----------|------|
| Insights semanais | Seg 11:00 UTC | `/api/cron/weekly-insights` |
| Lembretes de cobrança | Diário 12:00 | `/api/cron/collection-reminders` |
| Trials expirando | Diário 10:00 | `/api/cron/trial-ending` |
| Alertas de inadimplência | Diário 13:00 | `/api/cron/overdue-alerts` |

Guias passo a passo:

- [docs/FLUXO_DEPLOY.md](docs/FLUXO_DEPLOY.md) — fluxo simplificado
- [docs/DEPLOY_PRODUCAO.md](docs/DEPLOY_PRODUCAO.md) — checklist completo
- [docs/FINDER_DEPLOY.md](docs/FINDER_DEPLOY.md) — Finder na Vercel
- [docs/DOMINIO_APP.md](docs/DOMINIO_APP.md) — DNS e subdomínios

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md) | Painel admin e avisos |
| [docs/TRIAL_SUBDOMAIN.md](docs/TRIAL_SUBDOMAIN.md) | Subdomínio de cadastro trial |
| [docs/FINDER_INTEGRATION_PLAN.md](docs/FINDER_INTEGRATION_PLAN.md) | Arquitetura do Finder |
| [docs/FINDER_DEPLOY.md](docs/FINDER_DEPLOY.md) | Deploy do Finder |
| [docs/VERCEL_ENV.md](docs/VERCEL_ENV.md) | Variáveis na Vercel |
| [docs/ASAAS_SANDBOX.md](docs/ASAAS_SANDBOX.md) | Asaas em desenvolvimento |
| [docs/ASAAS_PRODUCAO.md](docs/ASAAS_PRODUCAO.md) | Asaas em produção |
| [docs/DEPLOY_PENDENTE.md](docs/DEPLOY_PENDENTE.md) | Pendências operacionais |
| [PRE_DEPLOY.md](PRE_DEPLOY.md) | Checklist pré-deploy |

---

## Licença

Projeto **privado** — todos os direitos reservados. Uso, cópia e distribuição não autorizados.

---

<p align="center">
  <strong>Azulli</strong> — gestão financeira simples para quem empreende no Brasil.
</p>
