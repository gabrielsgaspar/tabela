# Tabela — End-to-End Verification Report

**Date:** 2026-05-04  
**Auditor:** Claude Sonnet 4.6  
**Package manager detected:** pnpm (via `pnpm-lock.yaml`)  
**Ground rule:** read-only throughout. No source files modified.

---

## Executive summary

This report was commissioned on the stated premise that "Phases 1 through 6 are complete." That premise is not accurate. The evidence shows that **only Phase 0 (documentation and design scaffolding) and partial skeleton work for Phases 1–2 have been implemented.** Phases 3–6 have detailed plans but no executable code.

As a result, most of the eight verification layers cannot be exercised against a live system — there is no live pipeline, no data in the database, and no website beyond a single-word placeholder. The report records this accurately rather than fabricating findings.

This is not a code-quality crisis. The planning documents are thorough, the type definitions are well-crafted, and the prompt engineering is strong. The gap is between planned and built.

---

## Layer 1 — Sanity check

### Typecheck

| Check | Status | Evidence |
|-------|--------|----------|
| `pnpm typecheck` | ✅ pass | Exits 0. `tsc --noEmit` reports no errors. |

### Build

| Check | Status | Evidence |
|-------|--------|----------|
| `pnpm build` | ✅ pass | Next.js 16.2.4 (Turbopack) builds cleanly. Routes: `/` (static) and `/_not-found`. No warnings. |

### Lint

| Check | Status | Evidence |
|-------|--------|----------|
| `pnpm lint` | ❌ fail | `next lint` was removed from the Next.js CLI in v16. Every invocation exits with: `Invalid project directory provided, no such directory: …/tabela/lint`. The `lint` script has been broken since the Next.js 16.x install. |

**What went wrong:** `DECISIONS.md` notes that pnpm resolved Next.js 16.x when the plan expected 15.x. The `next lint` subcommand was removed in that upgrade. `eslint-config-next` is still installed and the config would work if called via `./node_modules/.bin/eslint src/` directly, but the documented `pnpm lint` command never succeeds.

**Suggested fix:** Update the `lint` script in `package.json` to `eslint src/` (or `eslint src/ --ext .ts,.tsx`), which works with the installed `eslint-config-next`. This is a one-line change.

### Git status

| Check | Status | Evidence |
|-------|--------|----------|
| Uncommitted changes | ⚠️ partial | `git status` shows 2 modified files (`.gitignore`, `README.md`) and 20+ untracked files — including all source code, docs, config, and the entire `src/` tree. Nothing beyond the initial commit has been committed. |
| Recent history | ⚠️ partial | One commit: `6c0c06a Initial commit`. That commit is a fork of the F1 race report repo. All Tabela-specific work exists only as untracked/unstaged files. |

No debug prints, test files, or commented-out blocks were found. The code quality of the files that do exist is high.

### Package scripts

| Script | Status | Note |
|--------|--------|------|
| `dev` | ✅ exists | `next dev` — correct |
| `build` | ✅ exists | `next build` — correct |
| `typecheck` | ✅ exists | `tsc --noEmit` — correct |
| `lint` | ❌ broken | `next lint` removed in Next.js 16 — always fails |
| `trigger:dev` | ✅ exists | `npx trigger.dev@latest dev` — correct syntax, but `src/trigger/` does not exist |
| `run-once` | ❌ broken | References `scripts/run-once.ts` — **file does not exist** |
| `backfill` | ❌ broken | References `scripts/backfill.ts` — **file does not exist** |

### Missing dependency

`@anthropic-ai/sdk` is **not listed in `package.json`**. The editorial generation pipeline in `src/editorial/prompts.ts` explicitly requires it (comment at line 6: "generate.ts passes them directly to client.messages.create()"). Phase 2 cannot work without it being installed.

---

## Layer 2 — Walk the data backwards

❌ **Cannot execute.**

