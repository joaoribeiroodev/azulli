-- ============================================================================
-- AZULLI — View transactions_with_status
-- ----------------------------------------------------------------------------
-- Calcula o status real de cada lançamento on-the-fly:
--   - paid:     status = 'paid' (preservado)
--   - overdue:  status = 'pending' E due_date < hoje
--   - pending:  status = 'pending' E due_date >= hoje
--
-- Vantagem: nunca precisamos rodar cron para atualizar registros.
-- A view herda RLS da tabela base (segurança preservada por tenant_id).
-- ============================================================================

create or replace view public.transactions_with_status
with (security_invoker = true) as
select
  t.id,
  t.tenant_id,
  t.customer_id,
  t.type,
  t.amount,
  t.due_date,
  t.paid_at,
  t.description,
  t.created_at,
  t.updated_at,
  case
    when t.status = 'paid'                          then 'paid'::public.transaction_status
    when t.status = 'pending' and t.due_date < current_date then 'overdue'::public.transaction_status
    else 'pending'::public.transaction_status
  end as status,
  t.status as raw_status   -- valor literal armazenado (para mutations)
from public.transactions t;

comment on view public.transactions_with_status is
  'Status dinâmico: pending vira overdue quando due_date < current_date. Use esta view para leitura; mutations escrevem em public.transactions.';