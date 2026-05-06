// Core daily pipeline logic — fetches, persists, and generates editorials for
// one UTC date across all five leagues.
//
// Used by:
//   src/trigger/daily-report.ts  (scheduled Trigger.dev task)
//   scripts/backfill.ts          (CLI backfill for historical dates)
//
// Ordering contract for backfill correctness:
//   Phase A (sequential, rate-limited): fetch → persist match_days + season_stats
//   Phase B (parallel across leagues):  generate captions + league overviews
//   Phase C (after Phase B):            generate day overview
//
// Each day's editorial reads the season_stats written during Phase A for the
// same date. Because the Football-Data.org scorers endpoint always reflects
// the cumulative season-to-date state, this gives Claude the "Igor Thiago is
// currently 2nd top scorer" effect with no cross-run database joins.

import {
  getMatches,
  getScorers,
  getStandings,
} from "../football/client";
import {
  LEAGUES,
  type LeagueCode,
  type Match,
  type ScorerEntry,
} from "../lib/football-types";
import {
  buildMatchCaptionPrompt,
  buildLeagueOverviewPrompt,
  buildDayOverviewPrompt,
} from "../editorial/prompts";
import { generate } from "../editorial/generate";
import {
  LEAGUE_NAMES,
  type EditorialContext,
  type MatchCaption,
  type LeagueOverview,
  type DayOverview,
} from "../editorial/types";
import { createServerClient } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import {
  getTeamHistory,
  getHeadToHead,
  getCurrentSeasonStats,
  type TeamHistoryContext,
  type HeadToHeadMatch,
  type SeasonStats,
} from "../editorial/team-history";
import { preProcess } from "../audio/pre-process";
import { synthesize, SynthesisError } from "../audio/synthesize";
import { uploadAudio } from "../audio/upload";
import type { EditorialRef } from "../audio/types";

// ---- Season derivation ---------------------------------------------------

