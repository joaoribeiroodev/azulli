# Deploy em produção — Azulli (ordem correta)

> **Comece por aqui se está confuso:** [`docs/FLUXO_DEPLOY.md`](./FLUXO_DEPLOY.md) — fluxo simples em 4 fases (Vercel + Registro.br).

Guia passo a passo para colocar o Azulli no ar em `use.azulli.app.br` (app) e `azulli.app.br` (marketing), com Asaas, Supabase, Resend e crons.

**Pendências atuais:** [`docs/DEPLOY_PENDENTE.md`](./DEPLOY_PENDENTE.md) — checklist do que falta nos painéis.

**Situação típica:** conta Asaas aprovada, API key e token de webhook já gerados, resto ainda não configurado.

---

## Visão geral (ordem obrigatória)

```
1. Pré-voo local (build)
2. Supabase produção (migrations + conferência)
3. Segredos (CRON_SECRET — webhook token você já tem)
4. Vercel: importar repo + variáveis de ambiente
5. Primeiro deploy
6. Domínios + DNS
7. Supabase Auth (URLs de redirect)
8. Redeploy (se mudou NEXT_PUBLIC_APP_URL)
9. Webhook Asaas (URL pública)
10. Resend (domínio + e-mail)
11. Testes de fumaça em produção
12. Teste de assinatura real (Asaas produção)
```

Não configure o webhook Asaas **antes** do passo 9 — ele precisa de `https://use.azulli.app.br` respondendo.

---

## O que você já deve ter em mãos

