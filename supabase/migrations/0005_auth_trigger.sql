-- ============================================================================
-- AZULLI — Trigger de Signup: cria tenant em trial automaticamente
-- ----------------------------------------------------------------------------
-- Quando um novo usuário é criado em auth.users (signup via Supabase Auth),
-- este trigger:
--   1. Cria um tenant com tier='trial' e trial_ends_at = now() + 7 dias
--   2. Vincula o usuário como 'owner' do tenant
--   3. Cria tenant_settings com defaults
--
-- Os campos `name` e `phone` (WhatsApp) chegam via raw_user_meta_data,
-- preenchidos no signUp() do Supabase Auth no front (Fase 2).
--
-- SECURITY DEFINER: roda com privilégios do owner da função (postgres no
-- Supabase), bypassando RLS para conseguir inserir nas três tabelas.
-- ============================================================================

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
begin
  -- Fallback amigável caso o front não envie o nome
  v_tenant_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    'Minha Empresa'
  );

  v_user_phone := nullif(trim(new.raw_user_meta_data->>'phone'), '');

  -- 1) Cria o tenant em trial de 7 dias
  insert into public.tenants (name, tier, subscription_status, trial_ends_at)
  values (
    v_tenant_name,
    'trial',
    'active',
    now() + interval '7 days'
  )
  returning id into v_tenant_id;

  -- 2) Vincula o usuário como owner
  insert into public.tenant_users (tenant_id, user_id, role)
  values (v_tenant_id, new.id, 'owner');

  -- 3) Cria configurações padrão (regime MEI por padrão; ajustável no onboarding)
  insert into public.tenant_settings (tenant_id, default_tax_regime, whatsapp_number)
  values (v_tenant_id, 'mei', v_user_phone);

  return new;
end;
$$;

-- Trigger AFTER INSERT em auth.users
-- (drop antes de recriar para idempotência em re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();