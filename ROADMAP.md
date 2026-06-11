# ROADMAP.md

Build phases for Tabela. Mark `← CURRENT` next to the active phase. Each phase begins with a `PLAN.md` at the repo root that gets approved before code lands.

---

## Phase 0 — Bootstrap ✅ DONE

- [x] Project name: **Tabela**
- [x] Visual design via Claude Design (output in `claude_design/`)
- [x] Documentation skeleton: `README.md`, `CLAUDE.md`, `DATA.md`, `VOICE.md`, `ROADMAP.md`, `DECISIONS.md`
- [x] `.env.example`, `.gitignore`

---

## Phase 1 — Data pipeline ✅ DONE

**Goal:** prove we can fetch yesterday's matches across all five leagues from Football-Data.org and produce clean JSON.

- [x] Fork/strip the [F1 race report repo](https://github.com/IAmTomShaw/f1-race-report) — keep TS skeleton, drop Python/FastF1, OpenAI, Resend, chart code.
- [x] Get Football-Data.org token; wire into `.env.local`.
- [x] Build `src/football/client.ts` with `getMatches`, `getStandings`, `getScorers`.
- [x] Build `src/trigger/daily-report.ts` that loops over the five leagues and logs JSON.
- [x] Add resilience: per-league try/catch, empty-day handling, raw JSON archive to `output/YYYY-MM-DD.json`.
- [x] Sanity check: confirm what *is* and *isn't* on the free tier (goalscorer events especially). Log findings in `DECISIONS.md`.

**Done when:** running the task locally produces a clean JSON file with yesterday's matches across all five leagues, with sensible empty-day and error handling. ✓ Confirmed.

---

## Phase 2 — Editorial generation ✅ DONE

**Goal:** Claude writes per-match captions and a day overview from the Phase 1 JSON, in the voice spec'd in `VOICE.md`.

- [x] Build `src/editorial/prompts.ts` with the prompt templates (match caption, day overview, league storyline).
- [x] Build `src/editorial/generate.ts` — takes structured input, returns structured output. Use the Anthropic TS SDK.
- [x] Strict no-invention guardrails: prompts must instruct the model to cite only facts in the input.
- [x] Output an HTML file locally that renders the day's results with captions and overview.

**Done when:** running locally produces an HTML page that reads like a thin first draft of the home page in `claude_design/`. ✓ Confirmed (pipeline output matches design register; voice audit verified no invented facts).

---

## Phase 3 — Storage and multi-run memory ✅ DONE

**Goal:** persist daily snapshots so Claude has memory across runs and the website can browse history.

- [x] Set up Supabase project. Create tables per `DATA.md` schema sketch.
- [x] Persist daily fetch results (`match_days`).
- [x] Persist running season state (`season_stats`).
- [x] Editorial generation reads latest `season_stats` and passes it as context.
- [x] Verify the "Igor Thiago is 2nd top scorer" trick works on real data.

**Done when:** today's editorial can correctly reference season-to-date stats from prior runs. ✓ Confirmed — 180 editorials across 13 dates in DB; scorer references grounded in live `season_stats`; production cloud run (version 20260505.3) verified end-to-end 2026-05-05.

**Phase 3 production notes:**
- Supabase: 4 tables with RLS; anon SELECT policies on `editorials`, `match_days`, `season_stats` added (migration `0002_rls_read_policies`).
- Trigger.dev: `daily-report` schedule (`sched_wqapcm3eta5zi6huqsm83`, cron `0 7 * * *`) registered in Production and currently **paused** — re-enable when Phase 4 ships.
- Voice audit and prompt fixes applied during Phase 3; see `VOICE_FIXES.md` and `VOICE_FIXES_V2.md`.

---

## Phase 3.5 — Historical Memory ✅ DONE

**Goal:** enrich editorials with team-specific historical context (streaks, recency, head-to-head) so captions can make claims like "Wolves' first win since November" or "Arsenal's third clean sheet in four matches."

- [x] Investigate Football-Data.org free-tier historical scope; document backfill window in `DECISIONS.md`. ✓ Two seasons accessible (2024/25 + 2025/26); monthly chunks confirmed.
- [x] Schema migration: `match_results` denormalized table with btree indexes on team IDs.
- [x] Historical backfill script (`scripts/historical-backfill.ts`) — two-season scope, ~100 API calls, ~14 min runtime, idempotent. ~3,600 rows in `match_results`.
- [x] Helper-query layer (`src/editorial/team-history.ts`) — `getTeamHistory`, `getHeadToHead`, `getCurrentSeasonStats`.
- [x] Prompt enrichment — team history injected into caption and summary prompts via `HISTORY_CALIBRATION_SECTION`; league and day overviews not enriched (token budget / signal-noise tradeoff).
- [x] Eval harness (`scripts/eval-history-v1.ts`) + control comparison across 7 test dates / 31 match pairs. Three eval runs; final: 0 invented facts, 0 horizon violations, 65% enrichment, 1/31 residual filler case (accepted — see DECISIONS.md).

**Achieved:** production pipeline (`src/trigger/pipeline.ts`) now fetches team history per match in Phase B via five parallel DB reads; falls back gracefully to history-free generation if the fetch fails. First daily run after `pnpm trigger:deploy` will produce captions with historical context.

---

## Phase 4A — Design system ✅ DONE

> **Pre-condition before re-enabling the production schedule:**
> Run `pnpm trigger:deploy` to push Phase 3.5 pipeline changes to
> the live task. The current deployed version (20260505.3) pre-dates
> Phase 3.5 and would produce un-enriched editorials if it ran.
> Sequence: deploy → verify a manual run produces enriched output →
> unpause the `daily-report` schedule in the Trigger.dev dashboard.

**Goal:** port the full component library from `claude_design/` so every primitive is in TypeScript and exercised at `/styleguide`.

- [x] Scaffold Next.js 15 app at `src/app/`. Tailwind v4 CSS-first tokens in `globals.css`.
- [x] Design tokens: `src/lib/tokens.ts` mirrors `@theme` block exactly.
- [x] Supabase probe at `/styleguide` — three explicit states (error / zero rows / real row).
- [x] Component library — all components reviewed at 375px, 768px, and 1240px against JSX source:
  - `Masthead` — clamp wordmark, mustard period, GnG mark, live-dot + audio cue chip (conditional)
  - `Footer` — two-column nav (About / Archive / RSS + Newsletter / Podcast feed / Contact), copyright bar
  - `LeagueFilterChip` — bg-ink selected, border on both states, h-9 fixed height
  - `MatchCard` — grid score layout, 40–52px tabular numerals, loser opacity-55, xG bar, affordance row
  - `EditorialBlock` — three size tiers (sm/md/lg), dek, paragraphs array, kicker JSX nodes
  - `StatLeaderCard` — h-serif player name, num text-[34px], TrendArrow + deltaLabel, editor's note
  - `AudioPlayer` — dark bg-pitch card, mustard play button, chapters, skip ±15s, speed cycle
  - `TeamCrest` — circle / roundel / shield fallback shape system with bg/fg/mono props
  - `RaceWatch` — top/bottom zone colouring, ··· divider
  - `Sparkline` — draw-in animation, fill prop (6% opacity area under line)
  - `TrendArrow` — SVG chevrons, three states (up/flat/down)
  - Skeleton and error states for all stateful components

**Done when:** `/styleguide` renders every component across all viewports matching the design reference. ✓ Confirmed — full visual review passed 2026-05-05.

---

## Phase 4B — Real pages ✅ DONE

**Goal:** wire the component library to real data and ship the pages.

- [x] Home page (`/`) — today's edition: Masthead, FilterBar (league chips), MatchCard rows from Supabase, editorial NarrativeSection, StatLeaderCard for top scorer + assister.
- [x] League page (`/leagues/[slug]`) — FullStandingsTable (expandable rows, zone colours), StatLeaders, recent matchday MatchCards, latest league editorial.
- [x] Team page (`/teams/[id]`) — team header (crest + position + form), SeasonStatsPanel (dark bg-pitch, 8-stat grid), recent MatchCards, upcoming fixtures.
- [x] Listen page (`/listen`) — single query for audio editorials, week-grouped EpisodeList, sticky MiniPlayer (rAF simulated; Phase 5 wires real audio), graceful empty state.
- [x] Routing: `FullStandingsTable` expansion panel links to `/teams/[id]`; home page league headers link to `/leagues/[slug]`.
- [x] Deployed to Vercel (production). Deployment `dpl_E86uRW1emjJ2kPE1HmVnLhg9o1eD`. All four routes return 200 on live URL.

**What shipped:** four server-rendered routes (home dynamic, leagues dynamic, teams dynamic, listen static); two client islands (FullStandingsTable expansion + listen filters/sticky player); Supabase anon reads via `createBrowserClient`; no service-role key on web. Live: https://tabela-topaz.vercel.app

**Done when:** the live site renders the latest run's data and matches the design reference end-to-end. ✓ Confirmed 2026-05-06.

---

## Phase 5 — Audio ⏸️ DEFERRED (B3/B4 pending)

**Goal:** every editorial has an audio version users can play in-line.

- [x] **A1** — Wire standalone `AudioPlayer` to a real `<audio>` element. Verified at `/styleguide`.
- [x] **A2** — Wire `StickyMiniPlayer` + `ListenClient` to real audio. Verified at `/listen` locally.
- [x] **B1** — Build synthesis layer (`pre-process.ts`, `synthesize.ts`, `upload.ts`, Phase D in pipeline). Local end-to-end test confirmed: synthesis → Supabase Storage → `audio_url` populated → public URL returns `200 audio/mpeg`.
- [x] **B2** — Trigger.dev Production redeploy (`20260505.3 → 20260506.1`). Schedule confirmed paused. Phase D wired.
- [⏸️] **B3** — Production audio verification run. **Deferred.** Blocked by ElevenLabs free-tier abuse detection on Trigger.dev container IPs (`detected_unusual_activity`). Requires Creator tier upgrade (~$22/mo). ~30 min of operational work when upgrade happens.
- [⏸️] **B4** — ISR fix for `/listen` (`revalidate = 3600` or `force-dynamic`). **Deferred.** The page was prerendered when no `audio_url` rows existed; it will show the empty state even after B3 populates rows until this is applied. ~5 min fix. Sequence: apply after B3 confirms rows exist.

**Known limitation at close:** production audio synthesis is blocked by the ElevenLabs free-tier IP restriction. All code is correct and verified locally. The `/listen` page shows the empty state in production because no `audio_url` rows exist. The deferral is operational, not architectural.

**Done when:** B3 and B4 complete (after Creator tier upgrade). ✓ Everything else is done.

---

## Phase 6 — Polish ✅ DONE (superseded by Phase 7 re-scope)

**Goal:** audit what exists for launch-readiness, fix what surfaces, then execute the
launch sequence (tier upgrade, voice swap, schedule unpause, first user).

**Audit completed:** `PHASE_6_AUDIT.md` produced and committed. Three pre-launch fixes applied:
1. Storage path trailing-dash bug fixed (`upload.ts`) + production data repaired (`scripts/fix-day-overview-path.ts`).
2. Prompt hedge patterns suppressed in `prompts.ts` (league-overview and day-overview format blocks).
3. Discord run-status notification wired (`notify.ts` + `daily-report.ts`), docs drift corrected.

**Pre-launch operational setup (do BEFORE Step 1):**
- Create a Discord webhook for notifications: Discord → channel settings → Integrations → Webhooks → New Webhook → Copy URL.
- Add the URL to `.env.local` AND Trigger.dev Production env vars as `DISCORD_NOTIFY_WEBHOOK`.
- Run `pnpm trigger:dev` locally, trigger `daily-report-one-shot` for any date, confirm the webhook fires and the summary message arrives in Discord.
- The code is wired (`notify.ts`); this step puts the URL in place before the live schedule starts.

**Pre-launch sequence (ordered — complete in this order before unpausing the daily schedule):**

1. [ ] **ElevenLabs Creator tier upgrade** ($22/mo) — required before any production synthesis. Bypasses free-tier IP abuse detection on container environments. See DECISIONS.md 2026-05-06 entry for full context.
2. [ ] **Production voice swap** — replace `ELEVENLABS_VOICE_ID` in Trigger.dev Production from Sarah (`EXAVITQu4vr4xnSDxMaL`) to Adam (`jsCqWAovK2LkecY7zXl4`) — "Adam - Confident Passionate British Narrator", category: professional (see DECISIONS.md 2026-05-04 entry). Set `DISCORD_NOTIFY_WEBHOOK` at same time.
3. [ ] **Phase 5 B3: production audio one-shot** — trigger `daily-report-one-shot` for a recent matchday, confirm `audio_url` populated on all `day_overview` + `league_overview` rows, curl one mp3 URL for `200 audio/mpeg`.
4. [ ] **Phase 5 B4: `/listen` ISR fix** — add `export const revalidate = 3600` to `src/app/listen/page.tsx`. Remove dev-only MDN test block. Fix empty-state copy. Vercel redeploy. Confirm `/listen` shows real episodes on the live site.
5. [ ] **Unpause daily schedule** (`sched_wqapcm3eta5zi6huqsm83`) in Trigger.dev dashboard — only after steps 1–4 are done and at least one production audio run has been verified.

**Proposed Phase 6 features** (post-launch, see `PHASE_6_PROPOSED_FEATURES.md` for full list):
"Follow a team", country flag filter, season leaderboards, open graph share images.

**Done when:** Tabela feels like a finished product and you'd send the link to a friend.

**Note:** the Phase 6 pre-launch sequence (steps 1–5 above) was not executed
before the Phase 7 re-scope landed. Those operational steps remain valid and
should be completed after the Phase 7 CL backfill, retargeted at the PL + CL
scope.

---

## Phase 7 — Refocus on Premier League + Champions League ✅ DONE (code)

**Goal:** re-scope Tabela from five domestic leagues to the Premier League and
the UEFA Champions League. Full plan and rationale in `PLAN.md` and
`DECISIONS.md` (2026-05-29).

A 2026-05-29 review found the committed repo did not build (nine web-layer
modules absent from disk and from all git history) and could not install
(stale lockfile). Both were fixed before any scope change, so the
reconstruction could be proven faithful at the old scope first.

- [x] **Phase A — Make the repo build again.** Regenerated the lockfile;
  reconstructed the nine missing modules; recreated `env.example`. `typecheck`,
  `lint`, `build` green at the original five-league scope.
- [x] **Phase B — Verify Champions League data.** Confirmed CL (competition
  2001) is on the free tier and that 2024-25+ uses a single 36-team league
  phase. Findings in `DECISIONS.md`; runnable `scripts/probe-cl.ts` left for
  the maintainer to confirm against the live API with a real token.
- [x] **Phase C — Scope rewrite to PL + CL.** `LeagueCode = "PL" | "CL"`;
  `LEAGUES`/`LEAGUE_META`/`LEAGUE_NAMES` trimmed; editorial prompts, metadata,
  and UI copy retargeted (VOICE.md rules unchanged); CL league-phase standings
  zones (1–8 / 9–24 / 25–36) with a results-only knockout fallback. The four
  dropped leagues' `/leagues/<slug>` routes now 404; their Supabase rows are
  left in place (no migration, no deletion).
- [x] **Phase D — Adapt backfill + run-once scripts.** The scripts and the
  daily pipeline already key off `LEAGUES`, so they fetch CL with no functional
  change; headers/usage notes aligned to the new scope and CL knockout
  behaviour documented. The backfill *run* needs maintainer secrets.
- [x] **Phase E — Verify, document, ship.** `typecheck`/`lint`/`build` green;
  `/leagues/champions-league` resolves and the dropped slugs 404; `README.md`,
  `ROADMAP.md`, `DATA.md`, `DECISIONS.md` updated.

**Maintainer-owned (needs credentials/spend, out of scope for the code work):**
provide secrets in `.env.local`, run `scripts/probe-cl.ts` then the CL
backfill, then the Phase 6 pre-launch sequence (ElevenLabs tier, voice swap,
production audio run, `/listen` ISR fix, schedule unpause) retargeted at PL + CL.

**Done when:** the live site serves PL + CL content under the new scope. Code
work ✓ complete; data backfill + ops remain maintainer steps.

---

## Expansion — Personalized, spoiler-safe briefings

Full roadmap in [EXPANSION.md](./EXPANSION.md); per-workstream task list in
[TASKS.md](./TASKS.md). Built WS0 → WS7 in the sequence in EXPANSION.md §11. Each
workstream is shippable on its own and starts with an approved `PLAN.md`.

### WS0 — Scope refactor + data-layer foundation ✅ DONE (code)

**Goal:** competition set as a single `kind`-aware source of truth; fetch
upcoming fixtures (for the WS4 preview); explicit per-competition failure signal.
Plan in `PLAN.md`; decisions in `DECISIONS.md` (2026-06-04).

- [x] `kind: "league" | "cup"` on the competition registry; `COMPETITIONS` +
  `competitionKind()` exported from `src/lib/leagues.ts` (chose to extend the
  existing registry over a new `config.ts` — see DECISIONS.md).
- [x] `getUpcomingMatches()` added to `src/football/client.ts` (`SCHEDULED,TIMED`).
- [x] Structured `[fetch_partial_failure]` log in the pipeline's Phase A catch.
- [x] `scripts/probe-el.ts` + `pnpm probe:el` for the EL free-tier question.
- [x] `typecheck` + `lint` green; no dropped-league codes leaked into `src/`.
- [ ] **Maintainer:** run `pnpm probe:el` (and `pnpm probe:cl`) with a real token;
  record EL's free-tier outcome in `DECISIONS.md` (EXPANSION.md §0.2 blocking
  question). Then either activate EL (PLAN.md "EL activation") or launch PL + CL.

