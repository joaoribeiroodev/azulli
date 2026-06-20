# Plano de integração — Azulli Finder (unificado)

## Arquitetura atual (pós-unificação App Router)

| Superfície | Host | Runtime |
|---|---|---|
| Landing | `azulli.app.br` | Next.js / Vercel |
| App | `use.azulli.app.br` | Next.js / Vercel |
| Admin | `admin.azulli.app.br` | Next.js / Vercel (`src/app/(admin)/`) |
| **Finder** | `finder.azulli.app.br` | Next.js / Vercel (`src/app/(finder)/finder/`) |

**Um deploy. Um Postgres (Supabase).** Schema `finder.*` isolado do multi-tenant `public.*`.

```
┌─────────────────────────────────────────────────────────┐
│              Next.js (Vercel) — projeto único            │
│  /api/finder/*  ←→  apps/finder/ (lógica JS)          │
│  /finder/*      ←→  App Router + módulos public/finder/js│
│  convert-lead   ←→  public.tenants (mesmo DB, in-process)│
└──────────────────────────┬──────────────────────────────┘
                           │
                    Supabase Postgres
                    ├── public.*  (SaaS multi-tenant)
                    └── finder.*  (time comercial)
```

## UI Finder

- **Shell:** `src/app/(finder)/finder/(shell)/layout.tsx` + `finder-sidebar.tsx` (padrão Admin)
- **Login:** `src/app/(finder)/finder/login/page.tsx` (shadcn + JWT)
- **Páginas:** rotas App Router (`/finder/dashboard`, `/finder/leads`, …) carregam módulos JS existentes
- **Estilos:** tokens globais (`globals.css`) + `public/finder/css/app.css` (componentes Finder)
- **Legacy:** `public/finder/index.html` redireciona para `/finder/dashboard`

## Decisões

| Tópico | Decisão |
|---|---|
| Docker | **Removido** — Finder não roda em container separado |
| Banco | **Supabase Postgres único**, schema `finder` |
| Comunicação | Conversão lead→tenant **in-process** (`convertFinderLead`) |
| Auth Finder | JWT próprio (`finder.users`) — roles comerciais |
| Auth Admin | Supabase + `platform_admins` (inalterado) |
| Deploy | Mesmo `git push` → Vercel de landing/app/admin/finder |

## Setup

1. Aplicar `supabase/migrations/00026_finder_schema.sql`
2. Configurar `DATABASE_URL`, `FINDER_JWT_SECRET` na Vercel
3. `npm run finder:seed` (primeiro admin)
4. Adicionar domínio `finder.azulli.app.br` na Vercel

Ver [`FINDER_DEPLOY.md`](./FINDER_DEPLOY.md).

## Fases posteriores

- SSO Supabase para usuários comerciais
- Google Places API (substituir Puppeteer na Vercel)
- Métricas Finder no painel Admin
- Criação automática de tenant no signup via convite
