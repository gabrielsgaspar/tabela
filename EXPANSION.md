# EXPANSION.md

Expansion plan for **tabela**. This document is written to be executed by an
LLM coding agent. Read it top to bottom before writing any code. Then read
`CLAUDE.md`, `DATA.md`, `DECISIONS.md`, and `ROADMAP.md` in the repo to confirm
nothing here contradicts existing conventions. If something does conflict,
**stop and flag it** rather than silently diverging.

This plan does not assume you can see the running app. Every workstream below
states (a) the problem and the evidence for it, (b) exactly what to build and
where, (c) ordered build steps, and (d) machine-checkable and product-level
acceptance criteria. Build workstreams in the order given; later ones depend on
earlier ones.

---

## 0. Scope and current state

### 0.1 What tabela is today
A scheduled pipeline that, each morning, fetches the prior day's matches across
five European leagues, updates season stats, asks Claude to write a short
editorial in a warm voice, synthesizes audio (ElevenLabs), and publishes to a
Next.js site. Stack: **Next.js 16 · Trigger.dev v4 · Supabase (Postgres +
Storage) · Anthropic Claude · ElevenLabs**, package manager **pnpm**, language
**TypeScript**.

Existing source layout (do not reorganize without reason):
| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js app-router pages |
| `src/trigger/` | Trigger.dev scheduled tasks |
| `src/football/` | Football-Data.org API client |
| `src/editorial/` | Claude prompt builders + generation pipeline |
| `src/audio/` | ElevenLabs synthesis pipeline |
| `src/lib/` | Shared types, Supabase clients, utilities |
| `scripts/` | One-off runners (`run-once`, `backfill`) |
| `supabase/` | Migrations + CLI config |

### 0.2 Scope change for this expansion
**Reduce competition scope from five domestic leagues to three competitions:**
- **Premier League** (`PL`)
- **UEFA Champions League** (`CL`)
- **UEFA Europa League** (`EL`)

Remove La Liga (`PD`), Bundesliga (`BL1`), Serie A (`SA`), Ligue 1 (`FL1`) from
all default fetch/generation paths. Do not delete historical rows for those
leagues; just stop fetching and stop rendering them by default. Gate league set
behind a single config constant so it can be changed in one place.

> **BLOCKING OPEN QUESTION — resolve before WS0 coding.** `DATA.md` documents
> Football-Data.org free tier for the five domestic leagues. It does **not**
> confirm Champions League (`CL`) and especially Europa League (`EL`) are on the
> free tier. Verify both with a live probe (`GET /competitions/CL` and
> `GET /competitions/EL` with the existing token). If `EL` is not on the free
> tier, record it in `DECISIONS.md` and either (a) drop `EL` from launch scope
> and proceed with `PL` + `CL`, or (b) trigger the documented migration to
> API-Football. Do **not** hardcode `EL` support that silently returns empty.

### 0.3 The thesis this expansion is built on
The product's edge is **respecting the user's attention**: short, personalized,
spoiler-safe briefings that a busy fan finishes daily. Two validated pains drive
the roadmap:
1. **Spoiler + timezone misery.** Fans who watch late/on replay want to catch up
   without the result being revealed first. Delivery-level spoilers (scores in
   titles/notifications) are a known, repeated complaint.
2. **The new Champions League is unfollowable.** The 36-team league phase runs up
   to ~9 games a night; fans say they cannot keep track. A digest of a chaotic
   European night is a sharp, scope-specific use case.

Everything below serves those two, plus the data/personalization layer that lets
the product improve with use.

---

## 1. Hard rules (cross-cutting invariants)

These apply to **every** workstream. Treat violations as build failures.

**R1 — Spoiler safety is a hard invariant, not a feature.**
No score, scoreline, aggregate, or result-implying phrase (e.g. "comeback win",
"thrashing", "knocked out") may appear in any of: push-notification title or
body, email subject, browser tab title, list/feed item title, link preview/OG
tags, or any surface shown before the user explicitly opts to see results.
Scores live only behind an explicit reveal action. See WS2 for the enforcement
mechanism and the automated test that guards it.

**R2 — Never fabricate match facts.**
The editorial/recap generation step may state only facts present in the
structured context passed to the model. On the Football-Data.org free tier there
are **no per-match goal events** (no scorer, assist, or minute data) — only final
scores, standings, and season-level top scorers. The model must not invent who
scored, when, or how. Add this constraint to the prompt and add a generation-time
guard (WS3.4). If richer per-match narrative is required, that is a data-source
decision (see §7), not a prompting workaround.

