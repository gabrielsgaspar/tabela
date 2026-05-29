// League registry — display metadata for the leagues the website surfaces.
//
// The canonical set of league *codes* lives in football-types.ts (LEAGUES).
// This module attaches presentation metadata (URL slug, display name, flag,
// current season) and the slug → meta lookup used by routing.
//
// LEAGUE_META order is the order leagues appear on the home page.

import type { LeagueCode } from "./football-types";

export interface LeagueMeta {
  code: LeagueCode;
  name: string;
  /** URL slug for /leagues/[slug]. */
  slug: string;
  /** Country/competition flag emoji used in headers and filter chips. */
  flag: string;
  /** Display label for the active season, e.g. "2025/26". */
  currentSeason: string;
}

const SEASON = "2025/26";

export const LEAGUE_META: readonly LeagueMeta[] = [
  { code: "PL",  name: "Premier League", slug: "premier-league", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", currentSeason: SEASON },
  { code: "PD",  name: "La Liga",        slug: "la-liga",        flag: "🇪🇸",          currentSeason: SEASON },
  { code: "BL1", name: "Bundesliga",     slug: "bundesliga",     flag: "🇩🇪",          currentSeason: SEASON },
  { code: "SA",  name: "Serie A",        slug: "serie-a",        flag: "🇮🇹",          currentSeason: SEASON },
  { code: "FL1", name: "Ligue 1",        slug: "ligue-1",        flag: "🇫🇷",          currentSeason: SEASON },
];

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
