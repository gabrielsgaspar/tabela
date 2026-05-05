// Prompt builders and tool schemas for the four editorial formats.
//
// No @anthropic-ai/sdk import in this file — these are plain objects.
// generate.ts (Commit 3) passes them directly to client.messages.create().
// The local types below mirror @anthropic-ai/sdk's TextBlockParam and Tool
// exactly, so no adapter is needed once the SDK lands (structural typing).
//
// Prompt caching: the VOICE_BLOCK is marked cache_control: ephemeral.
// With ~50+ caption calls per run, this block would otherwise be re-encoded
// on every request. The format block (second system entry) varies per call
// type and is not cached.

import type { Match, ScorerEntry } from "../lib/football-types";
import type {
  MatchEditorialInput,
  LeagueOverviewInput,
  DayOverviewInput,
} from "./types";
import type { Streak, RecentMatch } from "./team-history";

// ---- SDK-compatible local types -----------------------------------------
// These mirror @anthropic-ai/sdk's TextBlockParam and Tool interfaces.
// Update if the SDK changes its shapes (unlikely for stable fields).

interface CacheControl {
  type: "ephemeral";
}

interface TextBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

interface PropertySchema {
  type: string;
  description?: string;
}

interface InputSchema {
  type: "object";
  properties: Record<string, PropertySchema>;
  required: string[];
}

interface Tool {
  name: string;
  description?: string;
  input_schema: InputSchema;
}

export interface PromptPackage {
  systemBlocks: TextBlock[];
  userText: string;
  tool: Tool;
  toolName: string;
}

// ---- Voice block (static, cached) ---------------------------------------
// Identical across all four formats. Cached so the API does not re-encode
// it for every caption call in a run.
//
// Phase 2 data constraint: we have final scores, half-time scores, team
// names, matchday numbers, and season-to-date top scorers. We do NOT have
// league table positions (those are typed as `unknown` until Phase 3).
// The no-invention rule covers both match events and table standings.

const VOICE_BLOCK: TextBlock = {
  type: "text",
  cache_control: { type: "ephemeral" },
  text: `\
You write football editorial for Tabela, a daily morning briefing on the top five European leagues.

VOICE PRINCIPLES
- Specific over generic. Use team names, opponents, matchday numbers — specifics earn trust.
- Allusive memory. Reference records and past seasons only when the input data supports the claim.
- Warm, never shouty. No exclamation marks. No "INSANE". No "robbed". No "crisis".
- Confident, never breathless. State things plainly. No hedges: "arguably", "perhaps", "what could be".
- Tactical when useful, accessible always. If a stat does not change how the reader sees the match, cut it.

EXAMPLES OF THE VOICE
✓ "[Team A] made it five straight home wins — [Team B] never looked like ending the streak."
✓ "It is the first time [Team] have lost back-to-back home games since their relegation season."
✗ "INSANE result!!" / "[Team A] ROBBED [Team B]" / "[Team] in CRISIS mode"
✗ Do not use: amazing, incredible, unbelievable, stunning, shocking
✗ Do not use: must-win, do-or-die, season on the line, turning point, arguably, perhaps
✗ Do not use: keeps/keeping the pressure on, sends a statement, little time to recover,
  can ill afford, needed the points, or any phrase that implies a team's league position,
  urgency, or desperation — you do not have standings data, so you cannot know.
✗ Do not use countdowns as a substitute for observation: "with N games remaining" and
  "this late in the season" are filler when there is nothing else to say. If you have
  nothing specific to observe about the match, write a shorter sentence, not a vaguer one.
✗ Do not use the four-word stem "the kind of ___" in any form. The construction
  "the kind of [noun] [connector] [clause]" is banned regardless of the noun or
  connector used — "that", "who", "where", "when", "which", no connector, or anything
  else. All of the following are forbidden:
    ✗ "…in the kind of match the scoreline describes perfectly"
    ✗ "…is the kind of player who raises a team's ceiling in big fixtures"
    ✗ "…the kind of afternoon where the result was never really in doubt"
  Replace with a specific claim about what happened:
    ✓ "the scoreline says it plainly"
    ✓ "Gibbs-White has 13 goals and 5 assists; Forest's ceiling in away fixtures reflects it"
    ✓ "the result was clear from the half-time score"
  If you cannot make a specific claim, cut the sentence entirely.
✗ Do not expose your data limitations in editorial copy. If you cannot confirm something,
  omit it — do not write "the data does not confirm" or "whether X happened is not
  confirmed". You are a writer, not a data system. A writer who does not know who scored
  simply does not raise the subject.

STRICT NO-INVENTION RULE — THE SINGLE MOST IMPORTANT INSTRUCTION
You only know what the structured input data tells you. The available data is:
  • Final score and half-time score
  • Home and away team names
  • Matchday number
  • Season-to-date top scorers and assists for the league (not per-match events)

You MUST NOT invent:
  • Goalscorer names for this specific match — even if a top scorer plays for the winning team,
    you cannot say or imply they scored today
  • Goal minutes, sequences of play, or how goals were scored
  • Substitutions, cards, injuries, or tactical instructions
  • Shots, xG, possession, or any granular match statistics
  • League table positions or points gaps — standings data is not available in this phase
  • Streaks, records, or historical comparisons unless the input explicitly states them

If the data is thin, write something thin but true. One accurate sentence beats three invented ones.`,
};

