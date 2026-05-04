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

// "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null (null while in progress)
export type MatchWinner = "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;

// "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
export type MatchDuration = "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";

export interface Score {
  winner: MatchWinner;
  duration: MatchDuration;
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
  assists: number | null;   // present on free tier; null for scorers with none recorded
  penalties: number | null; // goals from the spot; also available on free tier
  playedMatches: number;
}

export interface ScorersResponse {
  scorers: ScorerEntry[];
}

export type LeagueCode = "PL" | "PD" | "BL1" | "SA" | "FL1";

export const LEAGUES: readonly LeagueCode[] = ["PL", "PD", "BL1", "SA", "FL1"];

// Phase 3: StandingsResponse type will be defined once the Supabase schema is in place.
// The /standings endpoint is fetched in Phase 1 but typed as `unknown` until then.
