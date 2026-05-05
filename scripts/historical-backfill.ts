// Historical backfill script — Phase 3.5.
//
// Fetches match data for the five leagues over a date range, persisting into:
//   match_days    — one row per (date, league), raw match payload
//   match_results — one row per FINISHED match, denormalized for team-history queries
//
// Fetching strategy: one API call per (league, calendar month). Each monthly
// response is split by date; each date is written atomically to both tables
// inside a shared try/catch. Idempotent upserts — safe to re-run at any time.
// Partial work from an aborted run is preserved and re-runnable.
//
// Usage:
//   # Default: 2024-08-01 → yesterday UTC (~110 API calls, ~14–16 minutes)
//   pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts
//
//   # Explicit range
//   pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \
//     --from 2024-08-01 --to 2026-05-04
//
//   # Three-season backfill (2023/24 confirmed accessible on free tier)
//   pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \
//     --from 2023-08-01
//
//   # Surgical retry — paste failed dates from end-of-run summary
//   pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \
//     --dates 2024-11-04,2025-01-12

import { createServerClient } from "../src/lib/supabase";
import {
  LEAGUES,
  type LeagueCode,
  type Match,
} from "../src/lib/football-types";
import type { Json } from "../src/lib/database.types";

// ---- Rate limiter --------------------------------------------------------
// 8 req/min effective ceiling (free tier is 10; 2-request safety margin).

const REQUESTS_PER_MINUTE = 8;
const MIN_INTERVAL_MS = Math.ceil(60_000 / REQUESTS_PER_MINUTE);
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise<void>((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

// ---- API -----------------------------------------------------------------

// Returns all matches in the date range, or null if the API returns 403
// (free-tier permission boundary for this league/period). Throws on all
// other HTTP errors so the caller can propagate them as date failures.
async function fetchMatchesRange(
  league: LeagueCode,
  dateFrom: string,
  dateTo: string,
): Promise<Match[] | null> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set");

  await throttle();

  const url =
    `https://api.football-data.org/v4/competitions/${league}/matches` +
    `?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  const res = await fetch(url, { headers: { "X-Auth-Token": token } });

  if (res.status === 403) {
    return null; // caller logs warning and skips
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { matches: Match[] };
  return data.matches ?? [];
}

// ---- Date / season helpers -----------------------------------------------

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Returns the European football season string for a given date.
// Aug–May: 2024-09-01 → "2024-25", 2025-03-01 → "2024-25",
//          2025-08-01 → "2025-26".
function deriveSeason(date: string): string {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  return month >= 8
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

interface MonthChunk {
  label: string;   // "2024-08" — used in progress logging
  dateFrom: string;
  dateTo: string;
}

// Generates all calendar-month chunks that overlap [from, to].
// dateFrom and dateTo in each chunk are clamped to the outer bounds.
function buildMonthChunks(from: string, to: string): MonthChunk[] {
  const chunks: MonthChunk[] = [];

  let year = parseInt(from.slice(0, 4), 10);
  let month = parseInt(from.slice(5, 7), 10);
  const toYear = parseInt(to.slice(0, 4), 10);
  const toMonth = parseInt(to.slice(5, 7), 10);

  while (year < toYear || (year === toYear && month <= toMonth)) {
    const yStr = String(year);
    const mStr = String(month).padStart(2, "0");
    const firstOfMonth = `${yStr}-${mStr}-01`;
    // Last day of month: day 0 of the following month.
    const lastOfMonth = new Date(Date.UTC(year, month, 0))
      .toISOString()
      .slice(0, 10);

    chunks.push({
      label: `${yStr}-${mStr}`,
      dateFrom: firstOfMonth < from ? from : firstOfMonth,
      dateTo: lastOfMonth > to ? to : lastOfMonth,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return chunks;
}

// ---- Stats ---------------------------------------------------------------

interface FailedDate {
  league: LeagueCode;
  date: string;
  error: string;
}

interface WriteStats {
  matchResultsWritten: number;
  matchDaysWritten: number;
  byLeague: Record<LeagueCode, { matchResults: number; matchDays: number }>;
  bySeason: Record<string, number>;
  failedDates: FailedDate[];
}

// ---- DB write (atomic per date) ------------------------------------------

// Upserts one date's data into match_days and match_results.
// Both writes share a try/catch: if either fails, the date is logged as
// failed and neither is counted in stats. On re-run, the failed date is
// re-attempted cleanly because all upserts are idempotent.
async function writeDate(
  db: ReturnType<typeof createServerClient>,
  league: LeagueCode,
  date: string,
  allMatchesForDate: Match[],
  stats: WriteStats,
): Promise<void> {
  const finished = allMatchesForDate.filter((m) => m.status === "FINISHED");
  const season = deriveSeason(date);

  try {
    // Write 1: match_days — all matches for this date (FINISHED and others).
    const { error: mdErr } = await db.from("match_days").upsert(
      {
        date,
        league_code: league,
        payload: { matches: allMatchesForDate } as unknown as Json,
      },
      { onConflict: "date,league_code" },
    );
    if (mdErr) throw new Error(`match_days: ${mdErr.message}`);

    // Write 2: match_results — FINISHED matches only.
    if (finished.length > 0) {
      const rows = finished.map((m) => ({
        match_id: m.id,
        date,
        league_code: league,
        season,
        matchday: m.matchday,
        home_team_id: m.homeTeam.id,
        home_team_name: m.homeTeam.name,
        home_team_short: m.homeTeam.shortName,
        away_team_id: m.awayTeam.id,
        away_team_name: m.awayTeam.name,
        away_team_short: m.awayTeam.shortName,
        score_home: m.score.fullTime.home,
        score_away: m.score.fullTime.away,
        status: m.status,
      }));
      const { error: mrErr } = await db
        .from("match_results")
        .upsert(rows, { onConflict: "match_id" });
      if (mrErr) throw new Error(`match_results: ${mrErr.message}`);
    }

    // Both writes succeeded — update stats now (never before).
    stats.matchDaysWritten++;
    stats.matchResultsWritten += finished.length;
    stats.byLeague[league].matchDays++;
    stats.byLeague[league].matchResults += finished.length;
    if (finished.length > 0) {
      stats.bySeason[season] = (stats.bySeason[season] ?? 0) + finished.length;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [${league}] ${date}: FAILED — ${msg}`);
    stats.failedDates.push({ league, date, error: msg });
  }
}