// ---- Tool schemas -------------------------------------------------------

const CAPTION_TOOL: Tool = {
  name: "write_match_caption",
  description:
    "Write a single-sentence match caption (15–25 words) for display under the scoreline.",
  input_schema: {
    type: "object",
    properties: {
      caption: {
        type: "string",
        description:
          "One sentence, 15–25 words. Does not restate the score. States what the result means in context.",
      },
    },
    required: ["caption"],
  },
};

const SUMMARY_TOOL: Tool = {
  name: "write_match_summary",
  description: "Write a 2–3 paragraph match summary with a headline.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "6–10 words. States the result plainly. No exclamation, no inflation.",
      },
      body: {
        type: "string",
        description:
          "2–3 paragraphs separated by \\n\\n. Does not open with the score.",
      },
    },
    required: ["headline", "body"],
  },
};

const LEAGUE_OVERVIEW_TOOL: Tool = {
  name: "write_league_overview",
  description: "Write a 3–5 paragraph overview of a single league's matchday.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "6–10 words capturing the main story of the day in this league.",
      },
      body: {
        type: "string",
        description:
          "3–5 paragraphs separated by \\n\\n. Synthesises the day — does not list every result.",
      },
    },
    required: ["headline", "body"],
  },
};

const DAY_OVERVIEW_TOOL: Tool = {
  name: "write_day_overview",
  description:
    "Write a 3–5 paragraph cross-league overview of the day in European football.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "6–10 words capturing the cross-league story of the day.",
      },
      body: {
        type: "string",
        description:
          "3–5 paragraphs separated by \\n\\n. Selects what mattered — does not catalogue every league.",
      },
    },
    required: ["headline", "body"],
  },
};

// ---- Team history calibration block -------------------------------------
// Appended to the format block (system) when team history is present in the
// input. Placed adjacent to format instructions so the model encounters
// the rules at the point of temptation, not buried in the global voice block.

