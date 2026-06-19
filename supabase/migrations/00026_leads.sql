-- ============================================================================
-- AZULLI — Leads de campanhas (n8n / Meta Ads → painel admin)
-- ============================================================================

create type public.lead_status as enum ('novo', 'contatado', 'ativado');

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  email        text,
  cnpj         text,
  status       public.lead_status not null default 'novo',
  utm_source   text,
  utm_campaign text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.leads is
  'Leads capturados via webhook n8n (nível plataforma, sem tenant)';

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create index idx_leads_status on public.leads(status);
create index idx_leads_created on public.leads(created_at desc);
create index idx_leads_email on public.leads(email) where email is not null;

alter table public.leads enable row level security;
alter table public.leads force row level security;

-- Acesso apenas via service role (APIs admin + webhook)
