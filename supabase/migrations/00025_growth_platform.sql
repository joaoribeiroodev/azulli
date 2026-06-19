-- ============================================================================
-- AZULLI — Growth Platform: inbound IA, métricas admin, avisos globais
-- ============================================================================

-- Status do lead inbound (pré-conversão → tenant)
create type public.inbound_lead_status as enum (
  'NEW_INBOUND',
  'IN_NEGOTIATION',
  'CONVERTED'
);

create type public.inbound_message_sender as enum ('user', 'ai', 'system');

-- ----------------------------------------------------------------------------
-- platform_admins — operadores do painel admin (subdomínio)
-- ----------------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Usuários com acesso ao subdomínio admin e APIs /api/admin/*';

-- ----------------------------------------------------------------------------
-- inbound_leads — leads de Meta Ads / WhatsApp (nível plataforma)
-- tenant_id preenchido após conversão em assinatura
-- ----------------------------------------------------------------------------
create table public.inbound_leads (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  phone        text not null,
  status       public.inbound_lead_status not null default 'NEW_INBOUND',
  tenant_id    uuid references public.tenants(id) on delete set null,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint inbound_leads_phone_unique unique (phone)
);

create trigger trg_inbound_leads_updated_at
  before update on public.inbound_leads
  for each row execute function public.set_updated_at();

create index idx_inbound_leads_status on public.inbound_leads(status);
create index idx_inbound_leads_tenant on public.inbound_leads(tenant_id)
  where tenant_id is not null;
create index idx_inbound_leads_created on public.inbound_leads(created_at desc);

-- ----------------------------------------------------------------------------
-- inbound_messages — histórico de conversas com a IA de vendas
-- ----------------------------------------------------------------------------
create table public.inbound_messages (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.inbound_leads(id) on delete cascade,
  sender     public.inbound_message_sender not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index idx_inbound_messages_lead on public.inbound_messages(lead_id, created_at);

-- ----------------------------------------------------------------------------
-- ad_spend — investimento em campanhas (Meta Ads etc.)
-- ----------------------------------------------------------------------------
create table public.ad_spend (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  platform      text not null,
  campaign_name text,
  amount_spent  numeric(12, 2) not null check (amount_spent >= 0),
  created_at    timestamptz not null default now()
);

create index idx_ad_spend_date on public.ad_spend(date desc);

-- ----------------------------------------------------------------------------
-- billing_payments — pagamentos com atribuição ao lead (LTV / funil)
-- ----------------------------------------------------------------------------
create table public.billing_payments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  lead_id          uuid references public.inbound_leads(id) on delete set null,
  asaas_payment_id text unique,
  amount           numeric(12, 2) not null check (amount >= 0),
  status           text not null,
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_billing_payments_tenant on public.billing_payments(tenant_id);
create index idx_billing_payments_lead on public.billing_payments(lead_id)
  where lead_id is not null;
create index idx_billing_payments_paid on public.billing_payments(paid_at desc)
  where paid_at is not null;

-- Vínculo opcional na subscription
alter table public.subscriptions
  add column if not exists lead_id uuid references public.inbound_leads(id) on delete set null;

-- ----------------------------------------------------------------------------
-- system_announcements — avisos globais do admin
-- ----------------------------------------------------------------------------
create table public.system_announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  priority     text not null default 'normal'
                 check (priority in ('low', 'normal', 'high')),
  audience     text not null default 'all'
                 check (audience in ('all', 'trial', 'pro', 'enterprise')),
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index idx_system_announcements_published
  on public.system_announcements(published_at desc);

-- ----------------------------------------------------------------------------
-- announcement_reads — controle lido/não lido por usuário
-- ----------------------------------------------------------------------------
create table public.announcement_reads (
  user_id         uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.system_announcements(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

alter table public.inbound_leads enable row level security;
alter table public.inbound_leads force row level security;

alter table public.inbound_messages enable row level security;
alter table public.inbound_messages force row level security;

alter table public.ad_spend enable row level security;
alter table public.ad_spend force row level security;

alter table public.billing_payments enable row level security;
alter table public.billing_payments force row level security;

alter table public.system_announcements enable row level security;
alter table public.system_announcements force row level security;

alter table public.announcement_reads enable row level security;
alter table public.announcement_reads force row level security;

-- Avisos publicados visíveis para usuários autenticados
create policy "announcements_select_published"
  on public.system_announcements for select to authenticated
  using (
    published_at <= now()
    and (expires_at is null or expires_at > now())
  );

-- Usuário marca próprio aviso como lido
create policy "announcement_reads_select_own"
  on public.announcement_reads for select to authenticated
  using (user_id = auth.uid());

create policy "announcement_reads_insert_own"
  on public.announcement_reads for insert to authenticated
  with check (user_id = auth.uid());

-- billing_payments: tenant members read own tenant payments (opcional para UI futura)
create policy "billing_payments_select_own_tenant"
  on public.billing_payments for select to authenticated
  using (tenant_id in (select public.current_user_tenant_ids()));

-- inbound_leads/messages, ad_spend, platform_admins: apenas service role (sem policy authenticated)
