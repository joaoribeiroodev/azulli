-- ============================================================================
-- AZULLI — Tabelas + Triggers de updated_at + Indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tenants — raiz do isolamento multi-tenant
-- ----------------------------------------------------------------------------
create table public.tenants (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  document             text,                                       -- CNPJ/CPF (preenchido depois do onboarding)
  tier                 public.tenant_tier not null default 'trial',
  subscription_status  public.subscription_status not null default 'active',
  trial_ends_at        timestamptz not null default (now() + interval '7 days'),
  asaas_customer_id    text,                                       -- ID no gateway, preenchido na Fase 5
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- tenant_users — pivô N:N entre auth.users e tenants, com role
-- ----------------------------------------------------------------------------
create table public.tenant_users (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.tenant_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create trigger trg_tenant_users_updated_at
  before update on public.tenant_users
  for each row execute function public.set_updated_at();

create index idx_tenant_users_user_id    on public.tenant_users(user_id);
create index idx_tenant_users_tenant_id  on public.tenant_users(tenant_id);

-- ----------------------------------------------------------------------------
-- tenant_settings — configurações por tenant (1:1)
-- ----------------------------------------------------------------------------
create table public.tenant_settings (
  tenant_id            uuid primary key references public.tenants(id) on delete cascade,
  default_tax_regime   public.tax_regime not null default 'mei',
  whatsapp_connected   boolean not null default false,
  whatsapp_number      text,                                       -- E.164 (ex: +5571999999999)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_tenant_settings_updated_at
  before update on public.tenant_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- customers — clientes finais do tenant
-- ----------------------------------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  document    text,                                                -- CPF/CNPJ
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index idx_customers_tenant_id on public.customers(tenant_id);
create index idx_customers_email     on public.customers(tenant_id, email);

-- ----------------------------------------------------------------------------
-- transactions — lançamentos financeiros (receitas/despesas)
-- ----------------------------------------------------------------------------
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  customer_id  uuid references public.customers(id) on delete set null,
  type         public.transaction_type not null,
  amount       numeric(15, 2) not null check (amount > 0),         -- nunca float pra dinheiro
  status       public.transaction_status not null default 'pending',
  due_date     date not null,
  paid_at      timestamptz,                                        -- preenchido quando status -> 'paid'
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index idx_transactions_tenant_id        on public.transactions(tenant_id);
create index idx_transactions_tenant_status    on public.transactions(tenant_id, status);
create index idx_transactions_tenant_due_date  on public.transactions(tenant_id, due_date desc);
create index idx_transactions_customer_id      on public.transactions(customer_id);

-- ----------------------------------------------------------------------------
-- invoices — notas fiscais emitidas
-- ----------------------------------------------------------------------------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  type            public.invoice_type not null,
  status          public.invoice_status not null default 'processing',
  xml_url         text,
  pdf_url         text,
  error_message   text,                                            -- preenchido se status='error'
  external_id     text,                                            -- ID na API de NF (3rd party)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create index idx_invoices_tenant_id       on public.invoices(tenant_id);
create index idx_invoices_transaction_id  on public.invoices(transaction_id);
create index idx_invoices_tenant_status   on public.invoices(tenant_id, status);