-- ============================================================================
-- AZULLI — Fase 9: Previsão de Fluxo de Caixa
-- ----------------------------------------------------------------------------
-- A previsão em si é calculada em runtime (engine estatístico em
-- src/lib/forecast/engine.ts). Esta migration só cria infraestrutura para
-- alertas dismissáveis: o usuário pode esconder um alerta específico e ele
-- não volta a aparecer enquanto a "chave" (alert_key) for a mesma.
--
-- alert_key é um hash determinístico de (tipo + payload essencial), gerado
-- no servidor. Ex: "cash_shortage:2026-07-15:1500.00".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tabela: forecast_dismissed_alerts
-- ---------------------------------------------------------------------------

create table if not exists public.forecast_dismissed_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null,
  dismissed_at timestamptz not null default now(),

  unique (tenant_id, user_id, alert_key)
);

comment on table public.forecast_dismissed_alerts is
  'Alertas de previsão de fluxo descartados pelo usuário. Chave (alert_key) é determinística — se a situação reaparecer com novos números, gera nova chave e o alerta volta.';

create index if not exists forecast_dismissed_alerts_tenant_user_idx
  on public.forecast_dismissed_alerts (tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- RLS — usuário só vê os próprios dismisses dentro do tenant
-- ---------------------------------------------------------------------------

alter table public.forecast_dismissed_alerts enable row level security;

drop policy if exists "forecast_dismissed_alerts_select" on public.forecast_dismissed_alerts;
create policy "forecast_dismissed_alerts_select"
  on public.forecast_dismissed_alerts
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  );

drop policy if exists "forecast_dismissed_alerts_insert" on public.forecast_dismissed_alerts;
create policy "forecast_dismissed_alerts_insert"
  on public.forecast_dismissed_alerts
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  );

drop policy if exists "forecast_dismissed_alerts_delete" on public.forecast_dismissed_alerts;
create policy "forecast_dismissed_alerts_delete"
  on public.forecast_dismissed_alerts
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid()
    )
  );
