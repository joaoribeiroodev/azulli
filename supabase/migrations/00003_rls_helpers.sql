-- ============================================================================
-- AZULLI — Funções helper de RLS (rodam APÓS criação das tabelas)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: bypassa RLS, evitando recursão quando policies de
-- tenant_users referenciariam a própria tabela tenant_users.
-- ============================================================================

create or replace function public.current_user_tenant_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id
  from public.tenant_users
  where user_id = auth.uid();
$$;

create or replace function public.user_belongs_to_tenant(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_users
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
  );
$$;

create or replace function public.user_has_role_in_tenant(
  p_tenant_id uuid,
  p_roles public.tenant_role[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_users
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = any(p_roles)
  );
$$;

-- Restringe execução das funções helper apenas a usuários autenticados
revoke all on function public.current_user_tenant_ids()                                from public;
revoke all on function public.user_belongs_to_tenant(uuid)                             from public;
revoke all on function public.user_has_role_in_tenant(uuid, public.tenant_role[])      from public;

grant execute on function public.current_user_tenant_ids()                             to authenticated;
grant execute on function public.user_belongs_to_tenant(uuid)                          to authenticated;
grant execute on function public.user_has_role_in_tenant(uuid, public.tenant_role[])   to authenticated;