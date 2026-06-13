-- ============================================================================
-- AZULLI — Schema Init (Extensions + Enums + Trigger genérico)
-- ============================================================================

create extension if not exists "pgcrypto" with schema public;

-- ----- Enums -----
create type public.tenant_tier         as enum ('trial', 'pro', 'enterprise');
create type public.subscription_status as enum ('active', 'past_due', 'canceled');
create type public.tenant_role         as enum ('owner', 'admin', 'member');
create type public.tax_regime          as enum ('mei', 'simples_nacional');
create type public.transaction_type    as enum ('income', 'expense');
create type public.transaction_status  as enum ('pending', 'paid', 'overdue');
create type public.invoice_type        as enum ('nfe', 'nfse');
create type public.invoice_status      as enum ('processing', 'authorized', 'error');

-- ----- Trigger genérico para updated_at -----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;