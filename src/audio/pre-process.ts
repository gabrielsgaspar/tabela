// Pre-process editorial text for speech synthesis.
//
// Three jobs:
//   1. Strip markdown formatting (headers, bold, italic, links, list markers)
//   2. Expand abbreviations and score notation to spoken forms
//   3. Insert ElevenLabs-compatible SSML <break> tags at paragraph boundaries
//
// ElevenLabs supports a limited SSML subset: only <break time="Xms"/> and
// <speak> are reliably honoured across voices. We wrap the output in <speak>
// so the element is valid and insert 500ms paragraph pauses.

import type { PreProcessResult } from "./types";

// ---- Abbreviation / score expansion table --------------------------------
//
// Order matters: longer keys first prevents partial replacements.
// Score patterns (e.g. "2-1") are handled by a regex below, not this table.

const EXPANSIONS: [RegExp, string][] = [
  // Scores — must come before hyphenated abbreviations
  // "1-0", "2-1", "3-0" etc — spoken as "one-nil", "two-one", etc.
  // Handled separately via scoreToWords().

  // Match state
  [/\bFT\b/g, "full-time"],
  [/\bHT\b/g, "half-time"],
  [/\bAET\b/g, "after extra time"],
  [/\bPSO\b/g, "on penalties"],
  [/\bET\b/g, "extra time"],

  // Expected goals / stats
  [/\bxG\b/g, "expected goals"],
  [/\bxA\b/g, "expected assists"],

  // Competitions / abbreviations
  [/\bVAR\b/g, "V-A-R"],
  [/\bUCL\b/g, "Champions League"],
  [/\bUEL\b/g, "Europa League"],
  [/\bUECL\b/g, "Conference League"],
  [/\bPSG\b/g, "Paris Saint-Germain"],
  [/\bMan\s+City\b/gi, "Manchester City"],
  [/\bMan\s+Utd\b/gi, "Manchester United"],
  [/\bAtl\.\s*Madrid\b/gi, "Atlético Madrid"],

  // Ordinals / shorthand
  [/\b(\d+)st\b/g, "$1st"],  // already spoken correctly; no-op but explicit
  [/\b(\d+)nd\b/g, "$1nd"],
  [/\b(\d+)rd\b/g, "$1rd"],
  [/\b(\d+)th\b/g, "$1th"],

  // Minute markers "45'" → "minute 45"
  [/(\d{1,3})'+/g, "minute $1"],
];

// Score pattern: digits-digits at word boundary, possibly preceded by space.
// Covers "0-0", "1-0", "2-1", "10-0", "0-10" etc.
const SCORE_RE = /\b(\d{1,2})-(\d{1,2})\b/g;

const DIGIT_WORDS = [
  "nil", "one", "two", "three", "four",
  "five", "six", "seven", "eight", "nine", "ten",
];

function scoreToWords(home: string, away: string): string {
  const h = parseInt(home, 10);
  const a = parseInt(away, 10);

  // Beyond single-digit scores fall back to digit reading (rare in football).
  const hWord = h <= 10 ? DIGIT_WORDS[h] : home;
  const aWord = a <= 10 ? DIGIT_WORDS[a] : away;

  if (h === a) {
    // 0-0 → "nil-nil", 1-1 → "one-all", 2-2 → "two-all"
    return h === 0 ? "nil-nil" : `${hWord}-all`;
  }
  // 2-0 → "two-nil", 3-1 → "three-one"
  const awayFinal = a === 0 ? "nil" : aWord;
  return `${hWord}-${awayFinal}`;
}

// ---- Markdown stripping --------------------------------------------------

function stripMarkdown(text: string): string {
  return (
    text
      // ATX headings: ## Heading → Heading
      .replace(/^#{1,6}\s+/gm, "")
      // Bold + italic combined: ***text*** or ___text___
      .replace(/\*{3}(.+?)\*{3}/g, "$1")
      .replace(/_{3}(.+?)_{3}/g, "$1")
      // Bold: **text** or __text__
      .replace(/\*{2}(.+?)\*{2}/g, "$1")
      .replace(/_{2}(.+?)_{2}/g, "$1")
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      // Inline links: [text](url) → text
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      // Reference links: [text][ref] → text
      .replace(/\[(.+?)\]\[.*?\]/g, "$1")
      // Bare URLs
      .replace(/https?:\/\/\S+/g, "")
      // Unordered list markers: "- item" or "* item"
      .replace(/^[\-\*]\s+/gm, "")
      // Ordered list markers: "1. item"
      .replace(/^\d+\.\s+/gm, "")
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Blockquotes
      .replace(/^>\s+/gm, "")
  );
}

// ---- Player name pronunciation overrides ---------------------------------
// Add entries here when ElevenLabs mispronounces a specific player's name.
// Key: name as it appears in the text. Value: phonetic spelling.
// Empty by default — add per-player entries as needed.

const PLAYER_NAME_OVERRIDES: Record<string, string> = {
  // Example: "Vinicius": "Vin-ee-see-us",
  // "Güler": "Gew-ler",
};

function applyPlayerOverrides(text: string): string {
  let result = text;
  for (const [name, phonetic] of Object.entries(PLAYER_NAME_OVERRIDES)) {
    result = result.replaceAll(name, phonetic);
  }
  return result;
}

// ---- SSML paragraph breaks -----------------------------------------------
// ElevenLabs speaks blank-line-separated paragraphs without pause by default.
// Inserting a 500ms break between paragraphs improves listenability.

const PARAGRAPH_BREAK = `<break time="500ms"/>`;

function insertParagraphBreaks(text: string): string {
  // Normalise line endings then split on blank lines.
  const paras = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paras.join(` ${PARAGRAPH_BREAK} `);
}

// ---- Main export ----------------------------------------------------------

export function preProcess(rawText: string): PreProcessResult {
  let text = stripMarkdown(rawText);

  // Score expansion before other abbreviations to avoid double-processing.
  text = text.replace(SCORE_RE, (_, h, a) => scoreToWords(h, a));

  // Abbreviation / shorthand expansions.
  for (const [pattern, replacement] of EXPANSIONS) {
    text = text.replace(pattern, replacement);
  }

  // Player name pronunciation overrides.
  text = applyPlayerOverrides(text);

  // Insert SSML paragraph breaks.
  const inner = insertParagraphBreaks(text);

  // Wrap in <speak> for valid SSML.
  const ssml = `<speak>${inner}</speak>`;

  return {
    ssml,
    charCount: inner.length, // exclude <speak> tags from cost estimate
  };
}
