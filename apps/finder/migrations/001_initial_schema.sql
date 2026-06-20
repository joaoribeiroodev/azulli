-- =========================================================
-- Azulli Finder — Schema inicial (single-org, multi-usuário)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------
-- Usuários internos do time comercial Azulli
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  nome            VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL DEFAULT 'sdr',
    -- admin, sdr, bdr, closer, ops, viewer
  ativo           BOOLEAN      NOT NULL DEFAULT true,
  ultimo_login    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo);

-- ---------------------------------------------------------
-- Buscas executadas pelos SDRs
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  termo           VARCHAR(255) NOT NULL,
  localizacao     VARCHAR(255) NOT NULL,
  fonte           VARCHAR(50)  NOT NULL DEFAULT 'google_maps',
    -- google_maps, places_api, manual, import
  total_results   INTEGER,
  duracao_ms      INTEGER,
  erro            TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_searches_user_date ON searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_date      ON searches(created_at DESC);

-- ---------------------------------------------------------
-- Leads: MEIs / pequenas empresas candidatos a virar assinantes do Azulli
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id             UUID REFERENCES searches(id) ON DELETE SET NULL,

  -- Dados do negócio
  nome                  VARCHAR(255) NOT NULL,
  telefone              VARCHAR(32),
  whatsapp              VARCHAR(32),
  email                 VARCHAR(255),
  endereco              TEXT,
  cidade                VARCHAR(120),
  uf                    CHAR(2),
  cep                   VARCHAR(10),
  cnpj                  VARCHAR(20),

  -- Sinais do Google Maps / fontes públicas
  avaliacao             DECIMAL(3,1),
  total_avaliacoes      INTEGER,
  maps_url              TEXT,
  website               TEXT,

  -- Inteligência (Fase 2)
  segmento              VARCHAR(100),
    -- alimentacao, beleza, automotivo, saude, servicos, varejo, educacao, tech, construcao, outros
  porte                 VARCHAR(20),
    -- mei, me, pequena, outra
  icp_score             INTEGER CHECK (icp_score IS NULL OR (icp_score BETWEEN 0 AND 100)),
  pitch_whatsapp        TEXT,
  pitch_email           TEXT,
  validado              BOOLEAN NOT NULL DEFAULT false,
  enriquecido_em        TIMESTAMPTZ,

  -- Pipeline comercial
  status                VARCHAR(40) NOT NULL DEFAULT 'novo',
    -- novo, qualificado, contatado, em_negociacao, assinante, descartado
  responsavel_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  notas                 TEXT,

  -- Conversão (Fase 4)
  azulli_account_id     UUID,
  plano_contratado      VARCHAR(40),
  data_assinatura       TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_segmento    ON leads(segmento);
CREATE INDEX IF NOT EXISTS idx_leads_uf_cidade   ON leads(uf, cidade);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_leads_icp_score   ON leads(icp_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_created     ON leads(created_at DESC);

-- Dedup: mesmo nome + endereço normalizado = mesmo lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedup
  ON leads (lower(nome), lower(coalesce(endereco, '')));

-- ---------------------------------------------------------
-- Histórico de mudanças de status (auditoria)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  status_anterior VARCHAR(40),
  status_novo     VARCHAR(40) NOT NULL,
  motivo          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lsh_lead_id ON lead_status_history(lead_id, created_at DESC);

-- ---------------------------------------------------------
-- Uso de IA (controle de custo)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  acao            VARCHAR(40) NOT NULL,
    -- segmento, icp_score, pitch_whatsapp, pitch_email, validacao
  modelo          VARCHAR(40) NOT NULL,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  custo_usd       DECIMAL(10,6),
  erro            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_lead_date ON ai_usage(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date      ON ai_usage(created_at DESC);

-- ---------------------------------------------------------
-- Função utilitária: atualizar updated_at automaticamente
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------
-- Tabela de controle de migrations aplicadas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename  VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
