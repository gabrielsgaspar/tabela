// Shared types for the audio synthesis pipeline.
// Synthesis runs in the daily Trigger.dev task — never at request time.

export interface SynthesisInput {
  // Plain text, pre-processed by pre-process.ts before reaching synthesize().
  text: string;
  // Override the default ELEVENLABS_VOICE_ID env var for this call.
  voiceId?: string;
}

export interface SynthesisResult {
  buffer: Buffer;
  contentType: "audio/mpeg";
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
