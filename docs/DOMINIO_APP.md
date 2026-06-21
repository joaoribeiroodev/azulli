# Domínio do app: `use.azulli.app.br`

No `.app.br`, com o domínio **`azulli.app.br`**, subdomínios são `algo.azulli.app.br` — **não** `algo.app.br`.

| URL | Função |
|-----|--------|
| `https://azulli.app.br` | Marketing (landing) |
| `https://use.azulli.app.br` | App (login, dashboard, billing) |
| `https://trial.azulli.app.br` | Cadastro trial 7 dias (redireciona para `/register`) |
| `https://admin.azulli.app.br` | Painel operacional interno |
| `https://finder.azulli.app.br` | Ferramenta comercial (time Azulli) |

`useazulli.app.br` **não funciona** sem registrar esse domínio separado. Use `use.azulli.app.br`.

Cookies de sessão usam domínio `.azulli.app.br` para funcionar entre `use` e `trial`.

---

## Registro.br (zona `azulli.app.br`)

Remova o CNAME antigo `useazulli` se existir.

| Tipo | Nome | Destino |
|------|------|---------|
| **A** | `@` | IP da Vercel (apex — `azulli.app.br`) |
| **CNAME** | `use` | `9c3405a15a0010c3.vercel-dns-017.com` (valor da Vercel) |
| **CNAME** | `trial` | mesmo destino da Vercel (cadastro trial) |
| **CNAME** | `admin` | mesmo destino da Vercel |
| **CNAME** | `finder` | mesmo destino da Vercel |

Nome **`use`** apenas — o painel mostrará `use.azulli.app.br`.

---

## Vercel

1. Domains → remover `useazulli.app.br` (se existir)
2. Add → `use.azulli.app.br`, `trial.azulli.app.br`, `admin.azulli.app.br`, `finder.azulli.app.br`
3. Environment → `NEXT_PUBLIC_APP_URL=https://use.azulli.app.br`
4. **Redeploy**

---

## Supabase Auth

- Site URL: `https://use.azulli.app.br`
- Redirect: `https://use.azulli.app.br/**` e `https://trial.azulli.app.br/**`

---

## Asaas webhook

`https://use.azulli.app.br/api/webhooks/asaas`

---

## Teste

```powershell
nslookup use.azulli.app.br 8.8.8.8
nslookup trial.azulli.app.br 8.8.8.8
```

Deve retornar IP. Depois: `https://use.azulli.app.br/login` e `https://trial.azulli.app.br/register`
