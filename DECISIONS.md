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

<!-- Add new entries above this line, newest at top -->
