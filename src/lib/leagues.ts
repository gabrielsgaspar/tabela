// League registry — display metadata for the leagues the website surfaces.
//
// The canonical set of league *codes* lives in football-types.ts (LEAGUES).
// This module attaches presentation metadata (URL slug, display name, flag,
// current season) and the slug → meta lookup used by routing.
//
// LEAGUE_META order is the order leagues appear on the home page.

import type { LeagueCode } from "./football-types";

/**
 * A competition is either a domestic `league` (a season-long table, e.g. the
 * Premier League) or a `cup` (a knockout/league-phase tournament, e.g. the
 * Champions League). WS4's watchability scoring and the standings renderer key
 * off this to decide whether a table or a bracket applies.
 */
export type CompetitionKind = "league" | "cup";

export interface LeagueMeta {
  code: LeagueCode;
  name: string;
  /** URL slug for /leagues/[slug]. */
  slug: string;
  /** Country/competition flag emoji used in headers and filter chips. */
  flag: string;
  /** Display label for the active season, e.g. "2025/26". */
  currentSeason: string;
  /** Whether this competition runs as a table (`league`) or a bracket (`cup`). */
  kind: CompetitionKind;
}

const SEASON = "2025/26";

export const LEAGUE_META: readonly LeagueMeta[] = [
  { code: "PL", name: "Premier League",         slug: "premier-league",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", currentSeason: SEASON, kind: "league" },
  { code: "CL", name: "UEFA Champions League",  slug: "champions-league", flag: "🇪🇺",       currentSeason: SEASON, kind: "cup"    },
];

/**
 * The competition registry — the single entry point for "which competitions
 * does Tabela cover, and what kind is each". An alias of `LEAGUE_META`, named to
 * match the EXPANSION.md vocabulary (a competition can be a league or a cup).
 * Add a competition here (and its code to `LEAGUES`/`LeagueCode` in
 * football-types.ts) to bring it into scope — see PLAN.md "EL activation".
 */
export const COMPETITIONS = LEAGUE_META;

const BY_SLUG = new Map<string, LeagueMeta>(
  LEAGUE_META.map((m) => [m.slug, m]),
);

const BY_CODE = new Map<LeagueCode, LeagueMeta>(
  LEAGUE_META.map((m) => [m.code, m]),
);

/** Look up league metadata by URL slug. Returns undefined for unknown slugs. */
export function leagueBySlug(slug: string): LeagueMeta | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Look up league metadata by Football-Data.org code. Accepts a plain string
 * (codes read back from the database are typed as `string`) and returns
 * undefined for codes outside the registry.
 */
export function leagueByCode(code: string): LeagueMeta | undefined {
  return BY_CODE.get(code as LeagueCode);
}

/**
 * Whether a competition is a `league` (table) or a `cup` (bracket). Falls back
 * to `"league"` for unknown codes so callers never have to null-check.
 */
export function competitionKind(code: string): CompetitionKind {
  return BY_CODE.get(code as LeagueCode)?.kind ?? "league";
}
