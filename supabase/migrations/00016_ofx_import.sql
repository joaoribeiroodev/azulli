-- ============================================================================
-- AZULLI — Sub-fase 7A: Importação OFX + Detector de Recorrentes
-- ----------------------------------------------------------------------------
-- Adiciona infraestrutura de origem do lançamento (manual, importação OFX,
-- recorrente detectado) + tabela de batches de importação + colunas de dedup
-- e fingerprint de recorrência.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Enum de origem do lançamento
-- ----------------------------------------------------------------------------
create type public.transaction_source as enum (
  'manual',       -- criado pelo usuário
  'ofx_import',   -- importado de extrato bancário OFX
  'recurring'     -- gerado a partir de regra recorrente (futuro)
);

-- ----------------------------------------------------------------------------
-- 2) Enum de status do batch de importação
-- ----------------------------------------------------------------------------
create type public.import_batch_status as enum (
  'parsed',       -- arquivo lido, aguardando confirmação do usuário
  'confirmed',    -- usuário confirmou; rows inseridas em transactions
  'discarded'     -- usuário descartou na revisão
);

-- ----------------------------------------------------------------------------
-- 3) Tabela import_batches — agrupa lançamentos importados em uma sessão
-- ----------------------------------------------------------------------------
create table public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete set null,
  file_name       text not null,
  bank_id         text,                                            -- BANKID do OFX (ex: "001" = BB)
  account_id      text,                                            -- ACCTID do OFX (ag/conta mascarado)
  status          public.import_batch_status not null default 'parsed',
  total_parsed    integer not null default 0,                      -- linhas lidas do OFX
  total_imported  integer not null default 0,                      -- inseridas após confirm
  total_skipped   integer not null default 0,                      -- ignoradas (duplicadas)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_import_batches_updated_at
  before update on public.import_batches
  for each row execute function public.set_updated_at();

create index idx_import_batches_tenant_created
  on public.import_batches(tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4) Colunas novas em transactions
-- ----------------------------------------------------------------------------
alter table public.transactions
  add column source             public.transaction_source not null default 'manual',
  add column import_batch_id    uuid references public.import_batches(id) on delete set null,
  add column external_ref       text,                                -- FITID (OFX) ou outro id externo
  add column recurring_group    text;                                -- fingerprint pra agrupar recorrentes

-- ----------------------------------------------------------------------------
-- 5) Dedup: unique parcial em (tenant_id, external_ref) só pra ofx_import
-- ----------------------------------------------------------------------------
-- Garante que a mesma transação OFX (mesmo FITID) não seja importada 2x.
-- Partial index porque manual entries não têm external_ref.
create unique index uq_transactions_ofx_external_ref
  on public.transactions(tenant_id, external_ref)
  where source = 'ofx_import' and external_ref is not null;

-- ----------------------------------------------------------------------------
-- 6) Index pra detector de recorrentes (fingerprint scan)
-- ----------------------------------------------------------------------------
create index idx_transactions_recurring_group
  on public.transactions(tenant_id, recurring_group)
  where recurring_group is not null;

create index idx_transactions_import_batch
  on public.transactions(import_batch_id)
  where import_batch_id is not null;

-- ----------------------------------------------------------------------------
-- 7) RLS em import_batches (mesma estratégia das outras tabelas)
-- ----------------------------------------------------------------------------
alter table public.import_batches enable row level security;
alter table public.import_batches force row level security;

create policy "import_batches_select_own_tenant"
  on public.import_batches
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "import_batches_insert_own_tenant"
  on public.import_batches
  for insert
  to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "import_batches_update_own_tenant"
  on public.import_batches
  for update
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "import_batches_delete_own_tenant"
  on public.import_batches
  for delete
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- ----------------------------------------------------------------------------
-- 8) Recria a view transactions_with_status incluindo as colunas novas
-- ----------------------------------------------------------------------------
drop view if exists public.transactions_with_status;

create view public.transactions_with_status
with (security_invoker = true) as
select
  t.id,
  t.tenant_id,
  t.customer_id,
  t.supplier_id,
  t.type,
  t.amount,
  t.category,
  t.due_date,
  t.paid_at,
  t.description,
  t.source,
  t.import_batch_id,
  t.external_ref,
  t.recurring_group,
  t.created_at,
  t.updated_at,
  case
    when t.status = 'paid'                                  then 'paid'::public.transaction_status
    when t.status = 'pending' and t.due_date < current_date then 'overdue'::public.transaction_status
    else 'pending'::public.transaction_status
  end as status,
  t.status as raw_status
from public.transactions t;

comment on view public.transactions_with_status is
  'Status dinâmico + categoria + origem (manual/ofx_import/recurring). Atualizado na Sub-fase 7A.';
