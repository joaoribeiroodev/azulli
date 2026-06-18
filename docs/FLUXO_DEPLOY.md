# Fluxo de deploy — versão simples

Um caminho só, do zero até o site no ar. Detalhes extras ficam em `DEPLOY_PRODUCAO.md`.

---

## O que você quer no final

| URL | O que o usuário vê |
|-----|-------------------|
| `https://azulli.app.br` | Site marketing (landing) |
| `https://use.azulli.app.br` | App Azulli (login, dashboard, billing) |

Tudo roda no **mesmo projeto** na Vercel.

---

## Duas “telas” que você usa

```
┌─────────────────┐         ┌──────────────────┐
│     VERCEL      │         │   REGISTRO.BR    │
│  (hospedagem)   │         │  (DNS do domínio)│
├─────────────────┤         ├──────────────────┤
│ • Deploy do app │         │ • Registro A     │
│ • Lista domínios│  copia  │ • Registro CNAME │
│ • Mostra DNS    │ ──────► │   use            │
│   que criar     │  valores│                  │
└─────────────────┘         └──────────────────┘
```

- **Vercel** não cria DNS sozinha se o domínio está no Registro.br — ela só **mostra** o que você precisa criar.
- **Registro.br** não sabe da Vercel até você criar os registros A e CNAME.

---

## Ordem completa (não pule)

### Fase A — App na Vercel (sem domínio customizado)

1. Vercel → importar repo GitHub `azulli`
2. Colocar **variáveis de ambiente** (Production) — ver tabela abaixo
3. **Deploy** → deve ficar verde
4. Abrir `https://azulli-xxxx.vercel.app` → site responde

