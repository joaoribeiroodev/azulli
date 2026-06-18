# Variáveis de ambiente na Vercel (sem erro)

Erros ao **salvar** na Vercel quase sempre são formato do valor, `$` na chave Asaas ou aspas no e-mail.

---

## Regras gerais

1. **Sem aspas** nos valores (exceto se a Vercel pedir — em geral não use `"`).
2. **Sem espaço** antes/depois do valor.
3. URLs sempre com `https://` e **sem** barra no final.
4. Variáveis **opcionais vazias** → **delete** a linha; não deixe valor vazio.
5. Marque **Sensitive** em chaves secretas.
6. Scope: **Production** (e Preview se quiser).

---

## Valores corretos (copiar o formato)

| Variável | Valor exemplo | Erro comum |
|----------|---------------|------------|
| `NEXT_PUBLIC_APP_URL` | `https://use.azulli.app.br` | `use.azulli.app.br` sem https, ou barra no final |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | http em vez de https |
| `ASAAS_API_KEY` | `aact_prod_xxxxxxxx` | **Não** use `$` no início — Vercel interpreta `$` como outra variável |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` | URL sandbox em Production |
| `RESEND_FROM_EMAIL` | `Azulli <oi@azulli.app.br>` | Aspas em volta: `"Azulli <oi@...>"` |
| `ASSISTANT_MODE` | `auto` | Valor diferente de `auto`, `llm`, `rules` |
| `ASSISTANT_DAILY_LLM_LIMIT` | `15` | Texto ou zero |

**Não crie** `GOOGLE_GENERATIVE_AI_ASSISTANT_KEY` se não vai usar — omita a variável.

---

## ASAAS_API_KEY e o `$`

Se colar `$aact_prod_...`, a Vercel pode mostrar erro ou substituir por vazio.

Use só:

```text
aact_prod_xxxxxxxxxxxxxxxx
```

O código adiciona o `$` automaticamente.

---

## RESEND_FROM_EMAIL na Vercel

Campo **Value**:

```text
Azulli <oi@azulli.app.br>
```

Sem aspas. Se der erro, use só:

```text
oi@azulli.app.br
```

---

## Lista mínima para Production

Obrigatórias para o app subir:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://use.azulli.app.br
ASAAS_API_KEY
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN
GOOGLE_GENERATIVE_AI_API_KEY
CRON_SECRET
```

Recomendadas (e-mail):

```text
RESEND_API_KEY
RESEND_FROM_EMAIL=Azulli <oi@azulli.app.br>
```

Opcionais:

```text
ASSISTANT_MODE=auto
ASSISTANT_DAILY_LLM_LIMIT=15
```

---

## Depois de salvar

**Deployments → Redeploy** (obrigatório para `NEXT_PUBLIC_*`).

Se o erro é no **build** (não ao salvar), abra o log e procure `Variáveis de ambiente inválidas`.

---

## Se ainda falha

Anote:

1. **Nome exato** da variável que edita
2. **Mensagem de erro** da Vercel (texto ou print)
3. Se o erro é ao **Salvar** ou no **Deploy**

Sem o `$` na Asaas e `https://` na URL do app, na maioria dos casos resolve.