**Next:** WS1 — accounts + preferences (auth, `app_user`/`follow`/`user_prefs`).

### WS1 — Accounts and preferences ← CURRENT

**Goal:** identity + stored preferences to personalize briefings and attribute
events. Plan in `PLAN.md`; decisions in `DECISIONS.md` (2026-06-04). Supabase is
the cloud project; all WS1 credentials are present in `.env.local`.

Data layer (this turn — `typecheck` + `lint` green):
- [x] `supabase/migrations/0004_accounts.sql` — `app_user` / `follow` /
  `user_prefs` with owner-only RLS, `authenticated` grants, `user_prefs`
  `updated_at` trigger, and a guarded NOTICE for `teams_followed`.
- [x] `src/lib/database.types.ts` — three tables hand-added (reconcile via
  `pnpm supabase:gen-types` after the migration applies).
- [x] `src/lib/users.ts` — `getUserContext(db, userId)` with the cold-start guard.

Maintainer / terminal-gated:
- [x] `@supabase/ssr@0.10.3` installed (`corepack pnpm add`).
- [x] `0004_accounts.sql` applied to the cloud DB via Supabase MCP (2026-06-05);
  three tables + RLS verified; `database.types.ts` regenerated from live schema.
- [x] `0005_harden_set_updated_at_search_path.sql` applied via MCP (2026-06-05);
  security advisor confirms the function warning is cleared.
- [ ] **Enable email magic-link Auth in the Supabase dashboard** (+ site/redirect
  URL `http://localhost:3000`) — dashboard-only; the only step before runtime test.

Auth UI sub-phase (built this turn — `typecheck` + `lint` + `next build` green):
- [x] `@supabase/ssr` clients (`src/lib/auth/{env,server,client}.ts`) + session
  refresh in `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`).
- [x] Magic-link sign-in (`/sign-in`), `/auth/callback` (PKCE code exchange),
  `/auth/sign-out` (POST).
- [x] Onboarding (`/onboarding`) → writes `app_user` + `user_prefs` + competition
  `follow` rows, sets `onboarded_at`; auto-detects timezone. Team-following
  deferred to a settings enhancement (competition follows satisfy "≥1 follow").

Remaining to close WS1: enable magic-link in the dashboard, then runtime-verify
the full sign-in → onboard → row-creation flow.

**Next:** WS2 — spoiler-safe delivery layer (`spoiler.ts` linter + reveal-on-tap).
