# Deploy — o que falta configurar

Checklist do que **ainda precisa ser feito nos painéis** (Supabase, Asaas, Resend, Vercel). O app já está no ar em:

| URL | Status típico |
|-----|----------------|
| `https://use.azulli.app.br` | App (login, dashboard) |
| `https://azulli.app.br` | Landing marketing |

Guia completo: [`DEPLOY_PRODUCAO.md`](./DEPLOY_PRODUCAO.md). Domínio correto: [`DOMINIO_APP.md`](./DOMINIO_APP.md).

---

## Verificação rápida (no PC)

```bash
npm run test:production
```

Testa rotas públicas, manifest PWA e `sw.js`. Crons e webhook exigem segredos locais (ver abaixo).

---

## 1. Supabase Auth (obrigatório para login/recuperação de senha)

**Supabase Dashboard** → projeto produção → **Authentication** → **URL Configuration**

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://use.azulli.app.br` |

**Redirect URLs** — adicione cada linha (ou use wildcard):

```text
https://use.azulli.app.br/**
https://use.azulli.app.br/auth/callback
https://use.azulli.app.br/auth/confirm
```

Opcional (marketing):

```text
https://azulli.app.br/**
```

**Conferir:** cadastro, login, “Esqueci senha” → e-mail → link abre em `use.azulli.app.br/auth/confirm`.

---

## 2. Migrations no Supabase produção

Todas em `supabase/migrations/` aplicadas em ordem. **Críticas para go-live recente:**

| Migration | Conteúdo |
|-----------|----------|
| `00021_onboarding` | Onboarding |
| `00022_account_deletion` | LGPD / exclusão de conta |
| `00023_accountant_role` | Perfil contador |
| `00024_fix_ofx_paid_at` | Correção OFX `paid_at` |

Via CLI:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Ou SQL Editor, arquivo por arquivo, em ordem.

---

## 3. Vercel — variáveis (Production)

**Settings → Environment Variables → Production**. Conferir que **todas** existem:

| Variável | Valor produção |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (webhook Asaas) |
| `NEXT_PUBLIC_APP_URL` | `https://use.azulli.app.br` |
| `ASAAS_API_KEY` | `aact_prod_...` **sem** `$` |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | token gerado |
| `CRON_SECRET` | **outro** token (`npm run generate:secret`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM_EMAIL` | `Azulli <oi@azulli.app.br>` |
| `ASSISTANT_MODE` | `auto` |
| `ASSISTANT_DAILY_LLM_LIMIT` | `15` |

Detalhes e erros comuns: [`VERCEL_ENV.md`](./VERCEL_ENV.md).

Após mudar `NEXT_PUBLIC_*` → **Deployments → Redeploy** (Production).

---

## 4. Webhook Asaas (obrigatório para assinatura)

Só configure com `https://use.azulli.app.br` no ar.

**Asaas** → Integrações → **Webhooks** → Adicionar

| Campo | Valor |
|-------|--------|
| **URL** | `https://use.azulli.app.br/api/webhooks/asaas` |
| **Token** | igual `ASAAS_WEBHOOK_TOKEN` na Vercel |
| **Método** | POST |

**Eventos:**

- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_REFUNDED`
- `SUBSCRIPTION_DELETED`

**Teste:** painel Asaas “Testar webhook” → esperado **200**. **401** = token diferente entre Asaas e Vercel.

Teste local do token (sem expor no chat):

```bash
# PowerShell — substitua TOKEN
Invoke-WebRequest -Uri "https://use.azulli.app.br/api/webhooks/asaas" -Method POST -Headers @{ "asaas-access-token" = "TOKEN" } -Body "{}" -UseBasicParsing
```

401 sem token correto é esperado; 200 no teste do painel Asaas confirma alinhamento.

---

## 5. Resend (e-mails transacionais e crons)

Sem domínio verificado, e-mails não saem (app funciona).

### 5.1 Verificar domínio

**Resend** → Domains → Add → `azulli.app.br`

No **Registro.br**, adicione os registros que Resend mostra (SPF, DKIM — geralmente TXT/CNAME).

### 5.2 DMARC (recomendado)

| Tipo | Nome | Valor |
|------|------|--------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:oi@azulli.app.br` |

### 5.3 Remetente

Vercel: `RESEND_FROM_EMAIL=Azulli <oi@azulli.app.br>` (domínio verificado).

**Não** misture MX de e-mail corporativo com CNAME no `@` — apex usa **A** da Vercel; registros Resend são subdomínios (`resend._domainkey`, etc.).

---

## 6. Crons Vercel

Definidos em `vercel.json`. Exigem `CRON_SECRET` na Vercel.

| Cron | UTC | Rota |
|------|-----|------|
| Insights semanais | Seg 11:00 | `/api/cron/weekly-insights` |
| Cobrança | Diário 12:00 | `/api/cron/collection-reminders` |
| Trial acabando | Diário 10:00 | `/api/cron/trial-ending` |
| Vencidos | Diário 13:00 | `/api/cron/overdue-alerts` |

Teste manual (substitua `SEU_CRON_SECRET`):

```powershell
Invoke-WebRequest -Uri "https://use.azulli.app.br/api/cron/trial-ending?dryRun=1" -Headers @{ Authorization = "Bearer SEU_CRON_SECRET" } -UseBasicParsing
```

Esperado: JSON com `ok: true`. **401** = `CRON_SECRET` ausente ou errado na Vercel.

---

## 7. DNS (Registro.br) — conferência

| Tipo | Nome | Serve |
|------|------|--------|
| **A** | `@` | `azulli.app.br` → Vercel |
| **CNAME** | `use` | `use.azulli.app.br` → Vercel |

Remova CNAME antigo `useazulli` se ainda existir.

```powershell
nslookup use.azulli.app.br 8.8.8.8
```

---

## 8. Testes finais (produção)

- [ ] `https://azulli.app.br` — landing
- [ ] `https://use.azulli.app.br/login` — login
- [ ] Cadastro + login + logout
- [ ] Esqueci senha → e-mail → reset
- [ ] Dashboard sem erro 500
- [ ] Billing → fluxo assinatura (PIX/boleto/cartão)
- [ ] Webhook Asaas 200 no painel
- [ ] Cron trial-ending dryRun OK
- [ ] PWA: ícone na tela inicial (opcional)

Checklist detalhado: `SMOKE_TEST.md` na raiz do repo.

---

## Ordem recomendada (se ainda não fez)

```
1. Migrations Supabase
2. Vercel env vars + redeploy
3. Supabase Auth URLs
4. Webhook Asaas
5. Resend domínio + DNS
6. Teste cron + smoke test
7. Assinatura real (Asaas produção)
```

---

*Atualizado: junho 2026 — domínio app `use.azulli.app.br`*