**R3 — Single source of truth for scope.**
Competition set, per-competition display names, and feature flags live in
`src/lib/config.ts` (create if absent). No competition codes hardcoded elsewhere.

**R4 — Privacy by minimization.**
Collect only data a feature needs. Personal data requires consent (WS6.5). No
selling/sharing. No sensitive-category data. Every new user-data column must be
justifiable by a named feature in this doc.

**R5 — All times stored in UTC.**
Per `DATA.md`. Convert to the user's timezone only at render/notification time.

**R6 — Restraint over volume.**
Default to at most **one scheduled notification per user per day**. Engagement is
measured by completion + return, never by raw time-in-app (see WS6, WS7).

---

## 2. WS0 — Scope refactor and data-layer foundation

**Goal:** narrow to `PL`/`CL`/`EL`, add the ability to fetch *upcoming fixtures*
(needed for the preview feature), and keep graceful degradation when one
competition fails.

### 2.1 What to build
1. `src/lib/config.ts` exporting:
   ```ts
   export const COMPETITIONS = [
     { code: "PL", name: "Premier League",        kind: "league" },
     { code: "CL", name: "UEFA Champions League", kind: "cup"    },
     { code: "EL", name: "UEFA Europa League",    kind: "cup"    },
   ] as const;
   export type CompetitionCode = (typeof COMPETITIONS)[number]["code"];
   ```
2. Extend `src/football/` client with:
   - `getFinishedMatches(code, dateFrom, dateTo)` — existing behavior, reused.
   - `getUpcomingMatches(code, dateFrom, dateTo)` — `status=SCHEDULED|TIMED`,
     used by preview (WS4). Endpoint: `GET /competitions/{code}/matches?dateFrom&dateTo`.
   - `getStandings(code)` — for `PL` only (`CL`/`EL` league-phase tables exist for
     `CL` but treat as optional; cups in knockout have no standings).
   - All calls keep the existing 10-req/min backoff. Budget the calls: 3
     competitions × ≤3 endpoints = ≤9 requests per run; fits one minute.
3. Graceful degradation: a per-competition fetch failure must not abort the run.
   Persist whatever succeeded and write a structured warning row (see WS7 events:
   `fetch_partial_failure`).

### 2.2 Build steps
1. Add `config.ts`; replace every hardcoded league array with `COMPETITIONS`.
2. Add the upcoming-fixtures fetch + TypeScript types matching the real response
   shape in `DATA.md` (do not paraphrase the shape).
3. Update the daily trigger task to iterate `COMPETITIONS` and to tolerate
   partial failure.
4. Update website rendering to only show the three competitions.

### 2.3 Acceptance criteria
- `pnpm typecheck` and `pnpm lint` pass.
- A dry run (`scripts/run-once`) fetches only `PL`/`CL`/`EL` and writes
  `match_days` rows for the competitions that returned data.
- Forcing one competition's fetch to throw still produces a completed run with a
  `fetch_partial_failure` event and rows for the other two.
- Grep check: no occurrence of `"PD"`, `"BL1"`, `"SA"`, `"FL1"` outside historical
  migrations/`config.ts` comments.

---

## 3. WS1 — Accounts and preferences (personalization foundation)

**Goal:** enough identity + stored preference to personalize briefings and to
attribute behavioral events. Required by WS3–WS7.

### 3.1 What to build
- Supabase Auth (email magic-link; no passwords). Use the existing Supabase
  project.
- New tables (add via a `supabase/` migration):
  ```sql
  -- one row per authenticated user
  create table app_user (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    timezone text not null default 'UTC',            -- IANA, e.g. 'Europe/London'
    briefing_local_time time not null default '07:00',-- when they want the recap
    onboarded_at timestamptz
  );

  -- competitions/teams the user follows
  create table follow (
    user_id uuid not null references app_user(id) on delete cascade,
    kind text not null check (kind in ('competition','team')),
    ref text not null,            -- competition code (e.g. 'CL') or team id (e.g. '57')
    created_at timestamptz not null default now(),
    primary key (user_id, kind, ref)
  );

  -- consent + notification preferences
  create table user_prefs (
    user_id uuid primary key references app_user(id) on delete cascade,
    notif_daily boolean not null default true,        -- the one daily briefing nudge
    notif_match_alerts boolean not null default false, -- opt-in, per-followed-team
    analytics_consent boolean not null default false,  -- behavioral tracking consent
    spoiler_mode text not null default 'hide'          -- 'hide' | 'show'
      check (spoiler_mode in ('hide','show')),
    updated_at timestamptz not null default now()
  );
  ```
  Note: `teams_followed(user_id, team_id)` is sketched in `DATA.md` as deferred;
  supersede it with `follow` and migrate any existing rows.
