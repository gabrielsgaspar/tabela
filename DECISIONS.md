# DECISIONS.md

Append-only log of architectural decisions. Each entry: date, decision, alternatives considered, rationale.

Don't edit old entries — if a decision is reversed, add a new entry referencing the old one.

---

### 2026-05-03 — Project name: **Tabela**

**Decision.** The product is called Tabela.

**Alternatives.** Clean Sheet, The Ninetieth, Backheel, Stoppage, Eleven.

**Rationale.** *Tabela* in Portuguese means both the league table and the give-and-go pass between two players — a clean double meaning that captures both halves of what the site does (standings and the connections between results). Short, distinctive, easy logo, bilingual nod without being inaccessible.

---

### 2026-05-03 — Stack: Next.js + Trigger.dev in a single project

**Decision.** Single Next.js 15 project. Trigger.dev v3 tasks live alongside in `src/trigger/`.

**Alternatives.** Monorepo with separate apps for web and scheduler. Two separate repos.

**Rationale.** Trigger.dev v3 integrates cleanly with Next.js. Single project = one install, one deploy target, less yak-shaving for an MVP. We can split later if it ever becomes worth it. Probably won't.

---

### 2026-05-03 — Data source for MVP: Football-Data.org

**Decision.** Football-Data.org free tier for the five leagues (PL, PD, BL1, SA, FL1).

**Alternatives.** API-Football (RapidAPI) — richer but rate-limited free tier. SportMonks/Sportradar — paid.

**Rationale.** Free, no credit card, covers exactly the leagues we need. Limitations (no goalscorer events on free tier, no shot/xG data) are acceptable for MVP. If/when those limitations bite, migration target is API-Football. Document the trigger event for the migration when it happens.

---

### 2026-05-03 — Design direction: editorial newspaper

**Decision.** Visual style is editorial newspaper, not sports-app dashboard. Reference assets in `claude_design/`.

**Alternatives.** FotMob/SofaScore-style data density. ESPN-style tabloid energy.

**Rationale.** Tabela's value isn't real-time scoreboards — it's the writing and the connections between results. The visual language should support reading, not glancing. Big serif headlines, tight sans body, generous whitespace, restrained colour palette (paper, ink, pitch-green, mustard accent).

---

### 2026-05-03 — Storage: Supabase (Phase 3+)

**Decision.** Supabase Postgres for structured data, Supabase Storage for audio files.

**Alternatives.** Plain Postgres on Railway/Fly. Vercel Postgres. SQLite + S3.

**Rationale.** Free tier covers the MVP. Auth, database, and storage all in one. Future "follow a team" feature gets auth for free. Vercel deploy lives next door cleanly.

---

### 2026-05-04 — Next.js App Router + Tailwind v4

**Decision.** Next.js App Router with React 19. Tailwind v4 (`@tailwindcss/postcss`) — CSS-first, no `tailwind.config.ts`. Tokens defined once in `src/app/globals.css` `@theme` block.

**Alternatives.** Pages Router (no longer recommended for new projects). Tailwind v3 (still valid, but v4 is stable and the CSS-first approach is a better fit for the token system).

**Rationale.** App Router server components minimise JS sent to the browser — important for a reading-focused editorial site. Tailwind v4 `@theme` maps directly to CSS variables, eliminating the dual-maintenance problem of keeping `tailwind.config.ts` and `globals.css` in sync. `src/lib/tokens.ts` exports the same values as TypeScript constants for code that cannot use Tailwind or CSS variables (SVG props, inline styles).

**Note.** pnpm resolved Next.js 16.x and React 19 (latest at time of install). The plan referenced Next.js 15 as the expected version; 16.x is App Router with the same patterns, no breaking changes for this use case.

---

### 2026-05-04 — Anon client for all website reads; service role key not in Vercel

**Decision.** `getBrowserClient()` (anon key) used for all server component Supabase reads on the website. The service role key is never set as a Vercel environment variable.

**Rationale.** The website is read-only. RLS `SELECT` policies on `match_days`, `season_stats`, and `editorials` are sufficient. Keeping the service role key out of Vercel prevents it from reaching any client-side code path, even accidentally. The two `NEXT_PUBLIC_` vars (URL and anon key) are safe to expose.

---

### 2026-05-04 — TTS provider: ElevenLabs; voice: George

