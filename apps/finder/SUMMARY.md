# Sumário Executivo — Azulli Finder

**Versão**: 1.0.0 (MVP)
**Data**: 19/06/2026
**Status**: MVP em uso. Fase 1 (persistência + auth do time interno) próxima.

---

## O que é o Azulli Finder

Ferramenta **interna** do time comercial do **Azulli** (SaaS de gestão financeira e operacional para MEIs e pequenas empresas) para **prospectar e converter MEIs e pequenas empresas em assinantes do Azulli**.

O Finder ajuda os SDRs/BDRs/closers a:

- **Descobrir** MEIs e pequenas empresas reais a partir de dados públicos (Google Maps).
- **Qualificar** cada negócio com **ICP score** (fit com o perfil ideal de assinante Azulli).
- **Abordar** com pitch personalizado gerado por IA (WhatsApp/Email).
- **Converter** o lead em **assinante** com provisionamento automático no núcleo Azulli (workspace + owner + plano).

> O Finder não é vendido para os MEIs. O Finder é o **motor de aquisição** que o time Azulli usa para alcançar os MEIs.

---

## Quem é o usuário e quem é o lead

| Papel | Quem é |
|---|---|
| **Usuário do Finder** | Time comercial do Azulli (SDR, BDR, closer, ops, admin) |
| **Lead** | MEI ou pequena empresa brasileira candidata a virar assinante |
| **Assinante** | Lead convertido — vira conta paga no Azulli |

---

## O que está entregue (Fase 0 — MVP)

### Backend
- `server.js` — Express + Puppeteer
- `POST /api/buscar` com scraping do Google Maps
- Regex para padrões brasileiros de telefone
- Validações, tratamento de erros, logs estruturados

### Frontend
- `public/index.html` — UI responsiva com Tailwind via CDN
- Tabela com telefones clicáveis, badges de avaliação e link para Google Maps
- Loader e sistema de alertas

### Exportação
- Botão **Exportar Excel** (SheetJS)
- Arquivo `.xlsx` formatado, nomeado `Azulli_Clientes_<timestamp>.xlsx`

### Configuração e docs
- `package.json` enxuto: `express`, `puppeteer`, `cors`
- `README.md` com setup, ICP, troubleshooting
- `implementation_plan.md` com 5 fases detalhadas
- `CURSOR_WORKFLOW.md` com guia de evolução

---

## Roadmap em uma página

| Fase | Escopo | Horas | Semanas (1 dev) |
|---|---|---|---|
| 0 | MVP — scraping + UI + Excel | — | concluído |
| 1 | Persistência (PostgreSQL) + auth do time interno + CRUD de leads | 21–27 | 1–1.5 |
| 2 | IA: segmento, **ICP score**, pitch de venda Azulli (WhatsApp/Email) | 11–14 | 0.5–1 |
| 3 | Dashboard React + **Kanban comercial** + filtros + métricas de funil | 34–45 | 2–2.5 |
| 4 | Integração com núcleo Azulli (provisionar assinante, SSO, webhooks) | 21–29 | 1–1.5 |
| 5 | Google Places API + enriquecimento (CNPJ, redes sociais) + produção | 23–31 | 1–1.5 |
| **Total** | Ferramenta pronta para produção | **110–146** | **6–8 semanas** |

> **Cobrança/financeiro está fora do escopo deste módulo**: o Azulli tem seu próprio módulo financeiro no núcleo. O Finder só dispara o provisionamento quando um lead vira assinante.

---

## Stack

| Camada | Hoje | Após o roadmap |
|---|---|---|
| Backend | Node.js, Express, Puppeteer | + PostgreSQL, JWT, OpenAI, BullMQ |
| Frontend | HTML5, Tailwind via CDN, Vanilla JS | React 18 + Vite + Tailwind + Recharts |
| Dados | sessão em memória | PostgreSQL single-org + Redis |
| IA | — | OpenAI (`gpt-4o-mini`) |
| Integração | — | Cliente HTTP + SSO + Webhooks Azulli |

---

## ICP — Perfil ideal de assinante (eixo central do produto)

O **ICP score** (Fase 2) é o número de 0 a 100 que diz quanto o lead se parece com um assinante real do Azulli:

- **Tamanho**: MEI, ME (1–9 funcionários) ou pequena empresa (até ~30).
- **Operação**: fluxo recorrente de cobrança/notas/recibos, hoje feito em planilha/WhatsApp.
- **Segmentos prioritários**: serviços, beleza, automotivo, alimentação local, saúde de bairro, pet, cowork, oficinas.
- **Sinais positivos**: avaliações Google ≥ 3.8, telefone visível, presença local consistente.
- **Anti-perfil**: grandes redes, franquias nacionais, multinacionais, empresas sem operação local.

O ICP score é o **principal eixo de ordenação** do pipeline.

---

## Como começar agora (10–15 minutos)

```bash
git clone <seu-repositorio>
cd azulli-finder
npm install            # baixa ~150 MB (Chromium do Puppeteer)
npm start              # abre http://localhost:3000
```

