-- ============================================================================
-- AZULLI — Finder (prospecção comercial) no mesmo Postgres do SaaS
-- Schema isolado: finder.* (single-org, não multi-tenant)
-- ============================================================================

create schema if not exists finder;

comment on schema finder is
  'Azulli Finder — time comercial interno (leads, buscas, pipeline).';

-- Usuários internos (JWT próprio — distinto de auth.users)
create table finder.users (
  id              uuid primary key default gen_random_uuid(),
  email           varchar(255) unique not null,
  password_hash   varchar(255) not null,
  nome            varchar(255) not null,
  role            varchar(50)  not null default 'sdr',
  ativo           boolean      not null default true,
  ultimo_login    timestamptz,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

create index idx_finder_users_role  on finder.users(role);
create index idx_finder_users_ativo on finder.users(ativo);

create table finder.searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references finder.users(id) on delete set null,
  termo           varchar(255) not null,
  localizacao     varchar(255) not null,
  fonte           varchar(50)  not null default 'google_maps',
  total_results   integer,
  duracao_ms      integer,
  erro            text,
  created_at      timestamptz  not null default now()
);

create index idx_finder_searches_user_date on finder.searches(user_id, created_at desc);
create index idx_finder_searches_date      on finder.searches(created_at desc);

create table finder.leads (
  id                    uuid primary key default gen_random_uuid(),
  search_id             uuid references finder.searches(id) on delete set null,
  nome                  varchar(255) not null,
  telefone              varchar(32),
  whatsapp              varchar(32),
  email                 varchar(255),
  endereco              text,
  cidade                varchar(120),
  uf                    char(2),
  cep                   varchar(10),
  cnpj                  varchar(20),
  avaliacao             decimal(3,1),
  total_avaliacoes      integer,
  maps_url              text,
  website               text,
  segmento              varchar(100),
  porte                 varchar(20),
  icp_score             integer check (icp_score is null or (icp_score between 0 and 100)),
  pitch_whatsapp        text,
  pitch_email           text,
  validado              boolean not null default false,
  enriquecido_em        timestamptz,
  status                varchar(40) not null default 'novo',
  responsavel_id        uuid references finder.users(id) on delete set null,
  notas                 text,
  azulli_account_id     uuid references public.tenants(id) on delete set null,
  plano_contratado      varchar(40),
  data_assinatura       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_finder_leads_status      on finder.leads(status);
create index idx_finder_leads_segmento    on finder.leads(segmento);
create index idx_finder_leads_uf_cidade   on finder.leads(uf, cidade);
create index idx_finder_leads_responsavel on finder.leads(responsavel_id);
create index idx_finder_leads_icp_score   on finder.leads(icp_score desc nulls last);
create index idx_finder_leads_created     on finder.leads(created_at desc);

create unique index idx_finder_leads_dedup
  on finder.leads (lower(nome), lower(coalesce(endereco, '')));

create table finder.lead_status_history (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references finder.leads(id) on delete cascade,
  user_id         uuid references finder.users(id) on delete set null,
  status_anterior varchar(40),
  status_novo     varchar(40) not null,
  motivo          text,
  created_at      timestamptz not null default now()
);

create index idx_finder_lsh_lead_id on finder.lead_status_history(lead_id, created_at desc);

create table finder.ai_usage (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references finder.leads(id) on delete set null,
  user_id         uuid references finder.users(id) on delete set null,
  acao            varchar(40) not null,
  modelo          varchar(40) not null,
  tokens_in       integer,
  tokens_out      integer,
  custo_usd       decimal(10,6),
  erro            text,
  created_at      timestamptz not null default now()
);

create index idx_finder_ai_usage_lead_date on finder.ai_usage(lead_id, created_at desc);
create index idx_finder_ai_usage_date      on finder.ai_usage(created_at desc);

create table finder.lead_conversions (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references finder.leads(id) on delete cascade,
  user_id           uuid references finder.users(id) on delete set null,
  plano             varchar(40) not null,
  status_resultado  varchar(40) not null,
  azulli_account_id uuid references public.tenants(id) on delete set null,
  payload_request   jsonb,
  payload_response  jsonb,
  erro              text,
  created_at        timestamptz not null default now()
);

create index idx_finder_lead_conversions_lead
  on finder.lead_conversions(lead_id, created_at desc);

create trigger trg_finder_users_updated_at
  before update on finder.users
  for each row execute function public.set_updated_at();

create trigger trg_finder_leads_updated_at
  before update on finder.leads
  for each row execute function public.set_updated_at();

-- Service role acessa finder (API Next.js com DATABASE_URL / service role)
grant usage on schema finder to postgres, service_role;
grant all on all tables in schema finder to postgres, service_role;
grant all on all sequences in schema finder to postgres, service_role;
alter default privileges in schema finder grant all on tables to postgres, service_role;
alter default privileges in schema finder grant all on sequences to postgres, service_role;