| Item | Onde obteve |
|------|-------------|
| API Key Asaas produção | Asaas → Integrações → API (`aact_prod_...`) |
| Token webhook | `npm run generate:secret` (mesmo valor no Asaas e na Vercel) |
| Supabase URL + anon key | Supabase → Project Settings → API |
| Service role key | Supabase → API → `service_role` (só servidor/Vercel) |
| Gemini API key | [Google AI Studio](https://aistudio.google.com/apikey) |
| Resend API key | [resend.com](https://resend.com) |
| Domínios | `azulli.app.br` e `use.azulli.app.br` no registrador |

---

## Passo 1 — Pré-voo local

No projeto, confirme que o build passa:

```bash
npm run build
```

Se falhar, corrija antes do deploy. O dev server (`npm run dev`) não substitui o build de produção.

---

## Passo 2 — Supabase produção

### 2.1 Migrations

Todas as migrations em `supabase/migrations/` devem estar aplicadas no projeto Supabase de **produção** (não só local).

Via CLI (se usa):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ou aplique manualmente no SQL Editor, em ordem (`00001` … `00024`).

**Críticas para go-live:** `00014_subscriptions`, `00021_onboarding`, `00022_account_deletion`, `00023_accountant_role`, `00024_fix_ofx_paid_at`.

### 2.2 Conferência rápida

- [ ] Tabelas `tenants`, `subscriptions`, `asaas_webhook_events` existem
- [ ] Auth habilitado (e-mail/senha)
- [ ] RLS ativo nas tabelas principais

URLs de Auth serão ajustadas no **Passo 7** (depois dos domínios).

---

## Passo 3 — Segredos

### Webhook Asaas (você já tem)

Guarde o valor — vai em:

- Vercel → `ASAAS_WEBHOOK_TOKEN`
- Asaas → Webhooks → autenticação (header `asaas-access-token`)

### CRON_SECRET (gere outro, separado do webhook)

```bash
npm run generate:secret
```

Use só para `CRON_SECRET` na Vercel (crons + tokens de unsubscribe de e-mail).

**Não reutilize** o mesmo token do webhook.

---

## Passo 4 — Vercel: projeto e variáveis

### 4.1 Importar repositório

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Conectar GitHub → repo `azulli`
3. Framework: **Next.js** (detectado automaticamente)
4. **Não** deploy ainda se quiser colocar todas as env vars primeiro (recomendado)

### 4.2 Environment Variables (Production)

Marque **Production**. Preview pode usar as mesmas ou subset.

Copie da tabela abaixo. Valores sensíveis **nunca** no Git.

| Variável | Valor produção | Obrigatório |
|----------|----------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | Sim (webhook Asaas) |
| `NEXT_PUBLIC_APP_URL` | `https://use.azulli.app.br` | Sim |
| `ASAAS_API_KEY` | `aact_prod_...` **sem** `$` | Sim |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` | Sim |
| `ASAAS_WEBHOOK_TOKEN` | token que você gerou | Sim |
| `CRON_SECRET` | outro token (`generate:secret`) | Sim (crons) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | chave Gemini | Sim (OFX + assistente) |
| `GOOGLE_GENERATIVE_AI_ASSISTANT_KEY` | opcional | Não |
| `ASSISTANT_MODE` | `auto` | Recomendado |
| `ASSISTANT_DAILY_LLM_LIMIT` | `15` | Recomendado |
| `RESEND_API_KEY` | chave Resend | Sim (e-mails) |
| `RESEND_FROM_EMAIL` | `Azulli <oi@azulli.app.br>` | Sim |

**Asaas:** chave sandbox + URL sandbox **não** entram em Production.

**Local:** mantenha sandbox no `.env.local` para desenvolvimento.

### 4.3 Validar API Asaas (opcional, no PC)

Temporariamente no `.env.local`:

```env
ASAAS_API_KEY=aact_prod_...
ASAAS_BASE_URL=https://api.asaas.com/v3
```

```bash
npm run test:asaas
```

Esperado: `Ambiente: PRODUÇÃO` e `✅ Asaas API OK`. Depois volte ao sandbox no local.

---

## Passo 5 — Primeiro deploy

1. Vercel → **Deploy** (ou push em `main` se CI conectado)
2. Aguarde build verde
3. URL temporária `https://azulli-xxx.vercel.app` deve abrir (landing ou redirect)

Erro comum: variável `NEXT_PUBLIC_*` faltando → build ou runtime quebrado.

---

## Passo 6 — Domínios e DNS

> **Fluxo resumido:** ver [`FLUXO_DEPLOY.md`](./FLUXO_DEPLOY.md) (Fases B e C).

Um **único** projeto Vercel serve app + marketing.

### 6.1 Guia visual — onde clicar na Vercel

1. Abra [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique no projeto **azulli** (não na conta/equipe)
3. Aba superior **Settings** (Configurações)
4. Menu lateral esquerdo → **Domains** (em “Configuration” / “Configuração”)

Você verá um campo **“Add”** / **“Adicionar”** para digitar o domínio.

**Se não aparece “Domains” em Settings:** na barra lateral do projeto (fora de Settings), procure **Domains** como item direto do projeto — a Vercel muda o layout; o destino é sempre a lista de domínios do projeto.

### 6.2 Configuração mínima (recomendada — sem www)

Para ir ao ar **sem** brigar com apex + www:

| Passo | Na Vercel digite | O que fazer no modal |
|-------|------------------|----------------------|
| 1 | `use.azulli.app.br` | Confirmar. Anotar DNS: **CNAME** `use` → valor da Vercel |
| 2 | `azulli.app.br` | Se perguntar sobre `www`, escolha **só o domínio digitado** / **Add only** — **não** adicione www agora |

Resultado: **2 linhas** na lista de domínios, ambas com status verde (Valid Configuration).

`www.azulli.app.br` **não é obrigatório** para o Azulli funcionar.

### 6.3 Redirect www (opcional — só depois que os 2 estão verdes)

Só faça isso se quiser `www.azulli.app.br` → `azulli.app.br`:

1. Precisa existir **mais de um** domínio na lista (já tem os 2 acima)
2. Na linha de `www.azulli.app.br` (se a Vercel criou ao adicionar apex), clique **⋯** (três pontos) ou **Edit** / **Editar**
3. Campo **Redirect to** / **Redirecionar para** → selecione `azulli.app.br`
4. Salvar

**Não há botão “Redirect” solto** — só aparece ao editar uma linha de domínio, com **mais de um** domínio no projeto.

Se `www` ficou como “principal” e o apex redireciona ao www: edite a linha do **www**, limpe o redirect (ou redirecione www → apex) — como na [comunidade Vercel](https://community.vercel.com/t/domain-redirect-issue/8047).

### 6.4 O que adicionar (resumo)

| Domínio | Função |
|---------|--------|
| `use.azulli.app.br` | App (login, dashboard, billing) |
| `azulli.app.br` | Landing marketing em `/` |

**Não adicione** (evita conflito na Vercel e no DNS):

| Evitar | Por quê |
|--------|---------|
| `www.use.azulli.app.br` | `use` já é subdomínio; `www` em cima é redundante |
| Apex + www manual duplicado | Vercel mostra “sobreposição” se apex e www competem na mesma linha DNS |

Para o **www do marketing** (`www.azulli.app.br`):

1. Adicione primeiro só `azulli.app.br`.
2. Na linha do domínio, use **Edit** → marque **Redirect** de `www.azulli.app.br` → `azulli.app.br` (a Vercel cria o www automaticamente como redirect, não como segundo site).
3. **Não** adicione `www.azulli.app.br` manualmente como domínio “Production” separado se a Vercel já oferece o redirect na mesma linha.

Se já adicionou apex + www e aparece **“sobreposição”**:

1. Vercel → Domains → remova **todos** os custom domains do projeto.
2. Adicione `use.azulli.app.br` → aguarde instruções DNS.
3. Adicione `azulli.app.br` → configure redirect www na UI da Vercel (não duplique entradas).
4. No registrador, apague registros antigos de `@` / `www` / `use` (e `useazulli` legado) antes de criar os novos.

### 6.2 DNS no registrador (zona `azulli.app.br`)

Use **um registro por nome** — tipos diferentes, sem duplicar o mesmo nome:

| Tipo | Nome / host | Valor | Serve |
|------|-------------|--------|--------|
| **A** | `@` (apex) | `76.76.21.21` * | `azulli.app.br` |
| **CNAME** | `www` | `cname.vercel-dns.com` * | `www.azulli.app.br` |
| **CNAME** | `use` | `cname.vercel-dns.com` * | `use.azulli.app.br` |

\* Valores exatos: copie da Vercel em **Domains → cada domínio → DNS Records** (podem ser `cname.vercel-dns-0.com` etc.).

**Erros que causam “sobreposição” ou Invalid Configuration:**

- **A + CNAME no `@`** (apex) ao mesmo tempo — use só **A** no apex.
- Dois **A** no `@` com IPs diferentes.
- **AAAA** antigo no `@` ou `www` — remova se a Vercel pedir.
- **CNAME no `@** quando o registrador já tem A/MX do e-mail — mantenha MX do e-mail; apex só com **A** da Vercel.
- Domínio já em **outro projeto** Vercel — remova do projeto antigo primeiro.

`use` é **subdomínio** (CNAME). `www` é outro subdomínio. O apex `@` é **A record** — não misture com CNAME no mesmo `@`.

### 6.3 Propagação

Pode levar de minutos a 48h. Teste:

```text
https://use.azulli.app.br/login
https://azulli.app.br
https://www.azulli.app.br   → deve redirecionar a azulli.app.br
```

### 6.4 Comportamento esperado

| URL | Host | Comportamento |
|-----|------|----------------|
| `azulli.app.br/` | marketing | Landing |
| `use.azulli.app.br/` | app | Redirect → `/login` ou `/dashboard` |
| `use.azulli.app.br/billing` | app | Planos / assinatura |

Definido em `src/lib/app/domain-hosts.ts` e `src/proxy.ts`.

---

## Passo 7 — Supabase Auth (URLs)

Supabase Dashboard → **Authentication → URL Configuration**

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://use.azulli.app.br` |
| **Redirect URLs** (adicione todas) | |

```
https://use.azulli.app.br/**
https://use.azulli.app.br/auth/callback
https://use.azulli.app.br/auth/confirm
```

Opcional (marketing não faz login, mas não atrapalha):

```
https://azulli.app.br/**
```

### E-mail de recuperação de senha

O link do e-mail Supabase usa `Site URL` + `/auth/confirm`. Por isso `Site URL` deve ser `use.azulli.app.br`.

Fluxo: e-mail → `/auth/confirm?token_hash=...&type=recovery&next=/reset-password` → sessão → reset.

---

## Passo 8 — Redeploy

Se você alterou `NEXT_PUBLIC_APP_URL` ou domínios após o primeiro deploy:

1. Confirme `NEXT_PUBLIC_APP_URL=https://use.azulli.app.br` na Vercel
2. **Deployments → Redeploy** (último deployment, Production)

`NEXT_PUBLIC_*` é embutido no build — mudança exige novo build.

---

## Passo 9 — Webhook Asaas (produção)

Só agora — com `use.azulli.app.br` no ar.

Asaas [asaas.com](https://www.asaas.com) → **Integrações → Webhooks → Adicionar**

| Campo | Valor |
|-------|--------|
| **URL** | `https://use.azulli.app.br/api/webhooks/asaas` |
| **Token de autenticação** | igual `ASAAS_WEBHOOK_TOKEN` na Vercel |
| **Método** | POST |

### Eventos (marque todos)

- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_REFUNDED`
- `SUBSCRIPTION_DELETED`

### Teste no painel

Use “Testar webhook” se existir. Resposta **401** = token diferente entre Asaas e Vercel. **200** = OK.

### O que o webhook faz

Atualiza assinatura e `tier` do tenant no Supabase via `SUPABASE_SERVICE_ROLE_KEY`.

Rota pública (sem login) — protegida só pelo token (`src/app/api/webhooks/asaas/route.ts`).

---

## Passo 10 — Resend (e-mails)

Sem Resend configurado, o app funciona; crons de e-mail falham silenciosamente ou retornam erro.

### 10.1 Domínio

Resend → **Domains → Add** → `azulli.app.br`

Adicione os registros DNS (SPF, DKIM) no registrador. Aguarde verificação.

### 10.2 DMARC (recomendado)

| Tipo | Nome | Valor |
|------|------|--------|
| TXT | `_dmarc.azulli.app.br` | `v=DMARC1; p=none; rua=mailto:oi@azulli.app.br` |

### 10.3 Remetente

`RESEND_FROM_EMAIL` deve usar domínio verificado:

```env
RESEND_FROM_EMAIL="Azulli <oi@azulli.app.br>"
```

---

## Passo 11 — Crons (Vercel)

Já definidos em `vercel.json`:

| Cron | Schedule (UTC) | Rota |
|------|----------------|------|
| Insights semanais | Seg 11:00 | `/api/cron/weekly-insights` |
| Cobrança | Diário 12:00 | `/api/cron/collection-reminders` |
| Trial acabando | Diário 10:00 | `/api/cron/trial-ending` |
| Vencidos | Diário 13:00 | `/api/cron/overdue-alerts` |

Com `CRON_SECRET` na Vercel, a Vercel envia `Authorization: Bearer <CRON_SECRET>` nas invocações agendadas.

### Teste manual

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://use.azulli.app.br/api/cron/trial-ending?dryRun=1"
```

Esperado: JSON com `ok: true`, sem 401/500.

**Plano Vercel:** Cron Jobs exigem plano que suporte crons (Hobby inclui crons com limitações — confira o plano atual).

---

## Passo 12 — Testes em produção

Use o checklist em `SMOKE_TEST.md`, adaptado para produção:

### Rotas críticas (sem 500)

- [ ] `https://azulli.app.br` — landing
- [ ] `https://use.azulli.app.br/login`
- [ ] `https://use.azulli.app.br/register`
- [ ] `https://use.azulli.app.br/dashboard` (logado)
- [ ] `https://use.azulli.app.br/configuracoes`
- [ ] `https://use.azulli.app.br/termos-de-uso`
- [ ] `https://use.azulli.app.br/politica-de-privacidade`

### Auth

- [ ] Cadastro novo usuário
- [ ] Login / logout
- [ ] Esqueci senha → e-mail → `/auth/confirm` → reset

### Billing (produção — dinheiro real)

1. **Configurações → Empresa** — CPF ou CNPJ (PF ok)
2. **Billing** → assinar Pro ou Empresarial
3. Pagar (PIX, boleto ou cartão)
4. Webhook confirma → tier atualiza no dashboard
5. Vercel → Logs → `/api/webhooks/asaas` sem erro

---

## Checklist final (imprimir)

| ⬜ | Passo |
|----|--------|
| ⬜ | `npm run build` OK |
| ⬜ | Migrations Supabase aplicadas |
| ⬜ | Vercel: repo importado |
| ⬜ | Todas env vars Production configuradas |
| ⬜ | Deploy verde |
| ⬜ | `use.azulli.app.br` + `azulli.app.br` no ar |
| ⬜ | Supabase Site URL + Redirect URLs |
| ⬜ | Redeploy após `NEXT_PUBLIC_APP_URL` |
| ⬜ | Webhook Asaas com URL + token + eventos |
| ⬜ | Resend domínio verificado |
| ⬜ | `CRON_SECRET` + teste curl dryRun |
| ⬜ | Smoke test + assinatura real OK |

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---------|--------|---------|
| Login redireciona errado | `NEXT_PUBLIC_APP_URL` errado ou build antigo | Corrigir env + redeploy |
| `callback_failed` | Redirect URL não listada no Supabase | Passo 7 |
| Webhook 401 | Token Asaas ≠ Vercel | Alinhar `ASAAS_WEBHOOK_TOKEN` |
| Plano não muda após pagar | Webhook não chegou ou sem service role | Logs Vercel + `SUPABASE_SERVICE_ROLE_KEY` |
| Asaas API 401 | Chave sandbox em URL produção | `api.asaas.com` + `aact_prod_` |
| E-mails não saem | Resend sem domínio | Passo 10 |
| Cron 401 | `CRON_SECRET` ausente ou errado | Vercel env + redeploy |
| Landing no app host | DNS apontando só um domínio | Passo 6 — dois hostnames no mesmo projeto |

---

## Referências no repositório

| Arquivo | Conteúdo |
|---------|----------|
| `docs/ASAAS_PRODUCAO.md` | Conta Asaas produção (PF/CNPJ) |
| `docs/ASAAS_SANDBOX.md` | Testes locais com sandbox |
| `SMOKE_TEST.md` | Checklist manual detalhado |
| `PRE_DEPLOY.md` | Status features pré-deploy |
| `.env.example` | Lista completa de variáveis |

---

*Última atualização: junho 2026*
