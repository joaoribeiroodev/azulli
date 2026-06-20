# Deploy — Azulli Finder (unificado na Vercel)

O Finder roda **no mesmo projeto Next.js** que landing, app e admin. **Não usa Docker.**

## URLs

| Ambiente | Finder |
|---|---|
| Produção | `https://finder.azulli.app.br` → `/finder/` |
| Local | `http://localhost:3000/finder/` |

API: `/api/finder/*` (JWT próprio do time comercial)

---

## Checklist produção

### 1. Supabase

- [ ] Aplicar `supabase/migrations/00026_finder_schema.sql`
- [ ] Copiar **Connection string** (URI) → `DATABASE_URL` na Vercel

### 2. Vercel — domínio

- [ ] Adicionar `finder.azulli.app.br` ao **mesmo projeto** (CNAME → `cname.vercel-dns.com`)

### 3. Vercel — variáveis

```
DATABASE_URL=postgresql://...
FINDER_JWT_SECRET=<gere com npm run generate:secret>
FINDER_ADMIN_EMAIL=ops@azulli.app.br
FINDER_ADMIN_PASSWORD=<senha-inicial>
NEXT_PUBLIC_FINDER_URL=https://finder.azulli.app.br
NEXT_PUBLIC_ADMIN_URL=https://admin.azulli.app.br
OPENAI_API_KEY=sk-...          # opcional
SUPABASE_SERVICE_ROLE_KEY=...  # já existente
```

### 4. Seed do admin Finder

Local (com `.env.local`):

```bash
npm run finder:seed
```

Ou SQL direto no Supabase após gerar hash bcrypt.

### 5. Validação

- [ ] `GET /api/finder/health` → `{ "status": "ok" }`
- [ ] Login em `/finder/`
- [ ] Link Admin → Finder na sidebar
- [ ] Conversão de lead vincula `public.tenants` (in-process, sem HTTP interno)

---

## Limitação: scraping (Puppeteer)

Busca Google Maps usa Puppeteer (Node). Na Vercel serverless pode falhar ou estourar timeout.

- **Dev local:** funciona normalmente
- **Produção:** se falhar, considerar fase posterior (Google Places API ou worker dedicado)

---

## Rollback

Reverter deploy na Vercel. Schema `finder` no Supabase pode permanecer (não afeta o SaaS).
