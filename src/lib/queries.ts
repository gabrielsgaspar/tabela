// Supabase read queries for the Tabela website.
// All functions use createBrowserClient (anon key, subject to RLS).
// Do not import createServerClient here.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { LeagueCode } from "./football-types";
import type { SeasonStatsPayload, MatchDayPayload } from "./query-types";

type DB = SupabaseClient<Database>;

// ── Day overview ──────────────────────────────────────────────────────────────

export interface DayOverviewRow {
  id: number;
  date: string;
  headline: string | null;
  body: string;
}

export async function getLatestDayOverview(db: DB): Promise<DayOverviewRow | null> {
  const { data, error } = await db
    .from("editorials")
    .select("id, date, headline, body")
    .eq("kind", "day_overview")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DayOverviewRow;
}

// ── Match days ────────────────────────────────────────────────────────────────

export interface MatchDayRow {
  league_code: string;
  date: string;
  payload: MatchDayPayload;
}

export async function getMatchDaysForDate(
  db: DB,
  date: string
): Promise<MatchDayRow[]> {
  const { data, error } = await db
    .from("match_days")
    .select("league_code, date, payload")
    .eq("date", date);

  if (error || !data) return [];
  return data.map((r) => ({
    league_code: r.league_code,
    date: r.date,
    payload: r.payload as unknown as MatchDayPayload,
  }));
}

// ── Match captions ────────────────────────────────────────────────────────────

/** Returns Map<matchId, captionBody> where matchId is the Football-Data.org match ID string. */
export async function getMatchCaptionsForDate(
  db: DB,
  date: string
): Promise<Map<string, string>> {
  const { data, error } = await db
    .from("editorials")
    .select("slug, body")
    .eq("kind", "match_caption")
    .eq("date", date);

  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const row of data) {
    map.set(row.slug, row.body);
  }
  return map;
}

// ── Season stats ──────────────────────────────────────────────────────────────
//
// PostgREST does not support DISTINCT ON, so we fetch 10 rows ordered by
// snapshot_date DESC and deduplicate by league_code in JavaScript. The
// season_stats_league_date_idx on (league_code, snapshot_date DESC) covers
// this query efficiently.
//
// Upgrade path: if we ever have > 2 snapshot rows per league in the result
// window (i.e. > 10 rows across 5 leagues), increase the LIMIT accordingly,
// or move to a Postgres view with DISTINCT ON.

export async function getLatestSeasonStats(
  db: DB
): Promise<Map<LeagueCode, SeasonStatsPayload>> {
  const { data, error } = await db
    .from("season_stats")
    .select("league_code, payload")
    .order("snapshot_date", { ascending: false })
    .limit(10);

  const map = new Map<LeagueCode, SeasonStatsPayload>();
  if (error || !data) return map;

  for (const row of data) {
    const code = row.league_code as LeagueCode;
    if (!map.has(code)) {
      map.set(code, row.payload as unknown as SeasonStatsPayload);
    }
  }
  return map;
}

// ── League page queries ───────────────────────────────────────────────────────

/** Latest league_overview editorial for a single league. */
export async function getLatestLeagueOverview(
  db: DB,
  leagueCode: string
): Promise<DayOverviewRow | null> {
  const { data, error } = await db
    .from("editorials")
    .select("id, date, headline, body")
    .eq("kind", "league_overview")
    .eq("league_code", leagueCode)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DayOverviewRow;
}

export interface SeasonStatsRow {
  snapshot_date: string;
  payload: SeasonStatsPayload;
}

/**
 * Returns the most recent season_stats snapshots for a single league.
 * Default limit 2 gives latest + previous snapshot (for delta computation).
 */
export async function getLeagueSeasonStats(
  db: DB,
  leagueCode: string,
  limit = 2
): Promise<SeasonStatsRow[]> {
  const { data, error } = await db
    .from("season_stats")
    .select("snapshot_date, payload")
    .eq("league_code", leagueCode)
    .order("snapshot_date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => ({
    snapshot_date: r.snapshot_date,
    payload: r.payload as unknown as SeasonStatsPayload,
  }));
}

/** Most recent match_days rows for a single league, ordered date DESC. */
export async function getRecentMatchDaysForLeague(
  db: DB,
  leagueCode: string,
  limit = 2
): Promise<MatchDayRow[]> {
  const { data, error } = await db
    .from("match_days")
    .select("league_code, date, payload")
    .eq("league_code", leagueCode)
    .order("date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => ({
    league_code: r.league_code,
    date: r.date,
    payload: r.payload as unknown as MatchDayPayload,
  }));
}

/**
 * Match captions for a specific league and a set of dates.
 * Returns Map<matchId, captionBody>.
 */
export async function getMatchCaptionsForLeagueAndDates(
  db: DB,
  leagueCode: string,
  dates: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (dates.length === 0) return map;

  const { data, error } = await db
    .from("editorials")
    .select("slug, body")
    .eq("kind", "match_caption")
    .eq("league_code", leagueCode)
    .in("date", dates);

  if (error || !data) return map;
  for (const row of data) {
    map.set(row.slug, row.body);
  }
  return map;
}
