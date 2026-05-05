// scripts/generate-hist-dev.ts
//
// Experimental one-shot editorial generator for Commit 5 verification.
// Generates a single match caption with team history context for a past
// match where the history is known to be striking, then prints:
//   1. The team_history payload that was passed in
//   2. The generated caption
//
// Written to DB with kind "match_caption_hist_v1_dev" — never overwrites
// production kinds.
//
// Target match: a Southampton (340) Premier League fixture during their
// L×6 losing streak (Dec 26 2024 – Jan 25 2025). The streak, a lastWin
// in November, and a weak season record are all present in the payload
// and all above the "striking" threshold for the prompt calibration rules.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/generate-hist-dev.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import type { Database } from "../src/lib/database.types";
import type { Match, ScorerEntry, LeagueCode } from "../src/lib/football-types";
import { LEAGUE_NAMES } from "../src/editorial/types";
import type { MatchEditorialInput, MatchCaption } from "../src/editorial/types";
import { buildMatchCaptionPrompt } from "../src/editorial/prompts";
import { generate } from "../src/editorial/generate";
import {
  getTeamHistory,
  getHeadToHead,
  getCurrentSeasonStats,
} from "../src/editorial/team-history";

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient<Database>(supabaseUrl, supabaseKey);

async function main() {
  // ---- 1. Find a Southampton match during the L streak window ------------

  console.log("Finding a Southampton PL match during the L×6 streak window...");
  const { data: rows, error: rowErr } = await db
    .from("match_results")
    .select("*")
    .or("home_team_id.eq.340,away_team_id.eq.340")
    .gte("date", "2025-01-01")
    .lte("date", "2025-01-25")
    .eq("status", "FINISHED")
    .order("date", { ascending: false })
    .limit(3);

  if (rowErr) {
    console.error("Query failed:", rowErr.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.error("No Southampton matches found in the target window. Check match_results.");
    process.exit(1);
  }

  // Pick the most recent match in the window (likely Jan 25 — well into the streak)
  const row = rows[0];
  console.log(
    `Found: ${row.date}  ${row.home_team_name} ${row.score_home}-${row.score_away} ` +
      `${row.away_team_name}  [${row.league_code}, matchday ${row.matchday}]`,
  );

  const date = row.date;
  const leagueCode = row.league_code as LeagueCode;
  const leagueName = LEAGUE_NAMES[leagueCode];

  // ---- 2. Construct a Match object from match_results row ----------------
  // score.halfTime is not stored in match_results — set to null (same as
  // what the pipeline would have if the API returned null halfTime values).

  const scoreHome = row.score_home ?? 0;
  const scoreAway = row.score_away ?? 0;
  const winner =
    scoreHome > scoreAway ? "HOME_TEAM" :
    scoreAway > scoreHome ? "AWAY_TEAM" : "DRAW";

  const match: Match = {
    id: Number(row.match_id),
    utcDate: `${date}T15:00:00Z`,
    status: row.status,
    matchday: row.matchday ?? 0,
    homeTeam: {
      id: row.home_team_id,
      name: row.home_team_name,
      shortName: row.home_team_short,
      tla: "",
      crest: "",
    },
    awayTeam: {
      id: row.away_team_id,
      name: row.away_team_name,
      shortName: row.away_team_short,
      tla: "",
      crest: "",
    },
    score: {
      winner: winner as "HOME_TEAM" | "AWAY_TEAM" | "DRAW",
      duration: "REGULAR",
      fullTime: { home: row.score_home, away: row.score_away },
      halfTime: { home: null, away: null },
    },
  };

  // ---- 3. Fetch team history ----------------------------------------------

  console.log(`\nFetching team history for both teams as of ${date}...`);
  const [homeHistory, awayHistory, h2h, homeStats, awayStats] =
    await Promise.all([
      getTeamHistory(db, match.homeTeam.id, date),
      getTeamHistory(db, match.awayTeam.id, date),
      getHeadToHead(db, match.homeTeam.id, match.awayTeam.id, date),
      getCurrentSeasonStats(db, match.homeTeam.id, date),
      getCurrentSeasonStats(db, match.awayTeam.id, date),
    ]);

  // ---- 4. Get top scorers from season_stats (most recent snapshot) --------

  let topScorers: ScorerEntry[] = [];
  const { data: ssRows } = await db
    .from("season_stats")
    .select("payload")
    .eq("league_code", leagueCode)
    .lte("snapshot_date", date)
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (ssRows && ssRows[0]) {
    const payload = ssRows[0].payload as { scorers?: ScorerEntry[] };
    topScorers = payload.scorers?.slice(0, 5) ?? [];
  }

  // ---- 5. Print the team history payload ----------------------------------

  console.log("\n" + "=".repeat(70));
  console.log("TEAM HISTORY PAYLOAD");
  console.log("=".repeat(70));

  const homeTeamLabel = `${match.homeTeam.shortName} (home)`;
  const awayTeamLabel = `${match.awayTeam.shortName} (away)`;

  console.log(`\n[${homeTeamLabel}]`);
  console.log(`  Streak:      ${homeHistory.currentStreak.type}×${homeHistory.currentStreak.length} since ${homeHistory.currentStreak.since}`);
  console.log(`  Last win:    ${homeHistory.lastWin ? `${homeHistory.lastWin.date} vs ${homeHistory.lastWin.opponent} ${homeHistory.lastWin.score}` : "none"}`);
  console.log(`  Last CS:     ${homeHistory.lastCleanSheet ? `${homeHistory.lastCleanSheet.date} vs ${homeHistory.lastCleanSheet.opponent}` : "none"}`);
  console.log(`  Last 5:      ${homeHistory.lastNMatches.map(m => `${m.result}(${m.score})`).join(" ")}`);
  if (homeStats) {
    console.log(`  Season:      ${homeStats.season} P${homeStats.played} W${homeStats.won} D${homeStats.drawn} L${homeStats.lost} | ${homeStats.points} pts`);
  }

  console.log(`\n[${awayTeamLabel}]`);
  console.log(`  Streak:      ${awayHistory.currentStreak.type}×${awayHistory.currentStreak.length} since ${awayHistory.currentStreak.since}`);
  console.log(`  Last win:    ${awayHistory.lastWin ? `${awayHistory.lastWin.date} vs ${awayHistory.lastWin.opponent} ${awayHistory.lastWin.score}` : "none"}`);
  console.log(`  Last CS:     ${awayHistory.lastCleanSheet ? `${awayHistory.lastCleanSheet.date} vs ${awayHistory.lastCleanSheet.opponent}` : "none"}`);
  console.log(`  Last 5:      ${awayHistory.lastNMatches.map(m => `${m.result}(${m.score})`).join(" ")}`);
  if (awayStats) {
    console.log(`  Season:      ${awayStats.season} P${awayStats.played} W${awayStats.won} D${awayStats.drawn} L${awayStats.lost} | ${awayStats.points} pts`);
  }

  if (h2h.length > 0) {
    console.log(`\n[Head-to-head — last ${h2h.length} meetings]`);
    h2h.forEach(m =>
      console.log(`  ${m.date}  ${m.homeTeamName} ${m.score} ${m.awayTeamName}`),
    );
  } else {
    console.log("\n[Head-to-head] No prior meetings in dataset.");
  }

  // ---- 6. Build editorial input and generate caption ----------------------

  const input: MatchEditorialInput = {
    context: { date, leagueCode, leagueName },
    match,
    topScorers,
    homeTeamHistory: homeHistory,
    awayTeamHistory: awayHistory,
    headToHead: h2h,
    homeSeasonStats: homeStats,
    awaySeasonStats: awayStats,
  };

  console.log("\n" + "=".repeat(70));
  console.log("GENERATING CAPTION (kind: match_caption_hist_v1_dev)");
  console.log("=".repeat(70));

  const pkg = buildMatchCaptionPrompt(input);
  const caption = await generate<MatchCaption>(pkg);

  console.log(`\nCaption: "${caption.caption}"`);

  // ---- 7. Write to DB with experimental kind label -----------------------

  const { error: upsertErr } = await db.from("editorials").upsert(
    {
      date,
      league_code: leagueCode,
      kind: "match_caption_hist_v1_dev",
      slug: String(match.id),
      headline: null,
      body: caption.caption,
    },
    { onConflict: "date,league_code,kind,slug" },
  );

  if (upsertErr) {
    console.error("\nDB upsert failed:", upsertErr.message);
  } else {
    console.log("\nWritten to editorials (kind=match_caption_hist_v1_dev).");
  }

  // ---- 8. Interpretation notes -------------------------------------------

  console.log("\n" + "=".repeat(70));
  console.log("INTERPRETATION NOTES");
  console.log("=".repeat(70));

  const saintStreak =
    match.homeTeam.id === 340 ? homeHistory.currentStreak :
    match.awayTeam.id === 340 ? awayHistory.currentStreak : null;

  if (saintStreak && saintStreak.length >= 4) {
    console.log(`\n  Southampton has a ${saintStreak.type}×${saintStreak.length} streak. This is above the 4+ threshold.`);
    console.log(`  The caption SHOULD reference it (streak length is striking).`);
    console.log(`  Check: does the caption mention the streak or the lastWin date?`);
  }

  const saintH2H = h2h.length > 0 ? h2h : null;
  if (saintH2H) {
    console.log(`\n  H2H has ${saintH2H.length} prior meetings.`);
    if (saintH2H.length >= 3) {
      console.log(`  3+ meetings — enough for a pattern. Check if the caption uses it.`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