const HISTORY_CALIBRATION_SECTION = `\

TEAM HISTORY CALIBRATION

The TEAM HISTORY block in the user message contains verified facts from the match_results
database. Data horizon: 2024-08-01. You may not make historical claims about periods before
this date.

WHEN TO USE IT
Use a historical reference when the data is genuinely striking:
  • A current streak of 4 or more consecutive results of the same type (W, D, or L).
  • A last win more than six weeks before this match date — a meaningful dry spell.
  • A head-to-head pattern where one team has won all of the last 3+ meetings.
A single allusive sentence, grounded in a specific fact from the payload, is the right use.

WHEN TO IGNORE IT
  • A streak of length 1 or 2 is not a pattern worth naming. Suppress it.
  • Fewer than 3 head-to-head meetings do not establish a trend.
  • Unremarkable season stats for a mid-table team are background noise.
  If the data offers nothing striking, write from match data alone and omit the history.
  Do not signal that you checked and found nothing.

HARD LIMITS — as strict as the no-invention rule
  1. No claims about periods before 2024-08-01. "Their worst run since 2022" is forbidden.
     "Their worst run this season" is permitted only if the payload supports it.
  2. No invented precision from dates. If lastWin is "2026-03-15", write "since mid-March"
     — not "a 47-day wait". You cannot count gap days reliably (postponements, breaks).
  3. No facts not in the payload. lastWin says "vs Fulham 3-0" — you may write that.
     You may not add "a Saka winner" or "their first clean sheet in weeks" unless those
     claims are also in the payload.
  4. Length-2 streaks are never notable. Length-3 is marginal; use only when match context
     is very thin and the streak genuinely shaped the game. Length 4+ is the safe threshold.

RE-STATING THE NO-INVENTION RULE for team history:
Every historical claim must be directly traceable to the TEAM HISTORY block in this message.
If the data does not say it, you may not say it.

WORKED EXAMPLES

✓ GOOD — striking losing streak, handled allusively:
  Data: Team A on L×6 since 2024-12-26; lastWin 2024-11-02 vs [Opponent] 1-0
  Caption: "A sixth consecutive defeat for [Team A], whose last win came in November."
  Works: streak of 6 is above threshold; "November" is verifiable from the date;
  no invented goalscorer, minute, or tactical detail.

✓ GOOD — head-to-head pattern with three data points:
  Data: [Team B] has won the last 3 H2H meetings (scores directly in payload)
  Caption: "[Team B]'s third successive win over [Team A] in this fixture."
  Works: 3-from-3 is countable from the payload; no invented context added.

✓ GOOD — ignoring thin context:
  Data: Team A on W×2; H2H shows only 1 prior meeting
  Caption: [written from match data alone — no history reference]
  Works: W×2 is below threshold; single H2H is not a trend. Silence is correct.

✗ BAD — horizon violation:
  Data: Team A on L×5 this season; dataFrom 2024-08-01
  Caption: "their worst run since the 2021/22 relegation season"
  Fails: data covers from August 2024 only; 2021/22 is outside the window.

✗ BAD — invented day-count precision:
  Data: lastWin 2026-03-15 (today is 2026-05-02)
  Caption: "ending a 47-day wait for a win"
  Fails: the day count may be wrong (international breaks, postponements not visible
  in the payload). Write "since mid-March" — that is what the data warrants.

✗ BAD — streak of 2 treated as notable:
  Data: Team A on W×2
  Caption: "back-to-back wins for [Team A], who are finding momentum at the right time"
  Fails: W×2 is below threshold; "finding momentum" is unsupported generic copy.

✗ BAD — throwaway sub-threshold filler (two cases):
  Data: Team A on L×2; one prior H2H meeting won by Team B this season
  Caption (a): "Team A's run of two straight defeats continued against a resolute Team B."
  Fails: L×2 is below the 4-game threshold. A two-game losing run is not editorial material.
    If the streak length is below 4, omit it entirely — not as background context, not in
    passing. The rule is: if it is not striking, it should not appear.
  Caption (b): "Team B had won their only previous meeting at Team A this season."
  Fails: When H2H data contains only 1 prior meeting, writing "only" draws attention to
    the data's thinness. Fewer than 3 meetings do not establish a pattern. Omit the H2H
    reference entirely rather than qualifying it.`;

// ---- Team history formatting helpers ------------------------------------
// Pure functions: accept data from MatchEditorialInput, return formatted strings
// for injection into the user message.

function fmtStreak(streak: Streak): string {
  if (streak.length === 0) return "no matches in data window";
  const word =
    streak.type === "W" ? "win" : streak.type === "D" ? "draw" : "loss";
  const plural = streak.length === 1 ? word : `${word}s`;
  return `${streak.length} consecutive ${plural}` +
    (streak.since ? ` (since ${streak.since})` : "");
}

function fmtRecent(matches: RecentMatch[]): string {
  if (matches.length === 0) return "none";
  return matches
    .map((m) => `${m.result}(${m.score} vs ${m.opponent})`)
    .join(" → ");
}

/**
 * Returns the formatted TEAM HISTORY data block for the user message, or null
 * if none of the history fields are populated (so callers can skip injection).
 */
