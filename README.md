# Azulli

SaaS de gestão financeira e operacional para MEIs e pequenas empresas (Next.js 16 + Supabase).

## Superfícies

| URL | Público |
|-----|---------|
| `azulli.app.br` | Landing marketing |
| `use.azulli.app.br` | App do cliente (assinantes) |
| `admin.azulli.app.br` | Painel operacional interno |
| `finder.azulli.app.br` | Prospecção comercial ([`/finder/`](public/finder/)) — **mesmo deploy Vercel** |

## Desenvolvimento local

```bash
npm install --legacy-peer-deps
npm run dev          # tudo em http://localhost:3000
# Finder UI: http://localhost:3000/finder/
# Finder API: http://localhost:3000/api/finder/health
```

Configure `.env.local` com `DATABASE_URL` (Supabase) e `FINDER_JWT_SECRET`.  
Após migration `00026_finder_schema.sql`: `npm run finder:seed`.

### Azulli Finder

Integrado ao Next.js — **sem Docker**, **mesmo Postgres** (schema `finder`).

Ver [docs/FINDER_DEPLOY.md](docs/FINDER_DEPLOY.md).

## Deploy

- **Tudo (landing + app + admin + finder):** um deploy Vercel — ver [docs/FLUXO_DEPLOY.md](docs/FLUXO_DEPLOY.md) e [docs/FINDER_DEPLOY.md](docs/FINDER_DEPLOY.md)

## Documentação

- [Admin setup](docs/ADMIN_SETUP.md)
- [Deploy produção](docs/DEPLOY_PRODUCAO.md)
- [Integração Finder](docs/FINDER_INTEGRATION_PLAN.md)

---

This is a [Next.js](https://nextjs.org) project. Legacy getting-started notes below.

## Getting Started (Next.js)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
