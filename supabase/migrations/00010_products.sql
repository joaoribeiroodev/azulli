-- ============================================================================
-- AZULLI — Sub-fase 3.12: Produtos, Serviços, Itens de Venda, Estoque
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Enums novos
-- ----------------------------------------------------------------------------
create type public.product_kind as enum ('product', 'service');
create type public.stock_movement_kind as enum (
  'sale',           -- venda subtraiu
  'purchase',       -- compra somou
  'adjustment_in',  -- ajuste manual +
  'adjustment_out', -- ajuste manual -
  'initial'         -- estoque inicial ao criar produto
);

-- ----------------------------------------------------------------------------
-- 2) Tabela products
-- ----------------------------------------------------------------------------
create table public.products (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,

  -- Identificação
  name                  text not null,
  kind                  public.product_kind not null default 'product',
  description           text,
  sku                   text,                  -- código interno (opcional)

  -- Preços
  price                 numeric(15,2) not null,  -- preço de venda padrão
  cost                  numeric(15,2),           -- custo (opcional, p/ margem)

  -- Estoque (apenas pra kind='product')
  track_stock           boolean not null default false,
  stock_quantity        numeric(15,3) not null default 0,  -- 3 casas pra fracionados (kg, L)
  low_stock_threshold   numeric(15,3),                     -- alerta quando estoque <= X
  unit                  text default 'un',                 -- un, kg, L, m, h...

  -- Fiscal (opcional pra MVP)
  ncm                   text,    -- Nomenclatura Comum do Mercosul
  cfop                  text,    -- Código Fiscal de Operações

  -- Status
  is_active             boolean not null default true,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index idx_products_tenant_id   on public.products(tenant_id);
create index idx_products_tenant_kind on public.products(tenant_id, kind);
create index idx_products_tenant_active on public.products(tenant_id) where is_active = true;
create unique index idx_products_tenant_sku on public.products(tenant_id, sku) where sku is not null;

-- Constraint D3: serviço não tem estoque
alter table public.products
  add constraint chk_service_no_stock check (
    kind = 'product' or (track_stock = false and stock_quantity = 0)
  );

-- Constraint: estoque não pode ser negativo (configuração padrão; pode evoluir)
alter table public.products
  add constraint chk_stock_non_negative check (stock_quantity >= 0);

comment on table public.products is
  'Catálogo de produtos e serviços do tenant. kind=service força track_stock=false.';

-- ----------------------------------------------------------------------------
-- 3) Adiciona product_id em transactions (modelo simples — 1 transaction = 1 produto)
-- ----------------------------------------------------------------------------
alter table public.transactions
  add column product_id uuid references public.products(id) on delete set null;

create index idx_transactions_product_id on public.transactions(product_id);

-- ----------------------------------------------------------------------------
-- 4) Tabela transaction_items (modelo carrinho — N produtos por transaction)
-- ----------------------------------------------------------------------------
create table public.transaction_items (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  transaction_id        uuid not null references public.transactions(id) on delete cascade,
  product_id            uuid not null references public.products(id) on delete restrict,

  quantity              numeric(15,3) not null,
  unit_price            numeric(15,2) not null,
  total                 numeric(15,2) not null,  -- quantity * unit_price (denormalizado pra reports)

  created_at            timestamptz not null default now()
);

create index idx_tx_items_tenant_id      on public.transaction_items(tenant_id);
create index idx_tx_items_transaction_id on public.transaction_items(transaction_id);
create index idx_tx_items_product_id     on public.transaction_items(product_id);

alter table public.transaction_items
  add constraint chk_quantity_positive check (quantity > 0);
alter table public.transaction_items
  add constraint chk_unit_price_non_neg check (unit_price >= 0);

comment on table public.transaction_items is
  'Itens de venda quando há múltiplos produtos numa transaction. transactions.amount = sum(items.total).';

-- ----------------------------------------------------------------------------
-- 5) Tabela stock_movements — log auditável de toda mudança de estoque
-- ----------------------------------------------------------------------------
create table public.stock_movements (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  product_id            uuid not null references public.products(id) on delete cascade,

  kind                  public.stock_movement_kind not null,
  quantity              numeric(15,3) not null,     -- positivo = entrada, negativo = saída
  stock_after           numeric(15,3) not null,     -- snapshot do estoque após o movimento

  -- Referências opcionais
  transaction_id        uuid references public.transactions(id) on delete set null,
  transaction_item_id   uuid references public.transaction_items(id) on delete set null,
  notes                 text,

  created_at            timestamptz not null default now()
);

create index idx_stock_mov_tenant     on public.stock_movements(tenant_id);
create index idx_stock_mov_product    on public.stock_movements(product_id, created_at desc);
create index idx_stock_mov_transaction on public.stock_movements(transaction_id) where transaction_id is not null;

comment on table public.stock_movements is
  'Log auditável de toda mudança de estoque. Append-only; nunca update/delete.';

-- ----------------------------------------------------------------------------
-- 6) RLS — products
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.products force row level security;

create policy "products_select_own_tenant"
  on public.products for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "products_insert_own_tenant"
  on public.products for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "products_update_own_tenant"
  on public.products for update to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "products_delete_own_tenant"
  on public.products for delete to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- ----------------------------------------------------------------------------
-- 7) RLS — transaction_items
-- ----------------------------------------------------------------------------
alter table public.transaction_items enable row level security;
alter table public.transaction_items force row level security;

create policy "tx_items_select_own_tenant"
  on public.transaction_items for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "tx_items_insert_own_tenant"
  on public.transaction_items for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "tx_items_update_own_tenant"
  on public.transaction_items for update to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) )
  with check ( public.user_belongs_to_tenant(tenant_id) );

create policy "tx_items_delete_own_tenant"
  on public.transaction_items for delete to authenticated
  using ( public.user_belongs_to_tenant(tenant_id) );

-- ----------------------------------------------------------------------------
-- 8) RLS — stock_movements (append-only via app; sem update/delete)
-- ----------------------------------------------------------------------------
alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;

create policy "stock_mov_select_own_tenant"
  on public.stock_movements for select to authenticated
  using ( tenant_id in (select public.current_user_tenant_ids()) );

create policy "stock_mov_insert_own_tenant"
  on public.stock_movements for insert to authenticated
  with check ( public.user_belongs_to_tenant(tenant_id) );

-- proposital: NÃO criamos policies de update/delete (movimentos são imutáveis)

-- ----------------------------------------------------------------------------
-- 9) Recria view transactions_with_status (DROP + CREATE pra incluir product_id)
-- ----------------------------------------------------------------------------
drop view if exists public.transactions_with_status;

create view public.transactions_with_status
with (security_invoker = true) as
select
  t.id,
  t.tenant_id,
  t.customer_id,
  t.supplier_id,
  t.product_id,
  t.type,
  t.amount,
  t.category,
  t.due_date,
  t.paid_at,
  t.description,
  t.created_at,
  t.updated_at,
  case
    when t.status = 'paid'                                  then 'paid'::public.transaction_status
    when t.status = 'pending' and t.due_date < current_date then 'overdue'::public.transaction_status
    else 'pending'::public.transaction_status
  end as status,
  t.status as raw_status
from public.transactions t;

comment on view public.transactions_with_status is
  'Status dinâmico + customer + supplier + product + category. Atualizado na 3.12.';