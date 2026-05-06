// Local synthesis test — produces one mp3 from hardcoded editorial text.
//
// Usage:
//   pnpm tsx scripts/test-synthesize.ts
//
// Requires .env.local with:
//   ELEVENLABS_API_KEY=...
//   ELEVENLABS_VOICE_ID=...
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// What it does:
//   1. Pre-processes sample editorial text (strip markdown, expand abbrevs,
//      insert SSML paragraph breaks)
//   2. Calls ElevenLabs → receives mp3 buffer
//   3. Saves the mp3 locally to /tmp/test-synthesis.mp3
//   4. Uploads to Supabase Storage episodes/ bucket and prints the public URL
//
// Stop after this script confirms the voice sounds right — then approve B2.

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local before anything else so env vars are available.
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { preProcess } from "../src/audio/pre-process";
import { synthesize } from "../src/audio/synthesize";
import { uploadAudio } from "../src/audio/upload";
import type { EditorialRef } from "../src/audio/types";

// ── Sample editorial text (3 paragraphs, ~250 words) ─────────────────────────
// This is representative editorial prose — a day overview in Tabela's voice.
// Not real match data; exists only to test the synthesis pipeline.

const SAMPLE_TEXT = `
## Tuesday, 6 May 2026

Five leagues, one Tuesday. The night belonged to goals that arrived late and points that felt almost undeserved — the kind of evening that reminds you why the table is always a snapshot, never the whole story.

In the **Premier League**, Arsenal edged past Wolves 2-1 in a match that spent most of its life balanced on a knife's edge. Saka was everywhere, as he usually is on nights when the Gunners need someone to break glass. The xG told a different story — 1.3 to 0.8 in Arsenal's favour — but football rarely honours such ledgers. Wolves' consolation came in the 87th minute, a VAR-checked tap-in that sent the away end briefly delirious before common sense prevailed. FT: 2-1.

La Liga offered the evening's most watchable football. Atlético Madrid and Real Sociedad played out a 1-1 draw that both managers will privately call a point gained. Atlético sit third, three points behind Barcelona with a game in hand — the sort of arithmetic that makes the final weeks genuinely interesting. HT had been 0-0. The second half opened up and both sides found the net inside six minutes of each other. Expected goals were 1.7 to 1.4; the scoreline felt fair.

Bundesliga, Ligue 1, and Serie A all returned action. PSG's weekend form wobbled here; Bayern Munich continued their relentless accumulation. The full picture is in each league's edition below.
`.trim();

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("── Pre-processing text ──────────────────────────────────────────");
  const { ssml, charCount } = preProcess(SAMPLE_TEXT);
  const estimatedCost = (charCount / 1000) * 0.003;
  console.log(`  charCount: ${charCount}`);
  console.log(`  estimated cost: $${estimatedCost.toFixed(4)}`);
  console.log(`  SSML preview (first 300 chars):`);
  console.log(`  ${ssml.slice(0, 300)}…`);
  console.log();

  console.log("── Calling ElevenLabs ───────────────────────────────────────────");
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  console.log(`  voiceId: ${voiceId ?? "(from env)"}`);
  const { mp3Buffer, bytes } = await synthesize({ text: ssml });
  console.log(`  received: ${(bytes / 1024).toFixed(1)} KB`);
  console.log();

  // Save locally.
  const localPath = "/tmp/test-synthesis.mp3";
  fs.writeFileSync(localPath, mp3Buffer);
  console.log(`── Saved locally ────────────────────────────────────────────────`);
  console.log(`  ${localPath}`);
  console.log(`  open /tmp/test-synthesis.mp3`);
  console.log();

  // Upload to Supabase Storage.
  console.log("── Uploading to Supabase Storage ────────────────────────────────");
  // Use a test editorial ref — id=0 is a sentinel; the DB update will fail if
  // there's no row with that id, which is expected for this test invocation.
  // To skip the DB write-back, pass --no-upload on the CLI.
  const skipUpload = process.argv.includes("--no-upload");
  if (skipUpload) {
    console.log("  --no-upload flag set — skipping Storage upload.");
  } else {
    // Real editorial row — day_overview 2026-05-04 (id=263).
    // Using a real row so the audio_url write-back can be verified in the DB.
    const ref: EditorialRef = {
      id: 263,
      date: "2026-05-04",
      kind: "day_overview",
      slug: "",
    };
    const { publicUrl, storagePath } = await uploadAudio(mp3Buffer, ref);
    console.log(`  storagePath: ${storagePath}`);
    console.log(`  publicUrl:   ${publicUrl}`);
  }

  console.log();
  console.log("── Done ─────────────────────────────────────────────────────────");
  console.log(`  Listen: open /tmp/test-synthesis.mp3`);
}

main().catch((err) => {
  console.error("test-synthesize failed:", err);
  process.exit(1);
});