// ---- Arg parsing ---------------------------------------------------------

type Mode =
  | { kind: "range"; from: string; to: string }
  | { kind: "dates"; dates: string[] };

function parseArgs(): Mode {
  const argv = process.argv.slice(2);

  const datesIdx = argv.indexOf("--dates");
  if (datesIdx !== -1) {
    const raw = argv[datesIdx + 1];
    if (!raw) {
      console.error("--dates requires a value (e.g. --dates 2024-11-04,2025-01-12)");
      process.exit(1);
    }
    const dates = raw
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        console.error(`Invalid date in --dates: "${d}" — expected YYYY-MM-DD`);
        process.exit(1);
      }
    }
    return { kind: "dates", dates };
  }

  const fromIdx = argv.indexOf("--from");
  const toIdx = argv.indexOf("--to");
  const from = fromIdx !== -1 ? argv[fromIdx + 1] : "2024-08-01";
  const to = toIdx !== -1 ? argv[toIdx + 1] : yesterdayUtc();

  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    console.error(`Invalid --from: "${from ?? ""}" — expected YYYY-MM-DD`);
    process.exit(1);
  }
  if (!to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    console.error(`Invalid --to: "${to ?? ""}" — expected YYYY-MM-DD`);
    process.exit(1);
  }
  if (from > to) {
    console.error(`--from (${from}) must not be after --to (${to})`);
    process.exit(1);
  }

  return { kind: "range", from, to };
}

// ---- Main ----------------------------------------------------------------

