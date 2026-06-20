-- Performance: filtros frequentes no Finder (listagem pós-busca, export)
CREATE INDEX IF NOT EXISTS idx_finder_leads_search_id
  ON finder.leads (search_id)
  WHERE search_id IS NOT NULL;

-- Busca textual por nome/endereço (ILIKE %termo%)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_finder_leads_nome_trgm
  ON finder.leads USING gin (lower(nome) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_finder_leads_endereco_trgm
  ON finder.leads USING gin (lower(coalesce(endereco, '')) gin_trgm_ops);
