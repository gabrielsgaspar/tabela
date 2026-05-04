# PLAN.md — Phase 5: Audio

---

## What this phase delivers

Every `day_overview` and `league_overview` editorial on the site gets an audio
version. The `<AudioPlayer>` component — built dormant in Phase 4 — starts
receiving real `audio_url` values. Users can play the daily briefing and the
five league overviews inline.

Match captions and match summaries are **not** synthesized in Phase 5. Reasons:
captions are 15–25 words, the wrong granularity for audio; summaries number
~50/day and their audio would cost more than the overviews for far less listening
value. Match summary synthesis is a Phase 6 candidate if it proves wanted.

---

## TTS provider decision: ElevenLabs

**Chosen: ElevenLabs.** Rationale and alternatives in Commit 1's DECISIONS.md
entry below.

**Why not OpenAI TTS:** OpenAI's `tts-1` and `tts-1-hd` voices (alloy, echo,
onyx, etc.) are functional but identifiably AI in a way that works against
Tabela's editorial register. ElevenLabs at its best sounds like a real narrator.
For a product whose entire value proposition is voice and craft, the quality
difference is worth the cost premium — at least at Phase 5 volumes. The
"revisit if unpleasant" threshold is documented below.

**Voice: George** (ElevenLabs voice ID `jsCqWAovK2LkecY7zXl4`). Described as
warm, measured, British-accented — the register of an informed football
correspondent, not a sports-radio presenter. The warmth and slight rasp sit
closer to VOICE.md's "Paulo Vinícius Coelho / The Athletic" tone than the
cleaner, more neutral voices do.

**Verify before going live:** play a sample synthesis via the ElevenLabs
Playground or `GET https://api.elevenlabs.io/v1/voices` against `VOICE.md`
reference paragraphs. If George is wrong in practice, document the switch in
DECISIONS.md with the reason.

**Model: `eleven_multilingual_v2`.** Synthesis happens offline (daily task),
not at request time, so latency is irrelevant. Use the highest-quality model.
Downgrade to `eleven_turbo_v2_5` only if monthly cost is an issue — document
the trade-off when making the change.

---

## Cost estimate (document in DECISIONS.md Commit 1)

Synthesized kinds: `day_overview` (~3,000 chars) + 5× `league_overview`
(~2,000 chars each) = **~13,000 chars per active matchday.**

Active matchdays per month: roughly 20 across the season (international breaks,
cup weeks, and August/May shoulder periods reduce this).

**20 days × 13,000 = ~260,000 chars/month.**

| Plan | Included | Per-char rate | Estimated monthly |
|------|----------|---------------|-------------------|
| ElevenLabs Creator | 100k chars | ~$0.24/1k overage | ~$22 + ($38) = ~$60 |
| ElevenLabs Pro | 500k chars | — | ~$99 (no overage) |
| OpenAI TTS (alloy/onyx) | pay-as-you-go | $0.015/1k | ~$3.90 |

**Recommended starting tier: Creator.** At ~260k chars/month it costs ~$60,
which is below the Creator+overage breakeven with Pro (~335k chars/month).
At international break months (fewer matchdays) it will be much less.

**Revisit threshold:** if monthly synthesis cost exceeds $120 for three
consecutive months, re-evaluate — either drop to `eleven_turbo_v2_5` (lower
cost, slightly lower quality), switch to OpenAI TTS, or restrict synthesis to
`day_overview` only.

---

## Commit structure

Six commits. Stops at a working end-to-end state: synthesis runs in the daily
task, audio URLs are in the database, the website plays them.

---

## Commit 1 — SDK install + env + DECISIONS.md entries

**Dependencies:**

```
pnpm add elevenlabs
```

The official ElevenLabs Node.js SDK (npm: `elevenlabs`). Uses it for the
`/v1/text-to-speech/{voice_id}` endpoint with SSML support.

**`env.example` additions:**

```
# -- Phase 5 (audio) ------------------------------------------
ELEVENLABS_API_KEY=
# Default voice. Override per-editorial if needed.
ELEVENLABS_VOICE_ID=jsCqWAovK2LkecY7zXl4
```

Uncomment the Phase 5 block that was already stubbed in `env.example`.

**`src/audio/types.ts`** — shared types for the audio module:

