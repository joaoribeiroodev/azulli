-- ============================================================================
-- AZULLI — Sub-fase 6.A: Remoção das estruturas de Notas Fiscais
-- ----------------------------------------------------------------------------
-- Decisão estratégica: NF (NFS-e/NF-e) saem do escopo do MVP.
-- Foco do produto migra para assistente financeiro inteligente.
-- ============================================================================

-- View auxiliar criada em 00007_invoice_limits.sql
drop view if exists public.invoice_monthly_count;

-- Tabela criada em 00002_tables.sql
drop table if exists public.invoices cascade;

-- Enums criados em 00001_init_schema.sql
drop type if exists public.invoice_type;
drop type if exists public.invoice_status;
