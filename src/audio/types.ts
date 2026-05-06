// Shared types for the audio synthesis pipeline.
// Synthesis runs in the daily Trigger.dev task — never at request time.

export interface SynthesisInput {
  // Plain text, pre-processed by pre-process.ts before reaching synthesize().
  text: string;
  // Override the default ELEVENLABS_VOICE_ID env var for this call.
  voiceId?: string;
}

export interface SynthesisResult {
  mp3Buffer: Buffer;
  contentType: "audio/mpeg";
  bytes: number;
  // Rough estimate based on average 150 wpm spoken rate. Populated after
  // upload when we get the real duration from audio metadata; set to
  // undefined here because ElevenLabs doesn't return duration directly.
  durationEstimate?: number;
}

export interface PreProcessResult {
  // Text ready to send to ElevenLabs (SSML breaks inserted, abbreviations
  // expanded, markdown stripped).
  ssml: string;
  // Character count used for cost estimation (chars × rate).
  charCount: number;
}

export interface UploadResult {
  publicUrl: string;
  // Storage path relative to bucket root, e.g. "episodes/2026-05-06/day_overview-.mp3"
  storagePath: string;
  bytes: number;
}

// Identifies a persisted editorial row — used to name the Storage file
// and to write audio_url back to the DB after upload.
export interface EditorialRef {
  id: number;
  date: string;   // YYYY-MM-DD
  kind: "day_overview" | "league_overview";
  // "" for day_overview; lowercase league code ("pl", "pd", ...) for league_overview.
  slug: string;
}
