# Growth Platform — Guia de configuração externa

Este documento cobre infraestrutura, DNS, webhooks e variáveis de ambiente para:

1. Motor de atendimento/vendas via WhatsApp + OpenAI (leads inbound)
2. Painel Admin analítico (`admin.azulli.app.br`)
3. Avisos globais (sininho no app)

---

### GUIA DE CONFIGURAÇÃO EXTERNA

#### 1. DNS — subdomínio Admin

No provedor de DNS (Cloudflare, Registro.br, etc.):

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | `admin` | `cname.vercel-dns.com` | Auto |

Ou, se a Vercel exigir registro A para apex:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `admin` | IP indicado pela Vercel |

**Vercel (mesmo projeto do app):**

1. Project → Settings → Domains → Add `admin.azulli.app.br`
2. Aguarde certificado SSL (HTTPS automático)
3. Defina `NEXT_PUBLIC_ADMIN_URL=https://admin.azulli.app.br` nas Environment Variables (Production)

**Supabase Auth:**

- Site URL pode continuar `https://use.azulli.app.br`
- Adicione em Redirect URLs: `https://admin.azulli.app.br/auth/callback`

**Primeiro admin:**

- Defina `PLATFORM_ADMIN_EMAILS=seu@email.com` na Vercel **ou**
- Insira manualmente em `platform_admins` (SQL):

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'seu@email.com';
```

---

#### 2A. Evolution API no Railway (passo a passo)

> **Alternativa gratuita:** Oracle Cloud Always Free — ver seção **2B** e `deploy/evolution/`.

Use o template oficial com Manager, Postgres e Redis:

**Deploy:** [railway.com/deploy/evolution-api-whatsapp](https://railway.com/deploy/evolution-api-whatsapp)

### Fase 1 — Criar o projeto na Railway

1. Abra o link acima e clique em **Deploy Now** (login com GitHub).
2. Railway cria 3 serviços: **Evolution API**, **PostgreSQL**, **Redis**.
3. Aguarde o deploy ficar **Active** (verde) em todos.

### Fase 2 — Domínio público (HTTPS)

1. Clique no serviço **evolution-api** (não no Postgres).
2. **Settings** → **Networking** → **Generate Domain**.
3. Anote a URL, ex.: `https://evolution-api-production-xxxx.up.railway.app`
4. Essa URL será:
   - `EVOLUTION_API_URL` no Azulli
   - `SERVER_URL` na Evolution (veja Fase 3)

Teste no navegador: `https://SUA-URL/manager` — deve abrir o painel Manager.

### Fase 3 — Variáveis de ambiente (Evolution)

No serviço **evolution-api** → **Variables**. Confirme ou adicione:

| Variável | Valor (Railway) |
|----------|-----------------|
| `SERVER_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTHENTICATION_API_KEY` | Gere um segredo longo (ex. `npm run generate:secret` no Azulli) — **anote!** |
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_CONNECTION_URI` | `${{Postgres.DATABASE_URL}}` |
| `CACHE_REDIS_ENABLED` | `true` |
| `CACHE_REDIS_URI` | `${{Redis.REDIS_URL}}` |
| `PORT` | `8080` |

**Importante:** `AUTHENTICATION_API_KEY` = mesma valor que você usará como `EVOLUTION_API_KEY` no Azulli.

Clique **Redeploy** após alterar variáveis.

### Fase 4 — Volume (sessão WhatsApp não perde no restart)

Sem volume, o QR Code expira em cada deploy.

1. Serviço evolution-api → **Settings** → **Volumes**.
2. **Add Volume**:
   - Mount path: `/evolution/instances`
   - Tamanho: 5 GB (suficiente)
3. Redeploy.

### Fase 5 — Conectar WhatsApp no Manager

1. Abra `https://SUA-URL-RAILWAY/manager`
2. **Create Instance** (ou Instances → New):
   - Instance name: `azulli-vendas` → vira `EVOLUTION_INSTANCE_NAME`
3. Clique na instância → **Connect** / QR Code.
4. No celular: WhatsApp → Aparelhos conectados → Conectar → escaneie.
5. Status deve ficar **open** / **connected**.

### Fase 6 — Webhook Evolution → Azulli

Antes, na **Vercel** (projeto Azulli), defina um token que você inventa:

```env
WHATSAPP_WEBHOOK_TOKEN=coloque-o-mesmo-token-aqui
```

Na Evolution (Manager **ou** API):

- URL: `https://use.azulli.app.br/api/webhooks/whatsapp`
- Evento: `MESSAGES_UPSERT`
- Header customizado:

