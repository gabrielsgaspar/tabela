// Team-history helper layer — Phase 3.5.
//
// Pure query functions that surface team-specific historical context from
// the match_results table. Used by the editorial prompt layer to enable
// claims like "Wolves' first win since November" or "Arsenal's third
// clean sheet in four matches."
//
// All functions accept a Supabase client as their first argument so they
// are testable in isolation and decoupled from the module-level singleton.
//
// Performance contract: all queries hit the (home_team_id, date DESC) and
// (away_team_id, date DESC) indexes on match_results. At ~76 rows per team
// (two seasons × 38 matches), each function should resolve in < 50ms.
//
// Edge-case conventions:
//   - Team with no matches before asOfDate:
//       lastWin / lastCleanSheet → null
//       currentStreak           → { type: "W", length: 0, since: null }
//       lastNMatches            → []
//       dataFrom                → null if team has no data at all
//   - Team with only one match: streak length 1, lastNMatches has one entry.
//   - Two teams that have never met: getHeadToHead returns [] (never null).
//   - Team with no matches in the current season: getCurrentSeasonStats returns null.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

type Db = SupabaseClient<Database>;
type MatchRow = Database["public"]["Tables"]["match_results"]["Row"];

// ---- Public types --------------------------------------------------------

/** A single match reference from a given team's perspective. */
export interface MatchRef {
  date: string;             // YYYY-MM-DD
  opponent: string;         // short team name
  /** "goals_for-goals_against" from the team's perspective */
  score: string;
  venue: "home" | "away";
}

export type ResultType = "W" | "D" | "L";

/**
 * Current result streak as of asOfDate (exclusive), walking backwards.
 * If the team has no matches in the window, length is 0 and since is null.
 */
export interface Streak {
  type: ResultType;
  length: number;
  /** Date of the first match in the streak (oldest end); null if length === 0. */
  since: string | null;
}

export interface RecentMatch {
  date: string;
  opponent: string;
  result: ResultType;
  /** "goals_for-goals_against" from the team's perspective */
  score: string;
  venue: "home" | "away";
}

/**
 * Bundled historical context for one team relative to asOfDate.
 * asOfDate is exclusive — only matches strictly before it are considered.
 */
export interface TeamHistoryContext {
  teamId: number;
  asOfDate: string;
  /**
   * Earliest match date for this team in all of match_results,
   * regardless of asOfDate. Represents the data horizon for this team.
   * Null if the team has no matches at all.
   */
  dataFrom: string | null;
  lastWin: MatchRef | null;
  lastCleanSheet: MatchRef | null;
  currentStreak: Streak;
  /** Most recent first, up to n matches (default 5). */
  lastNMatches: RecentMatch[];
}

/** A single head-to-head meeting between two teams. */
export interface HeadToHeadMatch {
  date: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  /** "home_score-away_score" */
  score: string;
  leagueCode: string;
  season: string;
}

