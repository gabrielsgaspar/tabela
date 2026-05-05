// Voice V2 evaluation script.
//
// Reads existing match_days and season_stats from the DB for a given date,
// generates editorials using the current prompts, and writes results to
// experimental _v2 kind labels — never overwriting production editorials.
//
// Usage:
//   pnpm exec tsx --env-file=.env.local scripts/eval-voice-v2.ts --date 2026-05-03
//
// After running, compare old vs new with:
//   SELECT o.slug, o.league_code, o.body AS current, n.body AS v2
//   FROM editorials o
//   JOIN editorials n
//     ON o.slug = n.slug AND o.date = n.date
//     AND o.league_code IS NOT DISTINCT FROM n.league_code
//   WHERE o.date = '<date>'
//     AND o.kind = 'match_caption'
//     AND n.kind = 'match_caption_v2'
//   ORDER BY o.league_code, o.slug;

import {
  buildMatchCaptionPrompt,
  buildLeagueOverviewPrompt,
  buildDayOverviewPrompt,
} from "../src/editorial/prompts";
import { generate } from "../src/editorial/generate";
import {
  LEAGUE_NAMES,
  type EditorialContext,
  type MatchCaption,
  type LeagueOverview,
  type DayOverview,
} from "../src/editorial/types";
import { createServerClient } from "../src/lib/supabase";
import type {
  LeagueCode,
  Match,
  ScorerEntry,
} from "../src/lib/football-types";

// ---- Arg parsing ---------------------------------------------------------

