-- ============================================================================
-- AZULLI — Categoria em transactions + recriação da view
-- ----------------------------------------------------------------------------
-- Categoria é string livre. Sugestões predefinidas ficam no client; usuário
-- pode digitar livremente. Persiste como texto, sem tabela auxiliar (KISS).
-- ============================================================================

-- 1) Adiciona coluna
alter table public.transactions
  add column category text;

-- 2) Trim e null pra strings vazias (consistência)
alter table public.transactions
  add constraint chk_category_not_empty
  check (category is null or length(trim(category)) > 0);

-- 3) Index pra filtros e GROUP BY rápidos (tenant + categoria)
create index idx_transactions_tenant_category
  on public.transactions(tenant_id, category)
  where category is not null;

-- 4) Recria a view DROP + CREATE pra incluir category (e o padrão de coluna mid-list que já aprendemos)
drop view if exists public.transactions_with_status;

create view public.transactions_with_status
with (security_invoker = true) as
select
  t.id,
  t.tenant_id,
  t.customer_id,
  t.supplier_id,
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
  'Status dinâmico + customer_id + supplier_id + category. Atualizado na Sub-fase 3.11.';