function formatTeamHistoryBlock(input: MatchEditorialInput): string | null {
  const { homeTeamHistory: hh, awayTeamHistory: ah, headToHead: h2h } = input;
  if (!hh && !ah && (!h2h || h2h.length === 0)) return null;

  const dataFrom =
    hh?.dataFrom ?? ah?.dataFrom ?? "2024-08-01";

  const lines: string[] = [
    `TEAM HISTORY (data from ${dataFrom} — claims about earlier periods are not permitted)`,
  ];

  if (hh) {
    const hs = input.homeSeasonStats;
    lines.push(`\n[${input.match.homeTeam.shortName} — home]`);
    if (hs) {
      lines.push(
        `  Season ${hs.season}:    ` +
          `P${hs.played} W${hs.won} D${hs.drawn} L${hs.lost} | ` +
          `GF ${hs.goalsFor} GA ${hs.goalsAgainst} | ${hs.points} pts`,
      );
    }
    lines.push(`  Current streak:   ${fmtStreak(hh.currentStreak)}`);
    lines.push(
      `  Last win:         ${hh.lastWin
        ? `${hh.lastWin.date} vs ${hh.lastWin.opponent} ${hh.lastWin.score} (${hh.lastWin.venue})`
        : "none in dataset"}`,
    );
    lines.push(
      `  Last clean sheet: ${hh.lastCleanSheet
        ? `${hh.lastCleanSheet.date} vs ${hh.lastCleanSheet.opponent} ${hh.lastCleanSheet.score}`
        : "none in dataset"}`,
    );
    if (hh.lastNMatches.length > 0) {
      lines.push(
        `  Last ${hh.lastNMatches.length} results:  ${fmtRecent(hh.lastNMatches)}`,
      );
    }
  }

  if (ah) {
    const as_ = input.awaySeasonStats;
    lines.push(`\n[${input.match.awayTeam.shortName} — away]`);
    if (as_) {
      lines.push(
        `  Season ${as_.season}:    ` +
          `P${as_.played} W${as_.won} D${as_.drawn} L${as_.lost} | ` +
          `GF ${as_.goalsFor} GA ${as_.goalsAgainst} | ${as_.points} pts`,
      );
    }
    lines.push(`  Current streak:   ${fmtStreak(ah.currentStreak)}`);
    lines.push(
      `  Last win:         ${ah.lastWin
        ? `${ah.lastWin.date} vs ${ah.lastWin.opponent} ${ah.lastWin.score} (${ah.lastWin.venue})`
        : "none in dataset"}`,
    );
    lines.push(
      `  Last clean sheet: ${ah.lastCleanSheet
        ? `${ah.lastCleanSheet.date} vs ${ah.lastCleanSheet.opponent} ${ah.lastCleanSheet.score}`
        : "none in dataset"}`,
    );
    if (ah.lastNMatches.length > 0) {
      lines.push(
        `  Last ${ah.lastNMatches.length} results:  ${fmtRecent(ah.lastNMatches)}`,
      );
    }
  }

  if (h2h && h2h.length > 0) {
    lines.push(
      `\n[Head-to-head — last ${h2h.length} meeting${h2h.length > 1 ? "s" : ""}, newest first]`,
    );
    for (const m of h2h) {
      lines.push(
        `  ${m.date}  ${m.homeTeamName} ${m.score} ${m.awayTeamName}  [${m.season}, ${m.leagueCode}]`,
      );
    }
  }

  return lines.join("\n");
}

// ---- Formatting helpers -------------------------------------------------

function formatResult(match: Match): string {
  const h = match.score.fullTime.home ?? "?";
  const a = match.score.fullTime.away ?? "?";
  const htH = match.score.halfTime.home ?? "?";
  const htA = match.score.halfTime.away ?? "?";
  return (
    `${match.homeTeam.shortName} ${h}–${a} ${match.awayTeam.shortName}` +
    ` (half-time: ${htH}–${htA})`
  );
}

function formatResultLong(match: Match): string {
  const h = match.score.fullTime.home ?? "?";
  const a = match.score.fullTime.away ?? "?";
  const htH = match.score.halfTime.home ?? "?";
  const htA = match.score.halfTime.away ?? "?";
  return (
    `${match.homeTeam.name} ${h}–${a} ${match.awayTeam.name}` +
    ` (half-time: ${htH}–${htA})`
  );
}

function formatScorers(scorers: ScorerEntry[], limit: number): string {
  return scorers
    .slice(0, limit)
    .map(
      (s, i) =>
        `${i + 1}. ${s.player.name} (${s.team.name}) — ${s.goals} goals, ${s.assists ?? 0} assists`,
    )
    .join("\n");
}

