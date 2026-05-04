// Input and output types for the editorial generation layer.
// Inputs are built from Phase 1's fetchDailyData() output.
// Outputs are what Claude returns via structured tool use.

import type { LeagueCode, Match, ScorerEntry } from "../lib/football-types";

// ---- Context ------------------------------------------------------------

// Shared context threaded into every generation call.
export interface EditorialContext {
  date: string;        // YYYY-MM-DD UTC
  leagueCode: LeagueCode;
  leagueName: string;  // "Premier League", "La Liga", etc.
}

// ---- Inputs -------------------------------------------------------------

// Single match — used for captions and match summaries.
export interface MatchEditorialInput {
  context: EditorialContext;
  match: Match;
  // Season-to-date top scorers for this league. Provides narrative context
  // (e.g. who leads the golden boot race) without per-match event data.
  // Callers should slice to the top 10 before passing in.
  topScorers: ScorerEntry[];
}

// All finished matches in one league on one day — used for the league overview.
export interface LeagueOverviewInput {
  context: EditorialContext;
  matches: Match[];        // only status === "FINISHED"
  topScorers: ScorerEntry[]; // season-to-date, top 10
}

// All leagues on one day — used for the cross-league day overview.
export interface DayOverviewInput {
  date: string;
  leagues: {
    code: LeagueCode;
    name: string;
    matches: Match[];    // only status === "FINISHED"
  }[];
}

// ---- Outputs ------------------------------------------------------------

export interface MatchCaption {
  caption: string; // 1 sentence, ~15–25 words
}

export interface MatchSummary {
  headline: string; // ~6–10 words
  body: string;     // 2–3 paragraphs separated by \n\n
}

export interface LeagueOverview {
  headline: string;
  body: string;     // 3–5 paragraphs separated by \n\n
}

export interface DayOverview {
  headline: string;
  body: string;     // 3–5 paragraphs separated by \n\n
}

// ---- HTML render types (added here ahead of Commit 4) -------------------

export interface MatchWithCaption {
  match: Match;
  caption: MatchCaption;
}

export interface LeagueSection {
  code: LeagueCode;
  name: string;
  matches: MatchWithCaption[];
  overview: LeagueOverview;
}

export interface DayHtmlData {
  date: string;
  dayOverview: DayOverview;
  leagues: LeagueSection[];
}

// ---- Constants ----------------------------------------------------------

export const LEAGUE_NAMES: Record<LeagueCode, string> = {
  PL:  "Premier League",
  PD:  "La Liga",
  BL1: "Bundesliga",
  SA:  "Serie A",
  FL1: "Ligue 1",
};
