# Azulli Finder — Prospecção Comercial

> Integrado ao monorepo Next.js. **Sem Docker.** Mesmo Postgres Supabase (schema `finder`).

## Acesso

| Ambiente | URL |
|---|---|
| Produção | `https://finder.azulli.app.br` |
| Local | `http://localhost:3000/finder/` |

API: `/api/finder/*`

## Setup

1. Aplicar `supabase/migrations/00026_finder_schema.sql`
2. Variáveis no `.env.local` (raiz): `DATABASE_URL`, `FINDER_JWT_SECRET`, `FINDER_ADMIN_PASSWORD`
3. `npm run finder:seed`
4. `npm run dev`

Lógica em `apps/finder/` · UI em `public/finder/`

Documentação: [docs/FINDER_DEPLOY.md](../../docs/FINDER_DEPLOY.md)

---


## Para que serve

O Finder é o **motor de aquisição de assinantes do Azulli**. Cada lead encontrado pode virar:

1. **Assinante do Azulli** (vira conta paga, com workspace provisionado automaticamente).
2. **Prospect em pipeline** (entra no Kanban comercial com pitch sugerido).
3. **Dado de mercado** (alimenta dashboards de oportunidade por região, segmento e tamanho).

```
┌──────────────────────────────────────────────────────────────┐
│                  TIME COMERCIAL DO AZULLI                    │
│                                                              │
│   ┌────────┐    ┌──────────┐    ┌────────────┐               │
│   │ Finder │ →  │  ICP +   │ →  │  Pipeline  │ →  Assinante  │
│   │ (este) │    │ Score IA │    │  /Kanban   │    do Azulli  │
│   └────────┘    └──────────┘    └────────────┘               │
│       │              │                │              │       │
│       └──────────────┴────────────────┴──────────────┘       │
│        descoberta · qualificação · abordagem · conversão     │
└──────────────────────────────────────────────────────────────┘
```

---

## O que funciona hoje

- Busca Google Maps (Puppeteer), persistência PostgreSQL, auth JWT (roles comerciais)
- SPA: dashboard, buscar, leads, kanban, histórico, equipe
- IA OpenAI: segmento, ICP score, pitches WhatsApp/email
- Integração MVP com o SaaS: converter lead → vincular tenant existente (`/api/leads/:id/converter`)
- Links internos Admin ↔ Finder (quando URLs configuradas)
- Auditoria de conversões (`lead_conversions`)

---

## Quem é o usuário e quem é o lead

| Papel | Quem é | O que faz |
|---|---|---|
| **Usuário do Finder** | Time comercial do Azulli (SDR/BDR/closer) | Busca, qualifica e contata leads |
| **Lead** | MEI ou pequena empresa brasileira (oficina, salão, padaria, cowork, consultório, restaurante etc.) | É abordado para virar assinante do Azulli |
| **Assinante** | Lead convertido | Vira conta paga no Azulli, com workspace provisionado |

O sistema **não é vendido para os MEIs**. Os MEIs são quem o Finder ajuda o nosso time a **alcançar**.

---

## Pré-requisitos

Escolha **um** dos caminhos:

### Caminho A — Docker (recomendado)

| Ferramenta | Versão | Verificar |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 | `docker compose version` |

Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e pronto — não precisa de Node, Postgres ou Chromium na máquina.

### Caminho B — Local (sem Docker)

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | `npm --version` |
| PostgreSQL | 15.x | `psql --version` |
| (Fase 2+) Conta OpenAI | — | https://platform.openai.com |

---

## Instalação e execução

### Setup com Docker (recomendado, ~5 minutos)

```powershell
# 1. Configure o .env
Copy-Item .env.example .env
notepad .env          # ajuste JWT_SECRET e ADMIN_PASSWORD

# 2. Suba a stack (app + Postgres)
docker compose up -d

# 3. Acompanhe os logs (vai mostrar migrate + seed + servidor subindo)
docker compose logs -f app
```

Pronto. Acesse `http://localhost:3000` e faça login com o `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`.

**Comandos úteis** (também disponíveis via `npm run docker:*`):

```powershell
docker compose up -d                    # subir
docker compose down                     # encerrar (mantém dados)
docker compose down -v                  # encerrar e APAGAR dados do Postgres
docker compose logs -f app              # logs da aplicação
docker compose exec app sh              # shell dentro do container
docker compose exec postgres psql -U postgres -d azulli_finder   # cliente SQL
docker compose up -d --build            # rebuild da imagem após mudanças
docker compose --profile tools up -d    # subir também o pgAdmin em http://localhost:5050
```

