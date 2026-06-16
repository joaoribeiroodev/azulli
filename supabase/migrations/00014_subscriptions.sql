-- ============================================================================
-- AZULLI — Fase 5: Billing & Asaas
-- Tabelas: subscriptions + webhook_events
-- ============================================================================

-- subscriptions — vínculo entre tenant e Asaas (uma row por tenant)
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null unique references public.tenants(id) on delete cascade,
  asaas_customer_id     text,                                     -- cus_xxxxxxxx (pode ser null durante criação)
  asaas_subscription_id text,                                     -- sub_xxxxxxxx (idem)
  plan_id               text not null
                          check (plan_id in ('pro', 'enterprise')),
  status                text not null default 'pending'
                          check (status in ('pending', 'active', 'past_due', 'canceled', 'trial_expired')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  canceled_at           timestamptz,
  billing_type          text
                          check (billing_type in ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index idx_subscriptions_tenant_id
  on public.subscriptions(tenant_id);

create index idx_subscriptions_asaas_subscription
  on public.subscriptions(asaas_subscription_id)
  where asaas_subscription_id is not null;

comment on table public.subscriptions is
  'Vínculo entre tenant e Asaas. Atualizado via webhook.';

-- webhook_events — log de webhooks para garantir idempotência
-- Asaas pode reenviar o mesmo evento em caso de falha ou timeout.
create table public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,                      -- 'asaas' por enquanto
  event_id     text not null,                      -- ID único vindo no payload
  event_type   text not null,
  payload      jsonb not null,
  processed_at timestamptz,                        -- null = ainda não processado
  error        text,                               -- preenchido se processamento falhou
  created_at   timestamptz not null default now(),

  constraint uq_webhook_provider_event unique (provider, event_id)
);

create index idx_webhook_events_provider_event
  on public.webhook_events(provider, event_id);

comment on table public.webhook_events is
  'Log de webhooks recebidos. Garante idempotência via unique(provider, event_id).';

-- ============================================================================
-- RLS — subscriptions
-- Usuários autenticados só leem a subscription do próprio tenant.
-- Insert/Update/Delete exclusivo via service role (webhook handler).
-- ============================================================================

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

create policy "subscriptions_select_own_tenant"
  on public.subscriptions for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

-- ============================================================================
-- RLS — webhook_events
-- Sem policies para authenticated: acessível apenas via service role.
-- O webhook handler usa createServiceRoleClient() que bypassa o RLS.
-- ============================================================================

alter table public.webhook_events enable row level security;
alter table public.webhook_events force row level security;
