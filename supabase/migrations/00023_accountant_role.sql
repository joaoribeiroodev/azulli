-- ============================================================================
-- AZULLI — Role contador + convite via metadata
-- ============================================================================

ALTER TYPE public.tenant_role ADD VALUE IF NOT EXISTS 'accountant';

-- Recria handle_new_user para suportar convite a tenant existente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id   uuid;
  v_tenant_name text;
  v_user_phone  text;
  v_invite_tid  text;
  v_invite_role text;
begin
  v_invite_tid := nullif(trim(new.raw_user_meta_data->>'invite_tenant_id'), '');
  v_invite_role := coalesce(
    nullif(trim(new.raw_user_meta_data->>'invited_role'), ''),
    'accountant'
  );

  if v_invite_tid is not null then
    v_tenant_id := v_invite_tid::uuid;
    insert into public.tenant_users (tenant_id, user_id, role)
    values (v_tenant_id, new.id, v_invite_role::public.tenant_role)
    on conflict (tenant_id, user_id) do update
      set role = excluded.role;
    return new;
  end if;

  v_tenant_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    'Minha Empresa'
  );

  v_user_phone := nullif(trim(new.raw_user_meta_data->>'phone'), '');

  insert into public.tenants (name, tier, subscription_status, trial_ends_at)
  values (
    v_tenant_name,
    'trial',
    'active',
    now() + interval '7 days'
  )
  returning id into v_tenant_id;

  insert into public.tenant_users (tenant_id, user_id, role)
  values (v_tenant_id, new.id, 'owner');

  insert into public.tenant_settings (tenant_id, default_tax_regime, whatsapp_number)
  values (v_tenant_id, 'mei', v_user_phone);

  return new;
end;
$$;

-- Helper para convite (service role / server actions)
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;
