-- ============================================================================
-- AZULLI — Fuso horário Brasil (America/Sao_Paulo)
-- ----------------------------------------------------------------------------
-- Corrige status overdue e "hoje" no Postgres (sessão UTC no Supabase).
-- Rode após 00027_finder_perf_indexes.sql.
-- ============================================================================

create or replace function public.today_brazil()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

comment on function public.today_brazil() is
  'Data civil de hoje no fuso America/Sao_Paulo (Brasil).';

-- View principal — overdue baseado no calendário BR, não em current_date UTC.
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
  t.source,
  t.import_batch_id,
  t.external_ref,
  t.recurring_group,
  t.created_at,
  t.updated_at,
  case
    when t.status = 'paid' then 'paid'::public.transaction_status
    when t.status = 'pending' and t.due_date < public.today_brazil()
      then 'overdue'::public.transaction_status
    else 'pending'::public.transaction_status
  end as status,
  t.status as raw_status
from public.transactions t;

comment on view public.transactions_with_status is
  'Status dinâmico; overdue quando due_date < hoje em America/Sao_Paulo.';
