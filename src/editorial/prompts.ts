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
✓ "Arsenal made it five straight home wins — Brighton never looked like ending the streak."
✓ "It is the first time Real Madrid have lost back-to-back home games since the Mourinho era."
✗ "INSANE result!!" / "Brentford ROBBED Liverpool" / "Real Madrid in CRISIS mode"
✗ Do not use: amazing, incredible, unbelievable, stunning, shocking
✗ Do not use: must-win, do-or-die, season on the line, turning point, arguably, perhaps

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
// Input:  Arsenal 2–0 Brighton, matchday 36, no goalscorer data available
//
// ✓ ACCEPTABLE caption:
//   "Arsenal won a third successive home match on matchday 36, keeping Brighton —
//    one of the league's more consistent visitors this season — at a distance."
//   Reasoning: uses team names, matchday, score context, no invented events.
//
// ✗ BANNED caption:
//   "Saka's curling finish broke the deadlock before Havertz added a second —
//    Arsenal's sixth straight home win."
//   Reasoning: invents goalscorers, describes goals, invents streak. None of
//   this is in the input data.

export function buildMatchCaptionPrompt(input: MatchEditorialInput): PromptPackage {
  const { context, match, topScorers } = input;

  const formatBlock: TextBlock = {
    type: "text",
    text: `\
FORMAT: MATCH CAPTION
One sentence, 15–25 words. Appears directly below the scoreline on the Tabela page.

Guidelines:
- Do not restate the score — it is already displayed above the caption.
- Do not describe how goals were scored (you do not have that data).
- Focus on what the result means: the opponent's standing, the stage of the season,
  the matchday number, anything the score implies about momentum or stakes.
- You may reference a player from the season scorer list as a league-level narrative
  thread (e.g. "the league's leading scorer is now on a team that...") but NEVER
  attribute a goal from this match to any specific player.`,
  };

  const userText =
    `League: ${context.leagueName} — Matchday ${match.matchday} — ${context.date}\n` +
    `\n` +
    `RESULT\n` +
    `${formatResult(match)}\n` +
    `\n` +
    `SEASON TOP SCORERS (${context.leagueName})\n` +
    `${formatScorers(topScorers, 5)}\n` +
    `\n` +
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
  none of that data is available.`,
  };

  const userText =
    `League: ${context.leagueName} — Matchday ${match.matchday} — ${context.date}\n` +
    `\n` +
    `RESULT\n` +
    `${formatResultLong(match)}\n` +
    `\n` +
    `SEASON TOP SCORERS (${context.leagueName})\n` +
    `${formatScorers(topScorers, 10)}\n` +
    `\n` +
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
- Find the story connecting the results — contrasts, patterns, what the day means
  for teams at the top and bottom of an imagined table.
- Synthesise; do not catalogue. A reader who saw the scores should still learn something.
- Do not open with a list of results — they appear above this text.
- Do not reference league table positions or points gaps (standings data not available).
- Do not invent goalscorers, match events, or stats. Write from scores, opponents,
  matchday numbers, and the seasonal scorer context.`,
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
- Find threads: parallel title races, contrasting relegation pictures, big results
  that shift the week's narrative.
- A reader who only reads this should understand what today meant for European football.
- Do not reference league table positions or points gaps (standings data not available).
- Do not invent goalscorers or match events. Write from scores, teams, and matchday numbers.`,
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
