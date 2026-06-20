-- Auditoria de conversões Finder → tenant Azulli

CREATE TABLE IF NOT EXISTS lead_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  plano             VARCHAR(40) NOT NULL,
  status_resultado  VARCHAR(40) NOT NULL,
    -- linked, pending_signup, error
  azulli_account_id UUID,
  payload_request   JSONB,
  payload_response  JSONB,
  erro              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_lead
  ON lead_conversions(lead_id, created_at DESC);
