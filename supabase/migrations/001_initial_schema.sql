-- Nepal Election Live — Initial Database Schema
-- Covers: 7 provinces, 77 districts, 165 FPTP constituencies, 275 total seats (165 FPTP + 110 PR)

-- ============================================================
-- 1. Reference / Hierarchy Tables
-- ============================================================

CREATE TABLE provinces (
  id   SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,          -- e.g. 'koshi', 'madhesh'
  name_en TEXT NOT NULL,
  name_ne TEXT NOT NULL,
  name_mai TEXT,                       -- Maithili
  name_bho TEXT,                       -- Bhojpuri
  name_thr TEXT,                       -- Tharu
  name_tam TEXT,                       -- Tamang
  name_new TEXT                        -- Nepal Bhasa (Newari)
);

CREATE TABLE districts (
  id          SERIAL PRIMARY KEY,
  province_id INT NOT NULL REFERENCES provinces(id),
  code        TEXT UNIQUE NOT NULL,    -- e.g. 'jhapa'
  name_en     TEXT NOT NULL,
  name_ne     TEXT NOT NULL
);

CREATE TABLE constituencies (
  id                     SERIAL PRIMARY KEY,
  district_id            INT NOT NULL REFERENCES districts(id),
  number                 INT NOT NULL,            -- 1, 2, 3… within the district
  name_en                TEXT NOT NULL,            -- e.g. 'Jhapa-1'
  name_ne                TEXT NOT NULL,
  total_registered_voters INT DEFAULT 0,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'counting', 'declared')),
  total_votes_cast       INT DEFAULT 0,
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Party & Candidate Tables
-- ============================================================

CREATE TABLE parties (
  id         SERIAL PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ne    TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  logo_url   TEXT,
  -- Aggregated FPTP results (updated by scraper)
  fptp_won     INT DEFAULT 0,
  fptp_leading INT DEFAULT 0,
  -- Aggregated PR results
  pr_votes     BIGINT DEFAULT 0,
  pr_seats     INT DEFAULT 0,
  -- Computed total
  total_seats  INT GENERATED ALWAYS AS (fptp_won + pr_seats) STORED,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE candidates (
  id               SERIAL PRIMARY KEY,
  constituency_id  INT NOT NULL REFERENCES constituencies(id),
  party_id         INT REFERENCES parties(id),    -- NULL = independent
  name_en          TEXT NOT NULL,
  name_ne          TEXT NOT NULL,
  votes            INT DEFAULT 0,
  is_winner        BOOLEAN DEFAULT FALSE,
  is_leading       BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- PR votes broken down by constituency × party
CREATE TABLE pr_votes (
  id               SERIAL PRIMARY KEY,
  constituency_id  INT NOT NULL REFERENCES constituencies(id),
  party_id         INT NOT NULL REFERENCES parties(id),
  votes            INT DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(constituency_id, party_id)
);

-- ============================================================
-- 3. Operational Tables
-- ============================================================

CREATE TABLE scrape_log (
  id              SERIAL PRIMARY KEY,
  scraped_at      TIMESTAMPTZ DEFAULT now(),
  source          TEXT NOT NULL,
  status          TEXT NOT NULL,
  records_updated INT DEFAULT 0,
  error_message   TEXT
);

-- Extensible i18n key-value store
CREATE TABLE translations (
  id     SERIAL PRIMARY KEY,
  key    TEXT NOT NULL,
  locale TEXT NOT NULL,               -- 'en','ne','mai','bho','thr','tam','new', …
  value  TEXT NOT NULL,
  UNIQUE(key, locale)
);

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX idx_districts_province     ON districts(province_id);
CREATE INDEX idx_constituencies_district ON constituencies(district_id);
CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);
CREATE INDEX idx_candidates_party        ON candidates(party_id);
CREATE INDEX idx_pr_votes_constituency   ON pr_votes(constituency_id);
CREATE INDEX idx_pr_votes_party          ON pr_votes(party_id);
CREATE INDEX idx_translations_locale     ON translations(locale, key);

-- ============================================================
-- 5. Row-Level Security (public read, service-role write)
-- ============================================================

ALTER TABLE provinces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations    ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read provinces"       ON provinces       FOR SELECT USING (true);
CREATE POLICY "Public read districts"       ON districts       FOR SELECT USING (true);
CREATE POLICY "Public read constituencies"  ON constituencies  FOR SELECT USING (true);
CREATE POLICY "Public read parties"         ON parties         FOR SELECT USING (true);
CREATE POLICY "Public read candidates"      ON candidates      FOR SELECT USING (true);
CREATE POLICY "Public read pr_votes"        ON pr_votes        FOR SELECT USING (true);
CREATE POLICY "Public read translations"    ON translations    FOR SELECT USING (true);

-- Service-role write (used by scraper and admin)
CREATE POLICY "Service write provinces"      ON provinces      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write districts"      ON districts      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write constituencies" ON constituencies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write parties"        ON parties        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write candidates"     ON candidates     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write pr_votes"       ON pr_votes       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write scrape_log"     ON scrape_log     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write translations"   ON translations   FOR ALL USING (auth.role() = 'service_role');
