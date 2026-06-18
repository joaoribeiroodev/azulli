-- ============================================================================
-- AZULLI — LGPD: exclusão de conta pelo usuário
-- ----------------------------------------------------------------------------
-- delete_my_account(): remove tenants onde o usuário é owner único (cascade
-- de todos os dados da empresa), desvincula de tenants compartilhados e
-- remove o registro em auth.users.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  r record;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  for r in
    select tu.tenant_id
    from public.tenant_users tu
    where tu.user_id = v_user_id
      and tu.role = 'owner'
      and not exists (
        select 1
        from public.tenant_users tu2
        where tu2.tenant_id = tu.tenant_id
          and tu2.user_id <> v_user_id
      )
  loop
    delete from public.tenants where id = r.tenant_id;
  end loop;

  delete from public.tenant_users where user_id = v_user_id;
  delete from public.email_preferences where user_id = v_user_id;
  delete from public.forecast_dismissed_alerts where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'LGPD: usuário autenticado exclui a própria conta e dados da empresa quando é o único owner.';
