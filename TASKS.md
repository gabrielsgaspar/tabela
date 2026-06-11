# TASKS.md

Actionable task list to take Tabela from its current state (Phase 7: PL + CL,
broadcast pipeline, single shared editorial) to the product described in
[EXPANSION.md](./EXPANSION.md) (PL/CL/EL, accounts, personalized spoiler-safe
briefings, engagement + metrics).

Tasks are grouped by the expansion's workstreams (WS0–WS7) and ordered by the
build sequence in EXPANSION.md §11. Each workstream must pass its acceptance
criteria **and** `pnpm typecheck && pnpm lint` before the next begins. Per
`CLAUDE.md`, **write a `PLAN.md` and get approval before coding each new phase.**

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked / needs decision

---

## Reconciliation notes (read before starting — these reconcile EXPANSION.md with the real repo)

EXPANSION.md was written against an assumed layout that differs from disk in a
few places. Resolve these first so we don't build duplicates:

- **`config.ts` vs `leagues.ts`.** The expansion (R3) wants a single source of
  truth at `src/lib/config.ts` exporting `COMPETITIONS`. The repo already has
  `src/lib/leagues.ts` with `LeagueCode = "PL" | "CL"` and `LEAGUES`/`LEAGUE_META`/
  `LEAGUE_NAMES`. **Decision needed:** extend `leagues.ts` in place (preferred —
  it's already the single source) or create `config.ts` and migrate. Do **not**
  end up with both. This task list assumes we extend `leagues.ts` and re-export
  the expansion's `COMPETITIONS` shape from it.
- **`editorials` table vs `user_briefing`.** Today briefings are shared rows in
  `editorials`/`match_days`/`season_stats`/`match_results` (see `supabase/migrations/`).
  The expansion introduces per-user `user_briefing`. Keep the existing tables for
  the shared pipeline; `user_briefing` is additive.
- **`src/editorial/` filenames.** The expansion references `prompts.ts` and a
  generation pipeline; on disk these are `src/editorial/prompts.ts`,
  `generate.ts`, `team-history.ts`. New files (`watchability.ts`, personalized
  prompt builder) are additive.
- **`src/lib/spoiler.ts`, `src/lib/users.ts`, `src/lib/config.ts`** do not exist
  yet — they are net-new in the expansion.
- **EL is not confirmed on the free tier.** The repo is currently PL + CL only
  (`LeagueCode = "PL" | "CL"`). Adding EL is gated on the §0.2 blocking probe
  below. Until resolved, build everything to be competition-set-driven but launch
  with PL + CL.

---

## WS-PRE — Pre-coding checklist (EXPANSION.md §12 — do this FIRST)

- [ ] Re-read `CLAUDE.md`, `DATA.md`, `DECISIONS.md`, `ROADMAP.md`, `VOICE.md`,
      `PLAN.md` and confirm nothing in EXPANSION.md contradicts them; flag conflicts
      rather than silently diverging.
- [!] **BLOCKING:** probe `GET /competitions/CL` and `GET /competitions/EL` with the
      live token (`scripts/probe-cl.ts` exists for CL; add an EL probe). Record the
      EL outcome in `DECISIONS.md`. If EL is **not** free-tier: drop EL from launch
      scope (proceed PL + CL) **or** record the API-Football migration decision. Do
      not hardcode EL support that silently returns empty (R2 / §10.4).
- [ ] Confirm Supabase Auth (email magic-link) is enabled on the project.
- [ ] Confirm ElevenLabs + Claude rate limits / budget for per-user fan-out (WS3).
      If per-user audio is too costly at scale, plan to generate audio **lazily on
      first reveal**; record the decision in `DECISIONS.md`.
- [ ] Resolve the `config.ts` vs `leagues.ts` reconciliation note above and record
      the choice in `DECISIONS.md`.
- [ ] Write `PLAN.md` for the first workstream (WS0) and get approval.

---

## WS0 — Scope refactor + data-layer foundation

**Goal:** competition set driven by one config; fetch upcoming fixtures; graceful
per-competition degradation.

- [x] Define the canonical competition set as the single source of truth.
      **Chose to extend `src/lib/leagues.ts`** (not a new `config.ts`) — added
      `kind: "league" | "cup"`, exported `COMPETITIONS` + `competitionKind()`.
      `LeagueCode`/`LEAGUES` stay in `football-types.ts`. (DECISIONS.md 2026-06-04.)
      Launch set = PL + CL (EL only if the §0.2 probe passes).
- [x] No hardcoded scope array outside the registry; grep clean for dropped codes.
- [x] `src/football/client.ts`: `getMatches`/`getStandings` kept as-is.
- [x] `src/football/client.ts`: added `getUpcomingMatches(code, dateFrom, dateTo)`
      (`status=SCHEDULED,TIMED`), typed to the existing `MatchesResponse` shape.
- [x] Existing 10-req/min throttle reused (≤9 requests/run budget holds).
- [x] `src/trigger/pipeline.ts`: Phase A catch now emits a structured
      `[fetch_partial_failure] league=… date=… reason=…` line (degradation already
      existed). The `event`-row insert is deferred to WS7 (table doesn't exist yet).
- [x] Website rendering already shows only PL + CL (unchanged this round).

**Acceptance:**
- [x] `tsc --noEmit` and `eslint src/` pass (run directly; corepack pnpm 11 trips
      on build-script approval, unrelated to these changes).
- [!] `scripts/run-once.ts` dry run — **maintainer** (needs a real `FOOTBALL_DATA_TOKEN`).
- [x] Forced-throw degradation verified by code review (live run needs a token).
- [x] Grep: no `"PD"`/`"BL1"`/`"SA"`/`"FL1"` in `src/`.
- [x] `scripts/probe-el.ts` added (+ `pnpm probe:el`); lints clean. **Maintainer**
      runs it to resolve the EL §0.2 blocking question and records it in DECISIONS.md.

---

## WS1 — Accounts and preferences

**Goal:** identity + stored preferences to personalize and attribute events.

- [x] Migration `supabase/migrations/0004_accounts.sql` creating `app_user`,
      `follow`, `user_prefs` per EXPANSION.md §3.1.
- [x] RLS policies: owner-only read/write via `auth.uid()`; service role bypasses;
      `GRANT`s to the `authenticated` role; `user_prefs` `updated_at` trigger.
- [x] Supersede `teams_followed` with `follow` (old table left in place + NOTICE;
      no auto data-migration — FK to `app_user`. DECISIONS.md 2026-06-04).
- [x] `src/lib/users.ts` — `getUserContext(db, userId)` returning timezone, follows
      (competitions/teams), prefs, + `effectiveCompetitions` cold-start guard.
- [x] `src/lib/database.types.ts` — three tables hand-added (regen after apply).
- [x] `@supabase/ssr@0.10.3` installed (`corepack pnpm add`).
- [x] `0004_accounts.sql` applied to cloud DB via Supabase MCP (2026-06-05);
      tables + RLS verified; `database.types.ts` regenerated from live schema.
- [x] `0005_harden_set_updated_at_search_path.sql` applied via MCP; advisor clear.
- [x] `@supabase/ssr` clients (`src/lib/auth/{env,server,client}.ts`) + `src/proxy.ts`
      session refresh (Next 16 `middleware` → `proxy`).
- [x] Auth pages: `/sign-in` (magic link), `/auth/callback` (PKCE), `/auth/sign-out` (POST).
- [x] Onboarding (`/onboarding`) → writes `app_user` + `user_prefs` + competition
      `follow` rows; auto-detects timezone. (`next build` green.) Team-follow picker
      deferred to settings.
- [!] **Maintainer:** enable email magic-link Auth in the Supabase dashboard (+ site/redirect URL),
      then runtime-verify sign-in → onboard → rows created.

**Acceptance:**
- [x] `tsc --noEmit` + `eslint src/` pass (DB layer + helper).
- [ ] New user signs in, onboards → exactly one `app_user` + one `user_prefs` + ≥1 `follow` (after auth UI lands).
- [x] RLS verified via MCP `pg_policies`: all 11 policies owner-only
      (`auth.uid() = id`/`user_id`) — user A cannot read user B's rows. Full
      behavioral test pending magic-link enable.
- [x] `getUserContext` is typed; cold-start guard defaults follow-nothing → all in-scope competitions.

---

## WS2 — Spoiler-safe delivery layer (blocks all briefings)

**Goal:** make R1 structurally enforced.

- [ ] Define the `Briefing` content contract (TS type) per §4.1
      (`spoiler_free_title`, `teaser`, `body_revealed`, `audio_url?`, `reveal_required`).
- [ ] `src/lib/spoiler.ts` exporting `assertSpoilerFree(text): void` — throws on
      score patterns (`/\b\d+\s*[-–:]\s*\d+\b/`), aggregate phrasing, and a
      configurable banned-phrase list (e.g. "comeback win", "thrashing", "knocked out").
- [ ] Unit tests for `spoiler.ts` with positive/negative fixtures.
- [ ] Reveal-on-tap UI component: feed/list + notifications show only
      `spoiler_free_title` + `teaser`; `body_revealed`/audio load on explicit
      "Show results" tap, or immediately if `user_prefs.spoiler_mode = 'show'`.
- [ ] `spoiler_mode` toggle in settings.
- [ ] Notification/email/OG/`<title>` construction reads **only** spoiler-free fields.
- [ ] Wire `assertSpoilerFree` into briefing-generation output validation.
- [ ] Add a CI check that fails if any notification/OG template interpolates `body_revealed`.

**Acceptance:**
- [ ] `assertSpoilerFree("Arsenal 2-0 Brighton")` throws; `assertSpoilerFree("Arsenal's morning catch-up")` does not.
- [ ] Integration test: a generated briefing's notification payload + OG tags contain no score substring.
- [ ] Manual: `spoiler_mode='hide'` hides scores until tap; `'show'` reveals immediately.

---

## WS3 — Personalized spoiler-safe morning recap (Pivot 1 — core product)

**Goal:** per-user "here's what you missed", text + audio, delivered at the user's
local time, results hidden by default.

- [ ] Migration: `user_briefing` table per §5.1 (`unique (user_id, date, kind)`).
- [ ] Personalized prompt builder in `src/editorial/` (variant of `prompts.ts`)
      taking `getUserContext` + that day's matches + latest `season_stats`,
      producing the `Briefing` contract. **Reference `VOICE.md`.**
- [ ] Enforce length cap: ≤200 words text / ≤3 min audio.
- [ ] Personalization order: followed teams → followed competitions → one-line "elsewhere".
- [ ] R2 facts-only: allowed = final scores, PL table movement, CL/EL advancement/
      elimination, season top-scorer standings. No invented scorers/minutes.
- [ ] **Generation guard (WS3.4):** post-generation, verify every team/scoreline in
      `body_revealed` maps to a real match in that day's data; if not, regenerate
      once, then fail loudly with a `generation_rejected` event.
- [ ] `spoiler_free_title` + `teaser` pass `assertSpoilerFree`.
- [ ] Per-user fan-out Trigger.dev task in `src/trigger/`, batched/chunked to respect
      Claude + ElevenLabs rate limits and cost.
- [ ] Audio of `body_revealed` via `src/audio/`; store at `briefings/{user_id}/{date}/{kind}.mp3`.
- [ ] Delivery: schedule notification at each user's `briefing_local_time` (UTC→local);
      payload uses spoiler-free fields only.

**Acceptance:**
- [ ] Seeded user following PL + Arsenal → `morning_recap` row for the date, ≤200 words,
      audio present, linter passes on title/teaser.
- [ ] Guard test: injected hallucinated scoreline → rejected + `generation_rejected` logged.
- [ ] User following only CL → recap mentions only CL (no PL).

**Non-goals:** no live in-match updates, no per-minute goal feed, no social features.

---

## WS7 (partial) — Event tracking + funnel (so WS3 is measurable day one)

- [ ] Migration: `event` table per §8.1 (`user_id` nullable, `name`, `props jsonb`, `created_at`).
- [ ] Emit canonical events only (no ad-hoc names): `onboarding_completed`,
      `briefing_sent`, `briefing_opened`, `briefing_revealed`, `audio_started`,
      `audio_completed`, `preview_opened`, `notif_enabled`, `notif_disabled`,
      `follow_added`, `follow_removed`, `caught_up_marked`, `fetch_partial_failure`,
      `generation_rejected`.
- [ ] Gate `user_id`-attributed events on `analytics_consent = true`; otherwise log
      anonymized (null user_id) rows.
- [ ] Instrument the WS3 funnel: `briefing_sent → briefing_opened → briefing_revealed → audio_completed`.

**Acceptance:**
- [ ] Consent on → full-funnel events appear for a seeded user; consent off → same
      actions log null-user rows only.

---

## WS5 — European Nights digest (new-CL-format use case)

**Goal:** turn a chaotic CL/EL night into one spoiler-safe `euro_night` briefing.

- [ ] Detection in the daily task: if the covered date had ≥4 finished CL **or** EL
      matches, generate a `euro_night` briefing (reuses `user_briefing`).
- [ ] `body_revealed` structure: one-line-per-match rundown ordered by watchability
      (reuse WS4 scoring retro-applied), then a short "what it means for table/bracket"
      close. Scores hidden until reveal.
- [ ] Personalization: lead with the user's followed teams' matches; collapse the rest.
- [ ] Length cap: ≤250 words / audio ≤3.5 min.

**Acceptance:**
- [ ] Seeded 9-match CL date → `euro_night` generated, lists all 9, leads with followed
      team, within caps, linter passes.
- [ ] 1-match date → **no** `euro_night` (threshold works).

---

## WS4 — Forward-looking "what's worth watching" preview (Pivot 2)

**Goal:** pre-weekend (PL) / pre-matchday (CL/EL) anticipation briefing.

- [ ] `src/editorial/watchability.ts`: transparent 0–100 heuristic from free-tier data
      — stakes (PL table proximity; CL/EL round weight + live qualification), form
      (last-5 points from stored history), followed-team boost, optional rivalry/marquee
      static table. Output score + one-line reason per fixture.
- [ ] `preview` briefing kind reusing `user_briefing` + the same delivery path;
      scheduled Friday morning (PL) and the morning before each CL/EL matchday.
- [ ] Run `assertSpoilerFree` on output even though it's forward-looking.
- [ ] Optional: "add to calendar" / kickoff time rendered in the user's timezone.

**Acceptance:**
- [ ] Seeded upcoming fixtures + standings → stable ranked list with reason strings;
      unit-tested on obvious high/low-stakes fixtures.
- [ ] A `preview` renders the top 3 fixtures with kickoff times in the user's timezone.

---

## WS6 — Engagement + data layer (transparency + consent)

**Goal:** minimum behavioral data under R4/R6 — personalize, measure, re-engage.

- [ ] "You're caught up" state after reveal/finish; log `caught_up_marked`. **No**
      streaks, infinite feeds, or variable-reward mechanics (§10.2).
- [ ] Disciplined re-engagement: a user with no `briefing_opened` in 7 days gets **one**
      spoiler-free nudge referencing a followed team's upcoming fixture; hard cap one
      per 14 days; respect `notif_daily=false` + OS opt-out.
- [ ] Transparency settings screen: what data is stored and why, with one-tap export
      and delete (cascades). Surface in-product when personalization changes the briefing.
- [ ] Consent: analytics off by default; prompt once, non-dark-pattern (no pre-checked
      boxes, equal-weight accept/decline). Gate all attributed events on it.

**Acceptance:**
- [ ] Re-engagement fires at most once / 14 days / user and never includes a score
      (linter on payload).
- [ ] Data export returns JSON of all the user's rows; delete removes + cascades.

---

## WS7 (full) — Measurement + instrumentation

**Goal:** make "did it work" answerable.

- [ ] Scheduled task writing `metrics_daily`: retention D1/D7/D30 (cohorted by
      `onboarded_at`), per-kind funnel (sent→opened→revealed/audio_completed),
      notification health (opt-out, re-engagement open rate), pipeline health
      (`fetch_partial_failure` rate, `generation_rejected` rate, cost/run Claude + ElevenLabs).
- [ ] Auth-gated `/admin/metrics` page rendering the table + funnel.
- [ ] Each §9.2 target has a computed field so it's checkable, not eyeballed
      (D7 ≥25%, recap open ≥35%, reveal/finish ≥50%, opt-out ≤20%, `generation_rejected` ≤2%).

**Acceptance:**
- [ ] `metrics_daily` populates nightly; `/admin/metrics` renders table + funnel.

---

## CARRIED-OVER OPS — Phase 6 pre-launch sequence (retargeted PL + CL)

These were never executed before the Phase 7 re-scope and remain valid
(ROADMAP.md Phase 6/7). They are maintainer-owned (need credentials/spend) and
should run after the CL backfill, before/with the live schedule.

- [ ] Provide secrets in `.env.local`; run `scripts/probe-cl.ts`, then the CL backfill.
- [ ] ElevenLabs Creator tier upgrade (~$22/mo) — bypasses free-tier IP abuse detection.
- [ ] Production voice swap: `ELEVENLABS_VOICE_ID` Sarah → Adam (`jsCqWAovK2LkecY7zXl4`);
      set `DISCORD_NOTIFY_WEBHOOK` at the same time.
- [ ] Phase 5 B3: production audio one-shot; confirm `audio_url` populated; curl one
      mp3 for `200 audio/mpeg`.
- [ ] Phase 5 B4: `/listen` ISR fix (`export const revalidate = 3600`), remove dev-only
      test block, fix empty-state copy, redeploy, confirm real episodes live.
- [ ] Unpause daily schedule `sched_wqapcm3eta5zi6huqsm83` only after the above verify.

---

## Cross-cutting invariants (apply to every task — treat violations as build failures)

- **R1** Spoiler safety is structural (WS2 linter guards all pre-reveal surfaces).
- **R2** Never fabricate match facts (free tier has no goal events; WS3.4 guard).
- **R3** Single source of truth for scope (one config constant; no hardcoded codes).
- **R4** Privacy by minimization (every user-data column traces to a named feature).
- **R5** Store all times in UTC; convert at render/notification time.
- **R6** ≤1 scheduled notification/user/day; measure completion + return, not time-in-app.

## Per-task done checklist

- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `DECISIONS.md` appended for any architectural choice (new dep/service/schema/schedule).
- [ ] `ROADMAP.md` updated when a workstream milestone completes.
- [ ] Any content-generating prompt references `VOICE.md`.
