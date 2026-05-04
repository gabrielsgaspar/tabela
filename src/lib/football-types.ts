// Football-Data.org v4 response shapes.
// Field names match the API exactly — do not rename or paraphrase.
// See DATA.md for the sample payloads these types are derived from.

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Score {
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
}

export interface MatchesResponse {
  matches: Match[];
}

export interface Player {
  id: number;
  name: string;
  nationality: string;
}

export interface ScorerEntry {
  player: Player;
  team: { id: number; name: string };
  goals: number;
  assists: number | null; // confirmed present on free tier — see DECISIONS.md Phase 1 entry
  playedMatches: number;
}

export interface ScorersResponse {
  scorers: ScorerEntry[];
}

export type LeagueCode = "PL" | "PD" | "BL1" | "SA" | "FL1";

export const LEAGUES: readonly LeagueCode[] = ["PL", "PD", "BL1", "SA", "FL1"];

// TODO Phase 3: add StandingsResponse type once we define the Supabase schema.
// The /standings endpoint is fetched in Phase 1 but typed as `unknown` until then.