```json
{ "x-webhook-token": "o-mesmo-WHATSAPP_WEBHOOK_TOKEN" }
```

**Via API (substitua URL, instância e keys):**

```bash
curl -X POST "https://SUA-URL-RAILWAY/webhook/set/azulli-vendas" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_AUTHENTICATION_API_KEY" \
  -d '{
    "enabled": true,
    "url": "https://use.azulli.app.br/api/webhooks/whatsapp",
    "webhookByEvents": false,
    "events": ["MESSAGES_UPSERT"],
    "headers": {
      "x-webhook-token": "SEU_WHATSAPP_WEBHOOK_TOKEN"
    }
  }'
```

### Fase 7 — Variáveis no Azulli (Vercel)

No projeto **azulli** na Vercel → Environment Variables:

```env
WHATSAPP_PROVIDER=evolution
WHATSAPP_WEBHOOK_TOKEN=mesmo-token-do-webhook
EVOLUTION_API_URL=https://SUA-URL-RAILWAY.up.railway.app
EVOLUTION_INSTANCE_NAME=azulli-vendas
EVOLUTION_API_KEY=mesmo-valor-de-AUTHENTICATION_API_KEY
OPENAI_API_KEY=sk-...
```

Redeploy na Vercel após salvar.

### Fase 8 — Testar

**Simulação (sem celular):**

```bash
curl -X POST https://use.azulli.app.br/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: SEU_WHATSAPP_WEBHOOK_TOKEN" \
  -d '{"phone":"5511999999999","text":{"message":"Teste"},"fromMe":false}'
```

**WhatsApp real:** outro número manda mensagem no WhatsApp conectado → deve responder com IA.

### Problemas comuns (Railway)

| Problema | Solução |
|----------|---------|
| `/manager` não abre | Deploy ainda rodando; confira `SERVER_URL` e redeploy |
| QR expira após deploy | Volume em `/evolution/instances` |
| Azulli 401 no webhook | `WHATSAPP_WEBHOOK_TOKEN` ≠ header na Evolution |
| Lead criado, sem resposta | `EVOLUTION_*` errado na Vercel ou instância desconectada |
| 503 / licença (v2.4+) | Ativar instância no Manager (Evolution Foundation) ou usar template que fixa v2.3.x |

**Custo Railway:** plano Hobby ~US$ 5/mês + uso (Evolution + Postgres + Redis no mesmo projeto).

---

#### 2B. Evolution API na Oracle Cloud Always Free (recomendado — $0)

Use a stack em `deploy/evolution/` (Docker Compose: Evolution + Manager + Postgres + Redis).

**Por que Oracle:** tier Always Free inclui VM ARM Ampere (até 4 OCPU / 24 GB RAM) — suficiente para Evolution sem pagar Railway.

### Fase 1 — Conta e VM na Oracle