- Onboarding flow (`src/app/`): pick competitions (`PL`/`CL`/`EL`), optionally
  follow specific teams, set timezone (auto-detect, editable) and briefing time.

### 3.2 Build steps
1. Migration for the three tables + RLS policies (each user can read/write only
   their own rows; service role bypasses for the pipeline).
2. Auth pages + session handling in `src/app/`.
3. Onboarding UI writing to `app_user` + `follow` + `user_prefs`.
4. `src/lib/users.ts` helpers: `getUserContext(userId)` returning timezone,
   follows, prefs in one object (used everywhere downstream).

### 3.3 Acceptance criteria
- A new user can sign in, complete onboarding, and have exactly one row in each
  of `app_user`/`user_prefs` plus ≥1 `follow` row.
- RLS verified: user A cannot read user B's `follow`/`user_prefs` rows.
- `getUserContext` returns a typed object; `pnpm typecheck` passes.
- **Cold-start guard:** if a user follows nothing, default their scope to all
  three competitions so they still receive a briefing.

---

## 4. WS2 — Spoiler-safe delivery layer

**Goal:** make R1 structurally enforced, not left to authors. This is a
prerequisite for shipping any recap (WS3) or digest (WS5).

### 4.1 What to build
1. A content contract for every briefing artifact:
   ```ts
   type Briefing = {
     id: string;
     spoiler_free_title: string;   // e.g. "Your Champions League catch-up"
     teaser: string;               // why it's worth your time, NO result language
     body_revealed: string;        // full recap WITH scores — never sent in notifications
     audio_url?: string;
     reveal_required: boolean;     // true unless user.spoiler_mode = 'show'
   };
   ```
2. Reveal-on-tap UI: feed/list and notifications show only
   `spoiler_free_title` + `teaser`. Results (`body_revealed`, audio) load only
   after an explicit "Show results" tap, or immediately if
   `user_prefs.spoiler_mode = 'show'`.
3. OG/meta tags and `<title>` for any shareable briefing URL must use
   `spoiler_free_title` only.
4. A **spoiler linter**: `src/lib/spoiler.ts` exporting
   `assertSpoilerFree(text): void` that throws if `text` contains digit-digit
   score patterns (`/\b\d+\s*[-–:]\s*\d+\b/`), agg/aggregate phrasing, or a
   configurable banned-phrase list. Run it on `spoiler_free_title` + `teaser` at
   generation time and in CI.

### 4.2 Build steps
1. Implement `spoiler.ts` + unit tests with positive/negative fixtures.
2. Wire `assertSpoilerFree` into the briefing-generation output validation.
3. Build the reveal-on-tap component + the `spoiler_mode` toggle in settings.
4. Set notification/email/OG construction to read only spoiler-free fields.

### 4.3 Acceptance criteria
- Unit test: `assertSpoilerFree("Arsenal 2-0 Brighton")` throws;
  `assertSpoilerFree("Arsenal's morning catch-up")` does not.
- Integration test: a generated briefing's notification payload and OG tags
  contain no substring matching the score regex.
- Manual: with `spoiler_mode='hide'`, the feed shows no scores until tap; with
  `'show'`, results render immediately.
- CI fails if any notification template interpolates `body_revealed`.

---

## 5. WS3 — Personalized spoiler-safe morning recap (Pivot 1)

**Goal:** each user gets a short, personalized "here's what you missed" briefing
(text + audio) for their followed competitions/teams, delivered at their chosen
local time, results hidden by default.

### 5.1 What to build
- New table:
  ```sql
  create table user_briefing (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user(id) on delete cascade,
    date date not null,                 -- UTC date the briefing covers
    kind text not null,                 -- 'morning_recap' | 'euro_night' | 'preview'
    spoiler_free_title text not null,
    teaser text not null,
    body_revealed text not null,
    audio_url text,
    created_at timestamptz not null default now(),
    unique (user_id, date, kind)
  );
  ```