// ---- Prompt builders ----------------------------------------------------
//
// Worked example (reference for future prompt iteration — do not delete):
//
// Input:  [Team A] 2–0 [Team B], matchday 36, no goalscorer data available
//
// ✓ ACCEPTABLE caption:
//   "[Team A] won a third successive home match on matchday 36, keeping [Team B] —
//    one of the league's more consistent visitors this season — at a distance."
//   Reasoning: uses team names, matchday, score context, no invented events.
//
// ✗ BANNED caption:
//   "[Player X]'s curling finish broke the deadlock before [Player Y] added a second —
//    [Team A]'s sixth straight home win."
//   Reasoning: invents goalscorers, describes goals, invents streak. None of
//   this is in the input data.
//
// NOTE: Do not use real team names, player names, or specific numbers in these
// reference examples. Real entities in examples can be reproduced verbatim by the
// model when actual match data happens to match the example (see DECISIONS.md,
// 2026-05-05 entry on few-shot example contamination).

export function buildMatchCaptionPrompt(input: MatchEditorialInput): PromptPackage {
  const { context, match, topScorers, priorCaptionOpenings = [] } = input;

  // If earlier captions have been generated for this league today, append their
  // full text so the model can see exactly which opening structures are already
  // taken and avoid repeating them. This is the deterministic complement to the
  // soft shape-repetition rule — the model is shown the actual prior output
  // rather than asked to infer from an abstract prohibition.
  const priorOpeningsBlock =
    priorCaptionOpenings.length > 0
      ? `\n\nShapes already used by earlier captions in this league today:\n` +
        priorCaptionOpenings.map((c) => `  "${c}"`).join("\n") +
        `\nDo not open with a structurally similar sentence. "Similar" means same subject type, same verb, same framing — not just same words. If your intended opening matches any of the above on those dimensions, change all three: pick a different subject, a different verb, a different angle on the match.`
      : "";

  const historyBlock = formatTeamHistoryBlock(input);
  const historySectionInFormat = historyBlock ? `\n\n${HISTORY_CALIBRATION_SECTION}` : "";

  const formatBlock: TextBlock = {
    type: "text",
    text: `\
FORMAT: MATCH CAPTION
One sentence, 15–25 words. Appears directly below the scoreline on the Tabela page.

Guidelines:
- Do not restate the score — it is already displayed above the caption.
- Do not describe how goals were scored (you do not have that data).
- Do not claim what the result "means" for a team's position, urgency, or survival —
  you do not have standings data. The caption must be grounded in what the data shows:
  the score, the half-time score, the matchday number, the opponent.
- You may reference a player from the season scorer list as a league-level narrative
  thread, but NEVER attribute a goal from this match to any specific player.

What to observe instead of stakes:
  • What did the half-time score tell us? A 3–0 lead at the break is a different game from 1–0.
  • What does the scoreline say about the losing team's afternoon?
  • What does a top scorer's season total suggest about what the result cost their opponents?
  • What was distinctive about this scoreline (high-scoring draw, comeback, shutout)?

Five shapes a caption can take — use whichever fits the data:

  1. What the score required:
     "[Team A] found themselves two goals clear before the break and spent the second half
      defending what they had — [Team B] pulled one back but could not find the second."

  2. Scorer as context, not as goalscorer:
     "For a [Team A] side that has run much of its season through [Player]'s [N] goals,
      a blank afternoon at [Team B] against a well-organised defence says something."

  3. The loser's read:
     "[Team A] led at half-time on matchday [N] and still lost — [Team B] took three points
      from a game that only started going their way after the interval."

  4. Half-time as the whole story:
     "[Team A] were two goals clear of [Team B] before the break and won [score] — an
      afternoon [Team B] had no realistic route back into from the first whistle."

  5. Scoreline observation:
     "Eight goals shared on matchday [N], with neither side holding a lead for more than
      a few minutes at a time."

NOTE ON EXAMPLES: the placeholders above ([Team A], [Team B], [Player], [N], [score])
are deliberately abstract. Do not treat them as fill-in-the-blank templates. They
illustrate sentence structure only — every actual caption must be written from the
real match data in the input, using the real team names and scores provided.

BAD examples — do not write captions like these:
  ✗ "[Team A]'s win keeps the pressure on at the top with three games remaining." — no
    standings data; "pressure on" is a cliché; the countdown is filler.
  ✗ "[Team A]'s Matchday 34 result sends a statement to the chasing pack." — hollow;
    what statement? What pack? The reader knows as little as you do.
  ✗ "[Team A] left [Team B] with nothing on Matchday 34, a comfortable away win with
    four games of the season remaining." — uses a countdown to signal importance it
    cannot demonstrate.

Shape repetition rule: within a single league's captions for one day, no opening
sentence structure may appear more than once. This is a hard constraint, not a preference.

Specifically — if you have already used "[Team A] were N goals clear before the break"
(or any close variant: "at half-time", "by the break", "before the interval") for one
match in a league, you must not use that construction for any other match in the same
league on the same day. Choose a different shape for the second match.

BAD — two captions in the same league both opening with shape 4:
  ✗ "[Team A] were two goals clear before the break — [Team B] had no route back."
  ✗ "[Team C] were two goals clear at half-time — [Team D]'s second-half reply was too late."

GOOD — same two matches, structurally distinct openings:
  ✓ "[Team A] were two goals clear before the break — [Team B] had no route back."
  ✓ "[Team C] finished the match before the interval; [Team D] spent the second half
      confirming what the break had already decided."

The same rule applies to all shapes: two captions from the same league on the same day
must not share an opening construction or resolve with the same framing. A reader
working through a league's results should encounter structurally distinct sentences.${priorOpeningsBlock}${historySectionInFormat}`,
  };

  const userText =
    `League: ${context.leagueName} — Matchday ${match.matchday} — ${context.date}\n` +
    `\n` +
    `RESULT\n` +
    `${formatResult(match)}\n` +
    `\n` +
    `SEASON TOP SCORERS (${context.leagueName})\n` +
    `${formatScorers(topScorers, 5)}\n` +
    (historyBlock ? `\n${historyBlock}\n` : `\n`) +
    `Write the match caption using the write_match_caption tool.`;

  return {
    systemBlocks: [VOICE_BLOCK, formatBlock],
    userText,
    tool: CAPTION_TOOL,
    toolName: CAPTION_TOOL.name,
  };
}