function parseDateArg(): string {
  const idx = process.argv.indexOf("--date");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Usage: eval-voice-v2.ts --date YYYY-MM-DD");
    process.exit(1);
  }
  const d = process.argv[idx + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    console.error(`Invalid date "${d}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }
  return d;
}

// ---- DB helpers ----------------------------------------------------------

interface MatchDayPayload {
  matches: Match[];
}

interface SeasonStatsPayload {
  scorers: ScorerEntry[];
}

async function readLeagueData(
  db: ReturnType<typeof createServerClient>,
  date: string,
): Promise<Map<LeagueCode, { matches: Match[]; scorers: ScorerEntry[] }>> {
  const result = new Map<LeagueCode, { matches: Match[]; scorers: ScorerEntry[] }>();

  // Fetch all match_days and season_stats rows for this date in one go.
  const [mdRows, ssRows] = await Promise.all([
    db.from("match_days").select("league_code, payload").eq("date", date),
    db.from("season_stats").select("league_code, payload").eq("snapshot_date", date),
  ]);

  if (mdRows.error) throw new Error(`match_days read: ${mdRows.error.message}`);
  if (ssRows.error) throw new Error(`season_stats read: ${ssRows.error.message}`);

  // Index season_stats by league.
  const scorersByLeague = new Map<string, ScorerEntry[]>();
  for (const row of ssRows.data ?? []) {
    const payload = row.payload as unknown as SeasonStatsPayload;
    scorersByLeague.set(row.league_code, payload.scorers ?? []);
  }

  for (const row of mdRows.data ?? []) {
    const code = row.league_code as LeagueCode;
    const payload = row.payload as unknown as MatchDayPayload;
    const finished = (payload.matches ?? []).filter((m) => m.status === "FINISHED");
    const scorers = scorersByLeague.get(code) ?? [];
    result.set(code, { matches: finished, scorers });
  }

  return result;
}

async function writeV2Editorial(
  db: ReturnType<typeof createServerClient>,
  row: {
    date: string;
    league_code: string | null;
    kind: string;
    slug: string;
    headline: string | null;
    body: string;
  },
): Promise<void> {
  if (row.league_code === null) {
    // day_overview_v2 — null league_code requires check-then-upsert.
    const { data: existing, error: selErr } = await db
      .from("editorials")
      .select("id")
      .eq("date", row.date)
      .eq("kind", row.kind)
      .is("league_code", null)
      .eq("slug", row.slug)
      .maybeSingle();
    if (selErr) throw new Error(`v2 select failed: ${selErr.message}`);

    if (existing) {
      const { error } = await db
        .from("editorials")
        .update({ headline: row.headline, body: row.body })
        .eq("id", existing.id);
      if (error) throw new Error(`v2 update failed: ${error.message}`);
    } else {
      const { error } = await db.from("editorials").insert(row);
      if (error) throw new Error(`v2 insert failed: ${error.message}`);
    }
  } else {
    const { error } = await db
      .from("editorials")
      .upsert(row, { onConflict: "date,league_code,kind,slug" });
    if (error) throw new Error(`v2 upsert failed: ${error.message}`);
  }
}

// ---- Side-by-side diff printer -------------------------------------------

async function printDiff(
  db: ReturnType<typeof createServerClient>,
  date: string,
  productionKind: string,
  v2Kind: string,
): Promise<void> {
  // Fetch production editorials for this date + kind.
  const prodQuery = db
    .from("editorials")
    .select("slug, league_code, body")
    .eq("date", date)
    .eq("kind", productionKind);

  const v2Query = db
    .from("editorials")
    .select("slug, league_code, body")
    .eq("date", date)
    .eq("kind", v2Kind);

  const [prodRows, v2Rows] = await Promise.all([prodQuery, v2Query]);
  if (prodRows.error) throw new Error(prodRows.error.message);
  if (v2Rows.error) throw new Error(v2Rows.error.message);

  // Index v2 by "league_code|slug".
  const v2Map = new Map<string, string>();
  for (const r of v2Rows.data ?? []) {
    v2Map.set(`${r.league_code ?? "null"}|${r.slug}`, r.body);
  }

  const divider = "─".repeat(72);
  console.log(`\n${"═".repeat(72)}`);
  console.log(`DIFF: ${productionKind} → ${v2Kind}  |  date: ${date}`);
  console.log(`${"═".repeat(72)}`);

  for (const prod of prodRows.data ?? []) {
    const key = `${prod.league_code ?? "null"}|${prod.slug}`;
    const v2Body = v2Map.get(key);
    if (!v2Body) continue;

    const label =
      productionKind === "day_overview"
        ? "(day)"
        : `${prod.league_code ?? "day"}/${prod.slug}`;

    console.log(`\n[${label}]`);
    console.log(`CURRENT: ${prod.body}`);
    console.log(divider);
    console.log(`    V2:  ${v2Body}`);
  }
}

// ---- Main ----------------------------------------------------------------

async function main() {
  const date = parseDateArg();
  const db = createServerClient();

  console.log(`\nVoice V2 eval — date: ${date}`);
  console.log("Reading match data from DB (no API calls)…\n");

  const leagueData = await readLeagueData(db, date);
  const leaguesWithMatches = Array.from(leagueData.entries()).filter(
    ([, d]) => d.matches.length > 0,
  );

  if (leaguesWithMatches.length === 0) {
    console.log("No finished matches in DB for this date. Nothing to generate.");
    process.exit(0);
  }

  let written = 0;
  let failed = 0;

  // Phase B: captions + league overviews, sequential across leagues.
  for (const [league, data] of leaguesWithMatches) {
    const context: EditorialContext = {
      date,
      leagueCode: league,
      leagueName: LEAGUE_NAMES[league],
    };
    const topScorers = data.scorers.slice(0, 10);

    // Captions — sequential within league so prior openings can be passed as context.
    const priorCaptionOpenings: string[] = [];
    for (const match of data.matches) {
      try {
        const pkg = buildMatchCaptionPrompt({ context, match, topScorers, priorCaptionOpenings });
        const result = await generate<MatchCaption>(pkg);
        priorCaptionOpenings.push(result.caption);
        await writeV2Editorial(db, {
          date,
          league_code: league,
          kind: "match_caption_v2",
          slug: String(match.id),
          headline: null,
          body: result.caption,
        });
        written++;
        console.log(`[${league}] caption_v2: ${match.homeTeam.shortName} v ${match.awayTeam.shortName}`);
      } catch (err) {
        failed++;
        console.error(`[${league}] caption_v2 failed for match ${match.id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // League overview.
    try {
      const pkg = buildLeagueOverviewPrompt({ context, matches: data.matches, topScorers });
      const result = await generate<LeagueOverview>(pkg);
      await writeV2Editorial(db, {
        date,
        league_code: league,
        kind: "league_overview_v2",
        slug: league.toLowerCase(),
        headline: result.headline,
        body: result.body,
      });
      written++;
      console.log(`[${league}] league_overview_v2: "${result.headline}"`);
    } catch (err) {
      failed++;
      console.error(`[${league}] league_overview_v2 failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Phase C: day overview.
  try {
    const leagueSections = leaguesWithMatches.map(([code, d]) => ({
      code,
      name: LEAGUE_NAMES[code],
      matches: d.matches,
    }));
    const pkg = buildDayOverviewPrompt({ date, leagues: leagueSections });
    const result = await generate<DayOverview>(pkg);
    await writeV2Editorial(db, {
      date,
      league_code: null,
      kind: "day_overview_v2",
      slug: "",
      headline: result.headline,
      body: result.body,
    });
    written++;
    console.log(`[day] day_overview_v2: "${result.headline}"`);
  } catch (err) {
    failed++;
    console.error(`[day] day_overview_v2 failed: ${err instanceof Error ? err.message : err}`);
  }

  console.log(`\nGenerated: ${written} / Failed: ${failed}`);

  // Print side-by-side diffs.
  await printDiff(db, date, "match_caption", "match_caption_v2");
  await printDiff(db, date, "league_overview", "league_overview_v2");
  await printDiff(db, date, "day_overview", "day_overview_v2");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
