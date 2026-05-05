-- Phase 3.5: denormalized match results table for team-history queries.
--
-- Rationale: match_days.payload is a JSONB blob containing an array of match
-- objects. Querying "most recent win for team 57" requires unnesting the array
-- on every query or a complex generated expression index. A flat table with
-- explicit columns and btree indexes is simpler, faster, and makes the helper
-- layer (src/editorial/team-history.ts) straightforward to implement.
--
-- match_days stays as the raw archive (source of truth for the full API
-- payload). match_results is the denormalized read model for team queries.
--
-- Populated by: scripts/historical-backfill.ts (one-time) and the daily
-- pipeline (src/trigger/pipeline.ts) on each run going forward.

CREATE TABLE match_results (
  match_id        BIGINT PRIMARY KEY,     -- Football-Data.org match ID (globally unique)
  date            DATE NOT NULL,
  league_code     TEXT NOT NULL,
  season          TEXT NOT NULL,          -- e.g. "2024-25", "2025-26"
  matchday        INT,
  home_team_id    INT NOT NULL,
  home_team_name  TEXT NOT NULL,
  home_team_short TEXT NOT NULL,
  away_team_id    INT NOT NULL,
  away_team_name  TEXT NOT NULL,
  away_team_short TEXT NOT NULL,
  score_home      INT,                    -- NULL for non-FINISHED rows
  score_away      INT,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Team-history lookups: find all home matches for a team, newest first.
CREATE INDEX match_results_home_team_date
  ON match_results (home_team_id, date DESC);

-- Team-history lookups: find all away matches for a team, newest first.
CREATE INDEX match_results_away_team_date
  ON match_results (away_team_id, date DESC);

-- League-scoped queries: e.g. head-to-head within a specific league, or
-- "last N matches in this league for team X" when cross-league history
-- would be misleading (different competition context).
CREATE INDEX match_results_league_date
  ON match_results (league_code, date DESC);

-- RLS enabled. No policies in this migration — service role key used for
-- all writes (backfill script, daily pipeline). Anon SELECT policy to be
-- added alongside Phase 4 website work when public reads are needed.
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