```typescript
export interface SynthesisInput {
  // Plain text to synthesize. Pre-processed before reaching synthesize().
  text: string;
  // Override the default ELEVENLABS_VOICE_ID for this call.
  voiceId?: string;
}

export interface SynthesisResult {
  buffer: Buffer;
  contentType: "audio/mpeg";
}

// Identifies a persisted editorial — used to name the Storage file.
export interface EditorialRef {
  id: number;       // primary key for the update call
  date: string;     // YYYY-MM-DD
  kind: "day_overview" | "league_overview";
  slug: string;     // "" for day_overview, league code for league_overview
}
```

**DECISIONS.md entries to add:**

```
### 2026-05-XX — TTS provider: ElevenLabs

Decision: ElevenLabs for text-to-speech synthesis. Voice: George
(jsCqWAovK2LkecY7zXl4) — warm, measured, British-accented.
Model: eleven_multilingual_v2.

Alternatives: OpenAI TTS (alloy/onyx) at ~$0.015/1k chars vs ElevenLabs
~$0.24/1k chars on Creator tier. OpenAI is ~15× cheaper but the voice
quality difference is audible and works against Tabela's editorial register.

Synthesize kinds: day_overview and league_overview only.
Estimated ~260k chars/month (~$60 on Creator tier).

Revisit if: cost exceeds $120/month for three consecutive months.

### 2026-05-XX — Audio scope: overviews only (Phase 5)

Decision: Phase 5 synthesizes only day_overview and league_overview.
Match captions (too short) and match_summary (too numerous, ~$50+/month
extra for low listening value) are excluded. Phase 6 candidate.
```

**Verify:** `pnpm typecheck` clean. `ELEVENLABS_VOICE_ID` env var resolves.

---

## Commit 2 — `src/audio/pre-process.ts`

Prepares raw editorial text for synthesis. The function signature:

```typescript
export function preProcess(headline: string, body: string): string
```

Returns SSML-wrapped text ready for the ElevenLabs API
(`enable_ssml_parsing: true`).

**Steps in order:**

**1. Strip markdown.** The editorial body should be plain prose, but defensively
strip any markdown that leaked in:
- Remove `**bold**` / `*italic*` → keep the text, drop the markers.
- Remove `# headings` → keep the text.
- Remove `[link text](url)` → keep the link text.

**2. Expand abbreviations.** Apply a lookup table before synthesis:

| Input | Spoken form |
|-------|-------------|
| `0-0` | `nil-nil` |
| `1-0`, `2-0`, … | `one-nil`, `two-nil`, … |
| `0-1`, `0-2`, … | `nil-one`, `nil-two`, … |
| `N-M` (any score) | digit-by-digit via map, `N` → word, `-` → `-`, `M` → word |
| `VAR` | `V-A-R` |
| `PSG` | `Paris Saint-Germain` |
| `UEFA` | `U-E-F-A` |
| `FC` (at end of a club name, e.g. "Arsenal FC") | drop — "Arsenal FC" → "Arsenal" |
| `Jr.` | `Junior` |

Score expansion rule: any token matching `/^\d+-\d+$/` that is not a year
(i.e., both parts ≤ 20) gets converted. Use a helper `expandScore(token)`.
Numbers one through ten are written out; above ten use digits.

**3. Pronunciation override map.** An exported constant:

```typescript
export const PRONUNCIATION_OVERRIDES: Record<string, string> = {
  // Populated as we hear mistakes. Examples:
  // "Vinicius": "Vineecius",
  // "Mbappé": "Mbappay",
};
```

Apply as simple whole-word replacements (case-sensitive). Keep the map in the
file, not in env vars — pronunciation quirks are code-level concerns.

**4. Insert SSML paragraph breaks.** Split on `\n\n`. Between paragraphs, insert
`<break time="700ms"/>`. A sentence-final `.` followed by content at the end of
a paragraph does not need an extra break — the 700ms covers it.

**5. Wrap in `<speak>`.** The final output:

```xml
<speak>
HEADLINE.<break time="900ms"/>
PARAGRAPH_ONE<break time="700ms"/>
PARAGRAPH_TWO<break time="700ms"/>
…
</speak>
```

The headline gets a slightly longer break after it (900ms) to act as a natural
pause before the body begins.

