-- Phase 4 read access: anon role can SELECT from the three public-facing tables.
-- teams_followed is intentionally excluded — it waits for auth (Phase 6).

-- RLS policies
CREATE POLICY "anon can read editorials"
  ON editorials FOR SELECT TO anon USING (true);

CREATE POLICY "anon can read match_days"
  ON match_days FOR SELECT TO anon USING (true);

CREATE POLICY "anon can read season_stats"
  ON season_stats FOR SELECT TO anon USING (true);

-- GRANT SELECT so PostgREST (Data API) exposes these tables to the anon role.
-- RLS controls which rows are visible; GRANT controls whether the table is reachable at all.
GRANT SELECT ON editorials TO anon;
GRANT SELECT ON match_days TO anon;
GRANT SELECT ON season_stats TO anon;