export function buildMatchSummaryPrompt(input: MatchEditorialInput): PromptPackage {
  const { context, match, topScorers } = input;

  const historyBlock = formatTeamHistoryBlock(input);
  const historySectionInFormat = historyBlock ? `\n\n${HISTORY_CALIBRATION_SECTION}` : "";

  const formatBlock: TextBlock = {
    type: "text",
    text: `\
FORMAT: MATCH SUMMARY
2–3 paragraphs, separated by \\n\\n.

Guidelines:
- The headline states the result plainly (6–10 words, no verb inflation).
- The opening paragraph establishes what the result means — not what happened goal by goal.
- Subsequent paragraphs use whatever the data supports: the half-time picture, the
  opposition's season context, the scorer list as background colour.
- Do not open with the score (it appears in the headline above the body).
- Do not describe goalscorer sequences, substitutions, or tactical instructions —
  none of that data is available.${historySectionInFormat}`,
  };

  const userText =
    `League: ${context.leagueName} — Matchday ${match.matchday} — ${context.date}\n` +
    `\n` +
    `RESULT\n` +
    `${formatResultLong(match)}\n` +
    `\n` +
    `SEASON TOP SCORERS (${context.leagueName})\n` +
    `${formatScorers(topScorers, 10)}\n` +
    (historyBlock ? `\n${historyBlock}\n` : `\n`) +
    `Write the match summary using the write_match_summary tool.`;

  return {
    systemBlocks: [VOICE_BLOCK, formatBlock],
    userText,
    tool: SUMMARY_TOOL,
    toolName: SUMMARY_TOOL.name,
  };
}

