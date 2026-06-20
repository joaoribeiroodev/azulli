# Guia de Evolução com Cursor — Azulli Finder

Como usar o **Cursor** para evoluir o **Azulli Finder** (ferramenta interna de **prospecção de assinantes** do SaaS **Azulli**) seguindo o [`implementation_plan.md`](./implementation_plan.md).

---

## O que você tem

- **`implementation_plan.md`** — 5 fases, ~20 tasks, código de exemplo, schemas SQL e estimativas.
- **`README.md`** — visão de produto e setup.
- **`SUMMARY.md`** — visão executiva em uma página.
- **Este arquivo** — workflow operacional com o Cursor.

---

## Workflow padrão

```
┌────────────────────────────────────────────────────────────┐
│ 1. Escolha UMA task no implementation_plan.md              │
│    (ex.: Task 1.1 — PostgreSQL e migrations)               │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Abra o Cursor no projeto e mencione o plano             │
│    (@file implementation_plan.md)                          │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Use o template de prompt (abaixo) e descreva a task     │
│    com requisitos concretos                                │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Revise os arquivos gerados, rode os testes              │
│    e ajuste o que for necessário                           │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 5. Commit com mensagem descritiva e siga para a próxima    │
└────────────────────────────────────────────────────────────┘
```

---

## Premissas do projeto (importante para todos os prompts)

Ao pedir código para o Cursor, sempre lembre:

- **Single-org, multi-usuário**: existe uma única organização (Azulli) e vários usuários internos (admin, sdr, bdr, closer, ops, viewer). **Não usamos `workspace_id` nem multi-tenant.**
- **Quem usa**: time comercial do Azulli.
- **O que é um lead**: MEI ou pequena empresa brasileira candidata a virar assinante do Azulli.
- **Conversão**: lead vira **assinante** (cria workspace no núcleo Azulli, não vira cliente do MEI).
- **Ownership**: leads têm `responsavel_id` (SDR dono); admin pode reatribuir.
- **Auditoria**: mudanças de status gravam em `lead_status_history`.

---

## Exemplo prático: Task 1.1 (PostgreSQL e migrations)

### Prompt sugerido

```
@file implementation_plan.md

Implemente a TASK 1.1: PostgreSQL e migrations (single-org, multi-usuário).

Contexto:
- Projeto Node.js + Express já existente (server.js + public/index.html).
- Azulli Finder é uma ferramenta INTERNA do time comercial Azulli.
- Single-org, multi-usuário (sem workspace_id).
- Leads = MEIs candidatos a virar assinantes do Azulli.

Crie os arquivos abaixo, COMPLETOS e sem omissões:

1. config/env.js
   - Carrega .env (dotenv)
   - Valida obrigatórias: DATABASE_URL, JWT_SECRET, PORT
   - Exporta objeto congelado

2. config/database.js
   - Pool pg
   - query(text, params) com logging em dev
   - transaction(callback) com BEGIN/COMMIT/ROLLBACK
   - healthcheck()

3. migrations/001_initial_schema.sql
   - Tabelas: users (com role), searches, leads, lead_status_history
   - Todos os índices do plano
   - Constraint única (lower(nome), lower(coalesce(endereco,''))) em leads
   - Sem workspace_id em nenhum lugar

4. models/User.js
   - create, findById, findByEmail, list, update, deactivate
   - Métodos sempre filtram por ativo=true onde fizer sentido

5. models/Search.js
   - create, findById, listByUser, listAll
   - includes user (join leve com nome do SDR)

6. models/Lead.js
   - create/upsert (ON CONFLICT por nome+endereco)
   - findById, update, list com filtros (status, segmento, uf, cidade, scoreMin, responsavel, q)
   - assign(leadId, responsavelId)
   - changeStatus(leadId, novoStatus, userId, motivo) → grava em lead_status_history dentro de transação

Requisitos:
- async/await em tudo
- SQL puro, sem ORM
- Tipos: UUID, TIMESTAMPTZ
- Sem TODOs, sem placeholders
- Exportações nomeadas claras
```

### Após a geração

