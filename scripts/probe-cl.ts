// Phase B probe — confirm Champions League (CL) data on the Football-Data.org
// free tier and capture the exact response shapes the app will render.
//
// Why this is a standalone script (not the shared client): the CL code is not
// yet in the `LeagueCode` union (that lands in Phase C), and `getStandings`
// returns `unknown`. This probe talks to the API directly so it can run today
// and dump the raw standings shape — the one thing the docs can't fully pin
// down (the exact `stage`/`type` strings for the new 36-team league phase, and
// whether knockout rounds report a table or `form` at all).
//
// Usage:
//   pnpm tsx --env-file=.env.local scripts/probe-cl.ts
//   (or: pnpm probe:cl)
//
// Needs a real FOOTBALL_DATA_TOKEN in .env.local. Read-only; writes a single
// inspection file to output/probe-cl.json. No database, no writes to the API.

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE_URL = "https://api.football-data.org/v4";
const CODE = "CL"; // UEFA Champions League, competition id 2001

// Courtesy spacing so we never graze the free-tier 10 req/min ceiling.
const MIN_INTERVAL_MS = 7_000;
let lastRequestAt = 0;

async function apiFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token || token === "placeholder") {
    throw new Error(
      "FOOTBALL_DATA_TOKEN is not set (or is the placeholder). " +
        "Put a real free-tier token in .env.local before running this probe.",
    );
  }

  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`API ${res.status} for ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Minimal structural typing — just enough to summarise without asserting the
// shape we're trying to discover.
interface CompetitionInfo {
  name?: string;
  currentSeason?: {
    startDate?: string;
    endDate?: string;
    currentMatchday?: number | null;
  };
}
interface StandingsResponse {
  standings?: Array<{
    stage?: string;
    type?: string;
    group?: string | null;
    table?: Array<Record<string, unknown>>;
  }>;
}
interface MatchesResponse {
  matches?: Array<{
    utcDate?: string;
    status?: string;
    stage?: string;
    matchday?: number;
    homeTeam?: { name?: string };
    awayTeam?: { name?: string };
    score?: { fullTime?: { home?: number | null; away?: number | null } };
  }>;
}
interface ScorersResponse {
  scorers?: Array<{
    player?: { name?: string };
    team?: { name?: string };
    goals?: number;
    assists?: number | null;
  }>;
}

function recentWindow(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

async function main() {
  console.log(`\nProbing Champions League (${CODE}) on Football-Data.org…\n`);
  const raw: Record<string, unknown> = {};

  // 1. Competition info — season window + current matchday.
  console.log("[1/4] GET /competitions/CL");
  const info = await apiFetch<CompetitionInfo>(`/competitions/${CODE}`);
  raw.competition = info;
  console.log(
    `      ${info.name ?? "?"} · season ${info.currentSeason?.startDate ?? "?"} → ` +
      `${info.currentSeason?.endDate ?? "?"} · matchday ${info.currentSeason?.currentMatchday ?? "?"}`,
  );

  // 2. Standings — THE key unknown. How does the league phase report?
  console.log("[2/4] GET /competitions/CL/standings");
  const standings = await apiFetch<StandingsResponse>(`/competitions/${CODE}/standings`);
  raw.standings = standings;
  const groups = standings.standings ?? [];
  console.log(`      ${groups.length} standings group(s):`);
  for (const g of groups) {
    const rows = g.table ?? [];
    console.log(
      `        · stage="${g.stage}" type="${g.type}" group=${JSON.stringify(g.group)} ` +
        `rows=${rows.length}`,
    );
    const first = rows[0];
    if (first) {
      console.log(`          row keys: ${Object.keys(first).join(", ")}`);
      console.log(`          form on row 1: ${JSON.stringify((first as { form?: unknown }).form)}`);
    }
  }
  const total = groups.find((g) => g.type === "TOTAL");
  console.log(
    total
      ? `      → a TOTAL group exists (${total.table?.length ?? 0} rows) — app's standings filter will work as-is.`
      : `      → NO TOTAL group. The app filters on type==="TOTAL"; Phase C must handle CL's actual type value.`,
  );

  // 3. Scorers — confirm goals/assists present on free tier.
  console.log("[3/4] GET /competitions/CL/scorers?limit=10");
  const scorers = await apiFetch<ScorersResponse>(`/competitions/${CODE}/scorers?limit=10`);
  raw.scorers = scorers;
  const top = scorers.scorers?.[0];
  console.log(
    top
      ? `      ${scorers.scorers?.length} scorers. Leader: ${top.player?.name} ` +
          `(${top.goals} goals, assists=${JSON.stringify(top.assists)})`
      : `      Scorer list empty.`,
  );

  // 4. Recent matches — confirm status + stage labels (knockout vs league phase).
  const { from, to } = recentWindow(21);
  console.log(`[4/4] GET /competitions/CL/matches?dateFrom=${from}&dateTo=${to}`);
  const matches = await apiFetch<MatchesResponse>(
    `/competitions/${CODE}/matches?dateFrom=${from}&dateTo=${to}`,
  );
  raw.matches = matches;
  const ms = matches.matches ?? [];
  const stages = [...new Set(ms.map((m) => m.stage).filter(Boolean))];
  console.log(`      ${ms.length} matches in window. Stages seen: ${stages.join(", ") || "none"}`);
  for (const m of ms.slice(0, 5)) {
    const ft = m.score?.fullTime;
    console.log(
      `        ${m.utcDate?.slice(0, 10)} [${m.status}] (${m.stage}) ` +
        `${m.homeTeam?.name} ${ft?.home ?? "-"}–${ft?.away ?? "-"} ${m.awayTeam?.name}`,
    );
  }

  // Dump full raw responses for offline inspection.
  const outDir = join(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "probe-cl.json");
  writeFileSync(outPath, JSON.stringify(raw, null, 2), "utf-8");
  console.log(`\nRaw responses written to ${outPath}`);
  console.log("\nDone. Paste the [2/4] standings summary into DECISIONS.md to close Phase B.\n");
}

main().catch((err) => {
  console.error("\nProbe failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
