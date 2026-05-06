// Upload synthesised mp3 to Supabase Storage and write audio_url back to DB.
//
// Storage layout:
//   Bucket:  episodes   (public, created via Supabase dashboard / migration)
//   Path:    episodes/{date}/{kind}-{slug}.mp3
//   Example: episodes/2026-05-06/day_overview-.mp3
//            episodes/2026-05-06/league_overview-pl.mp3
//
// After upload, audio_url on the matching editorials row is updated so the
// /listen page can render it immediately on next ISR revalidation.

import { createServerClient } from "../lib/supabase";
import type { EditorialRef, UploadResult } from "./types";

const BUCKET = "episodes";

// ---- Storage path helper --------------------------------------------------

export function buildStoragePath(ref: EditorialRef): string {
  // slug is "" for day_overview — included so the path stays consistent.
  const filename = `${ref.kind}-${ref.slug}.mp3`;
  return `${ref.date}/${filename}`;
}

// ---- Public uploadAudio() -------------------------------------------------

export async function uploadAudio(
  mp3Buffer: Buffer,
  ref: EditorialRef,
): Promise<UploadResult> {
  const db = createServerClient();
  const storagePath = buildStoragePath(ref);

  // Upload — upsert:true overwrites if a previous run already wrote this file.
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, mp3Buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(
      `Storage upload failed for ${storagePath}: ${uploadErr.message}`,
    );
  }

  // Retrieve the public URL. getPublicUrl never throws — it returns an empty
  // string if the bucket is private, so we validate it exists.
  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(storagePath);

  if (!publicUrl) {
    throw new Error(
      `getPublicUrl returned an empty URL for ${storagePath}. ` +
        `Confirm the "${BUCKET}" bucket is set to public in Supabase.`,
    );
  }

  // Write audio_url back to the editorials row so the frontend can serve it.
  const { error: dbErr } = await db
    .from("editorials")
    .update({ audio_url: publicUrl })
    .eq("id", ref.id);

  if (dbErr) {
    throw new Error(
      `editorials.audio_url update failed for id=${ref.id}: ${dbErr.message}`,
    );
  }

  return {
    publicUrl,
    storagePath,
    bytes: mp3Buffer.byteLength,
  };
}