- A Trigger.dev task that, after the existing fetch/stats step completes,
  generates one `morning_recap` per active user, scoped to that user's follows.
- Reuse `src/editorial/` prompt builders; add a personalized variant that takes
  `getUserContext` + that day's matches + latest `season_stats` and produces the
  `Briefing` contract.
- Reuse `src/audio/` for audio of `body_revealed`. Store under existing
  `episodes/` bucket convention, extended path: `briefings/{user_id}/{date}/{kind}.mp3`.

### 5.2 Generation rules
- Length target: **≤ 200 words** text / **≤ 3 minutes** audio. Enforce a word cap.
- Personalization order: followed teams first, then followed competitions, then a
  one-line "elsewhere" only if relevant.
- R2 holds: no invented scorers. Allowed facts = final scores, table position
  changes (PL), advancement/elimination (CL/EL knockouts), season top-scorer
  standings from `season_stats`.
- `spoiler_free_title` + `teaser` must pass `assertSpoilerFree`.

### 5.3 Build steps
1. Migration for `user_briefing`.
2. Personalized prompt builder in `src/editorial/` + word-cap enforcement.
3. Generation guard (WS3.4): post-generation, verify every team/score mentioned
   in `body_revealed` maps to a real match in that day's fetched data; if a
   scoreline is mentioned that isn't in source data, discard and regenerate once,
   then fail loudly with a `generation_rejected` event.
4. Per-user fan-out task in `src/trigger/`, batched to respect Claude/ElevenLabs
   rate limits and cost (process in chunks; see §7 cost note).
5. Delivery: schedule the notification at the user's `briefing_local_time`
   (convert from UTC); payload uses spoiler-free fields only.

### 5.4 Acceptance criteria
- For a seeded test user following `PL` + Arsenal, a `morning_recap` row is
  created for the covered date, ≤200 words, audio present, passing the spoiler
  linter on title/teaser.
- Guard test: inject a hallucinated scoreline into a draft → generation is
  rejected and a `generation_rejected` event is logged.
- A user following only `CL` receives a recap mentioning only `CL` (no `PL`).
- **Product metric (post-launch):** of users sent a recap, ≥ 35% open it and, of
  openers, ≥ 50% trigger the reveal (tap "show results") or finish the audio.
  Instrument via WS7 events `briefing_opened`, `briefing_revealed`,
  `audio_completed`.

### 5.5 Non-goals
- No live in-match updates. No per-minute goal feed (data not available).
- No comment threads / social features in this workstream.

---

## 6. WS4 — Forward-looking "what's worth watching" preview (Pivot 2)

**Goal:** a pre-weekend (PL) and pre-matchday (CL/EL) briefing flagging which of
the user's matches matter and why — anticipation, not results.

### 6.1 Watchability scoring (works within free-tier data)
Because per-match advanced stats are unavailable, compute a transparent
heuristic in `src/editorial/watchability.ts` from data you *do* have:
- **Stakes** (PL): table proximity of the two teams; closeness to title race,
  European places, or relegation, derived from `standings`.
- **Stakes** (CL/EL): knockout round weight (final > semi > quarter > R16 >
  league phase), and for league phase, whether either side's qualification is
  live.
- **Form**: points from each team's last 5 matches, derivable from stored
  `match_days` history.
- **Followed-team boost**: matches involving a user's followed team rank first.
- **Rivalry/marquee**: optional static table of notable fixtures.
Output a 0–100 score per fixture + a one-line human reason. This is forward-
looking, so it is inherently spoiler-free, but still run `assertSpoilerFree`.

### 6.2 What to build
1. `watchability.ts` producing ranked upcoming fixtures per user scope.
2. A `preview` briefing kind reusing the `user_briefing` table and the same
   delivery path; scheduled Friday morning (PL) and the morning before each
   CL/EL matchday.
3. Optional: integrate an "add to calendar" / kickoff-time-in-local-tz string so
   users stop missing games due to timezone confusion.

### 6.3 Acceptance criteria
- Given seeded upcoming fixtures + standings, `watchability.ts` returns a stable
  ranked list with a reason string per fixture; unit-tested on fixtures with
  obvious high/low stakes.