**Tests (in the same file as inline `if (import.meta.url ===...)`—** no test
runner in Phase 5, just verify by running `tsx`:

```bash
tsx src/audio/pre-process.ts
# Should print the SSML output for a hardcoded sample.
```

**Verify:** `pnpm typecheck` clean.

---

## Commit 3 — `src/audio/synthesize.ts`

Wraps the ElevenLabs SDK. Returns a Buffer, nothing else.

```typescript
import { ElevenLabsClient } from "elevenlabs";
import type { SynthesisInput, SynthesisResult } from "./types";

export async function synthesize(input: SynthesisInput): Promise<SynthesisResult>
```

**Implementation notes:**

- Construct `ElevenLabsClient` with `{ apiKey: process.env.ELEVENLABS_API_KEY }`.
  Throw clearly if the key is absent.
- `voiceId` falls back to `process.env.ELEVENLABS_VOICE_ID`. Throw if that is
  also absent.
- Call `client.textToSpeech.convert(voiceId, { ... })` with:
  ```typescript
  {
    text: input.text,
    model_id: "eleven_multilingual_v2",
    enable_ssml_parsing: true,
    voice_settings: {
      stability: 0.45,        // slightly lower = more natural variation
      similarity_boost: 0.80,
    },
  }
  ```
- The SDK returns a `ReadableStream<Uint8Array>` (or `Readable` in Node). Collect
  it into a `Buffer` before returning. Use a simple async iterator:
  ```typescript
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) { chunks.push(chunk); }
  const buffer = Buffer.concat(chunks);
  ```
- Throw a descriptive `Error` on any API error (rate limit, invalid key, etc.)
  so the caller can log the editorial ID alongside it.
- Return `{ buffer, contentType: "audio/mpeg" }`.

**Verify:** `pnpm typecheck` clean. Manually test with a short string against
the real API key before wiring into the pipeline.

---

## Commit 4 — `src/audio/store.ts`

Uploads the mp3 buffer to Supabase Storage and writes the URL back to the
`editorials` row.

```typescript
import type { EditorialRef, SynthesisResult } from "./types";

export async function storeAudio(
  ref: EditorialRef,
  result: SynthesisResult,
): Promise<string>
// Returns the public URL. Throws on upload or DB update failure.
```

**Storage path:** `episodes/{date}/{kind}-{slug}.mp3`

- `day_overview` (slug is `""`): `episodes/2026-05-04/day_overview.mp3`
- `league_overview` for PL (slug is `"pl"`): `episodes/2026-05-04/league_overview-pl.mp3`

The slug portion is omitted (no trailing `-`) when slug is empty.

**Steps:**

1. Upload via `getServerClient()` (service role — the task runner has this key):
   ```typescript
   const { error } = await client.storage
     .from("episodes")
     .upload(storagePath, ref.buffer, {
       contentType: "audio/mpeg",
       upsert: true,   // re-running for a date replaces the file
     });
   ```
2. Derive the public URL:
   ```typescript
   const { data } = client.storage.from("episodes").getPublicUrl(storagePath);
   const publicUrl = data.publicUrl;
   ```
3. Update the editorial row:
   ```typescript
   await client
     .from("editorials")
     .update({ audio_url: publicUrl })
     .eq("id", ref.id);
   ```
4. Return `publicUrl`.

**Verify:** `pnpm typecheck` clean.

---

## Commit 5 — Pipeline integration in `src/trigger/daily-report.ts`

After each `day_overview` or `league_overview` editorial is persisted to the
database, synthesize its audio.

**Pattern (pseudo-code for each editorial):**

```typescript
// After the INSERT/UPSERT returns the editorial id:
if (editorial.kind === "day_overview" || editorial.kind === "league_overview") {
  try {
    const processed = preProcess(editorial.headline, editorial.body);
    const result = await synthesize({ text: processed });
    const url = await storeAudio({ id: editorial.id, date, kind: editorial.kind, slug: editorial.slug }, result);
    console.log(`Audio stored for ${editorial.kind} ${editorial.slug || "(day)"}: ${url}`);
  } catch (err) {
    // Non-fatal: the editorial is already published. Log with ID for resynthesize.ts.
    console.error(`Audio synthesis failed for editorial id=${editorial.id}:`, err);
  }
}
```

Key constraint: **audio synthesis must not block editorial publication.** If
ElevenLabs is down, editorials still publish with `audio_url = null`.

**Order of synthesis:** synthesize `league_overview`s first (one per league
after that league's block is processed), then `day_overview` last (it's
generated after all leagues have been summarised). This keeps synthesis
interleaved with the work already in flight rather than batching it at the end.

**Verify:** run `pnpm run-once --generate` against a real date. Confirm:
- At least one editorial row in the DB has a non-null `audio_url`.
- The URL is publicly accessible (curl it or open in browser).
- A synthesis failure on one editorial does not abort the task.

---

## Commit 6 — Website: wire AudioPlayer + retry script + ROADMAP.md

### Website wiring

The `<AudioPlayer>` component already accepts `audioUrl: string | null`. In
Phase 4B, it was always passed `null`. Now pass the real value from the
editorial row.

Check each page component that renders an `<AudioPlayer>`:

**Home page (`src/app/page.tsx`):**
```tsx
<AudioPlayer audioUrl={dayOverview?.audio_url ?? null} headline={...} />
```
League overview sections:
```tsx
<AudioPlayer audioUrl={leagueOverview?.audio_url ?? null} headline={...} />
```

**League page (`src/app/leagues/[slug]/page.tsx`):** same pattern for
`league_overview` audio.

If Phase 4B already passes `audio_url` through (it should — the column has
always been in the query), this commit may only require confirming the
field name (`audio_url` not `audioUrl`) is correct end-to-end. Verify in
the browser with a date that has audio.

### `scripts/resynthesize.ts`

Re-synthesizes editorials whose `audio_url` is null. Useful when ElevenLabs
has a flaky hour on a given day.

```
tsx --env-file=.env.local scripts/resynthesize.ts
tsx --env-file=.env.local scripts/resynthesize.ts -- --from 2026-05-01 --to 2026-05-04
tsx --env-file=.env.local scripts/resynthesize.ts -- --date 2026-05-04
```

**Logic:**
1. Parse `--from`, `--to`, `--date` args (default: yesterday).
2. Query `editorials` for rows where `audio_url IS NULL` and
   `kind IN ('day_overview', 'league_overview')` and `date` in the range.
3. For each, call `preProcess` → `synthesize` → `storeAudio`.
4. Log success/failure per row. Exit non-zero if any row failed.

Matches the CLI pattern already used by `scripts/backfill.ts`.

### ROADMAP.md

Tick all Phase 5 checkboxes. Mark Phase 5 ✅ DONE. Mark Phase 6 ← CURRENT.

### env.example

Uncomment the Phase 5 section (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID) — the
values were stubbed, just remove the comment markers.

**Verify:**
- `pnpm typecheck` clean.
- `pnpm lint` clean.
- Open the site. A day with completed synthesis: play button is active,
  audio plays.
- A day without audio: play button is visually present, disabled, no JS errors.
- `scripts/resynthesize.ts` finds nulls and fills them.

---

## Phase 5 "done when" criteria

- [ ] `pnpm typecheck` and `pnpm lint` clean
- [ ] `synthesize()` returns a valid mp3 buffer for a test string
- [ ] Daily task synthesizes day_overview and league_overview after persisting each
- [ ] Audio files appear in Supabase Storage at `episodes/{date}/…`
- [ ] `editorials.audio_url` is non-null for a synthesized row
- [ ] AudioPlayer on the site plays real audio for a date that has it
- [ ] AudioPlayer is visually present but dormant for dates without audio (no regression)
- [ ] `scripts/resynthesize.ts` re-fills missing audio for a given date range
- [ ] A synthesis failure does not abort or corrupt the editorial publish step
- [ ] `ELEVENLABS_VOICE_ID` is in `env.example` (not hardcoded in source)
- [ ] DECISIONS.md has entries for provider choice, voice choice, cost estimate

---

## What this plan defers

- **Match summary synthesis** — too expensive to justify at Phase 5 volume.
  Add in Phase 6 if user listening behaviour suggests value.
- **Signed (private) audio URLs** — the `episodes/` bucket is public-read.
  Switch to signed URLs in Phase 6 when/if auth is in place.
- **Per-league voice differentiation** — all leagues use the same voice.
  A different voice per league (e.g. Italian-accented for Serie A) is a polish
  item, not a Phase 5 concern.
- **Audio quality A/B testing** — voice and `stability`/`similarity_boost`
  settings are starting points. Tune after listening to real output.
