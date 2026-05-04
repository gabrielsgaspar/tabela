// Football-Data.org v4 API client.
// Free tier: 10 requests per minute. All fetches are serialised through a
// rate limiter — never fire in parallel.
//
// See DATA.md for endpoint reference, sample response shapes, and the
// rationale for using this source over paid alternatives.

import type {
  LeagueCode,
  MatchesResponse,
  ScorersResponse,
} from "../lib/football-types";

const BASE_URL = "https://api.football-data.org/v4";

// Free tier ceiling. Subtract two as a safety margin so we never graze the
// actual limit (the API returns 429s that count against your quota).
const REQUESTS_PER_MINUTE = 8;
const MIN_INTERVAL_MS = Math.ceil((60 * 1000) / REQUESTS_PER_MINUTE);

// ---- Rate limiter --------------------------------------------------------

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - elapsed;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }
  lastRequestAt = Date.now();
}

// ---- HTTP helper ---------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error(
      "FOOTBALL_DATA_TOKEN is not set. Add it to .env.local before running.",
    );
  }

  await throttle();

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": token },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `Football-Data API error ${res.status} for ${path}: ${body}`,
    );
  }

  return res.json() as Promise<T>;
}

// ---- Public API ----------------------------------------------------------

/**
 * Fetch all matches for a league on a single UTC date.
 * @param league  One of the five supported league codes (PL, PD, BL1, SA, FL1).
 * @param date    YYYY-MM-DD string in UTC.
 */
export async function getMatches(
  league: LeagueCode,
  date: string,
): Promise<MatchesResponse> {
  return apiFetch<MatchesResponse>(
    `/competitions/${league}/matches?dateFrom=${date}&dateTo=${date}`,
  );
}

/**
 * Fetch the current season top scorers for a league (free tier: goals + assists).
 * @param league  One of the five supported league codes.
 * @param limit   How many scorers to return. Default 20 (API max on free tier).
 */
export async function getScorers(
  league: LeagueCode,
  limit = 20,
): Promise<ScorersResponse> {
  return apiFetch<ScorersResponse>(
    `/competitions/${league}/scorers?limit=${limit}`,
  );
}

/**
 * Fetch current standings for a league.
 * Typed as `unknown` in Phase 1 — the full StandingsResponse type will be
 * defined in Phase 3 when we design the Supabase schema around it.
 */
export async function getStandings(league: LeagueCode): Promise<unknown> {
  return apiFetch<unknown>(`/competitions/${league}/standings`);
}