async function main() {
  const mode = parseArgs();
  const db = createServerClient();
  const wallStart = Date.now();

  const stats: WriteStats = {
    matchResultsWritten: 0,
    matchDaysWritten: 0,
    byLeague: Object.fromEntries(
      LEAGUES.map((l) => [l, { matchResults: 0, matchDays: 0 }]),
    ) as Record<LeagueCode, { matchResults: number; matchDays: number }>,
    bySeason: {},
    failedDates: [],
  };

  // ---- Range mode: one API call per (league, calendar month) --------
  if (mode.kind === "range") {
    const chunks = buildMonthChunks(mode.from, mode.to);
    const totalChunks = LEAGUES.length * chunks.length;
    let chunksDone = 0;

    console.log(`\nHistorical backfill — range mode`);
    console.log(
      `Range: ${mode.from} → ${mode.to}  |  ` +
        `Months: ${chunks.length}  |  Leagues: ${LEAGUES.length}  |  ` +
        `Total API calls: ${totalChunks}`,
    );
    console.log(
      `Estimated runtime: ~${Math.ceil(totalChunks / REQUESTS_PER_MINUTE)} minutes at ${REQUESTS_PER_MINUTE} req/min\n`,
    );

    for (const league of LEAGUES) {
      for (const chunk of chunks) {
        const chunkStart = Date.now();
        chunksDone++;
        const remaining = totalChunks - chunksDone;

        let matches: Match[] | null;
        try {
          matches = await fetchMatchesRange(league, chunk.dateFrom, chunk.dateTo);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[${league}] ${chunk.label}: fetch failed — ${msg}; ${remaining} chunks remaining`,
          );
          // Treat every date in this month as failed so --dates can retry them.
          // We don't know which dates have matches, so just log the month-level error.
          stats.failedDates.push({
            league,
            date: chunk.label,
            error: `fetch failed: ${msg}`,
          });
          continue;
        }

        if (matches === null) {
          console.log(
            `[${league}] ${chunk.label}: 403 — skipped (free-tier boundary); ${remaining} chunks remaining`,
          );
          continue;
        }

        // Group by UTC date.
        const byDate = new Map<string, Match[]>();
        for (const m of matches) {
          const date = m.utcDate.slice(0, 10);
          const bucket = byDate.get(date);
          if (bucket) bucket.push(m);
          else byDate.set(date, [m]);
        }

        // Write each date atomically.
        const beforeResults = stats.matchResultsWritten;
        const beforeDays = stats.matchDaysWritten;
        for (const [date, dateMatches] of byDate) {
          await writeDate(db, league, date, dateMatches, stats);
        }

        const resultsDelta = stats.matchResultsWritten - beforeResults;
        const daysDelta = stats.matchDaysWritten - beforeDays;
        const elapsed = ((Date.now() - chunkStart) / 1000).toFixed(1);

        console.log(
          `[${league}] ${chunk.label} done: ` +
            `${resultsDelta} match_results across ${daysDelta} dates in ${elapsed}s; ` +
            `${remaining} chunks remaining`,
        );
      }
    }
  }

  // ---- Dates mode: one API call per (league, specific date) ----------
  else {
    const totalCalls = LEAGUES.length * mode.dates.length;
    let callsDone = 0;

    console.log(`\nHistorical backfill — surgical retry mode`);
    console.log(
      `Dates: ${mode.dates.join(", ")}  |  ` +
        `Leagues: ${LEAGUES.length}  |  ` +
        `Total API calls: ${totalCalls}\n`,
    );

    for (const league of LEAGUES) {
      for (const date of mode.dates) {
        const chunkStart = Date.now();
        callsDone++;
        const remaining = totalCalls - callsDone;

        let matches: Match[] | null;
        try {
          matches = await fetchMatchesRange(league, date, date);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[${league}] ${date}: fetch failed — ${msg}`);
          stats.failedDates.push({ league, date, error: `fetch: ${msg}` });
          continue;
        }

        if (matches === null) {
          console.log(
            `[${league}] ${date}: 403 — skipped; ${remaining} calls remaining`,
          );
          continue;
        }

        const before = stats.matchResultsWritten;
        await writeDate(db, league, date, matches, stats);
        const resultsDelta = stats.matchResultsWritten - before;
        const elapsed = ((Date.now() - chunkStart) / 1000).toFixed(1);

        console.log(
          `[${league}] ${date} done: ` +
            `${resultsDelta} match_results in ${elapsed}s; ` +
            `${remaining} calls remaining`,
        );
      }
    }
  }

  // ---- Final summary ---------------------------------------------------

  const totalElapsed = Math.round((Date.now() - wallStart) / 1000);
  const mins = Math.floor(totalElapsed / 60);
  const secs = totalElapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  console.log(`\n${"═".repeat(68)}`);
  console.log(`BACKFILL COMPLETE — elapsed: ${elapsedStr}`);
  console.log("═".repeat(68));
  console.log(`  match_results written : ${stats.matchResultsWritten}`);
  console.log(`  match_days written    : ${stats.matchDaysWritten}`);

  console.log(`\n  By league:`);
  for (const league of LEAGUES) {
    const s = stats.byLeague[league];
    console.log(
      `    ${league.padEnd(4)}  ` +
        `${String(s.matchResults).padStart(5)} match_results  /  ` +
        `${String(s.matchDays).padStart(3)} match_days`,
    );
  }

  console.log(`\n  By season:`);
  for (const [season, count] of Object.entries(stats.bySeason).sort()) {
    console.log(`    ${season}  →  ${count} match_results`);
  }

  if (stats.failedDates.length > 0) {
    console.log(`\n  Failed (${stats.failedDates.length}): re-run with --dates to retry:`);
    const retryDates = [
      ...new Set(stats.failedDates.map((f) => f.date)),
    ].join(",");
    for (const f of stats.failedDates) {
      console.log(`    [${f.league}] ${f.date} — ${f.error}`);
    }
    console.log(`\n  Retry command:`);
    console.log(
      `    pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \\`,
    );
    console.log(`      --dates ${retryDates}`);
    process.exit(1);
  } else {
    console.log(`\n  No failures.`);
  }
}

main().catch((err) => {
  console.error("\nFatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
