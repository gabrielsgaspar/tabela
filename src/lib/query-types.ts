// Shapes for the JSONB payloads stored in Supabase.
//
// `match_days.payload`   is the raw Football-Data.org matches response.
// `season_stats.payload` is { scorers, standings } captured per snapshot.
//
// These types describe what the website reads back out of those columns. The
// raw API shapes live in ./football-types; this module composes them into the
// stored payload shapes the query layer (queries.ts) and pages consume.

import type { Match, ScorerEntry } from "./football-types";

// ── match_days.payload ──────────────────────────────────────────────────────

// Mirrors Football-Data.org's /matches response. Stored verbatim by the pipeline.
export interface MatchDayPayload {
  matches: Match[];
}

// ── season_stats.payload ──────────────────────────────────────────────────────

// One team's row in a standings table. Field names match Football-Data.org's
// standings entries exactly.
export interface StandingTableEntry {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  // Comma-separated recent results, e.g. "W,D,L,W,W". Null when unavailable.
  form: string | null;
}

// A standings grouping. `type` is "TOTAL" | "HOME" | "AWAY"; the website reads
// the TOTAL group. `group` is set for competitions split into groups (legacy
// Champions League group stage); null for single-table leagues.
export interface StandingsGroup {
  stage: string;
  type: string;
  group: string | null;
  table: StandingTableEntry[];
}

// Mirrors Football-Data.org's /standings response (the parts we use).
export interface StandingsPayload {
  standings: StandingsGroup[];
}

// What the pipeline writes to season_stats.payload each snapshot.
export interface SeasonStatsPayload {
  scorers: ScorerEntry[];
  standings: StandingsPayload;
}