**O que o entrypoint faz no boot do container:**
1. Espera o Postgres ficar saudável (`pg_isready`)
2. Aplica migrations pendentes (`scripts/migrate.js`)
3. Garante o usuário admin (idempotente — atualiza senha se já existe)
4. Sobe o servidor Express

**Sobre o build:** a imagem usa `ghcr.io/puppeteer/puppeteer:22.15.0` como base, que já vem com Chrome pré-instalado. Primeiro build leva ~3-5 min (baixa a base ~600 MB); builds subsequentes que só mudam código levam segundos graças ao cache de camadas.

### Setup local (sem Docker, ~10 minutos)

```powershell
# 1. Dependências
npm install            # baixa ~150 MB (Chromium do Puppeteer) — 2–5 min

# 2. Configure o .env
Copy-Item .env.example .env
notepad .env           # ajuste DATABASE_URL, JWT_SECRET e ADMIN_PASSWORD

# 3. Crie o banco PostgreSQL
createdb -U postgres azulli_finder

# 4. Aplique migrations
npm run migrate

# 5. Crie o primeiro admin
npm run seed:admin

# 6. Inicie o servidor
npm start
```

Servidor sobe em `http://localhost:3000`. Faça login com o `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`.

```
╔════════════════════════════════════════════════════════════╗
║   Azulli Finder — Prospecção de Assinantes do Azulli       ║
║                                                            ║
║   Servidor:  http://localhost:3000                         ║
║   Ambiente:  development                                   ║
╚════════════════════════════════════════════════════════════╝
```

---

## Como usar (operação diária do SDR)

1. Acesse `http://localhost:3000`.
2. **Tipo de Negócio** (perfil de ICP): ex.: *Oficina Mecânica*, *Salão de Beleza*, *Padaria*, *Consultório Odontológico*, *Pet Shop*.
3. **Localização**: ex.: *Pinheiros SP*, *Vila Madalena*, *Centro RJ*, *Asa Sul DF*.
4. Clique em **Buscar** (ou Enter).
5. Avalie a tabela: nome, telefone clicável (`tel:`), endereço, avaliação Google e link para o Maps.
6. **Exportar Excel** para alimentar planilha de cadência ou CRM enquanto o pipeline interno (Fase 3) não está pronto.

### Tipos de negócio que costumam render bons assinantes

> São os segmentos com **alto fit de ICP** do Azulli: operações simples, fluxo de caixa constante, dor real de cobrança/controle, sensibilidade a custo.

| Segmento | Localização exemplo | Volume esperado |
|---|---|---|
| Oficina Mecânica | Pinheiros SP | 8–15 leads |
| Salão de Beleza | Vila Madalena SP | 10–20 leads |
| Pet Shop | Tijuca RJ | 8–15 leads |
| Padaria | Savassi BH | 10–20 leads |
| Consultório Odontológico | Asa Sul DF | 8–15 leads |
| Cowork | Av. Paulista SP | 5–10 leads |
| Restaurante | Centro RJ | 15–30 leads |

---

## Roadmap

O plano completo está em [`implementation_plan.md`](./implementation_plan.md).

| Fase | Escopo | Status |
|---|---|---|
| **0** | MVP — scraping + UI + Excel | Concluída |
| **1** | Persistência (PostgreSQL) + auth dos usuários internos + CRUD de leads | Próxima |
| **2** | IA com OpenAI: segmento, **ICP score**, pitch de venda do Azulli, validação | Planejada |
| **3** | Dashboard React + Kanban comercial + filtros + exportações em lote | Planejada |
| **4** | Integração com o núcleo do Azulli (provisionar workspace ao virar assinante, webhooks, eventos) | Planejada |
| **5** | Google Places API + enriquecimento (CNPJ, redes sociais, site) + rate limit, filas, observabilidade | Planejada |

---

## ICP do Azulli (ponto de partida)

O **ICP score** (Fase 2) prioriza leads com este perfil:

- **Tamanho**: MEI, ME (1–9 funcionários) ou pequena empresa (até ~30).
- **Operação**: emite recibo/serviço com regularidade, tem fluxo de cobrança recorrente ou parcelado.
- **Sinais positivos**: avaliações Google ≥ 3.8, presença ativa (site/Instagram), atende público local.
- **Segmentos prioritários**: serviços, beleza, automotivo, alimentação local, saúde de bairro, varejo de bairro.
- **Sinais negativos**: grandes redes, franquias nacionais, sem telefone, sem endereço, avaliação muito baixa.

