-- ─────────────────────────────────────────────────────────────────────────────
-- Asset402 Supabase PostgreSQL Schema
-- Mirrors on-chain states from the three Casper Odra contracts
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enable UUID extension ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Assets Table ────────────────────────────────────────────────────────────
-- Mirrors AssetRegistry contract state
CREATE TABLE IF NOT EXISTS assets (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id          BIGINT      UNIQUE NOT NULL,   -- on-chain AssetId
  owner_address     TEXT        NOT NULL,           -- Casper account-hash hex
  asset_type        TEXT        NOT NULL,
  make              TEXT,
  model_est         TEXT,
  year_range        TEXT,
  valuation_usd     INTEGER     NOT NULL DEFAULT 0,
  condition_score   SMALLINT    NOT NULL DEFAULT 0 CHECK (condition_score BETWEEN 0 AND 100),
  ipfs_photo_hash   TEXT,
  status            TEXT        NOT NULL DEFAULT 'Idle'
                    CHECK (status IN ('Idle','Listed','Rented','Locked')),
  ltv_ratio         NUMERIC(5,2),                   -- current LTV % (computed)
  mint_tx_hash      TEXT,                            -- Casper deploy hash
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Rentals Table ────────────────────────────────────────────────────────────
-- Mirrors RentalEscrow contract state
CREATE TABLE IF NOT EXISTS rentals (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id         BIGINT      UNIQUE NOT NULL,     -- on-chain RentalId
  asset_id          BIGINT      NOT NULL REFERENCES assets(asset_id),
  renter_address    TEXT        NOT NULL,
  owner_address     TEXT        NOT NULL,
  rate_per_minute   NUMERIC(20,0) NOT NULL,           -- motes/min
  rate_usd_per_hour NUMERIC(10,4),
  duration_minutes  INTEGER,
  total_streamed    NUMERIC(30,0) DEFAULT 0,          -- total motes streamed
  status            TEXT        NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Closed','Cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  start_tx_hash     TEXT,
  close_tx_hash     TEXT
);

-- ── Loans Table ──────────────────────────────────────────────────────────────
-- Mirrors LendingPool contract state
CREATE TABLE IF NOT EXISTS loans (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id          BIGINT      UNIQUE NOT NULL REFERENCES assets(asset_id),
  borrower_address  TEXT        NOT NULL,
  principal_motes   NUMERIC(30,0) NOT NULL,
  remaining_motes   NUMERIC(30,0) NOT NULL,
  ltv_bps           SMALLINT    NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Repaid','Liquidated')),
  originated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  repaid_at         TIMESTAMPTZ,
  origin_tx_hash    TEXT
);

-- ── Agent Logs Table ─────────────────────────────────────────────────────────
-- Audit trail of all agent actions with full payload
CREATE TABLE IF NOT EXISTS agent_logs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name       TEXT        NOT NULL,
  action_performed TEXT        NOT NULL,
  payload          JSONB,
  gas_spent        BIGINT,       -- motes
  tx_hash          TEXT,
  status           TEXT        DEFAULT 'success',
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_owner       ON assets(owner_address);
CREATE INDEX IF NOT EXISTS idx_assets_status      ON assets(status);
CREATE INDEX IF NOT EXISTS idx_rentals_asset      ON rentals(asset_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter     ON rentals(renter_address);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent   ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_ts      ON agent_logs(timestamp DESC);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Realtime publication (Supabase) ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE loans;
