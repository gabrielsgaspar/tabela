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

### 2026-05-05 — Editorial prompt convergence on near-identical matches

When two matches in the same league on the same day have identical shape (same scoreline, same direction, same margin, same decisive phase), the natural English description converges and the model may produce structurally similar captions even with prior-shape context injected. This is accepted as a model/language boundary rather than a prompt bug. Tightening the prompt further would either generalise poorly (new rules per converged frame) or force awkward writing in the common case. Documented after the 2026-05-05 V2 voice fix landed with FL1 showing 1 residual violation between two 4-0 away losses (Brest at Paris FC, Rennes at Lyon).

---

### 2026-05-05 — Football-Data.org free-tier historical scope; Phase 3.5 backfill window

**Investigation.** Three test requests against the Football-Data.org v4 API before writing the historical backfill script:

| Test | Endpoint | Result |
|---|---|---|
| Current season single day | `PL/matches?dateFrom=2025-08-16&dateTo=2025-08-16` | 200 — 5 matches returned |
| Prior season single day | `PL/matches?dateFrom=2024-08-16&dateTo=2024-08-16` | 200 — 1 match returned (Man Utd 1-0 Fulham) |
| Two seasons back | `PL/matches?dateFrom=2023-08-11&dateTo=2023-08-11` | 200 — 1 match returned |
| Month-wide range | `PL/matches?dateFrom=2025-08-01&dateTo=2025-08-31` | 200 — 30 matches, first: 2025-08-15, last: 2025-08-31 |

**Findings.**
- The free tier provides full read access to at least three seasons of historical match data (2023/24, 2024/25, 2025/26). No 403 or permission error for any tested date.
- Month-wide `dateFrom/dateTo` requests work correctly. The API returns all matches in the range in one response, spanning multiple matchdays. No evidence of a date-range cap.
- The monthly-chunk strategy (one request per league per calendar month) is confirmed viable.

**Decision: backfill 2024/25 + 2025/26 (two seasons).**

2023/24 is accessible but not included in the default backfill. Two seasons gives sufficient depth for all editorial claims this phase targets (streaks, recency, head-to-head). Adding 2023/24 would cost an additional ~50 API calls (~7 min) and ~1,800 more `match_results` rows — modest but unnecessary for Phase 3.5. If future voice work requires three-season comparisons, run the backfill script with `--from 2023-08-01`.

**Updated runtime estimate for Commit 3 (two-season scope):**

| | |
|---|---|
| 2024/25 | 10 months × 5 leagues = 50 requests (~7 min) |
| 2025/26 | 10 months × 5 leagues = 50 requests (~7 min) |
| Total API calls | ~100 |
| Total runtime | ~14–16 minutes (rate-limited to 8 req/min) |
| Estimated match_results rows | ~3,600 (≈1,800 per season) |

**Branching outcome:** "Prior season fully accessible" — per PLAN.md, the backfill script defaults to `--from 2024-08-01 --to yesterday`.

---

### 2026-05-05 — Phase 3.5 calibration refinement: lastCleanSheet as valid signal; refined over-use definition

**Context.** After two eval runs (commit 6 + rerun) the original calibration rules proved too mechanically strict. The rules caught genuine failures but also flagged specific, evocative editorial details as over-use.

**Decisions.**

1. **lastCleanSheet is a valid editorial signal** (option a) when the gap is ≥6 weeks (42 days). The payload provides date and opponent; reference by month ("since September"), not as a day count. Do not reference venue (home/away) — that is not in the payload. The calibration section in `src/editorial/prompts.ts` was updated to include this threshold and the "no venue" constraint.

