// User context helper (EXPANSION WS1, §3.2 step 4).
//
// getUserContext rolls a user's identity, follows, and preferences into one
// typed object that every downstream workstream reads from:
//   - the WS3 per-user briefing fan-out (called with a service-role client)
//   - the web app's per-user surfaces (called with the user's RLS-scoped session)
//
// It takes the Supabase client as an argument rather than building one, so the
// same helper serves both callers without knowing which auth context it's in
// (DECISIONS.md 2026-06-04, WS1 decision 4).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { LeagueCode } from "./football-types";
import { LEAGUES } from "./football-types";

export type SpoilerMode = "hide" | "show";

export interface UserContext {
  userId: string;
  /** IANA timezone, e.g. 'Europe/London'. Used to localize briefing delivery. */
  timezone: string;
  /** 'HH:MM:SS' local time the user wants their recap. */
  briefingLocalTime: string;
  onboardedAt: string | null;
  follows: {
    /** Followed competition codes, filtered to those currently in scope. */
    competitions: LeagueCode[];
    /** Followed team ids, as text (the `follow.ref` shape). */
    teams: string[];
  };
  /**
   * Competitions to actually brief this user on. Cold-start guard
   * (EXPANSION §3.3): a user who follows no competition gets all in-scope
   * competitions so they still receive a briefing.
   */
  effectiveCompetitions: LeagueCode[];
  prefs: {
    notifDaily: boolean;
    notifMatchAlerts: boolean;
    analyticsConsent: boolean;
    spoilerMode: SpoilerMode;
  };
}

type Db = SupabaseClient<Database>;

// Which competition codes are currently in scope (drops follows for leagues no
// longer surfaced, e.g. historical La Liga rows).
const IN_SCOPE = new Set<string>(LEAGUES);

/**
 * Load a user's full context in one call. Throws if the user has no `app_user`
 * row (they must complete onboarding first) or if any read errors.
 */
export async function getUserContext(db: Db, userId: string): Promise<UserContext> {
  const [userRes, prefsRes, followsRes] = await Promise.all([
    db
      .from("app_user")
      .select("timezone, briefing_local_time, onboarded_at")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("user_prefs")
      .select("notif_daily, notif_match_alerts, analytics_consent, spoiler_mode")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("follow").select("kind, ref").eq("user_id", userId),
  ]);

  if (userRes.error) throw new Error(`app_user read failed: ${userRes.error.message}`);
  if (!userRes.data) {
    throw new Error(`No app_user row for ${userId}. User must complete onboarding first.`);
  }
  if (prefsRes.error) throw new Error(`user_prefs read failed: ${prefsRes.error.message}`);
  if (followsRes.error) throw new Error(`follow read failed: ${followsRes.error.message}`);

  const followRows = followsRes.data ?? [];
  const competitions = followRows
    .filter((f) => f.kind === "competition" && IN_SCOPE.has(f.ref))
    .map((f) => f.ref as LeagueCode);
  const teams = followRows.filter((f) => f.kind === "team").map((f) => f.ref);

  const effectiveCompetitions = competitions.length > 0 ? competitions : [...LEAGUES];

  const prefs = prefsRes.data;
  const spoilerMode: SpoilerMode = prefs?.spoiler_mode === "show" ? "show" : "hide";

  return {
    userId,
    timezone: userRes.data.timezone,
    briefingLocalTime: userRes.data.briefing_local_time,
    onboardedAt: userRes.data.onboarded_at,
    follows: { competitions, teams },
    effectiveCompetitions,
    prefs: {
      notifDaily: prefs?.notif_daily ?? true,
      notifMatchAlerts: prefs?.notif_match_alerts ?? false,
      analyticsConsent: prefs?.analytics_consent ?? false,
      spoilerMode,
    },
  };
}