- A `preview` briefing renders the top 3 fixtures for the user with kickoff times
  in the user's timezone.
- **Product metric:** preview open rate ≥ recap open rate over a 4-week window
  (validates demand for forward-looking content); if materially lower, flag in a
  `RESULTS.md` note rather than expanding the feature.

---

## 7. WS5 — European Nights digest (new-CL-format use case)

**Goal:** turn a chaotic CL/EL night (up to ~9 simultaneous games) into one
digestible, spoiler-safe `euro_night` briefing.

### 7.1 Why this is distinct from WS3
The morning recap is per-user and competition-broad. The Euro Nights digest is a
focused artifact for CL/EL matchdays specifically, designed for the "I can't
follow nine games at once" problem. It runs only on dates with ≥4 CL or EL
finished matches.

### 7.2 What to build
1. Detection: in the daily task, if the covered date had ≥4 finished `CL` or `EL`
   matches, generate a `euro_night` briefing kind.
2. Structure of `body_revealed`: a one-line-per-match rundown ordered by
   watchability (reuse WS4 scoring, retro-applied), then a short "what it means
   for the table/bracket" close. Scores hidden per R1 until reveal.
3. Personalization: lead with the user's followed teams' matches; collapse the
   rest into a scannable list.

### 7.3 Acceptance criteria
- On a seeded 9-match CL date, a `euro_night` briefing is generated, lists all 9
  matches, leads with the user's followed team, ≤ 250 words, audio ≤ 3.5 min.
- On a 1-match date, **no** `euro_night` briefing is generated (threshold works).
- Spoiler linter passes on title/teaser.
- **Product metric:** on CL/EL nights, `euro_night` open rate ≥ the same users'
  baseline recap open rate (validates the format earns its existence).

---

## 8. WS6 — Engagement and data layer (used to keep the product useful, not addictive)

**Goal:** capture the minimum behavioral data needed to (a) personalize, (b)
measure retention, and (c) re-engage lapsing users — under R4 and R6. This is the
"data that compounds value" layer, deliberately built to reinforce the product's
attention-respecting positioning rather than undermine it.

### 8.1 Event tracking
- New table:
  ```sql
  create table event (
    id bigint generated always as identity primary key,
    user_id uuid references app_user(id) on delete set null,
    name text not null,         -- see canonical list below
    props jsonb not null default '{}',
    created_at timestamptz not null default now()
  );
  ```
- Canonical event names (do not invent ad-hoc ones): `onboarding_completed`,
  `briefing_sent`, `briefing_opened`, `briefing_revealed`, `audio_started`,
  `audio_completed`, `preview_opened`, `notif_enabled`, `notif_disabled`,
  `follow_added`, `follow_removed`, `caught_up_marked`, `fetch_partial_failure`,
  `generation_rejected`.
- Only log `user_id`-attributed events when `analytics_consent = true`; otherwise
  log anonymized (null user_id) counts.

### 8.2 "You're caught up" state (habit mechanic that fits the positioning)
- After a user reveals/finishes their briefing, show an explicit "You're caught
  up" state and log `caught_up_marked`. This rewards *closing the loop*, not
  endless scrolling. **Do not** implement streak counters, infinite feeds, or
  variable-reward mechanics — they contradict the product's premise (see §10).

### 8.3 Disciplined re-engagement
- A user with no `briefing_opened` in 7 days gets **one** re-engagement
  notification, spoiler-free, referencing their followed team's upcoming fixture
  (ties re-engagement to a real moment they care about). Hard cap: one per 14
  days. Respect `notif_daily=false` and OS-level opt-out.

### 8.4 Transparency surface
- A settings screen showing what data is stored and why, with one-tap export and
  delete (also satisfies privacy law). When personalization changes the briefing
  (e.g. trimming a competition the user always skips), say so in-product
  ("trimmed La-Liga-style noise you skip"). Transparency converts data use into a
  trust signal.

### 8.5 Consent
- Analytics consent is **off by default**; prompt once, non-dark-pattern (no
  pre-checked boxes, equal-weight accept/decline). Gate all `user_id`-attributed
  events on it.

### 8.6 Acceptance criteria
- Events for the full briefing funnel appear in `event` for a seeded user with
  consent on; with consent off, the same actions log null-user rows only.
- Re-engagement task fires at most once per 14 days per user and never includes a
  score (spoiler linter on payload).