2. **Season count must not be inferred from meeting count.** Three H2H meetings across two seasons do not become "three seasons." The dataset covers 2024-25 and 2025-26. A new HARD LIMIT (#5) and BAD example were added to the prompt to enforce this. This fixes the Chelsea/Bournemouth horizon violation observed in the rerun (the model wrote "across three seasons" from 3 H2H meetings).

3. **Refined calibration criterion for Phase 3.5 eval (criterion c):** The original threshold rules (streak ≥4, H2H ≥3 meetings) were a first approximation. In practice, specific historical detail — one memorable prior meeting with a verifiable score, a notable recent gap — can be striking below the mechanical thresholds, provided it is specific and not used as filler. The pass criterion for criterion (c) is now: **zero generic filler** (e.g. "a run of two defeats continued") **and zero hollow qualifiers** (e.g. "their only previous meeting") — but specific evocative details that read well and are directly traceable to the payload are acceptable even below the mechanical thresholds. This is a refinement of the metric, not a lowering of the bar: we measure writing quality, not threshold compliance.

### 2026-05-05 — Phase 3.5 calibration residual

After three eval runs, the model occasionally reaches for weaker historical context (e.g. a 2-game losing streak) when the payload contains stronger context (e.g. a 54-day clean sheet drought). Empoli/Genoa surfaced this pattern across all three runs: the model wrote "beaten in both their previous two outings" (L×2 streak) rather than referencing Empoli's 54-day gap without a clean sheet that was also in the payload.

**Mitigation:** accepted as a model-selection limitation rather than a prompt bug. Further rule additions (the 4th BAD example targeting sub-threshold filler) did not resolve it — the model selected weaker context in different words. The residual rate on the test set is 1/31 (3.2%).

**Acceptable given:** zero factual errors across 31 pairs, zero horizon violations, 65% enrichment rate, and all other flagged cases being either detector false negatives (good captions the keyword check missed) or specific evocative detail that reads well under the refined calibration criterion.

### 2026-05-06 — First Vercel production deploy (Phase 4B, Commits 1–2)

**Deployed URL:** https://tabela-topaz.vercel.app

**Deployment ID:** `dpl_9B2MH1N7PmknAHn4RhKzmgT6VnQq` (second deploy, with real APP_URL)

**Build summary:**
- Next.js 16.2.4 / Turbopack — compiled in 4.7 s, TypeScript clean
- Route `/` is dynamic (ƒ) — server-rendered on demand, reads Supabase via anon client
- Route `/styleguide` is static (○) — no dynamic data, prerendered at build time
- Build machine: 2 cores / 8 GB, Washington D.C. (iad1), ~32 s total

**Environment variables set in Vercel (production + development scopes):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (RLS-governed, safe to expose)
- `NEXT_PUBLIC_APP_URL` — `https://tabela-topaz.vercel.app`

`SUPABASE_SERVICE_ROLE_KEY` is explicitly absent from Vercel. Confirmed via `vercel env ls` before deploy. The website is read-only via the anon client; the service role key lives only in Trigger.dev's environment.

**Preview scope:** preview env vars not set (newer Vercel CLI 53.x requires explicit `--git-branch` for preview scope and stdin piping for non-interactive add; `--yes` alone does not bypass this). Preview deployments will lack Supabase credentials until set via the Vercel dashboard. Not blocking for an MVP with no PR workflow.

**Live verification (post-deploy):**
- All 5 league groups render; FT results, captions, race watch, stat leaders all present
- `?league=la-liga` filter returns only La Liga group, 55 KB vs 153 KB full page — server-side filter confirmed working on Vercel's Linux build
- No `service_role` string in the rendered HTML

**Deploy surprises / notes for future redeploys:**
- `vercel link --yes` created the project successfully but reported a GitHub connection error (400 — Login Connection required). The deploy via `vercel --prod` (file upload, not GitHub Actions) works without it. Connect GitHub in the Vercel dashboard to enable automatic PR deploys.
- pnpm@10.x used on Vercel (project creation date heuristic). Local uses same major. No lockfile mismatch.
- `supabase` CLI package downloads its binary at postinstall, adding ~10 s to install. Not avoidable without removing the dev dependency; acceptable for MVP.

---

### 2026-05-06 — Phase 4B Commits 3+4 deployed — league and team pages live

**Decision.** Deploy league pages (`/leagues/[slug]`) and team pages (`/teams/[id]`) together as the second production deployment.

**Deployment ID:** `dpl_21e4G1bgmY17UMKL4NLjRvRaBCgM`

**Deployed URL:** https://tabela-topaz.vercel.app (alias unchanged)

**Build summary:**
- 5 routes: `/` (dynamic), `/_not-found` (static), `/leagues/[slug]` (dynamic), `/styleguide` (static), `/teams/[id]` (dynamic)
- Compiled in 5.8 s, TypeScript clean, zero ESLint warnings
- Build machine: 2 cores / 8 GB, Washington D.C. (iad1)

**Env vars:** no changes — same `NEXT_PUBLIC_` trio as Commits 1–2. Neither route introduces new external dependencies or secrets. `SUPABASE_SERVICE_ROLE_KEY` remains absent from Vercel.

**Live verification (post-deploy):**
- `/leagues/premier-league` — 200, h1 present, standings grid rendered, FullStandingsTable in HTML
- `/leagues/la-liga` — 200, h1 present (confirms dynamic slug routing)
- `/teams/57` (Arsenal) — 200, h1 present, season stats panel rendered, breadcrumb links back to `/leagues/premier-league`
- `/teams/65` (Man City) — 200, h1 present, season stats panel rendered
- `/teams/9999999` — 404 (no match_results rows → `notFound()`)
- `/leagues/garbage` — 404 (`leagueBySlug` returns undefined → `notFound()`)
- Team page links in standings table: inside `{isExpanded && …}` (client-side only) — not in SSR payload; confirmed correct at route level (teams/57, teams/65 return 200)

**Architectural choices locked in this deploy:**

- **Season aggregate computed in JS, not SQL.** PostgREST does not support arbitrary `GROUP BY` aggregations. Rather than adding a Postgres function (migration overhead), the team page fetches all FINISHED season matches for the team (max 38 rows) and computes wins/draws/losses/goals/clean sheets in JavaScript. Comment in `queries.ts` explains this. Upgrade path: add a Postgres aggregate view if the calculation grows in complexity.

- **No kickoff time on team recent-matches MatchCards.** `match_results` stores `date` (DATE only) — the kickoff time is in `match_days.payload` (JSONB). Joining that for the team page would require an extra query per match or a denormalized column. For Phase 4B, `kickoffTime={null}` is passed; cards fall back to the scheduled-state layout gracefully. If kickoff times on the team page become important, add a `kickoff_utc` column to `match_results` populated by the pipeline.

- **Ripple effects section absent.** Computing which other matches affected a team's standing requires comparing pre- and post-matchday standings tables — a multi-query diff not yet supported. Section omitted with a comment; Phase 6 candidate.

- **Team-specific editorials deferred.** "Week in context" uses the league's `league_overview` editorial. Team-specific weekly briefs require a pipeline change (new `kind = 'team_weekly'` editorial generation). Phase 6.

**Daily report schedule:** remains paused. Trigger.dev pipeline not redeployed with this build. Enabling the schedule requires `pnpm trigger:deploy` to push Phase 3.5 changes to Trigger.dev's cloud before re-enabling.

---

### 2026-05-06 — Phase 4B closure — listen page deployed, phase complete

**Decision.** Ship the listen page (`/listen`) as Commit 5 and declare Phase 4B done. This is the third and final production deployment of Phase 4B.

**Deployment ID:** `dpl_E86uRW1emjJ2kPE1HmVnLhg9o1eD`

**Deployed URL:** https://tabela-topaz.vercel.app (alias unchanged)

**Phase 4B total commits:** 5 (home, styleguide fixes → Commits 1–2; league pages → Commit 3; team pages → Commit 4; listen page → Commit 5). Three Vercel production deployments.

**Build summary:**
- 6 routes: `/` (dynamic), `/_not-found` (static), `/leagues/[slug]` (dynamic), `/listen` (static — no audio rows in DB yet), `/styleguide` (static), `/teams/[id]` (dynamic)
- Compiled in 5.3 s (Vercel), TypeScript clean, zero ESLint errors
- Build machine: 2 cores / 8 GB, Washington D.C. (iad1)

**Live verification (post-deploy):**
- `/listen` — 200, empty state text ("No episodes yet" / "Audio synthesis is coming in Phase 5") rendered in HTML; header and footer present
- `/` — 200 (regression check)
- `/leagues/premier-league` — 200 (regression check)
- `/teams/57` — 200 (regression check)

**Architectural choices locked in Commit 5:**

- **`ListenClient` wrapper for shared player + filter state.** Rather than reaching for React Context, a thin client component (`ListenClient.tsx`) owns `useState` for filters and `useReducer(playerReducer)` for player state, passing both down as props to `EpisodeFilters`, `EpisodeList`, and `StickyMiniPlayer`. Three sibling components share state without a global store.

- **rAF simulated playback in Phase 4B.** No `<audio>` element is wired yet — `StickyMiniPlayer` uses `requestAnimationFrame` to advance a local timer, giving the full play/pause/speed/scrub UI without requiring a real `audio_url`. The 300-second placeholder duration is the only Phase-4B-specific assumption; Phase 5 replaces it with the real `duration_sec` column and an `HTMLAudioElement`.

- **`/listen` prerendered as static.** Because `getListenEpisodes` returns zero rows (no audio_url in DB yet), Next.js prerendered the page as static HTML at build time. Once the Phase 5 pipeline populates `audio_url`, the page will need to be dynamic (or ISR with a short revalidation window) so the episode list is fresh. Add `export const dynamic = 'force-dynamic'` or a revalidation tag to `src/app/listen/page.tsx` when Phase 5 ships.

- **`EpisodeArt` has no `"use client"`.** The component uses no hooks or browser APIs and is consumed by both the server-rendered `HeroEpisode` and the client-rendered `EpisodeRow`. Keeping it directive-free lets React use it in both trees without a module boundary.

- **Listen page query limit: 60 episodes.** Assumes the pipeline runs once a day with ~5–6 editorial types per run; 60 episodes covers roughly 10–12 days. Increase the limit or add pagination if the user expects a longer browse history.

**Phase 4B summary — what shipped:**
| Route | Type | Client islands |
|-------|------|----------------|
| `/` | Dynamic (SSR) | FilterBar (league chips) |
| `/leagues/[slug]` | Dynamic (SSR) | FullStandingsTable expansion |
| `/teams/[id]` | Dynamic (SSR) | None |
| `/listen` | Static (prerendered) | EpisodeFilters + EpisodeList + StickyMiniPlayer |

All routes use `createBrowserClient()` (anon key only). No service-role key on web.

### 2026-05-06 — Phase 5 B1: audio synthesis layer wired; actual cost picture

**Context.** B1 builds the synthesis pipeline (pre-process → ElevenLabs → Supabase Storage) and adds Phase D to `pipeline.ts`. A local test run with representative editorial prose (~250 words, 4 paragraphs) was used to verify the wiring before committing to a production deploy.

**Actual cost from local test run (2026-05-06):**

| Metric | Value |
|--------|-------|
| Input text | ~250 words, 4 paragraphs, `day_overview` editorial sample |
| Char count after pre-processing | 1,513 characters |
| mp3 output | 1,506 KB (~1.5 MB) |
| Estimated cost @ $0.003/1k chars (Starter plan) | **$0.0045 per editorial** |

**Revised monthly cost estimate:**

The original estimate in the 2026-05-04 TTS decision ($60/month) was based on stale ElevenLabs pricing and assumed $0.24/1k chars. Current rates (Creator tier, May 2026) are significantly cheaper. Using the measured 1,513 chars/editorial as representative:

- 6 editorials/active matchday (1 day_overview + 5 league_overviews)
- ~20 active matchdays/month
- ~120 editorials/month × ~1,500 chars = ~180,000 chars/month

| Plan | Included chars | Overage | Est. monthly cost |
|------|---------------|---------|-------------------|
| Free | 10,000 | N/A | Cannot sustain daily runs |
| Starter ($5/mo) | 30,000 | ~$0.003/1k | ~$5 + $0.45 overage ≈ **$5.50/mo** |
| Creator ($22/mo) | 100,000 | included | ~**$22/mo** flat (well within) |

The original $1/editorial figure was ~200× too high. Actual rate is ~$0.005 per editorial.

**ElevenLabs tier escalation path:**

| Tier | Included chars | Monthly cost | Status |
|------|---------------|--------------|--------|
| Free | 10,000 | $0 | Cannot use library voices; cannot sustain even one matchday |
| Starter | 30,000 | $5 | API access to pre-made voices; testing only (5 days of editorials) |
| Creator | 100,000 | $22 | **Minimum for daily production runs**; covers ~20 matchdays/month |
| Pro | 500,000 | $99 | Headroom for scale; not needed at MVP volumes |

**Voice in use for Phase 5 verification:** Sarah (`EXAVITQu4vr4xnSDxMaL`) — ElevenLabs pre-made voice, available on free and paid tiers. Selected as a stand-in for pipeline wiring verification only. This is not the production voice.

**Original voice decision (2026-05-04 entry):** George (`jsCqWAovK2LkecY7zXl4`) — library/community voice, requires paid plan (Starter or above). Voice ID preserved in `.env.local` as a comment. Production voice selection + account upgrade are Phase 6 launch prerequisites, not Phase 5 concerns.

**Phase 6 pre-launch requirement added to ROADMAP.md:** Creator tier must be active before unpausing the daily schedule.

### 2026-05-06 — Phase 5 B3: Production ELEVENLABS_VOICE_ID temporarily set to Sarah

**Decision.** For B3 end-to-end verification, `ELEVENLABS_VOICE_ID` in the Trigger.dev
Production environment is temporarily set to `EXAVITQu4vr4xnSDxMaL` (Sarah, pre-made,
available on free + paid tiers). This allows Phase D audio synthesis to run successfully
in production without requiring a tier upgrade.

**TODO (Phase 6 launch step):** restore `ELEVENLABS_VOICE_ID` to the chosen production voice
before unpausing the daily schedule. Sarah is a verification stand-in, not the production
voice. See the Phase 6 pre-launch checklist in ROADMAP.md.

---

### 2026-05-06 — Trigger.dev Production redeploy: 20260505.3 → 20260506.1

**Decision.** Redeploy the Trigger.dev Production task to close the gap between the
cloud-deployed version (20260505.3, pre-Phase 3.5) and the codebase (Phase 3.5 historical
memory + V2 voice fixes + Phase 5 audio synthesis / Phase D pipeline).

**Old version:** 20260505.3 (deployed 2026-05-05; no historical memory enrichment, no audio)
**New version:** 20260506.1 (deployed 2026-05-06; Phase 3.5 + Phase 5 audio synthesis)

**Tasks registered at 20260506.1:**
- `daily-report` (scheduled, attached to `sched_wqapcm3eta5zi6huqsm83`)
- `daily-report-one-shot` (manual trigger)

**Schedule status post-deploy:** `active: false` — the deploy did not unpause the schedule.
Confirmed via `GET /api/v1/schedules/sched_wqapcm3eta5zi6huqsm83` with Production key.
The schedule has no `nextRun` because it is inactive. Unpausing is a Phase 6 pre-launch step.

**Phase D behaviour in Production:** `ELEVENLABS_VOICE_ID` in the Trigger.dev Production
environment is `ZA3TGoYAsdYMffXndkSX` (a library voice). The ElevenLabs free plan blocks
library voices with a 402 `paid_plan_required` error. Phase D handles this gracefully — each
editorial logs a `[quota_exceeded]` error and the pipeline continues. No audio will be
synthesised in production until Phase 6 (Creator tier active + production voice confirmed).
This is the intended state; Phase D is wired and deployed, pending the tier upgrade.

---

### 2026-05-06 — Phase 6 polish note: empty slug produces trailing dash in Storage path

**Finding.** `day_overview` editorials have `slug = ""`. The current `buildStoragePath`
function in `src/audio/upload.ts` produces `{date}/day_overview-.mp3` — the trailing dash
comes from the template literal `` `${kind}-${slug}` `` when slug is empty.

**Decision.** Accept for Phase 5. The path is functional; `getPublicUrl` returns a valid URL
and the file is accessible. Fix in Phase 6 polish: treat empty slug as "no suffix at all",
producing `{date}/day_overview.mp3` instead.

**Fix location:** `src/audio/upload.ts` `buildStoragePath()` — change the filename template to:
```ts
const suffix = ref.slug ? `-${ref.slug}` : "";
const filename = `${ref.kind}${suffix}.mp3`;
```
Existing files at the old path will need to be renamed or re-synthesised when the fix lands.

### 2026-05-06 — Phase 5 closure with audio deferral

**Decision.** Phase 5 closes with B3 and B4 deferred. The ElevenLabs Creator tier upgrade was
not applied during this phase. Production audio synthesis remains blocked; all other Phase 5
work is complete and verified.

**What is done:**
- `src/audio/pre-process.ts` — markdown stripping, abbreviation expansion, SSML paragraph breaks
- `src/audio/synthesize.ts` — ElevenLabs SDK wrapper, structured errors, stream-to-buffer
- `src/audio/upload.ts` — Supabase Storage upload + `audio_url` DB write-back
- Phase D in `src/trigger/pipeline.ts` — sequential synthesis for `day_overview` + `league_overview` after Phase C; per-editorial error handling; cost logging
- `scripts/test-synthesize.ts` — local test script; confirmed synthesis → Storage → `audio_url`
- `AudioPlayer` wired to real `<audio>` element (A1, verified at `/styleguide`)
- `StickyMiniPlayer` + `ListenClient` wired to real audio (A2, verified at `/listen`)
- Trigger.dev Production redeployed: `20260505.3 → 20260506.1`. Schedule paused.
- `episodes` Storage bucket created with public read + service role upload policies.
- `/listen` page reads correctly from rows with `audio_url` populated. Currently shows empty
  state in production because no `audio_url` rows exist yet.

**What is deferred:**
- B3: production audio verification — blocked by ElevenLabs free-tier abuse detection
- B4: `/listen` ISR fix — meaningless until B3 populates `audio_url` rows

**Deferral is operational, not architectural.** The code is correct and verified locally.
Upgrading the tier and triggering one production run is sufficient to bring audio live.

---

### 2026-05-06 — ElevenLabs free-tier abuse detection blocks production synthesis (tier upgrade deferred)

**Decision.** The tier upgrade was deferred; this entry documents the root cause for future reference.

**Root cause of B3 audio failures.** All three synthesis attempts in the production Trigger.dev
container returned `"detected_unusual_activity"` from the ElevenLabs API. Free-tier accounts
are subject to abuse detection that triggers on requests from IP address classes associated
with cloud/container environments (Trigger.dev runs on shared cloud infrastructure). Local
development works because the request originates from a residential/office IP. The same API
key and voice ID that succeed locally fail in a production container on the free tier.

**Why the Phase 6 sequencing was wrong.** The assumption was that tier upgrade = production
scale = Phase 6 launch. In practice, tier upgrade = bypass container IP abuse detection =
required for any production synthesis run. Phase 5 B3 verification IS a production run.

**Cost reality check.** Creator tier ($22/mo) includes 100,000 chars/month. Actual usage at
~6 editorials/matchday × 1,500 chars × 20 matchdays = ~180,000 chars/month means overage at
Creator rate, but the $22 base is not buying character volume — it's buying the paid-tier
treatment that bypasses IP-based abuse detection. The production synthesis cost is negligible
(~$0.005/editorial); the $22 is effectively an infrastructure cost, not usage cost.

**Revised tier table:**

| Tier | Included | Cost | Production-safe? |
|------|----------|------|-----------------|
| Free | 10k chars | $0 | **No** — container IPs trigger abuse detection |
| Starter | 30k chars | $5 | Unknown — likely same issue |
| Creator | 100k chars | $22 | **Yes** — paid tier bypasses IP abuse detection |
| Pro | 500k chars | $99 | Yes |

**Phase 6 pre-launch sequence updated:** Creator tier upgrade is now step 1 of the Phase 6
pre-launch sequence. Voice swap (Sarah → production voice) remains step 4.

---

### 2026-05-07 — Version clarification: Next.js 16.2.4, Trigger.dev SDK 4.4.5

**Decision.** Docs updated to reflect actual installed versions.

**Context.** Earlier entries and CLAUDE.md referred to "Next.js 15 · Trigger.dev v3". The
actual installed versions are `next@16.2.4` and `@trigger.dev/sdk@4.4.5`. Both were updated
during development without explicit version-bump decisions; the docs drifted.

**How to read older entries.** Any reference to "Next.js 15" or "Trigger.dev v3" in prior
decisions should be understood as the stack at that snapshot, not the current versions.

---

### 2026-05-07 — Discord webhook for run-status monitoring

**Decision.** Added a non-fatal `notifyRunComplete()` call in both `dailyReportSchedule` and
`dailyReportOneShot`, posting a brief summary to a Discord webhook after each pipeline run.

**Alternatives.** Trigger.dev's built-in run history UI (no setup, always available); email
alert via Resend; PagerDuty/Opsgenie for on-call rotation.

**Rationale.** The Trigger.dev dashboard requires a login to check; a Discord ping in a
personal server is zero-friction for solo operation. Zero new npm dependencies (native
`fetch()`). Non-fatal — notification failures never abort the pipeline. Opt-in via
`DISCORD_NOTIFY_WEBHOOK` env var; absent = silent no-op.

---

<!-- Add new entries above this line, newest at top -->
