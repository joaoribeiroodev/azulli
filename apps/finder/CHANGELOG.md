# Changelog — Azulli Finder

Todas as mudanças relevantes do projeto.

## [1.1.0] — 2026-06-19

### Adicionado — Docker
- **`Dockerfile`** baseado em `ghcr.io/puppeteer/puppeteer:22.15.0` (Chrome já pré-instalado), com locale `pt_BR.UTF-8`, timezone `America/Sao_Paulo`, `tini` como init e healthcheck. Build inicial cai de ~20 min para ~3-5 min e rebuilds com mudança de código levam segundos.
- **`docker-compose.yml`** orquestrando `app` + `postgres:16-alpine` + `pgadmin` (opcional, perfil `tools`):
  - Network própria, volumes persistentes (`postgres_data`, `pgadmin_data`).
  - Healthcheck do Postgres com `pg_isready` — app só sobe quando o banco está pronto.
  - `JWT_SECRET` obrigatório (compose falha se não estiver definido).
- **`docker-entrypoint.sh`** que roda migrations + seed do admin (idempotente) + `exec` do servidor.
- **`.dockerignore`** para imagem enxuta.
- **Scripts npm**: `docker:up`, `docker:down`, `docker:logs`, `docker:rebuild`, `docker:psql`, `docker:tools`.

### Alterado
- `scripts/seedAdmin.js` agora sai com código 0 (warning) quando `ADMIN_PASSWORD` está vazia — não derruba o entrypoint Docker.
- `.env.example` ganha variáveis do compose (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT_EXPOSED`, `PGADMIN_*`).
- README ganha seção "Setup com Docker" como caminho recomendado.

## [1.0.0] — 2026-06-19

### Reformulação completa (Fase 0 → Fase 1 + 2)

#### Backend (novo, modular)
- Reescrita do `server.js` como bootstrap modular (config + routes + middlewares + error handler).
- **Configuração**: `config/env.js` (validação de envs), `config/database.js` (pool pg + transactions + healthcheck), `config/openai.js` (cliente opcional).
- **Persistência** (Fase 1): PostgreSQL com `migrations/001_initial_schema.sql` cobrindo `users`, `searches`, `leads`, `lead_status_history`, `ai_usage`.
- **Modelo**: single-org, multi-usuário com roles (`admin`, `sdr`, `bdr`, `closer`, `ops`, `viewer`). Ownership de lead por `responsavel_id`.
- **Models** (SQL puro): `User`, `Search`, `Lead` com filtros, upsert dedup, mudança de status auditável.
- **Auth**: JWT (login + me), middleware `requireAuth` e `requireRole`.
- **CRUD de leads**: listar com filtros (status, segmento, UF, cidade, score, responsável, texto), obter, atualizar, atribuir, mudar status, excluir, enriquecer, regerar pitch, estatísticas.
- **Scripts CLI**: `npm run migrate` (runner versionado em `schema_migrations`) e `npm run seed:admin`.
- **IA** (Fase 2, opcional): `services/aiService.js` com classificação de segmento, **ICP score** (fit com perfil de assinante Azulli), **pitch de venda do Azulli** (WhatsApp/Email), validação. Roda em background depois da busca. Custo registrado em `ai_usage`.
- **Scraper** isolado em `scrapers/googleMaps.js` (DOM atualizado para `div[role="feed"]`, scroll com lazy loading, dedup interno).

#### Frontend (SPA reformulado)
- Single Page Application com hash router próprio (sem build step).
- **Login** com paleta Azulli (azul gradient) e JWT persistido em `localStorage`.
- **Dashboard**: cartões de KPI, gráficos (funil, segmentos, distribuição geográfica) com Chart.js.
- **Buscar leads**: form com sugestões de ICP, resultados em tabela, exportação Excel (SheetJS), abertura direta no WhatsApp/Maps.
- **Leads**: lista com filtros avançados (status, segmento, UF, score mínimo, busca textual, ordenação).
- **Detalhe do lead**: dados completos, pitch sugerido com regerar/copiar, notas comerciais, atribuição, mudança de status, histórico auditável, re-enriquecimento por IA.
- **Kanban**: pipeline drag-and-drop entre 6 colunas (novo → assinante).
- **Histórico**: buscas executadas com opção de repetir.
- **Equipe**: lista de usuários internos; admin pode criar/ativar/desativar.
- UI helpers em `ui.js`: toasts, modais, badges de status/score, formatação BR.

#### Documentação
- `README.md` reformulado como ferramenta interna de prospecção de assinantes do Azulli.
- `implementation_plan.md` reescrito: single-org, ICP score, pitch de venda do Azulli, Fase 4 = provisionar assinante no núcleo Azulli (sem Asaas).
- `SUMMARY.md` e `CURSOR_WORKFLOW.md` alinhados ao novo posicionamento.
- `.env.example` completo.

### Removido
- Integração de pagamento com **Asaas** (fora do escopo deste módulo).
- HTML monolítico antigo do MVP.

### Pendente (próximas fases)
- **Fase 3.x**: gráfico de funil com taxas de conversão, salvar filtros favoritos.
- **Fase 4**: integração com núcleo Azulli (provisionar assinante, SSO, webhooks).
- **Fase 5**: Google Places API, enriquecimento por CNPJ (BrasilAPI), redes sociais, rate limit e fila com Redis/BullMQ.
