-- Nepal Election Live — Provincial Assembly (PA) Schema
-- Each of the 7 provinces holds its own PA election.
-- Structure mirrors the HoR tables (constituencies, candidates, PR votes)
-- but is scoped per-province with an additional pa_party_results aggregate.

-- ============================================================
-- 1. PA Constituency Table
-- ============================================================

CREATE TABLE pa_constituencies (
  id                      SERIAL PRIMARY KEY,
  province_id             INT NOT NULL REFERENCES provinces(id),
  district_id             INT NOT NULL REFERENCES districts(id),
  number                  INT NOT NULL,            -- constituency number within district
  name_en                 TEXT NOT NULL,
  name_ne                 TEXT NOT NULL,
  total_registered_voters INT DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'counting', 'declared')),
  total_votes_cast        INT DEFAULT 0,
  invalid_votes           INT DEFAULT 0,
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. PA Candidate Table
-- ============================================================

CREATE TABLE pa_candidates (
  id                  SERIAL PRIMARY KEY,
  pa_constituency_id  INT NOT NULL REFERENCES pa_constituencies(id),
  party_id            INT REFERENCES parties(id),    -- NULL = independent
  name_en             TEXT NOT NULL,
  name_ne             TEXT NOT NULL,
  votes               INT DEFAULT 0,
  is_winner           BOOLEAN DEFAULT FALSE,
  is_leading          BOOLEAN DEFAULT FALSE,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. PA Party Results (aggregated per-province)
-- ============================================================

CREATE TABLE pa_party_results (
  id           SERIAL PRIMARY KEY,
  province_id  INT NOT NULL REFERENCES provinces(id),
  party_id     INT NOT NULL REFERENCES parties(id),
  fptp_won     INT DEFAULT 0,
  fptp_leading INT DEFAULT 0,
  pr_votes     BIGINT DEFAULT 0,
  pr_seats     INT DEFAULT 0,
  total_seats  INT GENERATED ALWAYS AS (fptp_won + pr_seats) STORED,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(province_id, party_id)
);

-- ============================================================
-- 4. PA PR Votes (per constituency × party)
-- ============================================================

CREATE TABLE pa_pr_votes (
  id                  SERIAL PRIMARY KEY,
  pa_constituency_id  INT NOT NULL REFERENCES pa_constituencies(id),
  party_id            INT NOT NULL REFERENCES parties(id),
  votes               INT DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pa_constituency_id, party_id)
);

-- ============================================================
-- 5. Indexes
-- ============================================================

-- pa_constituencies
CREATE INDEX idx_pa_constituencies_province ON pa_constituencies(province_id);
CREATE INDEX idx_pa_constituencies_district ON pa_constituencies(district_id);
CREATE INDEX idx_pa_constituencies_status   ON pa_constituencies(status);

-- pa_candidates
CREATE INDEX idx_pa_candidates_constituency ON pa_candidates(pa_constituency_id);
CREATE INDEX idx_pa_candidates_party        ON pa_candidates(party_id);

-- pa_party_results
CREATE INDEX idx_pa_party_results_province ON pa_party_results(province_id);
CREATE INDEX idx_pa_party_results_party    ON pa_party_results(party_id);

-- pa_pr_votes
CREATE INDEX idx_pa_pr_votes_constituency ON pa_pr_votes(pa_constituency_id);
CREATE INDEX idx_pa_pr_votes_party        ON pa_pr_votes(party_id);

-- ============================================================
-- 6. Row-Level Security (public read, service-role write)
-- ============================================================

ALTER TABLE pa_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_candidates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_party_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_pr_votes       ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read pa_constituencies" ON pa_constituencies FOR SELECT USING (true);
CREATE POLICY "Public read pa_candidates"     ON pa_candidates     FOR SELECT USING (true);
CREATE POLICY "Public read pa_party_results"  ON pa_party_results  FOR SELECT USING (true);
CREATE POLICY "Public read pa_pr_votes"       ON pa_pr_votes       FOR SELECT USING (true);

-- Service-role write (used by scraper and admin)
CREATE POLICY "Service write pa_constituencies" ON pa_constituencies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write pa_candidates"     ON pa_candidates     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write pa_party_results"  ON pa_party_results  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write pa_pr_votes"       ON pa_pr_votes       FOR ALL USING (auth.role() = 'service_role');
