-- Phase 1/3 initial schema.
-- Four tables as specified in DATA.md:
--   match_days, season_stats, editorials, teams_followed
--
-- RLS is enabled on all tables; no policies yet (Phase 4 adds SELECT
-- policies for the anon role on the first three; teams_followed waits
-- for auth to land in Phase 6).
--
-- NULLS NOT DISTINCT requires PostgreSQL 15+ (Supabase runs PG 15+).
-- It lets the editorials unique constraint treat two NULL league_code
-- values as equal, so there can be at most one day_overview per date.

-- ---------------------------------------------------------------------------
-- match_days
-- Raw daily fetch results from Football-Data.org, one row per league per date.
-- The pipeline upserts on re-run (idempotent by the unique constraint).
-- ---------------------------------------------------------------------------

CREATE TABLE match_days (
  id          bigserial    PRIMARY KEY,
  date        date         NOT NULL,
  league_code text         NOT NULL,
  payload     jsonb        NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT match_days_date_league_uniq UNIQUE (date, league_code)
);

CREATE INDEX match_days_date_idx ON match_days (date DESC);

ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- season_stats
-- Running season snapshot per league: top scorers and standings.
-- One row per league per snapshot date; pipeline upserts on re-run.
-- ---------------------------------------------------------------------------

CREATE TABLE season_stats (
  id            bigserial    PRIMARY KEY,
  league_code   text         NOT NULL,
  season        text         NOT NULL,  -- e.g. "2025-26"
  snapshot_date date         NOT NULL,
  payload       jsonb        NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT season_stats_league_date_uniq UNIQUE (league_code, snapshot_date)
);

CREATE INDEX season_stats_league_date_idx ON season_stats (league_code, snapshot_date DESC);

ALTER TABLE season_stats ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- editorials
-- Claude-generated summaries with optional audio URL.
--
-- kind values:
--   'match_caption'   -- one-sentence caption per match
--   'match_summary'   -- 2-3 paragraph match summary
--   'league_overview' -- 3-5 paragraph league day overview
--   'day_overview'    -- cross-league lead editorial
--
-- slug:
--   ''               for day_overview (only one per date)
--   league code      for league_overview (e.g. 'pl')
--   match id as text for match_caption and match_summary
--
-- league_code is NULL for day_overview rows.
-- NULLS NOT DISTINCT means (date=X, league_code=NULL, kind='day_overview', slug='')
-- is unique -- at most one day_overview per date.
-- ---------------------------------------------------------------------------

CREATE TABLE editorials (
  id          bigserial    PRIMARY KEY,
  date        date         NOT NULL,
  league_code text,
  kind        text         NOT NULL,
  slug        text         NOT NULL DEFAULT '',
  headline    text,
  body        text         NOT NULL,
  audio_url   text,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT editorials_unique
    UNIQUE NULLS NOT DISTINCT (date, league_code, kind, slug)
);

CREATE INDEX editorials_date_idx      ON editorials (date DESC);
CREATE INDEX editorials_kind_date_idx ON editorials (kind, date DESC);

ALTER TABLE editorials ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- teams_followed
-- Phase 6 "follow a team" feature -- deferred until Supabase Auth is wired.
-- The user_id references auth.users implicitly; no FK constraint here so the
-- table can be created before Phase 6's auth migration.
-- ---------------------------------------------------------------------------

CREATE TABLE teams_followed (
  id          bigserial    PRIMARY KEY,
  user_id     uuid         NOT NULL,
  team_id     integer      NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT teams_followed_user_team_uniq UNIQUE (user_id, team_id)
);

ALTER TABLE teams_followed ENABLE ROW LEVEL SECURITY;
