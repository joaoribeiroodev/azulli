-- ============================================================================
-- AZULLI — Sub-fase 4.A: Funcionários (Employees)
-- ============================================================================

-- Tabela employees
create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  name          text not null,
  role          text,                  -- cargo
  email         text,
  phone         text,                  -- E.164
  document      text,                  -- CPF
  hire_date     date,                  -- data de admissão
  salary        numeric(15,2),         -- salário base (opcional)
  notes         text,
  is_active     boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

create index idx_employees_tenant_id     on public.employees(tenant_id);
create index idx_employees_tenant_active on public.employees(tenant_id) where is_active = true;
create unique index idx_employees_tenant_document on public.employees(tenant_id, document) where document is not null;

comment on table public.employees is
  'Cadastro de funcionários do tenant. Independente de transactions no momento.';

-- RLS
alter table public.employees enable row level security;
alter table public.employees force row level security;

create policy "employees_select_own_tenant"
  on public.employees for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "employees_insert_own_tenant"
  on public.employees for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "employees_update_own_tenant"
  on public.employees for update to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "employees_delete_own_tenant"
  on public.employees for delete to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );