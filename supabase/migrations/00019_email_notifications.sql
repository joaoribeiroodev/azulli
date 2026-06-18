-- ============================================================================
-- AZULLI — Fase 11A: Preferências de email + auditoria de envios
-- ----------------------------------------------------------------------------
-- email_preferences: 1:1 com (tenant_id, user_id). Cada usuário decide se
--   recebe insights semanais, lembretes etc. Default opt-in pra features
--   transacionais que ajudam o usuário (não é marketing).
--
-- email_logs: auditoria de toda mensagem disparada. Permite debugging,
--   evitar reenvios duplicados e métricas de delivery.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum: tipos de email enviados pelo Azulli
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.email_kind as enum (
    'weekly_insights',     -- Fase 11
    'collection_reminder', -- Fase 10 (futuro)
    'overdue_alert',       -- Futuro
    'trial_ending',        -- Futuro
    'transactional'        -- Genérico (recibo, confirmação, etc.)
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.email_status as enum (
    'queued',
    'sent',
    'failed',
    'skipped'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tabela: email_preferences
-- ---------------------------------------------------------------------------

create table if not exists public.email_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  weekly_insights_enabled    boolean not null default true,
  collection_reminders_enabled boolean not null default true,
  overdue_alerts_enabled     boolean not null default true,

  /* Última vez que cada email foi enviado — usado para evitar reenvios
     duplicados quando o cron roda mais de uma vez na mesma janela. */
  weekly_insights_last_sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, user_id)
);

create trigger trg_email_preferences_updated_at
  before update on public.email_preferences
  for each row execute function public.set_updated_at();

create index if not exists email_preferences_tenant_user_idx
  on public.email_preferences (tenant_id, user_id);

create index if not exists email_preferences_weekly_enabled_idx
  on public.email_preferences (weekly_insights_enabled)
  where weekly_insights_enabled = true;

comment on table public.email_preferences is
  'Preferências de email por usuário/tenant. Default opt-in para emails que ajudam o usuário a operar (não-marketing).';

-- ---------------------------------------------------------------------------
-- Tabela: email_logs
-- ---------------------------------------------------------------------------

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.email_kind not null,
  status public.email_status not null default 'queued',

  /* ID do provedor (Resend) — pra correlacionar webhooks de bounce/open. */
  provider_message_id text,

  recipient_email text not null,
  subject text not null,
  /* Payload JSON do que foi renderizado (KPIs, alertas) — útil pra debug. */
  payload jsonb,
  error_message text,

  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_tenant_idx on public.email_logs (tenant_id);
create index if not exists email_logs_user_kind_sent_idx
  on public.email_logs (user_id, kind, sent_at desc);
create index if not exists email_logs_provider_msg_id_idx
  on public.email_logs (provider_message_id)
  where provider_message_id is not null;

comment on table public.email_logs is
  'Auditoria de todo email enviado. Status atualizado por webhook do Resend.';

-- ---------------------------------------------------------------------------
-- RLS — usuário só vê suas próprias preferências e logs
-- ---------------------------------------------------------------------------

alter table public.email_preferences enable row level security;
alter table public.email_logs enable row level security;

-- email_preferences: leitura/escrita do próprio usuário
drop policy if exists "email_preferences_select" on public.email_preferences;
create policy "email_preferences_select"
  on public.email_preferences
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  );

drop policy if exists "email_preferences_insert" on public.email_preferences;
create policy "email_preferences_insert"
  on public.email_preferences
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  );

drop policy if exists "email_preferences_update" on public.email_preferences;
create policy "email_preferences_update"
  on public.email_preferences
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  )
  with check (user_id = auth.uid());

-- email_logs: usuário só lê os próprios. Inserts são feitos apenas pelo
-- service-role no cron (não precisa de policy de insert para authenticated).
drop policy if exists "email_logs_select" on public.email_logs;
create policy "email_logs_select"
  on public.email_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Auto-criação de email_preferences ao criar tenant_user
-- ---------------------------------------------------------------------------

create or replace function public.create_default_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_preferences (tenant_id, user_id)
  values (new.tenant_id, new.user_id)
  on conflict (tenant_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_default_email_preferences on public.tenant_users;
create trigger trg_create_default_email_preferences
  after insert on public.tenant_users
  for each row execute function public.create_default_email_preferences();

-- Backfill — cria preferências pra usuários existentes
insert into public.email_preferences (tenant_id, user_id)
select tu.tenant_id, tu.user_id
from public.tenant_users tu
on conflict (tenant_id, user_id) do nothing;