// Returns "YYYY-YY" for the European football season that contains `date`.
// Aug–May mapping: 2025-10-01 → "2025-26", 2026-04-30 → "2025-26".
function deriveSeason(date: string): string {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  if (month >= 8) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

// ---- Upsert helpers ------------------------------------------------------

// Standard upsert for rows where the conflict key has no NULL columns.
async function upsertEditorial(
  db: ReturnType<typeof createServerClient>,
  row: {
    date: string;
    league_code: string;
    kind: string;
    slug: string;
    headline: string | null;
    body: string;
  },
): Promise<void> {
  const { error } = await db
    .from("editorials")
    .upsert(row, { onConflict: "date,league_code,kind,slug" });
  if (error) throw new Error(`editorials upsert failed: ${error.message}`);
}

// The day_overview row has league_code = NULL. Standard ON CONFLICT with a
// null column is unreliable across PostgREST versions, so we use a
// check-then-insert/update pattern here. The pipeline runs day by day so the
// two-step is always safe.
async function upsertDayOverview(
  db: ReturnType<typeof createServerClient>,
  row: {
    date: string;
    headline: string;
    body: string;
  },
): Promise<void> {
  const { data: existing, error: selErr } = await db
    .from("editorials")
    .select("id")
    .eq("date", row.date)
    .eq("kind", "day_overview")
    .is("league_code", null)
    .eq("slug", "")
    .maybeSingle();

  if (selErr) throw new Error(`day_overview select failed: ${selErr.message}`);

  if (existing) {
    const { error } = await db
      .from("editorials")
      .update({ headline: row.headline, body: row.body })
      .eq("id", existing.id);
    if (error) throw new Error(`day_overview update failed: ${error.message}`);
  } else {
    const { error } = await db.from("editorials").insert({
      date: row.date,
      league_code: null,
      kind: "day_overview",
      slug: "",
      headline: row.headline,
      body: row.body,
    });
    if (error) throw new Error(`day_overview insert failed: ${error.message}`);
  }
}

// ---- Public pipeline function --------------------------------------------

export interface PipelineResult {
  date: string;
  leaguesDataOk: LeagueCode[];
  leaguesDataFailed: LeagueCode[];
  leaguesWithMatches: LeagueCode[];
  editorialsWritten: number;
  editorialsFailed: number;
  audioSynthesised: number;
  audioFailed: number;
}

export async function runDailyPipeline(date: string): Promise<PipelineResult> {
  const db = createServerClient();
  const leaguesDataOk: LeagueCode[] = [];
  const leaguesDataFailed: LeagueCode[] = [];
  let editorialsWritten = 0;
  let editorialsFailed = 0;
  let audioSynthesised = 0;
  let audioFailed = 0;

  // ------------------------------------------------------------------
  // Phase A: Fetch + persist (sequential — rate limiter in client.ts
  // serialises all HTTP calls regardless of JS async ordering).
  // ------------------------------------------------------------------

  type LeagueDataEntry = { matches: Match[]; scorers: ScorerEntry[] };
  const leagueData = new Map<LeagueCode, LeagueDataEntry>();

  for (const league of LEAGUES) {
    console.log(`[${league}] Fetching matches…`);
    try {
      const matchesResp = await getMatches(league, date);
      const finishedMatches = matchesResp.matches.filter(
        (m) => m.status === "FINISHED",
      );

      console.log(
        `[${league}] ${finishedMatches.length} finished / ` +
          `${matchesResp.matches.length} total`,
      );

      console.log(`[${league}] Fetching scorers…`);
      const scorersResp = await getScorers(league);

      console.log(`[${league}] Fetching standings…`);
      const standings = await getStandings(league);

      // Persist raw match payload.
      const { error: mdErr } = await db.from("match_days").upsert(
        {
          date,
          league_code: league,
          payload: matchesResp as unknown as Json,
        },
        { onConflict: "date,league_code" },
      );
      if (mdErr) throw new Error(`match_days upsert: ${mdErr.message}`);

      // Persist season snapshot. The scorers list is cumulative season-to-date
      // from the API, so this row encodes "what Claude knows as of today".
      const { error: ssErr } = await db.from("season_stats").upsert(
        {
          league_code: league,
          season: deriveSeason(date),
          snapshot_date: date,
          payload: { scorers: scorersResp.scorers, standings } as unknown as Json,
        },
        { onConflict: "league_code,snapshot_date" },
      );
      if (ssErr) throw new Error(`season_stats upsert: ${ssErr.message}`);

      leagueData.set(league, {
        matches: finishedMatches,
        scorers: scorersResp.scorers,
      });
      leaguesDataOk.push(league);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${league}] Phase A failed — skipping editorials: ${msg}`);
      leaguesDataFailed.push(league);
    }
  }

  const leaguesWithMatches = Array.from(leagueData.entries())
    .filter(([, d]) => d.matches.length > 0)
    .map(([code]) => code);

  if (leaguesWithMatches.length === 0) {
    console.log(`[pipeline] No finished matches on ${date} — skipping editorial generation.`);
    return {
      date,
      leaguesDataOk,
      leaguesDataFailed,
      leaguesWithMatches,
      editorialsWritten,
      editorialsFailed,
      audioSynthesised,
      audioFailed,
    };
  }

  // ------------------------------------------------------------------
  // Phase B: Generate captions + league overviews.
  // Leagues are processed sequentially to stay under the Claude API
  // input-token rate limit (30k tokens/min org limit). Captions within
  // a single league are still parallel (~4 calls × ~800 tokens = ~3k,
  // well within the per-minute budget).
  // ------------------------------------------------------------------

  const leagueEditorialEntries = Array.from(leagueData.entries()).filter(
    ([, d]) => d.matches.length > 0,
  );

  for (const [league, data] of leagueEditorialEntries) {
    const context: EditorialContext = {
      date,
      leagueCode: league,
      leagueName: LEAGUE_NAMES[league],
    };
    const topScorers = data.scorers.slice(0, 10);

    // Match captions — sequential within this league so each call receives the
    // full text of already-generated captions as context. This lets the model
    // see exactly which opening structures are taken and avoid repeating them.
    // Sequential is also fine for the token-rate budget: one call at a time
    // (~800 tokens) is well within the 30k tokens/min limit.
    const priorCaptionOpenings: string[] = [];
    for (const match of data.matches) {
      // Fetch team history for this match. Five parallel DB reads (read-only,
      // no rate-limit concern). If the fetch fails, we fall back to generating
      // without history rather than skipping the caption entirely.
      let historyData: {
        homeTeamHistory?: TeamHistoryContext;
        awayTeamHistory?: TeamHistoryContext;
        headToHead?: HeadToHeadMatch[];
        homeSeasonStats?: SeasonStats | null;
        awaySeasonStats?: SeasonStats | null;
      } = {};
      try {
        const [homeHistory, awayHistory, h2h, homeStats, awayStats] =
          await Promise.all([
            getTeamHistory(db, match.homeTeam.id, date),
            getTeamHistory(db, match.awayTeam.id, date),
            getHeadToHead(db, match.homeTeam.id, match.awayTeam.id, date),
            getCurrentSeasonStats(db, match.homeTeam.id, date),
            getCurrentSeasonStats(db, match.awayTeam.id, date),
          ]);
        historyData = {
          homeTeamHistory: homeHistory,
          awayTeamHistory: awayHistory,
          headToHead: h2h,
          homeSeasonStats: homeStats,
          awaySeasonStats: awayStats,
        };
      } catch (histErr) {
        const histMsg = histErr instanceof Error ? histErr.message : String(histErr);
        console.warn(
          `[${league}] History fetch failed for match ${match.id} — ` +
            `generating without history: ${histMsg}`,
        );
      }

      try {
        const pkg = buildMatchCaptionPrompt({
          context,
          match,
          topScorers,
          priorCaptionOpenings,
          ...historyData,
        });
        const caption = await generate<MatchCaption>(pkg);
        priorCaptionOpenings.push(caption.caption);
        await upsertEditorial(db, {
          date,
          league_code: league,
          kind: "match_caption",
          slug: String(match.id),
          headline: null,
          body: caption.caption,
        });
        editorialsWritten++;
        console.log(
          `[${league}] Caption: ${match.homeTeam.shortName} v ${match.awayTeam.shortName}`,
        );
      } catch (err) {
        editorialsFailed++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${league}] Caption failed for match ${match.id}: ${msg}`);
      }
    }

    // League overview — one per league, after captions settle.
    try {
      const pkg = buildLeagueOverviewPrompt({
        context,
        matches: data.matches,
        topScorers,
      });
      const overview = await generate<LeagueOverview>(pkg);
      await upsertEditorial(db, {
        date,
        league_code: league,
        kind: "league_overview",
        slug: league.toLowerCase(),
        headline: overview.headline,
        body: overview.body,
      });
      editorialsWritten++;
      console.log(`[${league}] League overview: "${overview.headline}"`);
    } catch (err) {
      editorialsFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${league}] League overview failed: ${msg}`);
    }
  }

  // ------------------------------------------------------------------
  // Phase C: Day overview — after all league editorials are done.
  // ------------------------------------------------------------------

  try {
    const leagueSections = leaguesWithMatches.map((code) => {
      const d = leagueData.get(code)!;
      return { code, name: LEAGUE_NAMES[code], matches: d.matches };
    });

    const pkg = buildDayOverviewPrompt({ date, leagues: leagueSections });
    const dayOverview = await generate<DayOverview>(pkg);
    await upsertDayOverview(db, {
      date,
      headline: dayOverview.headline,
      body: dayOverview.body,
    });
    editorialsWritten++;
    console.log(`[day] Overview: "${dayOverview.headline}"`);
  } catch (err) {
    editorialsFailed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[day] Day overview failed: ${msg}`);
  }

  // ------------------------------------------------------------------
  // Phase D: Audio synthesis — synthesise day_overview + league_overviews
  // that were written during phases B/C for this date.
  //
  // Sequential per editorial: ElevenLabs has a per-minute character limit
  // and audio files can be large; no benefit to parallelism here.
  //
  // Cost logging: ElevenLabs charges per character. We log char count per
  // editorial at 0.003 USD/1k chars (Starter plan rate) so spend is visible
  // in Trigger.dev run logs without querying the ElevenLabs dashboard.
  // ------------------------------------------------------------------

  // Fetch the day_overview and all league_overviews written for this date.
  const { data: audioTargets, error: audioFetchErr } = await db
    .from("editorials")
    .select("id, date, kind, slug, headline, body, league_code")
    .eq("date", date)
    .in("kind", ["day_overview", "league_overview"])
    .is("audio_url", null) // only rows that don't already have audio
    .order("kind", { ascending: true }); // day_overview before league_overview

  if (audioFetchErr) {
    console.error(`[audio] Failed to fetch synthesis targets: ${audioFetchErr.message}`);
  } else if (!audioTargets || audioTargets.length === 0) {
    console.log(`[audio] No synthesis targets for ${date} — skipping Phase D.`);
  } else {
    // ElevenLabs rate: ~$0.003 per 1k characters (Starter plan).
    const COST_PER_1K_CHARS = 0.003;

    for (const row of audioTargets) {
      const label = row.kind === "day_overview"
        ? "day"
        : `${row.kind}/${row.slug}`;

      try {
        const { ssml, charCount } = preProcess(row.body ?? "");
        const estimatedCost = (charCount / 1000) * COST_PER_1K_CHARS;
        console.log(
          `[audio] ${label}: ${charCount} chars (~$${estimatedCost.toFixed(4)}) — synthesising…`,
        );

        const { mp3Buffer, bytes } = await synthesize({ text: ssml });
        console.log(`[audio] ${label}: ${(bytes / 1024).toFixed(1)} KB received.`);

        const ref: EditorialRef = {
          id: row.id,
          date: row.date,
          kind: row.kind as "day_overview" | "league_overview",
          slug: row.slug ?? "",
        };
        const { publicUrl } = await uploadAudio(mp3Buffer, ref);
        audioSynthesised++;
        console.log(`[audio] ${label}: uploaded → ${publicUrl}`);
      } catch (err) {
        audioFailed++;
        const msg = err instanceof SynthesisError
          ? `[${err.kind}] ${err.message}`
          : err instanceof Error
          ? err.message
          : String(err);
        console.error(`[audio] ${label}: synthesis failed — ${msg}`);
        // Non-fatal: continue with remaining editorials.
      }
    }
  }

  return {
    date,
    leaguesDataOk,
    leaguesDataFailed,
    leaguesWithMatches,
    editorialsWritten,
    editorialsFailed,
    audioSynthesised,
    audioFailed,
  };
}
