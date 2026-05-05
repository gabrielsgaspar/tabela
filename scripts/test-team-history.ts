// scripts/test-team-history.ts
//
// Manual smoke-test for src/editorial/team-history.ts.
// Runs against the live Supabase database (uses service-role key via .env.local).
//
// Usage:
//   npx tsx scripts/test-team-history.ts
//
// Prints results for ≥5 team/date pairs and timing for every call.
// Every call should resolve in < 50ms.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import type { Database } from "../src/lib/database.types";
import {
  getTeamHistory,
  getHeadToHead,
  getCurrentSeasonStats,
} from "../src/editorial/team-history";

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient<Database>(supabaseUrl, supabaseKey);

function fmt(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  const flag = elapsed > 50 ? " ⚠️  OVER 50ms" : "";
  console.log(`  [${fmt(elapsed)}]${flag} ${label}`);
  return result;
}

// ---- Test cases ----------------------------------------------------------

async function testGetTeamHistory() {
  console.log("\n=== getTeamHistory ===");

  // 1. Arsenal (57) as of today — expect W streak of 2
  {
    const ctx = await timed("Arsenal (57) as of 2026-05-05", () =>
      getTeamHistory(db, 57, "2026-05-05"),
    );
    console.log(`    streak:       ${ctx.currentStreak.type}×${ctx.currentStreak.length} since ${ctx.currentStreak.since}`);
    console.log(`    lastWin:      ${ctx.lastWin ? `${ctx.lastWin.date} vs ${ctx.lastWin.opponent} ${ctx.lastWin.score}` : "null"}`);
    console.log(`    lastCS:       ${ctx.lastCleanSheet ? `${ctx.lastCleanSheet.date} vs ${ctx.lastCleanSheet.opponent} ${ctx.lastCleanSheet.score}` : "null"}`);
    console.log(`    dataFrom:     ${ctx.dataFrom}`);
    console.log(`    last5:        ${ctx.lastNMatches.map((m) => `${m.result}(${m.score})`).join(", ")}`);
  }

  // 2. Southampton (340) as of 2025-01-30 — expect long L streak, only 2 wins all season
  {
    const ctx = await timed("Southampton (340) as of 2025-01-30", () =>
      getTeamHistory(db, 340, "2025-01-30"),
    );
    console.log(`    streak:       ${ctx.currentStreak.type}×${ctx.currentStreak.length} since ${ctx.currentStreak.since}`);
    console.log(`    lastWin:      ${ctx.lastWin ? `${ctx.lastWin.date} vs ${ctx.lastWin.opponent} ${ctx.lastWin.score}` : "null"}`);
    console.log(`    last5:        ${ctx.lastNMatches.map((m) => `${m.result}(${m.score})`).join(", ")}`);
  }

  // 3. Real Madrid (86) as of 2024-09-01 — early in season, limited data
  {
    const ctx = await timed("Real Madrid (86) as of 2024-09-01", () =>
      getTeamHistory(db, 86, "2024-09-01"),
    );
    console.log(`    streak:       ${ctx.currentStreak.type}×${ctx.currentStreak.length} since ${ctx.currentStreak.since}`);
    console.log(`    dataFrom:     ${ctx.dataFrom}`);
    console.log(`    last5:        ${ctx.lastNMatches.map((m) => `${m.result}(${m.score})`).join(", ")}`);
  }

  // 4. Edge case: team with no matches before asOfDate (fictional ID 999999)
  {
    const ctx = await timed("Edge: unknown team (999999)", () =>
      getTeamHistory(db, 999999, "2026-01-01"),
    );
    console.log(`    streak:       ${ctx.currentStreak.type}×${ctx.currentStreak.length} since ${ctx.currentStreak.since}`);
    console.log(`    lastWin:      ${ctx.lastWin}`);
    console.log(`    lastCS:       ${ctx.lastCleanSheet}`);
    console.log(`    dataFrom:     ${ctx.dataFrom}`);
    console.log(`    last5:        [${ctx.lastNMatches.length} items]`);
    const ok =
      ctx.currentStreak.length === 0 &&
      ctx.currentStreak.since === null &&
      ctx.lastWin === null &&
      ctx.lastCleanSheet === null &&
      ctx.lastNMatches.length === 0 &&
      ctx.dataFrom === null;
    console.log(`    spec check:   ${ok ? "PASS" : "FAIL — edge case not handled"}`);
  }

  // 5. lastN=3 option
  {
    const ctx = await timed("PSG (524) as of 2025-12-01, n=3", () =>
      getTeamHistory(db, 524, "2025-12-01", { n: 3 }),
    );
    console.log(`    last3:        ${ctx.lastNMatches.map((m) => `${m.result}(${m.score})`).join(", ")}`);
    const ok = ctx.lastNMatches.length <= 3;
    console.log(`    spec check:   ${ok ? "PASS" : "FAIL — returned more than n"}`);
  }
}

