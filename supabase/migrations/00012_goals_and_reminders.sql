-- ============================================================================
-- AZULLI — Sub-fase 4.B: Goals + Reminders
-- ============================================================================

-- Goals
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  title         text not null,
  kind          text not null check (kind in ('revenue', 'profit', 'sales_count', 'custom')),
  target_value  numeric(15,2) not null check (target_value > 0),
  current_value numeric(15,2) not null default 0,  -- usado apenas quando kind='custom'
  period_start  date not null,
  period_end    date not null,
  is_archived   boolean not null default false,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint chk_goal_period check (period_end >= period_start)
);

create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create index idx_goals_tenant on public.goals(tenant_id);
create index idx_goals_active on public.goals(tenant_id, period_end) where is_archived = false;

comment on table public.goals is
  'Metas com progresso calculado dinamicamente (exceto custom, que usa current_value)';

-- Reminders
create table public.reminders (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  title         text not null,
  description   text,
  due_date      date not null,
  is_done       boolean not null default false,
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

create index idx_reminders_tenant on public.reminders(tenant_id);
create index idx_reminders_pending on public.reminders(tenant_id, due_date) where is_done = false;

-- RLS Goals
alter table public.goals enable row level security;
alter table public.goals force row level security;

create policy "goals_select_own_tenant"
  on public.goals for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );
create policy "goals_insert_own_tenant"
  on public.goals for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );
create policy "goals_update_own_tenant"
  on public.goals for update to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );
create policy "goals_delete_own_tenant"
  on public.goals for delete to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- RLS Reminders
alter table public.reminders enable row level security;
alter table public.reminders force row level security;

create policy "reminders_select_own_tenant"
  on public.reminders for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );
create policy "reminders_insert_own_tenant"
  on public.reminders for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );
create policy "reminders_update_own_tenant"
  on public.reminders for update to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );
create policy "reminders_delete_own_tenant"
  on public.reminders for delete to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );