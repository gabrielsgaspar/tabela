// One-off repair script: rename the mis-pathed day_overview audio file in
// Supabase Storage and update the editorials row to match.
//
// Context: the original buildStoragePath() produced "day_overview-.mp3" (with
// a trailing dash) when slug is "" (day_overview rows). The fix in upload.ts
// now produces "day_overview.mp3". This script migrates the one production row
// that was written with the old path before the fix landed.
//
// The affected row is editorials id=263, date=2026-05-04, kind=day_overview.
// audio_url was: …/episodes/2026-05-04/day_overview-.mp3
// audio_url will be: …/episodes/2026-05-04/day_overview.mp3
//
// Usage:
//   pnpm tsx scripts/fix-day-overview-path.ts
//
// Requires .env.local with:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// Run once. Safe to run again (move is a no-op if source no longer exists;
// DB update is idempotent because the new URL is what we want).

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { createServerClient } from "../src/lib/supabase";

const BUCKET = "episodes";
const OLD_PATH = "2026-05-04/day_overview-.mp3";
const NEW_PATH = "2026-05-04/day_overview.mp3";
const EDITORIAL_ID = 263;

async function main() {
  const db = createServerClient();

  // ── 1. Verify current DB state ──────────────────────────────────────────────
  console.log("── Checking current DB state ─────────────────────────────────────");
  const { data: row, error: selErr } = await db
    .from("editorials")
    .select("id, date, kind, audio_url")
    .eq("id", EDITORIAL_ID)
    .maybeSingle();

  if (selErr) throw new Error(`DB select failed: ${selErr.message}`);
  if (!row) throw new Error(`No editorials row with id=${EDITORIAL_ID}`);

  console.log(`  id:        ${row.id}`);
  console.log(`  date:      ${row.date}`);
  console.log(`  kind:      ${row.kind}`);
  console.log(`  audio_url: ${row.audio_url ?? "(null)"}`);
  console.log();

  if (row.audio_url && !row.audio_url.includes("day_overview-.mp3")) {
    console.log("  audio_url does not contain the old path — already correct or manually fixed.");
    console.log("  Nothing to do.");
    return;
  }

  // ── 2. Move the file in Storage ─────────────────────────────────────────────
  // storage.from(bucket).move(from, to) renames in place within the bucket.
  // If the source file doesn't exist (e.g. already renamed), this will return
  // an error which we surface clearly.
  console.log("── Moving file in Supabase Storage ───────────────────────────────");
  console.log(`  from: ${BUCKET}/${OLD_PATH}`);
  console.log(`  to:   ${BUCKET}/${NEW_PATH}`);

  const { error: moveErr } = await db.storage
    .from(BUCKET)
    .move(OLD_PATH, NEW_PATH);

  if (moveErr) {
    // The move fails if the source doesn't exist. Check if the destination
    // already exists instead — that means the move already ran.
    const { data: existCheck } = db.storage.from(BUCKET).getPublicUrl(NEW_PATH);
    if (existCheck.publicUrl) {
      console.log("  move() failed but destination URL is already present —");
      console.log("  assuming file was previously renamed. Continuing to DB update.");
    } else {
      throw new Error(`Storage move failed: ${moveErr.message}`);
    }
  } else {
    console.log("  moved.");
  }
  console.log();

  // ── 3. Get the new public URL ───────────────────────────────────────────────
  const { data: { publicUrl: newPublicUrl } } = db.storage
    .from(BUCKET)
    .getPublicUrl(NEW_PATH);

  if (!newPublicUrl) {
    throw new Error("getPublicUrl returned empty for the new path.");
  }
  console.log(`── New public URL: ${newPublicUrl}`);
  console.log();

  // ── 4. Update the DB row ────────────────────────────────────────────────────
  console.log("── Updating editorials row ───────────────────────────────────────");
  const { error: updateErr } = await db
    .from("editorials")
    .update({ audio_url: newPublicUrl })
    .eq("id", EDITORIAL_ID);

  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

  console.log(`  editorials id=${EDITORIAL_ID} audio_url → ${newPublicUrl}`);
  console.log();

  // ── 5. Verify ────────────────────────────────────────────────────────────────
  const { data: after, error: verifyErr } = await db
    .from("editorials")
    .select("audio_url")
    .eq("id", EDITORIAL_ID)
    .maybeSingle();

  if (verifyErr || !after) throw new Error("Post-update verify query failed");
  console.log(`── Verified: audio_url is now ${after.audio_url}`);
  console.log();
  console.log("── Done ─────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("fix-day-overview-path failed:", err);
  process.exit(1);
});