| Variável | Exemplo |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role |
| `NEXT_PUBLIC_APP_URL` | `https://use.azulli.app.br` |
| `ASAAS_API_KEY` | `aact_prod_...` |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | token que você gerou |
| `CRON_SECRET` | outro token (`npm run generate:secret`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM_EMAIL` | `Azulli <oi@azulli.app.br>` |

Não precisa de `GOOGLE_GENERATIVE_AI_ASSISTANT_KEY`.

---

### Fase B — Domínio do APP (`use.azulli.app.br`)

**B1. Vercel**

1. Projeto azulli → **Settings** → **Domains**
2. Campo Add → digite: `use.azulli.app.br` → Add
3. A Vercel mostra algo como:

   ```text
   Tipo: CNAME
   Nome: use
   Valor: cname.vercel-dns.com  (ou parecido — use o da sua tela)
   ```

4. **Copie** nome e valor exatos da sua tela.

**B2. Registro.br**

1. Login → seu domínio `azulli.app.br` → **DNS** / **Editar zona**
2. **Nova entrada**:
   - Tipo: **CNAME**
   - Nome: `use` (só isso — **não** `use.azulli.app.br`)
   - Destino: valor que a Vercel mostrou (ex. `cname.vercel-dns.com`)
3. Salvar
4. **Teste DNS** (no PC, após 15 min): `nslookup use.azulli.app.br` deve retornar um IP, não “não encontrado”

**Erro comum no Registro.br:** nome `use.azulli.app.br` completo no campo Nome (o painel já mostra `.azulli.app.br` ao lado).

O certo é só `use` → gera `use.azulli.app.br`. Nome errado = `nslookup use.azulli.app.br` falha para todo mundo.


**B3. Voltar na Vercel**

- Aguarde alguns minutos
- A linha `use.azulli.app.br` deve ficar **Valid** / verde
- Teste: `https://use.azulli.app.br/login`

---

### Fase C — Domínio marketing (`azulli.app.br`)

**C1. Vercel**

1. Domains → Add → `azulli.app.br` → Add
2. Se aparecer opção sobre **www**:
   - Escolha **apenas este domínio** / **Add only**
   - **Não** adicione `www` agora
3. A Vercel mostra registro **A** para o apex:

   ```text
   Tipo: A
   Nome: @  (ou vazio / azulli.app.br — depende do Registro.br)
   Valor: 76.76.21.21  (ou o IP da sua tela)
   ```

**C2. Registro.br**

1. **Nova entrada**:
   - Tipo: **A**
   - Nome: `@` ou deixar vazio (apex = `azulli.app.br`)
   - Valor: IP da Vercel
2. **Não** crie CNAME no `@` — só **A** no apex
3. Salvar

**C3. Vercel**

- Aguarde → linha `azulli.app.br` verde
- Teste: `https://azulli.app.br` → landing

---

### Fase D — Depois dos domínios

| # | Onde | O que fazer |
|---|------|-------------|
| 1 | Supabase | Auth → Site URL = `https://use.azulli.app.br` + Redirect URLs |
| 2 | Vercel | Redeploy (se mudou `NEXT_PUBLIC_APP_URL`) |
| 3 | Asaas | Webhook → `https://use.azulli.app.br/api/webhooks/asaas` |
| 4 | Resend | Verificar domínio `azulli.app.br` (e-mail) |

---

## O que NÃO fazer (evita confusão)

| ❌ Não | ✅ Em vez disso |
|--------|----------------|
| Adicionar `www.use.azulli.app.br` | Só `use.azulli.app.br` |
| Adicionar apex + www juntos no primeiro try | Só `azulli.app.br`; www depois (opcional) |
| CNAME no `@` no Registro.br | **A** no `@` |
| A + CNAME no mesmo `@` | Só **A** no `@` |
| Configurar DNS na Vercel sem Registro.br | DNS no **Registro.br** |
| Procurar menu “Redirect” solto | Só existe ao **Editar** uma linha de domínio (opcional) |

---

## www.azulli.app.br (opcional — pode ignorar no go-live)

Quem digita `www.azulli.app.br` pode não abrir até você configurar www.  
`azulli.app.br` e `use.azulli.app.br` são suficientes para lançar.

Quando quiser www:

1. Vercel → Add → `www.azulli.app.br`
2. Registro.br → CNAME `www` → valor da Vercel
3. Vercel → Edit na linha www → Redirect to → `azulli.app.br`

---

## Se algo falha

| Problema | Olhe aqui |
|----------|-----------|
| Vercel “Invalid Configuration” | Registro.br: registro errado ou ainda propagando (espere 15–60 min) |
| “Sobreposição” na Vercel | Remova todos os domínios, recomece Fase B e C |
| `use` abre landing em vez do app | `NEXT_PUBLIC_APP_URL` + redeploy |
| Login quebrado | Supabase Redirect URLs (Fase D) |

---

## Problema: app host mostra landing

**Causa:** `NEXT_PUBLIC_APP_URL` na Vercel diferente de `https://use.azulli.app.br` (ex.: `azulli.app.br` ou `localhost`).

**Correção:**

1. Vercel → Settings → Environment Variables  
2. `NEXT_PUBLIC_APP_URL` = `https://use.azulli.app.br` (sem barra no final)  
3. **Redeploy** obrigatório (`NEXT_PUBLIC_*` entra no build)

O código também reconhece `use.azulli.app.br` fixo — após push + deploy, `/` redireciona a `/login` mesmo se a env estiver errada.

---

## Problema: nslookup não encontra use.azulli.app.br

**Causa:** falta CNAME `use` no Registro.br (teste global ainda retorna “domínio não existe”).

**Correção no Registro.br:**

1. Domínio `azulli.app.br` → **DNS**
2. Nova linha: **CNAME** | nome `use` | destino `cname.vercel-dns.com` (valor da Vercel)
3. Salvar → aguardar 15–60 min
4. `nslookup use.azulli.app.br 8.8.8.8` deve mostrar IP, não erro

**Confira a barra do navegador:** se mostra `azulli.app.br`, é landing (correto). Só `use.azulli.app.br` é o app.

---


```
□ Deploy verde na Vercel
□ use.azulli.app.br → verde na Vercel + CNAME no Registro.br
□ azulli.app.br → verde na Vercel + A no Registro.br
□ https://use.azulli.app.br/login abre
□ https://azulli.app.br abre landing
□ Supabase Auth URLs
□ Webhook Asaas
```

---

**Pendências:** [`docs/DEPLOY_PENDENTE.md`](./DEPLOY_PENDENTE.md)