export function buildLeagueOverviewPrompt(input: LeagueOverviewInput): PromptPackage {
  const { context, matches, topScorers } = input;

  const resultLines = matches
    .map(
      (m) =>
        `  ${m.homeTeam.shortName} ${m.score.fullTime.home ?? "?"}–${m.score.fullTime.away ?? "?"} ` +
        `${m.awayTeam.shortName} ` +
        `(ht: ${m.score.halfTime.home ?? "?"}–${m.score.halfTime.away ?? "?"}, matchday ${m.matchday})`,
    )
    .join("\n");

  const formatBlock: TextBlock = {
    type: "text",
    text: `\
FORMAT: LEAGUE OVERVIEW
3–5 paragraphs, separated by \\n\\n. Covers all finished matches in ${context.leagueName} on ${context.date}.

Guidelines:
- Find the story connecting the results — contrasts, patterns, what the scores collectively
  say about how the day played out.
- Synthesise; do not catalogue. A reader who saw the scores should still learn something.
- Do not open with a list of results — they appear above this text.
- Do not reference league table positions, points gaps, or urgency — standings data is
  not available. This means: do not say a team "needed the points", "can ill afford" a
  result, is "fighting to stay up", or was under "survival" pressure. You do not know
  where they stand. If the data does not say it, you cannot imply it.
- Do not invent goalscorers, match events, or stats. Write from scores, opponents,
  matchday numbers, and the seasonal scorer context.
- On a day with only one or two matches, write only what those matches warrant. Do not
  pad the overview with observations about what the day "could not tell us" — if there
  is only one game, cover it fully and stop. Do not frame brevity as a limitation.`,
  };

  const userText =
    `League: ${context.leagueName} — ${context.date}\n` +
    `\n` +
    `RESULTS (all finished matches)\n` +
    `${resultLines}\n` +
    `\n` +
    `SEASON TOP SCORERS (${context.leagueName})\n` +
    `${formatScorers(topScorers, 10)}\n` +
    `\n` +
    `Write the league overview using the write_league_overview tool.`;

  return {
    systemBlocks: [VOICE_BLOCK, formatBlock],
    userText,
    tool: LEAGUE_OVERVIEW_TOOL,
    toolName: LEAGUE_OVERVIEW_TOOL.name,
  };
}

export function buildDayOverviewPrompt(input: DayOverviewInput): PromptPackage {
  // Only include leagues that had at least one finished match.
  const activeleagues = input.leagues.filter((l) => l.matches.length > 0);

  const leagueSections = activeleagues
    .map((l) => {
      const results = l.matches
        .map(
          (m) =>
            `  ${m.homeTeam.shortName} ${m.score.fullTime.home ?? "?"}–` +
            `${m.score.fullTime.away ?? "?"} ${m.awayTeam.shortName}` +
            ` (matchday ${m.matchday})`,
        )
        .join("\n");
      return `${l.name.toUpperCase()}\n${results}`;
    })
    .join("\n\n");

  const formatBlock: TextBlock = {
    type: "text",
    text: `\
FORMAT: DAY OVERVIEW
3–5 paragraphs, separated by \\n\\n. The cross-league lead story for the day.

Guidelines:
- Select the two or three results that mattered most across the five leagues.
  You do not need to mention every league that played.
- Find threads: patterns in how the day went across leagues — not assertions about what
  the results will do to league tables you cannot see.
- A reader who only reads this should understand how European football played out today,
  not receive urgency framing you cannot support with data.
- Do not reference league table positions, points gaps, title-race consequences, or
  relegation battles unless the data you have explicitly states a team's position.
  "Needs to win", "cannot afford to drop points", "could prove decisive in the title
  race" — none of these are available to you without standings. Omit them.
- Do not invent goalscorers or match events. Write from scores, teams, and matchday numbers.
- Do not explain what you cannot discuss. If standings data is absent, write from the
  scores alone — do not signal the absence ("though without standings data…", "a sweeping
  picture of the title race or relegation picture was not available today"). The editorial
  voice assumes a reader; it does not address the reader's expectations about what
  information the writer has.`,
  };

  const userText =
    `Date: ${input.date}\n` +
    `\n` +
    `RESULTS ACROSS EUROPEAN FOOTBALL\n` +
    `\n` +
    `${leagueSections}\n` +
    `\n` +
    `Write the day overview using the write_day_overview tool.`;

  return {
    systemBlocks: [VOICE_BLOCK, formatBlock],
    userText,
    tool: DAY_OVERVIEW_TOOL,
    toolName: DAY_OVERVIEW_TOOL.name,
  };
}
