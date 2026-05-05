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

## Phase 4B — Real pages ← CURRENT

**Goal:** wire the component library to real data and ship the pages.

- [ ] Home page (`/`) — today's edition: Masthead, FilterBar, MatchCard rows from Supabase, NarrativeSection with AudioPlayer.
- [ ] League page (`/league/[code]`) — RaceWatch, StatLeaders, filtered MatchCards.
- [ ] Team page (`/team/[id]`) — TeamHeader, recent matches, upcoming fixtures, ripple effects, season stats.
- [ ] Routing: link MatchCard affordance row (Read the report / Lineups / Player ratings) to real pages.
- [ ] Deploy to Vercel; confirm live site reads from Supabase.

**Done when:** the live site renders the latest run's data and matches the design reference end-to-end.

---

## Phase 5 — Audio

**Goal:** every editorial has an audio version users can play in-line.

- [ ] Pick TTS provider (ElevenLabs default; OpenAI TTS as cheaper fallback). Document in `DECISIONS.md`.
- [ ] Add TTS step to the daily task — generate mp3 per editorial.
- [ ] Upload mp3 to Supabase Storage; persist URL.
- [ ] Wire up `<audio>` player on the website.

**Done when:** every editorial on the site has a working play button.

---

## Phase 6 — Polish

**Goal:** the differentiators and nice-to-haves.

- [ ] "Follow a team" — auth via Supabase Auth, weekly digest job.
- [ ] Country flag filter UI on the home page.
- [ ] Season leaderboards page.
- [ ] Optional: email digest (the original F1-repo pattern).
- [ ] Open graph images for share previews.

**Done when:** Tabela feels like a finished product and you'd send the link to a friend.
