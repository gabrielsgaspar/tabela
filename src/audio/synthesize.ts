// ElevenLabs synthesis wrapper.
//
// Takes pre-processed SSML text and returns an mp3 Buffer.
// All ElevenLabs-specific error handling lives here so callers deal only
// with structured SynthesisError instances.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SynthesisInput, SynthesisResult } from "./types";

// ---- Config defaults -------------------------------------------------------

const DEFAULT_MODEL = "eleven_multilingual_v2";

// ---- Structured error ------------------------------------------------------

export type SynthesisErrorKind =
  | "rate_limit"        // 429 — back off and retry
  | "voice_not_found"   // 404 — bad ELEVENLABS_VOICE_ID
  | "quota_exceeded"    // 402 — billing / character quota
  | "malformed_text"    // 400 — text too long or invalid SSML
  | "unknown";

export class SynthesisError extends Error {
  readonly kind: SynthesisErrorKind;
  readonly statusCode?: number;

  constructor(kind: SynthesisErrorKind, message: string, statusCode?: number) {
    super(message);
    this.name = "SynthesisError";
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

// ---- HTTP status → kind mapping -------------------------------------------

function classifyStatus(status: number): SynthesisErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 404) return "voice_not_found";
  if (status === 402) return "quota_exceeded";
  if (status === 400) return "malformed_text";
  return "unknown";
}

// ---- Internal: collect a ReadableStream into a Buffer ----------------------
// The ElevenLabs SDK returns a web-standard ReadableStream<Uint8Array>.
// Node's Buffer.from(await Response.arrayBuffer()) pattern requires wrapping;
// instead we consume chunks directly.

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

// ---- Public synthesize() ---------------------------------------------------

export async function synthesize(input: SynthesisInput): Promise<SynthesisResult> {
  const voiceId = input.voiceId ?? process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new SynthesisError(
      "voice_not_found",
      "ELEVENLABS_VOICE_ID is not set and no voiceId was provided.",
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new SynthesisError("unknown", "ELEVENLABS_API_KEY is not set.");
  }

  const client = new ElevenLabsClient({ apiKey });

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await client.textToSpeech.convert(voiceId, {
      text: input.text,
      modelId: DEFAULT_MODEL,
      outputFormat: "mp3_44100_128",
    });
  } catch (err: unknown) {
    // ElevenLabs SDK throws objects with a statusCode property on API errors.
    if (
      err !== null &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number"
    ) {
      const status = (err as { statusCode: number }).statusCode;
      const msg =
        "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : `ElevenLabs API error ${status}`;
      throw new SynthesisError(classifyStatus(status), msg, status);
    }
    // Network errors or unexpected throws.
    const msg = err instanceof Error ? err.message : String(err);
    throw new SynthesisError("unknown", `ElevenLabs request failed: ${msg}`);
  }

  const mp3Buffer = await streamToBuffer(stream);

  return {
    mp3Buffer,
    contentType: "audio/mpeg",
    bytes: mp3Buffer.byteLength,
  };
}
