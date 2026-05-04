// Fetch one day's worth of match data across all five leagues and write the
// result to output/YYYY-MM-DD.json.
//
// Usage:
//   pnpm run-once                       # yesterday (UTC)
//   pnpm run-once -- --date 2026-05-03  # specific date
//
// The output file is the Phase 1 deliverable: clean JSON you can inspect
// before wiring up the Trigger.dev task.

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getMatches, getScorers } from "../src/football/client";
import { LEAGUES } from "../src/lib/football-types";
import type { LeagueCode, Match, ScorerEntry } from "../src/lib/football-types";

// ---- Date helpers --------------------------------------------------------

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function parseDateArg(): string {
  const idx = process.argv.indexOf("--date");
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = process.argv[idx + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      console.error(`Invalid --date value "${val}". Expected YYYY-MM-DD.`);
      process.exit(1);
    }
    return val;
  }
  return yesterday();
}

// ---- Types for the output file -------------------------------------------

interface LeagueResult {
  leagueCode: LeagueCode;
  leagueName: string;
  date: string;
  fetchedAt: string;
  finishedMatches: Match[];
  scheduledMatches: Match[];
  otherMatches: Match[];
  topScorers: ScorerEntry[];
  errors: string[];
}

interface DailyOutput {
  date: string;
  generatedAt: string;
  leagues: LeagueResult[];
  summary: {
    totalFinished: number;
    totalScheduled: number;
    leaguesWithMatches: string[];
    leaguesEmpty: string[];
    leagueErrors: string[];
  };
}

const LEAGUE_NAMES: Record<LeagueCode, string> = {
  PL: "Premier League",
  PD: "La Liga",
  BL1: "Bundesliga",
  SA: "Serie A",
  FL1: "Ligue 1",
};

// ---- Main ----------------------------------------------------------------

async function main() {
  const date = parseDateArg();
  console.log(`\nFetching data for ${date} across ${LEAGUES.length} leagues…\n`);

  const results: LeagueResult[] = [];

  for (const code of LEAGUES) {
    const name = LEAGUE_NAMES[code];
    const errors: string[] = [];
    let finishedMatches: Match[] = [];
    let scheduledMatches: Match[] = [];
    let otherMatches: Match[] = [];
    let topScorers: ScorerEntry[] = [];

    // Fetch matches --------------------------------------------------------
    console.log(`[${code}] Fetching matches…`);
    try {
      const data = await getMatches(code, date);
      finishedMatches = data.matches.filter((m) => m.status === "FINISHED");
      scheduledMatches = data.matches.filter(
        (m) => m.status === "SCHEDULED" || m.status === "TIMED",
      );
      otherMatches = data.matches.filter(
        (m) =>
          m.status !== "FINISHED" &&
          m.status !== "SCHEDULED" &&
          m.status !== "TIMED",
      );
      console.log(
        `[${code}] ${data.matches.length} total — ${finishedMatches.length} finished, ` +
          `${scheduledMatches.length} scheduled`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`matches: ${msg}`);
      console.error(`[${code}] Match fetch failed: ${msg}`);
    }

    // Fetch top scorers (always — useful context regardless of match day) ---
    console.log(`[${code}] Fetching top scorers…`);
    try {
      const data = await getScorers(code);
      topScorers = data.scorers;
      const sample = topScorers[0];
      if (sample) {
        console.log(
          `[${code}] ${topScorers.length} scorers. Leader: ${sample.player.name} ` +
            `(${sample.goals} goals, ${sample.assists ?? 0} assists)`,
        );
      } else {
        console.log(`[${code}] Scorer list empty — season may not have started`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`scorers: ${msg}`);
      console.error(`[${code}] Scorer fetch failed: ${msg}`);
    }

    results.push({
      leagueCode: code,
      leagueName: name,
      date,
      fetchedAt: new Date().toISOString(),
      finishedMatches,
      scheduledMatches,
      otherMatches,
      topScorers,
      errors,
    });
  }

  // ---- Build summary -----------------------------------------------------

  const leaguesWithMatches = results
    .filter((r) => r.finishedMatches.length > 0)
    .map((r) => r.leagueCode);

  const leaguesEmpty = results
    .filter((r) => r.finishedMatches.length === 0 && r.errors.length === 0)
    .map((r) => r.leagueCode);

  const leagueErrors = results
    .filter((r) => r.errors.length > 0)
    .map((r) => r.leagueCode);

  const output: DailyOutput = {
    date,
    generatedAt: new Date().toISOString(),
    leagues: results,
    summary: {
      totalFinished: results.reduce((n, r) => n + r.finishedMatches.length, 0),
      totalScheduled: results.reduce(
        (n, r) => n + r.scheduledMatches.length,
        0,
      ),
      leaguesWithMatches,
      leaguesEmpty,
      leagueErrors,
    },
  };

  // ---- Write output file -------------------------------------------------

  const outputDir = join(process.cwd(), "output");
  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, `${date}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  // ---- Console summary ---------------------------------------------------

  console.log("\n--- Summary ---");
  console.log(`Date:                ${date}`);
  console.log(`Leagues with matches: ${leaguesWithMatches.join(", ") || "none"}`);
  console.log(`Leagues empty:        ${leaguesEmpty.join(", ") || "none"}`);
  console.log(`Leagues with errors:  ${leagueErrors.join(", ") || "none"}`);
  console.log(`Total finished:       ${output.summary.totalFinished}`);
  console.log(`Total scheduled:      ${output.summary.totalScheduled}`);
  console.log(`Output:               ${outPath}`);

  if (leagueErrors.length > 0) {
    console.error("\nErrors occurred — check the JSON for details.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