Teste: termo *Salão de Beleza*, localização *Vila Madalena SP* → 10–20 leads → **Exportar Excel**.

---

## Estatísticas do pacote

```
Arquivos:                  7
Linhas de código (MVP):    ~700  (server.js + index.html)
Linhas de documentação:    ~1.700 (README + Plan + Workflow + Summary)

Projeção pós-Fases 1–4:
  Backend:    ~3.500–4.000 linhas
  Frontend:   ~4.000–5.000 linhas
```

---

## Diferenciais

### Produto
- **Foco em aquisição**: cada decisão de UI/dado serve para o SDR fechar mais assinantes.
- **ICP score real**: prioriza tempo do time comercial nos leads de maior chance.
- **Pitch sob medida**: a IA escreve mensagem que menciona benefício concreto do Azulli para o segmento do negócio.
- **Conversão integrada**: ao virar assinante, o workspace é criado no Azulli automaticamente.

### Técnico
- Single-org, multi-usuário com roles (admin, sdr, bdr, closer, ops, viewer).
- Sem ORM pesado (`pg` + `knex`).
- Provider de busca atrás de interface (`scrape` ↔ `places`).
- Auditoria de mudanças de status (`lead_status_history`).
- Webhooks assinados (HMAC-SHA256) para integrações seguras.
- Background jobs (Fase 5) com fila Redis.

### UX
- Telefone clicável (`tel:` e `wa.me`), link direto para Maps.
- Estados de loading, alertas claros, layout responsivo.
- Kanban comercial drag-and-drop (Fase 3).
- Filtros persistidos na URL.

---

## Estrutura recomendada após Fase 1

```
azulli-finder/
├── config/            # database, env, openai, azulli core
├── controllers/       # auth, search, lead, conversion
├── middleware/        # auth JWT, requireRole, rate limit
├── models/            # User, Search, Lead
├── routes/            # /api/auth, /api/searches, /api/leads, /api/webhooks
├── scrapers/          # googleMaps, places
├── services/          # aiService, azulliCore, events, webhooks
├── migrations/        # SQL
├── frontend/          # React (Fase 3)
├── tests/
├── public/            # build do frontend
├── server.js
├── package.json
└── .env
```

---

## Investimento estimado

### Infraestrutura
- **PostgreSQL**: Railway/Supabase free → ~$5–15/mês quando crescer.
- **Redis** (Fase 5): Upstash/Railway free → ~$5/mês.
- **Hospedagem** (Render/Fly/Railway): free tier no início.

### APIs
- **OpenAI** (`gpt-4o-mini`): ~$0.08 por 100 leads enriquecidos (validar + segmento + ICP score + pitch WhatsApp).
- **Google Places API** (Fase 5): $17 por 1.000 detalhes; planeje cache agressivo (TTL longo por `place_id`).

### Cobrança/financeiro
Não faz parte deste módulo. O Azulli tem módulo financeiro próprio no núcleo do produto.

---

## Próximos passos concretos

### Hoje
1. Rodar `npm install` e `npm start`
2. Validar busca de teste (*Salão de Beleza · Vila Madalena*)
3. Definir paleta/branding final do Azulli no `index.html`

### Esta semana
1. Iniciar **Task 1.1** (PostgreSQL + migrations + users com roles)
2. Configurar `.env` e PostgreSQL local
3. Deploy em staging interno

### Próximas 2 semanas
1. Concluir Fase 1 (auth + CRUD de leads + ownership por SDR)
2. Começar Fase 2 (ICP score + pitch WhatsApp)

### Mês 2
1. Concluir Fase 2 e Fase 3 (Dashboard React + Kanban)
2. Desenhar contrato da API do núcleo Azulli (`/v1/workspaces/provisionar`)

### Mês 3
1. Fase 4 (Integração Azulli — provisionamento automático)
2. Fase 5 (Places API + enriquecimento + produção)
3. Ferramenta em produção interna, gerando assinantes do Azulli

---

## Checklist de validação

- [ ] `npm install` sem erros
- [ ] `npm start` sobe em `http://localhost:3000`
- [ ] Busca *Pet Shop · Tijuca RJ* retorna ≥ 5 leads
- [ ] Exportação Excel funciona
- [ ] `implementation_plan.md` lido e Task 1.1 planejada
- [ ] `.env.example` copiado e preenchido (Fase 1)
- [ ] PostgreSQL local rodando (Fase 1)
- [ ] Migrations aplicadas (Fase 1)

---

## Conclusão

O **Azulli Finder** é a **máquina de aquisição** do Azulli: descobre MEIs e pequenas empresas reais, mede o fit com o ICP, sugere abordagem e, quando o lead vira assinante, provisiona o workspace automaticamente no núcleo do produto.

Sem complexidade desnecessária, com foco no que importa: **trazer mais assinantes pagantes para o Azulli, mais rápido e com menos atrito para o time comercial**.

---

**Mantido por**: time Azulli
**Versão**: 1.0.0 — Status: MVP em produção interna
