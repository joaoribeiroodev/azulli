-- ============================================================================
-- AZULLI — Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------
-- Estratégia:
--   1) Habilitar RLS em TODAS as tabelas de domínio
--   2) Cruzar auth.uid() com tenant_users via funções SECURITY DEFINER
--      (evita recursão infinita ao consultar tenant_users dentro da policy)
--   3) Operações destrutivas/sensíveis (tenants, tenant_users) exigem role
--      'owner' ou 'admin'
-- ============================================================================

-- Habilita RLS em todas as tabelas
alter table public.tenants          enable row level security;
alter table public.tenant_users     enable row level security;
alter table public.tenant_settings  enable row level security;
alter table public.customers        enable row level security;
alter table public.transactions     enable row level security;
alter table public.invoices         enable row level security;

-- (Bom hábito) Force RLS também para o owner da tabela
alter table public.tenants          force row level security;
alter table public.tenant_users     force row level security;
alter table public.tenant_settings  force row level security;
alter table public.customers        force row level security;
alter table public.transactions     force row level security;
alter table public.invoices         force row level security;

-- ============================================================================
-- tenants
-- ----------------------------------------------------------------------------
-- INSERT: bloqueado para cliente. Tenant é criado APENAS pelo trigger
--         on_auth_user_created (SECURITY DEFINER, bypassa RLS) ou via
--         service_role (jobs/webhooks).
-- DELETE: bloqueado. Exclusão de empresa é processo administrativo.
-- ============================================================================
create policy "tenants_select_own"
  on public.tenants
  for select
  to authenticated
  using ( id in (select public.current_user_tenant_ids()) );

create policy "tenants_update_own_by_owner_or_admin"
  on public.tenants
  for update
  to authenticated
  using (
    public.user_has_role_in_tenant(id, array['owner', 'admin']::public.tenant_role[])
  )
  with check (
    public.user_has_role_in_tenant(id, array['owner', 'admin']::public.tenant_role[])
  );

-- ============================================================================
-- tenant_users
-- ----------------------------------------------------------------------------
-- SELECT: usuário enxerga todos os membros dos tenants aos quais pertence
-- INSERT/UPDATE/DELETE: apenas owner pode gerenciar membros (convites/promoções)
-- ============================================================================
create policy "tenant_users_select_own_tenants"
  on public.tenant_users
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "tenant_users_insert_by_owner"
  on public.tenant_users
  for insert
  to authenticated
  with check (
    public.user_has_role_in_tenant(tenant_id, array['owner']::public.tenant_role[])
  );

create policy "tenant_users_update_by_owner"
  on public.tenant_users
  for update
  to authenticated
  using (
    public.user_has_role_in_tenant(tenant_id, array['owner']::public.tenant_role[])
  )
  with check (
    public.user_has_role_in_tenant(tenant_id, array['owner']::public.tenant_role[])
  );

create policy "tenant_users_delete_by_owner"
  on public.tenant_users
  for delete
  to authenticated
  using (
    public.user_has_role_in_tenant(tenant_id, array['owner']::public.tenant_role[])
  );

-- ============================================================================
-- tenant_settings
-- ----------------------------------------------------------------------------
-- INSERT: bloqueado (criado pelo trigger). UPDATE: owner/admin.
-- ============================================================================
create policy "tenant_settings_select_own"
  on public.tenant_settings
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "tenant_settings_update_by_owner_or_admin"
  on public.tenant_settings
  for update
  to authenticated
  using (
    public.user_has_role_in_tenant(tenant_id, array['owner', 'admin']::public.tenant_role[])
  )
  with check (
    public.user_has_role_in_tenant(tenant_id, array['owner', 'admin']::public.tenant_role[])
  );

-- ============================================================================
-- customers
-- ----------------------------------------------------------------------------
-- Qualquer membro do tenant pode gerenciar clientes.
-- ============================================================================
create policy "customers_select_own_tenant"
  on public.customers
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "customers_insert_own_tenant"
  on public.customers
  for insert
  to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "customers_update_own_tenant"
  on public.customers
  for update
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "customers_delete_own_tenant"
  on public.customers
  for delete
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- ============================================================================
-- transactions
-- ============================================================================
create policy "transactions_select_own_tenant"
  on public.transactions
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "transactions_insert_own_tenant"
  on public.transactions
  for insert
  to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "transactions_update_own_tenant"
  on public.transactions
  for update
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "transactions_delete_own_tenant"
  on public.transactions
  for delete
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- ============================================================================
-- invoices
-- ----------------------------------------------------------------------------
-- Emissão sempre passa por Server Action (Fase 4). Aqui só garantimos
-- isolamento por tenant.
-- ============================================================================
create policy "invoices_select_own_tenant"
  on public.invoices
  for select
  to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "invoices_insert_own_tenant"
  on public.invoices
  for insert
  to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "invoices_update_own_tenant"
  on public.invoices
  for update
  to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

-- DELETE de invoice é bloqueado para clientes (nota fiscal é registro fiscal)
-- Apenas service_role pode remover, em caso de cancelamento técnico.