-- ============================================================================
-- AZULLI — Adições para emissão de Notas Fiscais
-- ============================================================================

-- Adiciona limite mensal de NFS-e por tier no banco (pode evoluir pra tabela
-- de planos no futuro; hardcoded é suficiente pro MVP).
-- Tier 'pro' = 30 NFS-e/mês. Trial = 5 (suficiente pra demo).
-- Empresarial = ilimitado (nulo).

-- View auxiliar: total de NFS-e emitidas no mês corrente por tenant
create or replace view public.invoice_monthly_count
with (security_invoker = true) as
select
  i.tenant_id,
  count(*) filter (
    where i.type = 'nfse'
      and i.status in ('processing', 'authorized')
      and i.created_at >= date_trunc('month', current_date)
  )::int as nfse_count_current_month,
  count(*) filter (
    where i.type = 'nfe'
      and i.status in ('processing', 'authorized')
      and i.created_at >= date_trunc('month', current_date)
  )::int as nfe_count_current_month
from public.invoices i
group by i.tenant_id;

comment on view public.invoice_monthly_count is
  'Contagem mensal de notas emitidas (autorizadas ou em processamento) por tenant. Não conta erros.';