**Decision.** ElevenLabs for text-to-speech synthesis. SDK: `@elevenlabs/elevenlabs-js`
(the `elevenlabs` npm package was deprecated at the time of install and redirects here).
Model: `eleven_multilingual_v2`. Voice: **George** (`jsCqWAovK2LkecY7zXl4`) —
warm, measured, British-accented.

**Alternatives.** OpenAI TTS (`tts-1-hd`, voices: alloy / onyx) at ~$0.015/1k chars
vs ElevenLabs Creator tier at ~$0.24/1k chars overage — roughly 15× cheaper. OpenAI
voices are functional but identifiably AI in a way that works against Tabela's
editorial register. For a product whose value proposition is voice and craft, the
quality premium is justified at Phase 5 volumes.

**Cost estimate.** Synthesise `day_overview` (1/day) and `league_overview` (5/day) only.
~13,000 chars per active matchday × ~20 active days/month = ~260,000 chars/month.
ElevenLabs Creator tier (~$22/month base + ~$38 overage) ≈ **$60/month**.

**Revisit threshold.** If monthly synthesis cost exceeds $120 for three consecutive
months: downgrade to `eleven_turbo_v2_5`, restrict to `day_overview` only, or
switch to OpenAI TTS. Document the change here with the reason.

---

### 2026-05-04 — Audio scope: day_overview and league_overview only (Phase 5)

**Decision.** Phase 5 synthesises only `day_overview` and `league_overview` editorials.
Match captions (15–25 words — too short) and `match_summary` (~50/day —
high volume, marginal listening value) are excluded.

**Rationale.** Keeps Phase 5 cost manageable and focuses audio on the pieces users
are most likely to listen to end-to-end. Match summary synthesis is a Phase 6
candidate if usage data suggests demand.

---

### 2026-05-04 — Phase 1 free-tier data audit (Football-Data.org)

**Finding.** `pnpm run-once -- --date 2026-05-03` fetched 19 finished matches across all
five leagues (PL 3, PD 4, BL1 3, SA 4, FL1 5) with zero errors.

**What IS available on the free tier:**
- Final scores and half-time scores for all finished matches.
- `score.winner` ("HOME_TEAM" / "AWAY_TEAM" / "DRAW") and `score.duration`
  ("REGULAR" / "EXTRA_TIME" / "PENALTY_SHOOTOUT") — useful for edge cases.
- Season-to-date top scorers (goals, assists, penalties, playedMatches) via
  `/competitions/{code}/scorers`. Assists are present for most scorers; `null`
  only when none have been credited.
- `penalties` sub-total in the scorer entry (how many of their goals were pens).
- Basic team and player metadata (names, crest URLs, nationality).

**What is NOT available on the free tier (confirmed):**
- Per-match goalscorer events — no who-scored-when data at the match level.
- Substitutions, cards, or injuries.
- Granular match stats (shots, xG, possession).
- Detailed player stats beyond the season-total scorer list.

**Impact on prompts:** the VOICE_BLOCK no-invention rule in `src/editorial/prompts.ts`
already accounts for this — goalscorers and match events are explicitly banned.
No change to the prompt layer required.

**Migration trigger:** if goalscorer event data becomes essential for the editorial
quality bar, the migration target is API-Football (RapidAPI), as noted in the
original data-source decision (2026-05-03). Document the trigger event at that time.

---

### 2026-05-04 — Claude API concurrency: sequential leagues in Phase B

**Decision.** In `src/trigger/pipeline.ts` Phase B, leagues are processed sequentially
(`for...of`) rather than in parallel (`Promise.all`). Captions *within* a single league
remain parallel.

**Background.** Initial implementation wrapped all five league editorial jobs in a single
`Promise.all`. On a day with matches in all leagues, this generates roughly 25 concurrent
caption calls (≈5 per league × 5 leagues) plus 5 league overview calls — all firing at
once. Each call consumes ≈800 tokens of input, putting the burst at ≈24k tokens. At the
Claude Sonnet API org ceiling of **30k tokens per minute**, headroom is marginal and any
variation in match count pushed the run into 429 errors. The first 7-day backfill produced
four editorial failures from this cause.

**Fix.** Sequential outer loop: one league finishes all its captions (`Promise.all` within)
before the next league starts. Per-league burst: ≈4 captions × 800 tokens ≈ 3 200 tokens.
Well within budget with no rate-limit errors observed after the change.

