-- ============================================================================
-- Migration: 003_add_turnout_invalid_votes
--
-- Purpose:
--   1. Add `invalid_votes` to `constituencies` to track spoiled/invalid ballots.
--   2. Add `ec_symbol_id` to `parties` to store each party's Election Commission
--      symbol ID, used for matching against EC JSON data feeds.
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS so it can be safely re-run.
-- ============================================================================

ALTER TABLE constituencies
  ADD COLUMN IF NOT EXISTS invalid_votes INT DEFAULT 0;

ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS ec_symbol_id INT;