- Data export returns a JSON of all the user's rows; delete removes them and
  cascades.

---

## 9. WS7 — Measurement and instrumentation

**Goal:** make "did it work" answerable without guesswork.

### 9.1 Metrics to compute (a scheduled task writing to a `metrics_daily` table)
- **Retention:** D1, D7, D30 (cohorted by `onboarded_at`). Primary success metric
  for the whole expansion.
- **Funnel per briefing kind:** sent → opened → revealed/audio_completed.
- **Notification health:** opt-out rate, re-engagement open rate.
- **Pipeline health:** runs completed, `fetch_partial_failure` rate,
  `generation_rejected` rate, cost per run (Claude + ElevenLabs).

### 9.2 Targets (treat as hypotheses to validate, not guarantees)
| Metric | Launch target | Why |
| --- | --- | --- |
| D7 retention | ≥ 25% | Baseline for a daily content habit |
| Recap open rate | ≥ 35% | Below this, the nudge or timing is wrong |
| Reveal/finish rate (of openers) | ≥ 50% | Confirms the briefing is worth finishing |
| Notification opt-out (first week) | ≤ 20% | Above this, cadence is too aggressive |
| `generation_rejected` rate | ≤ 2% | Above this, prompt/data quality problem |

### 9.3 Acceptance criteria
- `metrics_daily` populates nightly; a simple `/admin/metrics` page (auth-gated)
  renders the table and the funnel.
- Each target has a corresponding computed field so it can be checked, not eyeballed.

---

## 10. Reality checks and explicit non-goals

These are deliberate constraints. An LLM agent optimizing locally will be tempted
to violate them; do not.

1. **The free-tier data ceiling is the biggest risk to recap quality.** With no
   per-match goal events, recaps are built on scorelines + table/bracket movement
   + season context. If user feedback shows this feels thin, the fix is a
   **data-source decision** (migrate to API-Football for goal events; record in
   `DECISIONS.md`), not richer prompting. Quantify cost before migrating.
2. **Do not optimize for time-in-app.** Success = completion + return. Streaks,
   infinite feeds, autoplay-next, and variable-reward loops are **out of scope**
   and off-thesis. The product wins by being the thing that *doesn't* waste the
   user's time.
3. **Personalization ≠ surveillance.** Every stored field must trace to a feature
   in this doc. If a future idea needs new personal data, add it to this doc with
   its justification first.
4. **Europa League may not be available on the free tier.** Resolve §0.2's
   blocking question before building EL-specific paths.
5. **No social/UGC, no betting/odds, no live scores** in this expansion. They are
   different products with different risk profiles (betting especially carries
   regulatory and trust costs) and would dilute the focused thesis.
6. **Demand is unproven.** All targets in §9.2 are hypotheses. Ship the smallest
   version, watch the funnel, and let retention — not feature count — decide what
   to build next.

---

## 11. Recommended build sequence

1. **WS0** — scope refactor + fixtures fetch + graceful degradation.
2. **WS1** — auth + preferences (unblocks personalization).
3. **WS2** — spoiler-safe layer + linter (unblocks all briefings).
4. **WS3** — personalized morning recap (the core product).
5. **WS7 (partial)** — event tracking + funnel, so WS3 is measurable from day one.
6. **WS5** — Euro Nights digest (high-leverage, scope-specific).
7. **WS4** — forward-looking preview.
8. **WS6** — engagement/data layer + transparency + consent.
9. **WS7 (full)** — retention metrics + admin dashboard.

Each workstream is shippable on its own and must pass its acceptance criteria and
`pnpm typecheck && pnpm lint` before the next begins.

---

## 12. Pre-coding checklist (do this first)

- [ ] Read `CLAUDE.md`, `DATA.md`, `DECISIONS.md`, `ROADMAP.md`.
- [ ] Probe `GET /competitions/CL` and `GET /competitions/EL` on the free tier;
      record the EL outcome in `DECISIONS.md` (§0.2 blocking question).
- [ ] Confirm Supabase Auth is enabled on the project.
- [ ] Confirm the ElevenLabs and Claude rate limits/budget for per-user fan-out
      (WS3) — if per-user audio is too costly at scale, generate audio lazily on
      first reveal instead of upfront, and note the decision.
- [ ] Create `src/lib/config.ts` (R3) before touching anything else.