**Reason:** The Supabase database (project `ksmgtrbgrvqfhiijqsyd`, region `eu-central-1`, status `ACTIVE_HEALTHY`) has **zero tables in the public schema**. No migrations have been applied (`supabase/migrations/` directory does not exist; `list_migrations` returns `[]`). There are no `match_days`, `season_stats`, or `editorials` rows to trace.

**Verification query run:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Result: [] (empty)
```

**Storage buckets:** Zero buckets created. The `episodes/` bucket described in `DATA.md` does not exist.

**Impact:** All editorial traceability, factual grounding, and audio URL checks are blocked. This is the highest-severity structural gap in the system.

---

## Layer 3 — Voice audit

❌ **Cannot execute — no editorials in the database.**

**Partial assessment from static analysis of `src/editorial/prompts.ts`:**

The prompt engineering is genuinely strong and closely mirrors `VOICE.md`:

- The `VOICE_BLOCK` system prompt (lines 67–103) is marked `cache_control: ephemeral`, correctly amortising the cost of a static block across ~50 caption calls per run.
- The no-invention rule is stated three times in increasing specificity, covering goalscorers, goal minutes, sequences, substitutions, cards, injuries, xG, table positions, and historical streaks — all the failure modes `VOICE.md` warns against.
- The format-specific blocks correctly enforce length targets (15–25 words for captions, 2–3 paragraphs for summaries, 3–5 paragraphs for overviews).
- The worked example in the comment at line 230 is instructive and correct — it shows both an acceptable and a banned caption for the same input.

**Structural voice gap (already flagged in `AUDIT.md` as EQ-1):**  
The `buildLeagueOverviewPrompt` and `buildDayOverviewPrompt` functions receive results and top scorers but **no standings data**. The prompt explicitly tells Claude not to reference table positions because the data isn't available. This means overviews cannot produce the contextual sentences that define the VOICE.md register ("the gap from second to fifth had narrowed to four points"). The prompts will generate competent but unanchored prose. This is a known structural ceiling, not an oversight.

**Voice scoring against VOICE.md criteria (for prompts, not live output):**

| Dimension | Score | Notes |
|-----------|-------|-------|
| No-invention guardrails | 5/5 | Exhaustive, specific, repeated |
| Voice principle coverage | 4/5 | All six principles reflected; "allusive memory" limited by data |
| Tonal don't-list coverage | 5/5 | All banned phrases, adjectives, and hedges listed explicitly |
| Format compliance | 5/5 | All four formats covered with correct length targets |
| Structural data completeness | 2/5 | Missing standings = unanchored overviews |

---

## Layer 4 — Scheduled run health

❌ **No task exists to check.**

| Check | Status | Evidence |
|-------|--------|----------|
| `trigger.config.ts` exists | ✅ | File present with `project: "tabela"`, `dirs: ["./src/trigger"]`, `maxDuration: 300` |
| `src/trigger/` directory exists | ❌ | Directory does not exist. `find src/trigger` → no such path. |
| Daily task defined | ❌ | No `.ts` files under `src/trigger/`. No cron schedule is attached to anything. |
| Trigger.dev dashboard run history | ⏭️ could not verify | No programmatic API access. With no task defined, there are no runs to inspect. |

**Configuration note:** `trigger.config.ts` configures `retries.default.maxAttempts: 3` with exponential backoff — correct for a data pipeline. `maxDuration: 300` is set. The `AUDIT.md` notes this may be tight on busy matchdays (REL-5); that risk is real but downstream of the task needing to exist first.

**Missing env vars for Trigger.dev:**  
`.env.local` contains no `TRIGGER_SECRET_KEY` or `TRIGGER_PROJECT_REF` values. Even when the task is built, `pnpm trigger:dev` will fail without these.

**Where to look in the Trigger.dev UI when this is built:**  
Navigate to `app.trigger.dev → [project] → Runs`. Filter by task name (`daily-report` or whatever it will be called). The 7-day run history shows success/failure status, duration, and per-run logs. Each log line to look for: one `[PL]`, `[PD]`, `[BL1]`, `[SA]`, `[FL1]` fetch line; one `editorial generated` line per match; one `audio stored` line per overview; a `run complete` final line.

---

## Layer 5 — Failure mode tour

❌ **Cannot execute — no pipeline scripts or trigger tasks exist.**

`scripts/run-once.ts` is referenced in `package.json` but does not exist. There is nothing to run under a modified environment.

**For each of the four scenarios, here is what the expected behaviour should be (for verification when the pipeline exists):**

1. **`FOOTBALL_DATA_TOKEN=invalid`** — Expected: each of the five leagues logs a fetch failure with the HTTP status code; no partial rows written to `match_days`; task exits with a logged error, not a silent success.

2. **`ANTHROPIC_API_KEY=invalid`** — Expected: `match_days` and `season_stats` rows populate (data pipeline independent of editorial generation); `editorials` gets zero new rows for today; each failed editorial logs the league code and date alongside the auth error.

3. **`ELEVENLABS_API_KEY=invalid`** — Expected: editorials persist with `audio_url = null`; ElevenLabs failure logged with editorial ID; website renders without an audio player (or renders a dormant player — `AUDIT.md` VP-2 flags this state as a UI gap). Note: `ELEVENLABS_API_KEY` is currently absent from `.env.local`, so this simulation is the system's current real state.

4. **Idempotency re-run** — Expected: second run for the same date produces no additional rows (match_days uses a unique constraint on `(date, league_code)`; editorials uses `(date, league_code, kind)`). Confirm via `SELECT count(*) FROM match_days WHERE date = '...'` before and after.

All four scenarios are currently in the "planned but unverifiable" state.

---

## Layer 6 — Browser-side checks

⏭️ **No headless browser available in this environment. Manual checks required.**

**What to verify manually (exact steps):**

### Network / 4xx audit
1. Open `[NEXT_PUBLIC_APP_URL]` (the deployed site URL from `.env.local`) in Chrome DevTools → Network tab.
2. Look for any 4xx or 5xx responses. Currently the site is a single placeholder page (`<main>Tabela</main>`), so there should be none — but confirm.
3. Routes `/teams/*`, `/leagues/*`, and `/listen` currently return 404s because those pages haven't been built yet.

### Secret key exposure
Run this against the deployed site's JS bundles — this is the highest-priority browser check:
```bash
# After loading the page, download all JS chunks and search:
curl -s [APP_URL] | grep -oE 'src="[^"]+\.js"' | xargs -I{} curl -s {} | grep -E 'sb_secret_|sk-ant-'
```
Expected: zero hits. Based on static code analysis, this should pass — `SUPABASE_SERVICE_ROLE_KEY` is not exposed with a `NEXT_PUBLIC_` prefix and `DECISIONS.md` explicitly records that the service role key is never set in Vercel.

### Supabase key check
All client-side Supabase requests should use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key). There is currently no Supabase client in any source file (none has been built yet), so this cannot be tested.

### Lighthouse
Run Lighthouse on the home page. Currently the page is a placeholder with a single serif string — it will score well on performance and best practices trivially. Re-run Lighthouse after Phase 4 website is built against the real content pages.

### Audio player
⏭️ No audio player exists in the current code. The `globals.css` has `.audio-track` and `.audio-fill` style classes stubbed in anticipation of Phase 5, but no `<AudioPlayer>` component has been built.

### Console errors / hydration warnings
Open the browser console on the home page. No React hydration warnings are expected for a server-rendered placeholder with no interactive state.

---

## Layer 7 — Security pass

| Check | Status | Evidence |
|-------|--------|----------|
| Secrets in git history | ✅ pass | `git log --all -p` scanned for `sb_secret_`, `sk-ant-`, `ANTHROPIC_API_KEY=`, `FOOTBALL_DATA_TOKEN=`, `ELEVENLABS_API_KEY=` — zero hits. |
| Tracked `.env` files | ✅ pass | `git ls-files \| grep '\.env'` — no output. No env files are tracked. |
| `.env.local` gitignored | ✅ pass | `git check-ignore .env.local` confirms the file is ignored. |
| `NEXT_PUBLIC_` prefix on service keys | ✅ pass | `.env.local` exposes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — both safe to expose per Supabase's own model. `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` carry no `NEXT_PUBLIC_` prefix. |
| `next.config.ts` — no key exposure | ✅ pass | `next.config.ts` contains only `images.remotePatterns` for `crests.football-data.org`. No `env:` block that could propagate secrets. |
| Service role key client isolation | ✅ pass (structural) | `src/lib/supabase.ts` does not exist yet, so there is no client to audit. The architecture decision (DECISIONS.md 2026-05-04) records: service role key never set in Vercel; anon key for all website reads. Verify the import graph when `supabase.ts` is built. |
| Vercel env var scoping | ⏭️ could not verify | No Vercel CLI available. Manual check: open Vercel → Settings → Environment Variables. Confirm `SUPABASE_SERVICE_ROLE_KEY` is absent (per the DECISIONS.md intent) and `ANTHROPIC_API_KEY` is scoped to Preview/Production only, not exposed to browser. |

**Missing env vars (not a security finding, but a functionality blocker):**

Comparing `.env.example` to `.env.local`, the following required vars are absent from `.env.local`:

| Variable | Required for | Status |
|----------|-------------|--------|
| `FOOTBALL_DATA_TOKEN` | Phase 1 data fetch | ❌ missing |
| `TRIGGER_SECRET_KEY` | Trigger.dev task auth | ❌ missing |
| `TRIGGER_PROJECT_REF` | Trigger.dev project link | ❌ missing |
| `SUPABASE_DB_URL` | Supabase CLI push | ❌ missing |
| `SUPABASE_PROJECT_REF` | `pnpm supabase:link` | ❌ missing |
| `ELEVENLABS_API_KEY` | Phase 5 audio synthesis | ❌ missing |
| `ELEVENLABS_VOICE_ID` | Phase 5 voice selection | ❌ missing |

Two non-standard vars (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`) are present in `.env.local` but not defined in `env.example`. These should be documented.

---

## Layer 8 — Outsider readiness

**First 30 seconds on the current live site:**

Navigating to the site presents a white-paper-toned page (`#FAF7F2` background, correct) with the single word **"Tabela"** in a large serif font. That is everything on the page.

What is clear: the name. The typography is excellent — Newsreader at display size reads immediately as editorial rather than app.

What is unclear: everything else. There is no explanation of what Tabela is, no navigation, no date, no football content, no call to action. A first-time visitor has no affordance to explore and no reason to return. The "morning paper for European football" promise from the `<title>` tag is not visible on the page.

What I would click first: nothing, because nothing is clickable.

What I'd expect to find that isn't there: at minimum, today's date, the five league logos, and at least one match result. The design reference in `claude_design/Tabela.html` is richly detailed — masthead, league filter row, match cards, narrative overview, audio player, stat leaders, race watch, follow-a-team CTA. None of this exists in the built site.

**Dead ends:** All routes except `/` return a Next.js 404. `/leagues/pl`, `/teams/arsenal`, `/listen` — all 404.

**Confusing states:** The page title (`<title>Tabela — The morning paper for European football</title>`) sets a promise that the page itself does not keep. This is fine in development; it would be jarring to a real user sent a link.

**Summary:** The site in its current state is a typography test, not a product. The design reference and the planning documents show a fully conceived product. The gap between the two is Phase 1 through Phase 6 of implementation.

---

## Fix list

The findings below are ranked by severity (high → low) then by effort (S → L). Items are scoped to what blocks progress right now — not the full `AUDIT.md` list, which is downstream of the pipeline existing.

| Severity | Effort | Layer | Issue | Recommendation |
|----------|--------|-------|-------|----------------|
| **high** | XS | 1 | `@anthropic-ai/sdk` not installed | `pnpm add @anthropic-ai/sdk`. Without it Phase 2 cannot be built or typechecked against the real SDK interface. |
| **high** | XS | 1 | `pnpm lint` always fails (Next.js 16 removed `next lint`) | Change `"lint"` script in `package.json` to `"eslint src/ --ext .ts,.tsx"`. Then verify the ESLint config resolves (it should — `eslint-config-next` is installed). |
| **high** | S | 1 | `scripts/run-once.ts` and `scripts/backfill.ts` missing | These are referenced in `package.json` but don't exist. Build them as part of Phase 1 so `pnpm run-once` works for local testing. |
| **high** | S | 7 | Missing env vars block all pipeline phases | Add `FOOTBALL_DATA_TOKEN`, `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`, `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` to `.env.local`. Without these no phase can run. |
| **high** | M | 2 | Supabase has zero tables — no schema migrations exist | Create the `supabase/migrations/` directory. Write and push the initial migration defining `match_days`, `season_stats`, `editorials`, and `teams_followed` (per `DATA.md` schema sketch). This unblocks Phase 3 and everything downstream. |
| **high** | M | 4 | `src/trigger/` directory absent — no scheduled task | Build `src/trigger/daily-report.ts` (the core Phase 1 deliverable). This is the heart of the system; nothing else in Phases 2–6 can be verified without it. |
| **high** | L | 1 | Phase 1 football client not built | `src/football/client.ts` with `getMatches`, `getStandings`, `getScorers` and correct rate-limit handling (10 req/min) does not exist. Prerequisite for the trigger task. |
| **med** | S | 1 | All current work is uncommitted | 20+ untracked files. Commit the scaffolding so git history reflects project progress and the initial commit is not the only reference point. |
| **med** | S | 1 | `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_APP_NAME` not in `env.example` | Add them to `env.example` so any new developer knows what to fill in. |
| **low** | S | 6 | Home page is a placeholder | Once Phase 3 data exists, wire `src/app/page.tsx` to read from Supabase and render the design-reference layout. Currently `page.tsx` is three lines. |

---

## Top 5 to fix first

These five unblock everything else in sequence:

### 1. Install `@anthropic-ai/sdk` and fix the lint script (Layer 1 — effort XS)
Both are one-liners. The SDK is needed before Phase 2 code can be written or typechecked against the real interface. The broken lint script means CLAUDE.md's "run `pnpm lint` before declaring a task done" instruction cannot be followed. Fix both before writing any new code.

### 2. Fill in the missing env vars (Layer 7 — effort S)
Without `FOOTBALL_DATA_TOKEN` there is no data. Without `TRIGGER_SECRET_KEY` there is no scheduling. Without `ELEVENLABS_API_KEY` there is no audio. These are blockers for every phase. Get the keys from their respective dashboards and add them to `.env.local`.

### 3. Build `src/football/client.ts` and `scripts/run-once.ts` (Layer 1 + 5 — effort M)
This is Phase 1's core deliverable and the entry point for all testing. `run-once.ts` lets you validate the data pipeline locally without deploying to Trigger.dev. Once it produces clean JSON from Football-Data.org, all downstream phases have a foundation to build on.

### 4. Create the Supabase schema (Layer 2 — effort M)
Write the migration and run `pnpm supabase:push`. Once the tables exist, the data walk (Layer 2), voice audit (Layer 3), and failure mode tour (Layer 5) all become executable. The schema is fully specified in `DATA.md` — it is a translation task, not a design task.

### 5. Build `src/trigger/daily-report.ts` (Layer 4 — effort L)
This is the single file that makes Tabela an automated system rather than a collection of types and prompts. It glues together the football client, the editorial generation layer, Supabase persistence, and (later) audio synthesis. Once it runs once against a real date, the product is provably end-to-end.

---

*This report covers the system as observed on 2026-05-04. No source files were modified during the audit.*
