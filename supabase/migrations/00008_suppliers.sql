-- ============================================================================
-- AZULLI — Tabela de fornecedores + supplier_id em transactions
-- ----------------------------------------------------------------------------
-- Regras:
--   - cliente só em receitas (income)
--   - fornecedor só em despesas (expense)
--   - constraint composta no nível da tabela transactions
-- ============================================================================

-- 1) Tabela suppliers (espelha customers)
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  document    text,                  -- CPF/CNPJ
  notes       text,                  -- bônus: anotações sobre o fornecedor
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create index idx_suppliers_tenant_id on public.suppliers(tenant_id);
create index idx_suppliers_email     on public.suppliers(tenant_id, email);

-- 2) Adiciona supplier_id em transactions (nullable, mesma lógica de customer_id)
alter table public.transactions
  add column supplier_id uuid references public.suppliers(id) on delete set null;

create index idx_transactions_supplier_id on public.transactions(supplier_id);

-- 3) Constraint de integridade — cliente só em income, fornecedor só em expense
-- Garante que nunca teremos uma transaction com os dois preenchidos nem com
-- o lado errado preenchido (cliente em despesa, fornecedor em receita).
alter table public.transactions
  add constraint chk_party_matches_type check (
    (type = 'income'  and supplier_id is null) and
    (type = 'expense' and customer_id is null)
    or (type = 'income'  and customer_id is not null and supplier_id is null)
    or (type = 'income'  and customer_id is null     and supplier_id is null)
    or (type = 'expense' and supplier_id is not null and customer_id is null)
    or (type = 'expense' and supplier_id is null     and customer_id is null)
  );

-- 4) RLS — mesma estratégia das outras tabelas
alter table public.suppliers enable row level security;
alter table public.suppliers force row level security;

create policy "suppliers_select_own_tenant"
  on public.suppliers
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "suppliers_insert_own_tenant"
  on public.suppliers
  for insert
  to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "suppliers_update_own_tenant"
  on public.suppliers
  for update
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "suppliers_delete_own_tenant"
  on public.suppliers
  for delete
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );