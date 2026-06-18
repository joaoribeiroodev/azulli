-- Onboarding wizard (Fase 12)
alter table public.tenants
  add column if not exists onboarding_completed_at timestamptz;

alter table public.tenant_settings
  add column if not exists business_type text;

comment on column public.tenants.onboarding_completed_at is
  'Preenchido ao concluir o wizard /onboarding';
comment on column public.tenant_settings.business_type is
  'Tipo de negócio (serviços, comércio, etc.) — opcional';

-- Contas existentes não devem ser bloqueadas no wizard
update public.tenants
set onboarding_completed_at = now()
where onboarding_completed_at is null;
