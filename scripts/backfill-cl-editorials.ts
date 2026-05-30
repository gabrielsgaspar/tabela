// CL editorial backfill — generates captions + league/day overviews for every
// date on which the Champions League has a FINISHED match in the database.
//
// Why a dedicated script: runDailyPipeline regenerates editorials for every
// league with finished matches on a date. To avoid re-fetching PL, writing
// empty PL snapshots, or overwriting existing PL editorials, this driver passes
// the leagues filter ["CL"] so only Champions League content is touched.
//
// Source of dates: distinct dates from match_results where league_code='CL' and
// status='FINISHED' (populated by scripts/historical-backfill.ts). Processed in
// ascending date order so the most recent date is generated last.
//
// Cost: each date runs the pipeline through Anthropic (captions + overviews).
// Audio synthesis (ElevenLabs) runs too; if ELEVENLABS_API_KEY is a placeholder
// it fails non-fatally and the editorial rows are still written without audio.
//
// Resumable: pass --from YYYY-MM-DD to skip earlier dates after a partial run.
//
// Usage:
//   pnpm exec tsx --env-file=.env.local scripts/backfill-cl-editorials.ts
//   pnpm exec tsx --env-file=.env.local scripts/backfill-cl-editorials.ts --from 2026-01-01

import { runDailyPipeline } from "../src/trigger/pipeline";
import { createServerClient } from "../src/lib/supabase";

function parseFrom(): string | null {
  const idx = process.argv.indexOf("--from");
  if (idx !== -1 && process.argv[idx + 1]) {
    const v = process.argv[idx + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      console.error(`Invalid --from "${v}" — expected YYYY-MM-DD`);
      process.exit(1);
    }
    return v;
  }
  return null;
}

async function main() {
  const from = parseFrom();
  const db = createServerClient();

  // Distinct CL dates with at least one FINISHED match, ascending.
  const { data, error } = await db
    .from("match_results")
    .select("date")
    .eq("league_code", "CL")
    .eq("status", "FINISHED")
    .order("date", { ascending: true });

  if (error) {
    console.error(`Failed to read CL dates: ${error.message}`);
    process.exit(1);
  }

  let dates = [...new Set((data ?? []).map((r) => r.date))];
  if (from) dates = dates.filter((d) => d >= from);

  if (dates.length === 0) {
    console.log("No CL dates to process.");
    return;
  }

  console.log(`\nCL editorial backfill — ${dates.length} date(s)`);
  console.log(`Range: ${dates[0]} → ${dates[dates.length - 1]}\n`);

  const wallStart = Date.now();
  let written = 0;
  let failed = 0;
  const failedDates: { date: string; error: string }[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const n = `${i + 1}/${dates.length}`;
    const t0 = Date.now();
    try {
      const result = await runDailyPipeline(date, ["CL"]);
      written += result.editorialsWritten;
      failed += result.editorialsFailed;
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[${n}] ${date}: ${result.editorialsWritten} editorials written, ` +
          `${result.editorialsFailed} failed, ${result.audioFailed} audio failed ` +
          `(${secs}s)`,
      );
      if (result.editorialsFailed > 0) {
        failedDates.push({ date, error: `${result.editorialsFailed} editorial(s) failed` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${n}] ${date}: FATAL — ${msg}`);
      failedDates.push({ date, error: msg });
    }
  }

  const totalSecs = Math.round((Date.now() - wallStart) / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`CL EDITORIAL BACKFILL COMPLETE — ${mins}m ${secs}s`);
  console.log("═".repeat(60));
  console.log(`  Dates processed     : ${dates.length}`);
  console.log(`  Editorials written  : ${written}`);
  console.log(`  Editorials failed   : ${failed}`);

  if (failedDates.length > 0) {
    console.log(`\n  Dates with failures (re-run with --from to retry):`);
    for (const f of failedDates) console.log(`    ${f.date} — ${f.error}`);
    process.exit(1);
  } else {
    console.log(`\n  No failures.`);
  }
}

main().catch((err) => {
  console.error("\nFatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