```bash
npm install pg knex dotenv

# .env local
@'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/azulli_finder
JWT_SECRET=troque-este-valor
'@ | Set-Content -Encoding utf8 .env

# Criar banco
createdb azulli_finder

# Rodar migration
psql azulli_finder -f migrations/001_initial_schema.sql

# Testar conexão
node -e "require('./config/database').query('SELECT NOW()').then(r => console.log(r.rows[0]))"

# Commit
git add . ; git commit -m "feat(fase-1): Task 1.1 — PostgreSQL e migrations (single-org)"
```

---

## Template de prompt (qualquer task)

```
@file implementation_plan.md

Implemente a TASK [X.Y]: [Nome da Task]

Contexto:
- Projeto: Azulli Finder (ferramenta interna de prospecção de assinantes do Azulli)
- Quem usa: time comercial do Azulli (SDR/BDR/closer/ops/admin)
- Modelo de dados: single-org, multi-usuário (sem workspace_id)
- Stack atual: [Node.js + Express + ... | + PostgreSQL | + OpenAI | + React]
- Fase: [N — Nome da Fase]
- Esta task é parte de: [Objetivo da fase em uma linha]

Arquivos a criar/modificar:
1. [arquivo1] — [responsabilidade]
2. [arquivo2] — [responsabilidade]
3. [arquivo3] — [responsabilidade]

Requisitos não-funcionais:
- async/await em tudo
- Single-org (sem multi-tenant)
- Ownership de lead por responsavel_id; admin reatribui
- Mudanças de status registram em lead_status_history
- Tratamento de erros explícito
- Logs estruturados (prefixo do módulo)
- Sem TODOs, sem placeholders
- Manter compatibilidade com código existente

Referência: consulte a seção da TASK [X.Y] no plan.
```

---

## Ordem recomendada

### Sprint 1 (1–2 semanas) — Backend persistente
- **Task 1.1** — PostgreSQL + migrations + models
- **Task 1.2** — JWT auth com roles
- **Task 1.3** — Persistir buscas/leads + upsert por nome+endereço
- **Task 1.4** — CRUD de leads + ownership + histórico de status
- Deploy em staging interno

### Sprint 2 (1 semana) — Inteligência
- **Task 2.1** — Cliente OpenAI + serviço de IA (segmento, ICP score, pitch WhatsApp/Email, validar)
- **Task 2.2** — Pipeline de enriquecimento em background + `ai_usage`
- **Task 2.3** — Endpoints de regerar pitch / reavaliar ICP
- Validação com 100 leads reais e revisão dos pitches

### Sprint 3 (2–3 semanas) — Dashboard
- **Task 3.1** — Bootstrap React (Vite + TS + Tailwind + TanStack Query)
- **Task 3.2** — Kanban comercial (dnd-kit)
- **Task 3.3** — Filtros avançados (status, segmento, UF, score, responsável, texto)
- **Task 3.4** — Gráficos (funil, conversão por segmento/UF, score médio)
- **Task 3.5** — Exportação em lote (Excel/CSV/JSON)

### Sprint 4 (1–1.5 semana) — Integração com Azulli
- **Task 4.1** — Cliente HTTP do Azulli core (`provisionarAssinante`)
- **Task 4.2** — Endpoint "converter lead em assinante"
- **Task 4.3** — SSO Finder ↔ Azulli admin
- **Task 4.4** — Webhooks de saída (lead.*)
- **Task 4.5** — Sync reverso (workspace.upgraded / workspace.churned)

### Sprint 5 (1–1.5 semana) — Produção
- **Task 5.1** — Adapter Google Places API
- **Task 5.2** — Enriquecimento por CNPJ (BrasilAPI)
- **Task 5.3** — Site e redes sociais
- **Task 5.4** — Rate limit + filas (`bullmq`) + observabilidade (`pino`, `/metrics`, `/health`)

### Se tiver pouco tempo
Priorize: **1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 4.1 → 4.2**.
Com isso já dá pra rodar o Finder com IA básica e converter assinantes via integração interna.

---

## Boas práticas