async function testGetHeadToHead() {
  console.log("\n=== getHeadToHead ===");

  // 1. Real Madrid (86) vs Barcelona (81) — expect 3 meetings in dataset
  {
    const matches = await timed("Real Madrid (86) vs Barcelona (81) before 2026-05-05", () =>
      getHeadToHead(db, 86, 81, "2026-05-05"),
    );
    console.log(`    meetings:     ${matches.length}`);
    matches.forEach((m) =>
      console.log(`      ${m.date}  ${m.homeTeamName} ${m.score} ${m.awayTeamName}  [${m.season}]`),
    );
  }

  // 2. Reversed team order — should return same matches
  {
    const matches = await timed("Barcelona (81) vs Real Madrid (86) — reversed order", () =>
      getHeadToHead(db, 81, 86, "2026-05-05"),
    );
    console.log(`    meetings:     ${matches.length}`);
  }

  // 3. Teams that have never met in the dataset (Arsenal vs Real Madrid — different leagues)
  {
    const matches = await timed("Arsenal (57) vs Real Madrid (86) — different leagues", () =>
      getHeadToHead(db, 57, 86, "2026-05-05"),
    );
    console.log(`    meetings:     ${matches.length} (expected 0)`);
    console.log(`    spec check:   ${matches.length === 0 ? "PASS — empty array" : "FAIL"}`);
  }

  // 4. lastN=2
  {
    const matches = await timed("Real Madrid (86) vs Barcelona (81) lastN=2", () =>
      getHeadToHead(db, 86, 81, "2026-05-05", 2),
    );
    console.log(`    meetings:     ${matches.length} (expected ≤2)`);
    console.log(`    spec check:   ${matches.length <= 2 ? "PASS" : "FAIL"}`);
  }
}

async function testGetCurrentSeasonStats() {
  console.log("\n=== getCurrentSeasonStats ===");

  // 1. Arsenal (57) current season (2025-26 since > Aug 1)
  {
    const stats = await timed("Arsenal (57) as of 2026-05-05", () =>
      getCurrentSeasonStats(db, 57, "2026-05-05"),
    );
    if (stats) {
      console.log(`    season:       ${stats.season}`);
      console.log(`    played:       ${stats.played}  W${stats.won} D${stats.drawn} L${stats.lost}`);
      console.log(`    goals:        ${stats.goalsFor}:${stats.goalsAgainst}`);
      console.log(`    points:       ${stats.points}`);
      console.log(`    GD check:     ${stats.goalsFor - stats.goalsAgainst >= 0 ? "positive" : "negative"} (${stats.goalsFor - stats.goalsAgainst})`);
    } else {
      console.log("    null (unexpected)");
    }
  }

  // 2. Bayer Leverkusen (3 — Bundesliga) as of 2025-01-15 — mid-season
  {
    const stats = await timed("Bayer Leverkusen (3) as of 2025-01-15", () =>
      getCurrentSeasonStats(db, 3, "2025-01-15"),
    );
    if (stats) {
      console.log(`    season:       ${stats.season}`);
      console.log(`    played:       ${stats.played}  W${stats.won} D${stats.drawn} L${stats.lost}`);
      console.log(`    points:       ${stats.points}`);
      console.log(`    math check:   played=${stats.won + stats.drawn + stats.lost} ${stats.won + stats.drawn + stats.lost === stats.played ? "PASS" : "FAIL"}`);
    } else {
      console.log("    null");
    }
  }

  // 3. Edge case: team with no matches in current season (unknown team)
  {
    const stats = await timed("Edge: unknown team (999999)", () =>
      getCurrentSeasonStats(db, 999999, "2026-05-05"),
    );
    console.log(`    result:       ${stats === null ? "null PASS" : "FAIL — expected null"}`);
  }

  // 4. Season boundary check: date = 2025-07-31 → season 2024-25; date = 2025-08-01 → season 2025-26
  {
    const statsJul = await timed("Arsenal (57) as of 2025-07-31 (still 2024-25)", () =>
      getCurrentSeasonStats(db, 57, "2025-07-31"),
    );
    const statsAug = await timed("Arsenal (57) as of 2025-08-01 (new season 2025-26)", () =>
      getCurrentSeasonStats(db, 57, "2025-08-01"),
    );
    const seasonJul = statsJul?.season ?? "null";
    const seasonAug = statsAug?.season ?? "null";
    console.log(`    Jul season:   ${seasonJul} (expected 2024-25)`);
    console.log(`    Aug season:   ${seasonAug} (expected 2025-26)`);
    const ok = seasonJul === "2024-25" && (seasonAug === "2025-26" || statsAug === null);
    console.log(`    spec check:   ${ok ? "PASS" : "FAIL"}`);
  }
}

// ---- Main ----------------------------------------------------------------

async function main() {
  console.log("team-history smoke test — running against live Supabase DB");
  console.log("All calls should resolve in < 50ms.\n");

  await testGetTeamHistory();
  await testGetHeadToHead();
  await testGetCurrentSeasonStats();

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