/** Season-to-date stats for a team as of a given date. */
export interface SeasonStats {
  season: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

// ---- Internal helpers ----------------------------------------------------

// Returns the European football season string for a date.
// Aug 1 or later is the new season: "2025-26", else "2024-25".
function deriveSeason(date: string): string {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  return month >= 8
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

function resultFor(teamId: number, m: MatchRow): ResultType {
  const gh = m.score_home ?? 0;
  const ga = m.score_away ?? 0;
  if (m.home_team_id === teamId) {
    if (gh > ga) return "W";
    if (gh < ga) return "L";
    return "D";
  }
  // team is away
  if (ga > gh) return "W";
  if (ga < gh) return "L";
  return "D";
}

function isCleanSheet(teamId: number, m: MatchRow): boolean {
  if (m.score_home === null || m.score_away === null) return false;
  return m.home_team_id === teamId ? m.score_away === 0 : m.score_home === 0;
}

function scoreStr(teamId: number, m: MatchRow): string {
  const gf = m.home_team_id === teamId ? (m.score_home ?? 0) : (m.score_away ?? 0);
  const ga = m.home_team_id === teamId ? (m.score_away ?? 0) : (m.score_home ?? 0);
  return `${gf}-${ga}`;
}

function opponentShort(teamId: number, m: MatchRow): string {
  return m.home_team_id === teamId ? m.away_team_short : m.home_team_short;
}

function venueOf(teamId: number, m: MatchRow): "home" | "away" {
  return m.home_team_id === teamId ? "home" : "away";
}

function toMatchRef(teamId: number, m: MatchRow): MatchRef {
  return {
    date: m.date,
    opponent: opponentShort(teamId, m),
    score: scoreStr(teamId, m),
    venue: venueOf(teamId, m),
  };
}

function toRecentMatch(teamId: number, m: MatchRow): RecentMatch {
  return {
    date: m.date,
    opponent: opponentShort(teamId, m),
    result: resultFor(teamId, m),
    score: scoreStr(teamId, m),
    venue: venueOf(teamId, m),
  };
}

// ---- Public API ----------------------------------------------------------

/**
 * Returns bundled historical context for a team as of asOfDate (exclusive).
 *
 * Runs two parallel queries:
 *   1. All FINISHED matches before asOfDate — ordered newest first.
 *      Used for streak, lastWin, lastCleanSheet, and lastNMatches.
 *   2. Earliest match date for the team (no date filter) — used for dataFrom.
 *
 * @param options.n  Number of recent matches to include in lastNMatches. Default 5.
 */
export async function getTeamHistory(
  db: Db,
  teamId: number,
  asOfDate: string,
  options?: { n?: number },
): Promise<TeamHistoryContext> {
  const n = options?.n ?? 5;

  const [matchesRes, dataFromRes] = await Promise.all([
    db
      .from("match_results")
      .select("*")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .lt("date", asOfDate)
      .order("date", { ascending: false }),
    db
      .from("match_results")
      .select("date")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("date", { ascending: true })
      .limit(1),
  ]);

  if (matchesRes.error) throw new Error(`getTeamHistory: ${matchesRes.error.message}`);
  if (dataFromRes.error) throw new Error(`getTeamHistory (dataFrom): ${dataFromRes.error.message}`);

  const matches = matchesRes.data ?? [];
  const dataFrom = dataFromRes.data?.[0]?.date ?? null;

  // lastNMatches — front of the date-DESC sorted list
  const lastNMatches = matches.slice(0, n).map((m) => toRecentMatch(teamId, m));

  // currentStreak — walk from newest until the result type changes
  let currentStreak: Streak;
  if (matches.length === 0) {
    currentStreak = { type: "W", length: 0, since: null };
  } else {
    const streakType = resultFor(teamId, matches[0]);
    let len = 1;
    for (let i = 1; i < matches.length; i++) {
      if (resultFor(teamId, matches[i]) === streakType) len++;
      else break;
    }
    // matches[len - 1] is the oldest match in the streak
    currentStreak = { type: streakType, length: len, since: matches[len - 1].date };
  }

  // lastWin — most recent W in the list
  const lastWinRow = matches.find((m) => resultFor(teamId, m) === "W") ?? null;

  // lastCleanSheet — most recent match where team conceded 0
  const lastCSRow = matches.find((m) => isCleanSheet(teamId, m)) ?? null;

  return {
    teamId,
    asOfDate,
    dataFrom,
    lastWin: lastWinRow ? toMatchRef(teamId, lastWinRow) : null,
    lastCleanSheet: lastCSRow ? toMatchRef(teamId, lastCSRow) : null,
    currentStreak,
    lastNMatches,
  };
}

/**
 * Returns up to lastN meetings between two teams before beforeDate, most
 * recent first. Returns an empty array if the teams have not met within the
 * data window — never throws, never returns null.
 */
export async function getHeadToHead(
  db: Db,
  teamAId: number,
  teamBId: number,
  beforeDate: string,
  lastN = 5,
): Promise<HeadToHeadMatch[]> {
  const { data, error } = await db
    .from("match_results")
    .select("*")
    .or(
      `and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),` +
        `and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`,
    )
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(lastN);

  if (error) throw new Error(`getHeadToHead: ${error.message}`);

  return (data ?? []).map((m) => ({
    date: m.date,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeTeamName: m.home_team_name,
    awayTeamName: m.away_team_name,
    score: `${m.score_home ?? "?"}-${m.score_away ?? "?"}`,
    leagueCode: m.league_code,
    season: m.season,
  }));
}

/**
 * Returns season-to-date stats for a team in the current season as of
 * asOfDate (exclusive). "Current season" is derived from the date using
 * the Aug 1 cutoff.
 *
 * Returns null if the team has no matches in the current season before asOfDate.
 */
export async function getCurrentSeasonStats(
  db: Db,
  teamId: number,
  asOfDate: string,
): Promise<SeasonStats | null> {
  const season = deriveSeason(asOfDate);

  const { data, error } = await db
    .from("match_results")
    .select("score_home, score_away, home_team_id")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("season", season)
    .lt("date", asOfDate);

  if (error) throw new Error(`getCurrentSeasonStats: ${error.message}`);

  const matches = data ?? [];
  if (matches.length === 0) return null;

  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;

  for (const m of matches) {
    const gh = m.score_home ?? 0;
    const ga = m.score_away ?? 0;
    const gf = m.home_team_id === teamId ? gh : ga;
    const gag = m.home_team_id === teamId ? ga : gh;
    goalsFor += gf;
    goalsAgainst += gag;
    if (gf > gag) won++;
    else if (gf === gag) drawn++;
    else lost++;
  }

  return {
    season,
    played: matches.length,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    points: won * 3 + drawn,
  };
}
