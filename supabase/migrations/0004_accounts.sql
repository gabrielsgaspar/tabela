-- EXPANSION WS1 — accounts and preferences (EXPANSION.md §3.1).
--
-- Three tables that turn Tabela from a broadcast site into a per-user product:
--   app_user    one row per authenticated user (timezone + briefing time)
--   follow      competitions/teams a user follows
--   user_prefs  notification + consent + spoiler preferences
--
-- Identity comes from Supabase Auth (auth.users); these tables hang off it.
-- RLS is owner-only: a signed-in user reads/writes only their own rows. The
-- service role (used by the pipeline fan-out, WS3) bypasses RLS automatically.
--
-- Account rows are provisioned by the onboarding flow in the app, not by an
-- auth.users trigger (DECISIONS.md 2026-06-04, WS1 decision 3).

-- ---------------------------------------------------------------------------
-- app_user
-- One row per authenticated user. Keyed to auth.users; deleting the auth user
-- cascades here (and onward to follow/user_prefs).
-- ---------------------------------------------------------------------------

CREATE TABLE app_user (
  id                  uuid         PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  timezone            text         NOT NULL DEFAULT 'UTC',     -- IANA, e.g. 'Europe/London'
  briefing_local_time time         NOT NULL DEFAULT '07:00',   -- when they want the recap
  onboarded_at        timestamptz
);

ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own app_user"
  ON app_user FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "owner inserts own app_user"
  ON app_user FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "owner updates own app_user"
  ON app_user FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "owner deletes own app_user"
  ON app_user FOR DELETE TO authenticated USING (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE, DELETE ON app_user TO authenticated;

-- ---------------------------------------------------------------------------
-- follow
-- Competitions or teams a user follows. `ref` is a competition code (e.g. 'CL')
-- when kind='competition', or a team id as text (e.g. '57') when kind='team'.
-- Composite PK makes each (user, kind, ref) at most once.
-- Supersedes the deferred teams_followed table (left in place; see end of file).
-- ---------------------------------------------------------------------------

CREATE TABLE follow (
  user_id    uuid         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  kind       text         NOT NULL CHECK (kind IN ('competition', 'team')),
  ref        text         NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, ref)
);

CREATE INDEX follow_user_idx ON follow (user_id);

ALTER TABLE follow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own follow"
  ON follow FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner inserts own follow"
  ON follow FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes own follow"
  ON follow FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON follow TO authenticated;

-- ---------------------------------------------------------------------------
-- user_prefs
-- Notification, consent, and spoiler preferences. One row per user.
-- spoiler_mode drives the WS2 reveal-on-tap layer; analytics_consent gates the
-- WS6/WS7 event attribution (off by default, R4).
-- ---------------------------------------------------------------------------

CREATE TABLE user_prefs (
  user_id            uuid         PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
  notif_daily        boolean      NOT NULL DEFAULT true,   -- the one daily briefing nudge
  notif_match_alerts boolean      NOT NULL DEFAULT false,  -- opt-in, per-followed-team
  analytics_consent  boolean      NOT NULL DEFAULT false,  -- behavioral tracking consent
  spoiler_mode       text         NOT NULL DEFAULT 'hide'  -- 'hide' | 'show'
                       CHECK (spoiler_mode IN ('hide', 'show')),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own user_prefs"
  ON user_prefs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner inserts own user_prefs"
  ON user_prefs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates own user_prefs"
  ON user_prefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes own user_prefs"
  ON user_prefs FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON user_prefs TO authenticated;

-- Keep updated_at honest on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_prefs_set_updated_at
  BEFORE UPDATE ON user_prefs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- teams_followed → follow supersession.
-- teams_followed predates auth and is expected to be empty. We do NOT auto-
-- migrate: follow.user_id has an FK to app_user, and any orphan teams_followed
-- row (user_id not in app_user) would fail the insert. If rows somehow exist,
-- raise a notice so a maintainer migrates them by hand. The old table is left
-- in place (still referenced by database.types.ts / FollowTeamCTA) and can be
-- dropped in a later cleanup once nothing reads it.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM teams_followed;
  IF n > 0 THEN
    RAISE NOTICE 'teams_followed has % row(s). Migrate them into follow '
      '(kind=''team'', ref=team_id::text) by hand after the matching app_user '
      'rows exist; auto-migration is skipped to avoid FK violations.', n;
  END IF;
END;
$$;