1. Crie conta em [cloud.oracle.com](https://cloud.oracle.com) (cartão para verificação; Always Free não cobra se ficar no limite).
2. **Compute** → **Instances** → **Create instance**:
   - Image: **Ubuntu 22.04** ou 24.04
   - Shape: **Ampere** → `VM.Standard.A1.Flex` (ex.: 2 OCPU, 12 GB RAM — dentro do free)
   - Adicione sua chave SSH pública
   - Networking: VCN pública com IP público
3. **Security List** (VCN): permitir **SSH 22** do seu IP (não abra 8080/3000 se usar Cloudflare Tunnel).
4. Conecte: `ssh ubuntu@IP_PUBLICO`

**AMD Micro (1 GB RAM):** só se não tiver Ampere disponível — adicione swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Fase 2 — Docker e Evolution

Na VM:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker

mkdir -p ~/evolution && cd ~/evolution
```

Copie de este repo `deploy/evolution/docker-compose.yml` e `deploy/evolution/.env.example`, ou:

```bash
git clone https://github.com/joaoribeiroodev/azulli.git /tmp/azulli
cp /tmp/azulli/deploy/evolution/* ~/evolution/
```

Configure:

```bash
cd ~/evolution
cp .env.example .env
nano .env   # ou vim
```

| Variável | Valor |
|----------|-------|
| `POSTGRES_PASSWORD` | Senha forte (igual na `DATABASE_CONNECTION_URI`) |
| `AUTHENTICATION_API_KEY` | Chave longa aleatória → será `EVOLUTION_API_KEY` no Azulli |
| `SERVER_URL` | URL HTTPS pública (Fase 3) — ex. `https://evolution.azulli.app.br` |

Subir:

```bash
docker compose up -d
docker compose ps
docker compose logs -f api   # aguarde "HTTP - ON" / sem erro de DB
```

Volumes Docker já persistem `/evolution/instances` (sessão WhatsApp sobrevive restart).

### Fase 3 — HTTPS com Cloudflare Tunnel (recomendado)

A Vercel precisa alcançar a Evolution por URL pública. O compose expõe API e Manager só em `127.0.0.1` — use tunnel.

1. No [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels** → **Create tunnel**.
2. Instale `cloudflared` na VM (instruções do painel) ou:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```

3. **Public Hostname** no tunnel:
   - `evolution.azulli.app.br` → `http://127.0.0.1:8080`
   - (opcional) `evolution-manager.azulli.app.br` → `http://127.0.0.1:3000`
4. Atualize `SERVER_URL` no `.env` com a URL HTTPS (ex. `https://evolution.azulli.app.br`) e reinicie:

```bash
docker compose up -d --force-recreate api
```

Teste: `https://evolution.azulli.app.br/manager` — deve abrir o Manager.

**Alternativa:** IP público Oracle + firewall só para IPs conhecidos + Caddy/Nginx com TLS (mais trabalho; tunnel é mais simples).

### Fase 4 — Conectar WhatsApp (igual Railway Fase 5)

1. Abra `https://evolution.azulli.app.br/manager` (ou hostname do tunnel).
2. **Create Instance** → nome: `azulli-vendas` (`EVOLUTION_INSTANCE_NAME`).
3. Conectar via QR Code → status **open** / **connected**.

### Fase 5 — Webhook Evolution → Azulli (igual Railway Fase 6)

Na Vercel, defina `WHATSAPP_WEBHOOK_TOKEN` (token que você inventa).

Webhook:

- URL: `https://use.azulli.app.br/api/webhooks/whatsapp`
- Evento: `MESSAGES_UPSERT`
- Header: `x-webhook-token` = mesmo `WHATSAPP_WEBHOOK_TOKEN`

```bash
curl -X POST "https://evolution.azulli.app.br/webhook/set/azulli-vendas" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_AUTHENTICATION_API_KEY" \
  -d '{
    "enabled": true,
    "url": "https://use.azulli.app.br/api/webhooks/whatsapp",
    "webhookByEvents": false,
    "events": ["MESSAGES_UPSERT"],
    "headers": {
      "x-webhook-token": "SEU_WHATSAPP_WEBHOOK_TOKEN"
    }
  }'
```

### Fase 6 — ENVs no Azulli (Vercel)

```env
WHATSAPP_PROVIDER=evolution
WHATSAPP_WEBHOOK_TOKEN=mesmo-token-do-webhook
EVOLUTION_API_URL=https://evolution.azulli.app.br
EVOLUTION_INSTANCE_NAME=azulli-vendas
EVOLUTION_API_KEY=mesmo-valor-de-AUTHENTICATION_API_KEY
OPENAI_API_KEY=sk-...
```

Redeploy na Vercel.

### Fase 7 — Testar (igual Railway Fase 8)

Ver seção 2A Fase 8 ou seção 6 deste documento.

### Manutenção Oracle

```bash
cd ~/evolution
docker compose pull && docker compose up -d
docker compose logs -f api --tail 100
```

| Problema | Solução |
|----------|---------|
| Ampere “Out of capacity” | Tente outra região ou horário; ou AMD Micro + swap |
| Manager/API 502 no tunnel | `docker compose ps`; API em `127.0.0.1:8080` |
| QR expira após reboot | Volume `evolution_instances` — não apague volumes |
| Azulli 401 webhook | `WHATSAPP_WEBHOOK_TOKEN` ≠ header Evolution |
| `SERVER_URL` errado | Webhook/QR quebram — alinhar com URL HTTPS do tunnel |

**Custo:** $0 (Always Free) + domínio já existente no Cloudflare.

---

#### 2. Webhook WhatsApp (Evolution API ou Z-API)

**URL do webhook (produção):**

```
https://use.azulli.app.br/api/webhooks/whatsapp
```

**Autenticação:** header com o mesmo valor de `WHATSAPP_WEBHOOK_TOKEN`:

- Evolution API: configure `webhook` com header `apikey` ou `x-webhook-token`
- Z-API: use token no header `Client-Token` ou configure proxy com `x-webhook-token`

**Evolution API (exemplo):**

1. Crie instância e conecte WhatsApp (QR Code)
2. Webhook → URL acima → eventos: `MESSAGES_UPSERT`
3. Header: `apikey: <EVOLUTION_API_KEY>` ou token dedicado igual a `WHATSAPP_WEBHOOK_TOKEN`

**Z-API (exemplo):**

1. Instância → Webhooks → Received message
2. URL: `https://use.azulli.app.br/api/webhooks/whatsapp`
3. Token no painel = `WHATSAPP_WEBHOOK_TOKEN`

**Meta Ads → WhatsApp (UTM):**

- Use link com UTMs no anúncio: `https://wa.me/55XXXXXXXX?text=Olá`
- Para capturar UTMs automaticamente, use um redirecionador (ex: landing com query `utm_*` que abre wa.me) ou configure o provedor para incluir `metadata`/`utm` no payload do webhook (campos já preparados em `inbound_leads`).

---

#### 3. Webhook Gateway de Pagamento (Asaas)

Já existente — mantenha:

```
https://use.azulli.app.br/api/webhooks/asaas
```

Token: `ASAAS_WEBHOOK_TOKEN` (header `asaas-access-token`).

**Novidade:** pagamentos confirmados passam a registrar `billing_payments` e marcar lead como `CONVERTED` quando `subscriptions.lead_id` estiver preenchido.

Para vincular lead na conversão, ao criar assinatura após cadastro do lead, atualize:

```sql
update subscriptions set lead_id = '<lead_uuid>' where tenant_id = '<tenant_uuid>';
```

(Automação futura: match por telefone em `tenant_settings.whatsapp_number`.)

---

#### 4. Variáveis de ambiente (ENV)

Adicione ao `.env.local` e à Vercel:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Sim (IA vendas) | Chave OpenAI para gpt-4o-mini |
| `OPENAI_MODEL` | Não | Default: `gpt-4o-mini` |
| `WHATSAPP_PROVIDER` | Não | `evolution` ou `zapi` |
| `WHATSAPP_WEBHOOK_TOKEN` | Sim (webhook) | Token secreto do webhook inbound |
| `EVOLUTION_API_URL` | Se Evolution | Ex: `https://api.evolution.example.com` |
| `EVOLUTION_INSTANCE_NAME` | Se Evolution | Nome da instância |
| `EVOLUTION_API_KEY` | Se Evolution | API key da instância |
| `EVOLUTION_WEBHOOK_TOKEN` | Alt. | Alias aceito no webhook |
| `ZAPI_INSTANCE_ID` | Se Z-API | ID da instância |
| `ZAPI_TOKEN` | Se Z-API | Token da instância |
| `ZAPI_BASE_URL` | Não | Default `https://api.z-api.io` |
| `NEXT_PUBLIC_ADMIN_URL` | Sim (admin) | `https://admin.azulli.app.br` |
| `PLATFORM_ADMIN_EMAILS` | Bootstrap | E-mails comma-separated com acesso admin |

**Já existentes (manter):**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`, `ASAAS_*`, `CRON_SECRET`, etc.

---

#### 5. Migration Supabase

Aplique no projeto Supabase:

```bash
# Via CLI
supabase db push

# Ou SQL Editor: conteúdo de
# supabase/migrations/00025_growth_platform.sql
```

---

#### 6. Testes rápidos

**Métricas admin (logado como platform admin):**

```bash
curl -H "Cookie: <sessão>" https://admin.azulli.app.br/api/admin/metrics
```

**Webhook WhatsApp (dry):**

```bash
curl -X POST https://use.azulli.app.br/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $WHATSAPP_WEBHOOK_TOKEN" \
  -d '{"phone":"5511999999999","text":{"message":"Quero organizar minha empresa"},"fromMe":false}'
```

**Aviso global:** Admin → `/admin/announcements` → publicar → sininho no app.

---

#### 7. Arquitetura de código (referência)

| Módulo | Caminho |
|--------|---------|
| Migration | `supabase/migrations/00025_growth_platform.sql` |
| Webhook WhatsApp | `src/app/api/webhooks/whatsapp/route.ts` |
| IA vendas | `src/lib/inbound/sales-agent.ts` |
| Métricas admin | `src/lib/admin/metrics.ts` |
| API métricas | `src/app/api/admin/metrics/route.ts` |
| Avisos | `src/lib/announcements/`, `src/components/app/announcements-bell.tsx` |
| Painel admin | `src/app/(admin)/admin/` |
| Host admin | `src/lib/app/domain-hosts.ts`, `src/proxy.ts` |