O score vai de **0 a 100** e é o principal eixo de ordenação do pipeline.

---

## Configurações úteis

### Mudar a porta

Em `server.js`:

```js
const PORT = 5000;
```

### Aumentar timeout do scraping

```js
waitUntil: 'networkidle2',
timeout: 60000
```

### Ativar logs detalhados do Puppeteer

```js
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

---

## Troubleshooting

### `npm command not found`

Reinstale o Node.js LTS, reinicie o terminal e tente novamente.

### Puppeteer não consegue baixar o Chrome

```bash
npm install --verbose
```

Se persistir, apague `node_modules` e `package-lock.json` e rode `npm install` de novo.

### Porta 3000 em uso

Windows (PowerShell):

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id <PID> -Force
```

macOS/Linux:

```bash
lsof -i :3000
kill -9 <PID>
```

### Nenhum resultado

- DOM do Google Maps pode ter mudado ou houve throttling.
- Localização mal escrita ou pequena demais.
- Tente cidade maior (*São Paulo SP*) e termo comum (*Pizzaria*).

### Scraping lento

- Aguarde 5–10 s entre buscas.
- Reduza paralelismo.
- Em produção (Fase 5), tudo isso vira fila com `bullmq`.

---

## Privacidade, segurança e conformidade

- **Dados públicos**: o Finder lê dados que o próprio negócio publicou no Google Maps.
- **LGPD**: a base legal para coleta é **legítimo interesse comercial** (prospecção B2B); manter logs de origem e oferecer opt-out na primeira abordagem.
- **Sem exposição externa**: nenhum dado de lead é compartilhado para fora do Azulli.
- **Acesso interno**: apenas usuários do time comercial autenticados acessam o sistema (Fase 1).
- **Auditoria**: cada busca, edição e conversão fica registrada com `user_id` e timestamp (Fase 1).

---

## Estrutura

```
apps/finder/
├── config/          # env, database, openai, plans (espelho do SaaS)
├── controllers/     # auth, lead, search, user
├── models/          # User, Lead, Search
├── routes/          # /api/*
├── services/        # aiService, azulliCore, leadEnrichment
├── scrapers/        # googleMaps.js
├── migrations/      # SQL versionado
├── public/          # SPA vanilla (hash router)
├── deploy/          # Caddyfile.example
├── docker-compose.yml
└── server.js
```

---

## Integração com o núcleo Azulli

Configure no `.env` do Finder:

```
AZULLI_CORE_URL=https://use.azulli.app.br
AZULLI_CORE_API_KEY=<mesmo valor de FINDER_API_KEY na Vercel>
```

Na Vercel (SaaS):

```
FINDER_API_KEY=<segredo compartilhado>
NEXT_PUBLIC_FINDER_URL=https://finder.azulli.app.br
```

Fluxo **Converter em assinante** (roles `admin` ou `closer`):
1. Finder chama `POST /api/internal/finder/convert-lead` no SaaS
2. SaaS busca tenant por e-mail, CNPJ ou owner em `auth.users`
3. Se encontrado → lead vira `assinante` com `azulli_account_id`
4. Se não → retorna link de cadastro (`pending_signup`)

Criação automática de tenant + convite fica para fase posterior (ver plano de integração).

---

## Dicas operacionais

- Use termos específicos: *Oficina Mecânica* > *Mecânica*.
- Foque em cidades médias e grandes — mais densidade de ICP.
- Trabalhe por **micro-região + segmento** (ex.: *Salão de Beleza · Vila Madalena*) para cadência mais eficiente.
- Após Fase 2, ordene sempre pelo **ICP score** descendente.
- Valide telefone via WhatsApp antes da primeira abordagem (link `wa.me/55...` ajuda).
- Exporte semanalmente para ter snapshot do funil.

---

## Suporte

1. Consulte este README e o [`implementation_plan.md`](./implementation_plan.md).
2. Veja os logs do terminal.
3. Para evoluir o código, siga o [`CURSOR_WORKFLOW.md`](./CURSOR_WORKFLOW.md).

---

## Licença

Projeto interno do Azulli. Uso restrito ao time e parceiros oficiais.

---

**Azulli Finder — descobrir, qualificar e converter MEIs em assinantes do Azulli.**