**Alternatives considered.** Adding an explicit per-call sleep delay; chunking the
`Promise.all` with a semaphore. Both add complexity with no benefit over the sequential
approach, because leagues are a natural ordering boundary and the football API throttle
(10 req/min) already imposes a 6+ second wait between league fetches in Phase A.

**Revisit threshold.** If the org Claude token limit increases above 60k tokens/min, it is
safe to reintroduce `Promise.all` across leagues. Document and benchmark before doing so.

---

### 2026-05-05 — Trigger.dev attached schedules are not visible in /api/v1/schedules

**Finding.** Schedules defined in code via `schedules.task({ cron: "..." })` are "attached schedules" — they are deployed as part of a task version and managed through the Trigger.dev dashboard environment, not the `/api/v1/schedules` REST endpoint. That endpoint only lists detached schedules created programmatically via `POST /api/v1/schedules`. Querying it for a code-defined schedule will always return `count: 0`, which is expected, not a missing-registration error.

**Correct endpoint.** To verify an attached schedule exists, query the per-environment schedule directly:
```
GET /api/v1/schedules/{scheduleId}
```
or list all schedules for the environment using the same endpoint with the production key. The schedule ID is visible in the Trigger.dev dashboard and in the `/api/v1/schedules` response once you have the ID. To deactivate: `POST /api/v1/schedules/{scheduleId}/deactivate`.

**Impact.** No code change needed. Documents the correct verification workflow for future deploys.

---

### 2026-05-05 — Docker credential helper required for pnpm trigger:deploy

**Decision.** `pnpm trigger:deploy` (Trigger.dev cloud build via Depot) requires a working Docker credential configuration. On macOS with Docker Desktop not running, the default `~/.docker/config.json` contains `"credsStore": "desktop"` which references `docker-credential-desktop` — a binary only present when Docker Desktop is active. Without it, the Depot build fails at the image resolution step.

**Workaround for local deploys.** Set `DOCKER_CONFIG` to a directory containing a minimal `config.json` with no `credsStore`:
```bash
mkdir -p /tmp/trigger-docker-config && echo '{"auths":{}}' > /tmp/trigger-docker-config/config.json
DOCKER_CONFIG=/tmp/trigger-docker-config pnpm trigger:deploy
```

**For CI.** Either start Docker Desktop before the deploy step, or set `DOCKER_CONFIG` in the CI environment to a path with a clean config (no `credsStore`). Do not rely on `docker-credential-desktop` being available in headless environments.

**Alternatives considered.** Permanently editing `~/.docker/config.json` to remove `credsStore` — rejected because it breaks all other Docker operations on the same machine.

---

### 2026-05-05 — Few-shot examples in editorial prompts must use placeholder entities, never real ones

**Decision.** All worked examples in `src/editorial/prompts.ts` that illustrate caption shapes, voice principles, or bad patterns must use abstract placeholders (`[Team A]`, `[Team B]`, `[Player]`, `[N]`, `[score]`) — never real team names, player names, venue names, or specific matchday numbers.

**Rationale.** Surfaced by the V2 test loop on 2026-04-26: the shape 5 example used "Six goals shared at Le Havre on matchday 31". The real match on that date was Le Havre 4–4 FC Metz on matchday 31 — the model reproduced the example verbatim, outputting "Six goals shared" for a match that produced eight goals. Same class of error confirmed in three other shape examples (shapes 1, 3, 4) where the example teams happened to match the real fixture; the model reproduced the example text nearly verbatim, bypassing the no-invention rule entirely.

The mechanism: when a few-shot example contains entity names that appear in the current match input, the model can pattern-match on those names and regurgitate the example text as if it were generated output. The no-invention guardrail does not catch this because the model does not register it as invention.

**Fix applied.** All seven locations with real entities in prompt examples updated to placeholders in commit following VOICE_V2_TEST_REPORT_V2.md. A NOTE was added to the shape examples block in the caption format prompt explicitly warning that placeholders are structural illustrations only, not fill-in-the-blank templates.

**Rule.** Any future addition of worked examples to any prompt in `src/editorial/prompts.ts` must use placeholders. If a concrete example is needed for clarity, use teams from a fictional league not among the five covered leagues.

---

<!-- Add new entries above this line, newest at top -->
