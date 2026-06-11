// WS0 blocking probe — does the UEFA Europa League (EL) exist on the
// Football-Data.org free tier? EXPANSION.md §0.2 makes this the gate for adding
// EL to Tabela's scope: the docs confirm CL is free-tier but say nothing
// definitive about EL. This script answers it with a live call so the decision
// is recorded in DECISIONS.md, not guessed.
//
// The decisive call is [1/4] GET /competitions/EL. On the free tier a
// restricted competition typically returns 403 ("restricted to paid plans") or
// 404. If [1/4] fails with 403/404, EL is NOT free-tier and the maintainer must
// either launch PL + CL only or migrate to API-Football (EXPANSION.md §0.2 / §10.4).
// Do NOT add EL to scope on the strength of a partial/empty 200.
//
// Usage:
//   pnpm tsx --env-file=.env.local scripts/probe-el.ts
//   (or: pnpm probe:el)
//
// Needs a real FOOTBALL_DATA_TOKEN in .env.local. Read-only; writes a single
// inspection file to output/probe-el.json. No database, no writes to the API.

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE_URL = "https://api.football-data.org/v4";
const CODE = "EL"; // UEFA Europa League

// Courtesy spacing so we never graze the free-tier 10 req/min ceiling.
const MIN_INTERVAL_MS = 7_000;
let lastRequestAt = 0;

interface FetchResult<T> {
  ok: boolean;
  status: number;
  body: T | null;
  errorText?: string;
}

// Unlike probe-cl, this probe must distinguish "restricted" (403/404) from a
// real failure, so it returns the status instead of throwing on !ok.
async function apiFetch<T>(path: string): Promise<FetchResult<T>> {
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
    const errorText = await res.text().catch(() => "(no body)");
    return { ok: false, status: res.status, body: null, errorText };
  }
  return { ok: true, status: res.status, body: (await res.json()) as T };
}

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
    homeTeam?: { name?: string };
    awayTeam?: { name?: string };
  }>;
}
interface ScorersResponse {
  scorers?: Array<{ player?: { name?: string }; goals?: number }>;
}

function recentWindow(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

async function main() {
  console.log(`\nProbing Europa League (${CODE}) on Football-Data.org…\n`);
  const raw: Record<string, unknown> = {};

  // 1. THE decisive call. Is EL accessible on this token's tier at all?
  console.log("[1/4] GET /competitions/EL");
  const info = await apiFetch<CompetitionInfo>(`/competitions/${CODE}`);
  raw.competition = { status: info.status, body: info.body, error: info.errorText };

  if (!info.ok) {
    console.log(`      ✗ ${info.status} — ${info.errorText?.slice(0, 200)}`);
    console.log(
      "\n────────────────────────────────────────────────────────────\n" +
        `VERDICT: EL is NOT available on this tier (HTTP ${info.status}).\n` +
        "Per EXPANSION.md §0.2 / §10.4: do NOT add EL to scope. Either launch\n" +
        "PL + CL only, or record a decision to migrate to API-Football.\n" +
        "Write this outcome into DECISIONS.md to close the blocking question.\n" +
        "────────────────────────────────────────────────────────────\n",
    );
    writeRaw(raw);
    process.exit(0);
  }

  console.log(
    `      ✓ ${info.body?.name ?? "?"} · season ` +
      `${info.body?.currentSeason?.startDate ?? "?"} → ` +
      `${info.body?.currentSeason?.endDate ?? "?"} · matchday ` +
      `${info.body?.currentSeason?.currentMatchday ?? "?"}`,
  );

  // 2. Standings — does EL report a table (new league phase) or only knockout?
  console.log("[2/4] GET /competitions/EL/standings");
  const standings = await apiFetch<StandingsResponse>(`/competitions/${CODE}/standings`);
  raw.standings = { status: standings.status, body: standings.body, error: standings.errorText };
  if (standings.ok) {
    const groups = standings.body?.standings ?? [];
    console.log(`      ${groups.length} standings group(s):`);
    for (const g of groups) {
      console.log(
        `        · stage="${g.stage}" type="${g.type}" group=${JSON.stringify(g.group)} ` +
          `rows=${g.table?.length ?? 0}`,
      );
    }
  } else {
    console.log(`      (standings ${standings.status} — knockout-only or restricted)`);
  }

  // 3. Scorers — confirm goals present on free tier for EL.
  console.log("[3/4] GET /competitions/EL/scorers?limit=10");
  const scorers = await apiFetch<ScorersResponse>(`/competitions/${CODE}/scorers?limit=10`);
  raw.scorers = { status: scorers.status, body: scorers.body, error: scorers.errorText };
  if (scorers.ok) {
    const top = scorers.body?.scorers?.[0];
    console.log(
      top
        ? `      ${scorers.body?.scorers?.length} scorers. Leader: ${top.player?.name} (${top.goals} goals)`
        : `      Scorer list empty.`,
    );
  } else {
    console.log(`      (scorers ${scorers.status})`);
  }

  // 4. Recent matches — confirm match data flows for EL.
  const { from, to } = recentWindow(21);
  console.log(`[4/4] GET /competitions/EL/matches?dateFrom=${from}&dateTo=${to}`);
  const matches = await apiFetch<MatchesResponse>(
    `/competitions/${CODE}/matches?dateFrom=${from}&dateTo=${to}`,
  );
  raw.matches = { status: matches.status, body: matches.body, error: matches.errorText };
  if (matches.ok) {
    const ms = matches.body?.matches ?? [];
    const stages = [...new Set(ms.map((m) => m.stage).filter(Boolean))];
    console.log(`      ${ms.length} matches in window. Stages seen: ${stages.join(", ") || "none"}`);
  } else {
    console.log(`      (matches ${matches.status})`);
  }

  console.log(
    "\n────────────────────────────────────────────────────────────\n" +
      "VERDICT: EL /competitions/EL returned 200 — it is reachable on this tier.\n" +
      "Confirm the standings/scorers/matches lines above all carry real data\n" +
      "(a 200 with empty payloads does NOT count). If they do, EL can be\n" +
      "activated per PLAN.md \"EL activation\". Record the outcome in DECISIONS.md.\n" +
      "────────────────────────────────────────────────────────────\n",
  );
  writeRaw(raw);
}

function writeRaw(raw: Record<string, unknown>) {
  const outDir = join(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "probe-el.json");
  writeFileSync(outPath, JSON.stringify(raw, null, 2), "utf-8");
  console.log(`Raw responses written to ${outPath}\n`);
}

main().catch((err) => {
  console.error("\nProbe failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
