-- Add is_final flag to mark constituencies with certified final results
-- Once is_final=true, the scraper skips re-fetching this constituency
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
ALTER TABLE pa_constituencies ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