### Faça
- 1 prompt por task, esperando concluir antes da próxima.
- Commit ao final de cada task: `feat(fase-N): Task X.Y — descrição`.
- Atualize um `CHANGELOG.md` curto a cada task concluída.
- Rode `npm install` e teste **antes** de seguir.
- Use branch isolada: `feature/task-1.1-postgres`.

### Evite
- Implementar várias tasks de uma vez.
- Aceitar código com `TODO`, `// implementar`, imports faltando.
- Reintroduzir `workspace_id` — o projeto é **single-org**.
- Commitar `.env` (está no `.gitignore`).
- Acoplar lógica de scraping a controllers (mantenha em `scrapers/`).
- Misturar lógica de pitch com persistência (use `services/aiService.js`).

---

## Checklist após cada task

- [ ] Arquivos compilam sem erros (`node arquivo.js` ou `npm start`)
- [ ] Imports/exports corretos
- [ ] Dependências em `package.json`
- [ ] Variáveis novas em `.env.example`
- [ ] Testes manuais via cURL/Insomnia documentados
- [ ] Sem TODOs ou placeholders
- [ ] Commit com mensagem clara
- [ ] `implementation_plan.md` atualizado se a task abriu sub-itens novos

---

## Troubleshooting

### Cursor não gera código completo
Seja explícito: *"sem TODOs, sem omissões, código pronto para produção; decida defaults razoáveis e justifique no commit"*. Liste arquivos exatos e o que cada um deve exportar.

### Código gerado quebra import
1. Cheque deps em `package.json`
2. Rode `npm install`
3. O projeto usa **CommonJS** (`require/module.exports`) no backend e ESM no frontend (Vite).

### Erro de conexão com Postgres
```powershell
# Windows (servidor instalado)
Get-Service postgresql*

# Listar BDs
psql -U postgres -c "\l"

# Criar BD
createdb -U postgres azulli_finder
```

### Erro 401 em endpoints autenticados
- Header correto: `Authorization: Bearer <token>`
- `JWT_SECRET` precisa ser o mesmo no emissor e validador
- Token expira em 7 dias por padrão

### Scraper retornando 0 resultados
- DOM do Maps mudou. Inspecione com `headless: false` temporariamente.
- Aumente `timeout` em `page.goto` para 60s.
- Aguarde 30s entre buscas para evitar throttling.

---

## Atualize a documentação a cada fase

Ao fechar cada fase, atualize:

1. **`implementation_plan.md`** — marca tasks concluídas, registra aprendizados.
2. **`README.md`** — atualiza "O que já funciona hoje".
3. **`SUMMARY.md`** — atualiza tabela de roadmap.
4. **`CHANGELOG.md`** — registra cada release.

---

## Exemplo completo: do zero até a Task 1.1

```powershell
# 1. Estrutura
mkdir azulli-finder
cd azulli-finder
mkdir config, models, migrations, routes, controllers, middleware, scrapers, services

# 2. Iniciar projeto (repo novo)
npm init -y
npm install express puppeteer cors dotenv pg knex bcryptjs jsonwebtoken

# 3. .env
@'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/azulli_finder
JWT_SECRET=troque-este-valor-em-producao
'@ | Set-Content -Encoding utf8 .env

# 4. Abrir no Cursor
cursor .

# 5. Cole o prompt da Task 1.1 (acima)

# 6. Após gerar:
createdb -U postgres azulli_finder
psql -U postgres azulli_finder -f migrations/001_initial_schema.sql

# 7. Validar
node -e "require('./config/database').query('SELECT NOW()').then(r => console.log(r.rows[0]))"

# 8. Commit
git add .
git commit -m "feat(fase-1): Task 1.1 — PostgreSQL e migrations (single-org)"
```

---

## Próximos passos

1. Você tem o `implementation_plan.md` reformulado.
2. Abra o Cursor no projeto.
3. Comece pela **Task 1.1**.
4. Avance pelas tasks na ordem recomendada.
5. Após Fase 4, o Finder já provisiona assinantes no núcleo Azulli automaticamente.

---

**Boa evolução!** Mantenha as premissas claras (single-org, ICP score como eixo, conversão = virar assinante) e o resto do código segue natural.
