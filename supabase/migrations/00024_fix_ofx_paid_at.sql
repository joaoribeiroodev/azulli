-- ============================================================================
-- AZULLI — Corrige paid_at de lançamentos importados via OFX
-- ----------------------------------------------------------------------------
-- Antes da correção no app, confirmImportAction gravava paid_at = now() no dia
-- da importação. Gráficos e KPIs usam paid_at → valores apareciam no mês/dia
-- errado. Este script alinha paid_at à due_date (data real do extrato), com
-- meio-dia em America/Sao_Paulo — igual a dateYMDToPaidAtBR() no código.
--
-- Prévia (rodar antes, no SQL Editor):
--
--   select id, due_date,
--          paid_at,
--          (paid_at at time zone 'America/Sao_Paulo')::date as paid_local_date
--   from public.transactions
--   where source = 'ofx_import'
--     and status = 'paid'
--     and due_date is not null
--     and (
--       paid_at is null
--       or (paid_at at time zone 'America/Sao_Paulo')::date is distinct from due_date
--     );
-- ============================================================================

update public.transactions t
set paid_at = (
  (t.due_date::text || ' 12:00:00')::timestamp at time zone 'America/Sao_Paulo'
)
where t.source = 'ofx_import'
  and t.status = 'paid'
  and t.due_date is not null
  and (
    t.paid_at is null
    or (t.paid_at at time zone 'America/Sao_Paulo')::date is distinct from t.due_date
  );
