# Subdomínio de cadastro trial — `trial.azulli.app.br`

URL dedicada para captar leads e iniciar o **trial de 7 dias** sem passar pela landing.

| Ambiente | URL |
|----------|-----|
| Produção | `https://trial.azulli.app.br` → redireciona para `/register` |
| Local | `http://localhost:3000/register` (sem subdomínio; configure `NEXT_PUBLIC_TRIAL_URL` só em produção) |

Use em anúncios, WhatsApp, Instagram e bio:

```text
https://trial.azulli.app.br
```

---

## Fluxo do usuário

1. Acessa `trial.azulli.app.br` → formulário de cadastro
2. Cria conta → onboarding no mesmo subdomínio
3. Ao concluir onboarding → redirecionado para `use.azulli.app.br/dashboard`
4. Sessão compartilhada entre subdomínios (cookie `.azulli.app.br`)

A landing (`azulli.app.br`) continua existindo; os CTAs **“Começar trial”** apontam para o subdomínio quando `NEXT_PUBLIC_TRIAL_URL` está configurado.

---

## Checklist Vercel + DNS

### 1. Domínio na Vercel

No **mesmo projeto** do Azulli:

- Adicionar `trial.azulli.app.br`

### 2. DNS (Registro.br)

| Tipo | Nome | Valor |
|------|------|-------|
| CNAME | `trial` | `cname.vercel-dns.com` |

### 3. Variável de ambiente

```text
NEXT_PUBLIC_TRIAL_URL=https://trial.azulli.app.br
```

Production + Preview (se quiser testar preview com subdomínio custom).

**Redeploy obrigatório** após adicionar `NEXT_PUBLIC_*`.

---

## Supabase Auth

Em **Authentication → URL Configuration**, incluir:

```text
https://trial.azulli.app.br/auth/callback
https://trial.azulli.app.br/auth/confirm
https://trial.azulli.app.br/**
```

Mantenha também as URLs de `use.azulli.app.br` e `admin.azulli.app.br`.

**Site URL** principal continua:

```text
https://use.azulli.app.br
```

---

## Rotas permitidas no subdomínio trial

| Rota | Visitante | Logado |
|------|-----------|--------|
| `/` | → `/register` | → `/onboarding` ou app |
| `/register` | Cadastro | → onboarding / app |
| `/login` | Login (redireciona para app se já logado) | — |
| `/onboarding` | — | Wizard inicial |
| `/billing` | — | Upgrade pós-trial |
| `/dashboard`, `/lancamentos`, … | → `/register` | → `use.azulli.app.br` |

---

## Sessão entre subdomínios

Em produção, cookies Supabase usam `domain=.azulli.app.br` para o login valer em `trial` e `use`.

Em **localhost** não há domínio compartilhado — use `/register` normal.

---

## Links úteis

- App: `NEXT_PUBLIC_APP_URL` → `https://use.azulli.app.br`
- Trial: `NEXT_PUBLIC_TRIAL_URL` → `https://trial.azulli.app.br`
- Landing CTAs: gerados por `src/lib/app/public-urls.ts`
