// Backfill script — runs the full daily pipeline for a range of historical dates.
//
// Usage:
//   pnpm backfill                                  # last 7 days
//   pnpm backfill -- --from 2026-04-27 --to 2026-05-03
//   pnpm backfill -- --days 14                     # last 14 days
//
// Days run strictly sequentially: day N's season_stats must be written before
// day N+1's editorials read them. The Football-Data.org rate limiter in
// client.ts enforces API pacing regardless of JS async ordering.

import { runDailyPipeline, type PipelineResult } from "../src/trigger/pipeline";
import { createServerClient } from "../src/lib/supabase";

// ---- Date helpers --------------------------------------------------------

function parseDate(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    console.error(`Invalid date "${s}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }
  return new Date(`${s}T00:00:00Z`);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function dateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(formatDate(cur));
    cur = addDays(cur, 1);
  }
  return dates;
}

// ---- Arg parsing ---------------------------------------------------------

function parseDaysArg(): number {
  const idx = process.argv.indexOf("--days");
  if (idx !== -1 && process.argv[idx + 1]) {
    const n = parseInt(process.argv[idx + 1], 10);
    if (isNaN(n) || n < 1) {
      console.error("--days must be a positive integer.");
      process.exit(1);
    }
    return n;
  }
  return 7;
}

function parseDateRange(): { from: string; to: string } {
  const fromIdx = process.argv.indexOf("--from");
  const toIdx = process.argv.indexOf("--to");

  if (fromIdx !== -1 || toIdx !== -1) {
    if (fromIdx === -1 || toIdx === -1) {
      console.error("--from and --to must be used together.");
      process.exit(1);
    }
    return {
      from: process.argv[fromIdx + 1],
      to: process.argv[toIdx + 1],
    };
  }

  // Default: last N days (yesterday inclusive).
  const days = parseDaysArg();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const from = addDays(yesterday, -(days - 1));
  return {
    from: formatDate(from),
    to: formatDate(yesterday),
  };
}

// ---- Gap detection -------------------------------------------------------

interface RowCounts {
  match_days: number;
  season_stats: number;
  editorials: number;
}

async function countRowsForDate(date: string): Promise<RowCounts> {
  const db = createServerClient();
  const [md, ss, ed] = await Promise.all([
    db.from("match_days").select("*", { count: "exact", head: true }).eq("date", date),
    db
      .from("season_stats")
      .select("*", { count: "exact", head: true })
      .eq("snapshot_date", date),
    db.from("editorials").select("*", { count: "exact", head: true }).eq("date", date),
  ]);
  return {
    match_days: md.count ?? 0,
    season_stats: ss.count ?? 0,
    editorials: ed.count ?? 0,
  };
}

function logGap(table: string, before: number, after: number) {
  const inserted = after - before;
  const overwritten = before;
  const pad = " ".repeat(Math.max(0, 14 - table.length));
  console.log(`  ${table}:${pad}before=${before}  after=${after}  inserted=${inserted}  overwritten=${overwritten}`);
}

// ---- Main ----------------------------------------------------------------

async function main() {
  const { from, to } = parseDateRange();
  const dates = dateRange(parseDate(from), parseDate(to));

  console.log(`\nBackfill: ${from} → ${to} (${dates.length} days)\n`);

  const results: PipelineResult[] = [];
  let totalEditorials = 0;
  let totalFailed = 0;

  for (const date of dates) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Date: ${date}`);
    console.log(`${"─".repeat(60)}`);

    try {
      const before = await countRowsForDate(date);
      const result = await runDailyPipeline(date);
      const after = await countRowsForDate(date);

      results.push(result);
      totalEditorials += result.editorialsWritten;
      totalFailed += result.editorialsFailed;

      console.log(`\nGap check for ${date}:`);
      logGap("match_days", before.match_days, after.match_days);
      logGap("season_stats", before.season_stats, after.season_stats);
      logGap("editorials", before.editorials, after.editorials);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Fatal error for ${date}: ${msg}`);
      // Continue with next date rather than aborting the whole backfill.
    }
  }

  // ---- Summary -----------------------------------------------------------

  console.log(`\n${"═".repeat(60)}`);
  console.log("BACKFILL SUMMARY");
  console.log(`${"═".repeat(60)}`);

  for (const r of results) {
    const matchLeagues = r.leaguesWithMatches.join(", ") || "none";
    const errLeagues = r.leaguesDataFailed.join(", ") || "none";
    console.log(
      `${r.date}  matches=${matchLeagues}  ` +
        `editorials=${r.editorialsWritten}  ` +
        `errors=${r.editorialsFailed}  ` +
        `data_fail=${errLeagues}`,
    );
  }

  const daysWithMatches = results.filter((r) => r.leaguesWithMatches.length > 0).length;
  console.log(`\nTotal editorials written: ${totalEditorials}`);
  console.log(`Total editorial failures: ${totalFailed}`);
  console.log(`Days with matches:        ${daysWithMatches} / ${results.length}`);

  if (totalFailed > 0) {
    console.error("\nSome editorials failed — review logs above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
