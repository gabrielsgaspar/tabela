# PLAN.md — Phase 7: Refocus on Premier League + Champions League

> Status marker: **Phases A–C complete · Phase D in progress**. Update as phases complete.

## Goal

Re-scope Tabela from "the top five European domestic leagues" to a tighter
product: **the Premier League and the UEFA Champions League** — the English
top flight plus the premier European competition its clubs compete in.

Scope decisions (locked with the maintainer 2026-05-29):

- **Competitions:** Premier League (`PL`) + Champions League (`CL`) only.
  Europa League / Conference League are deferred — most likely gated behind a
  paid Football-Data.org tier (to be confirmed in Phase B). Adding them later
  is a config change once the data plan allows.
- **The other four domestic leagues** (La Liga, Bundesliga, Serie A, Ligue 1):
  removed from the app's scope and UI. Their existing rows in Supabase are left
  in place — no migration, no deletion. Their `/leagues/<slug>` routes will
  simply 404. No data is destroyed; the change is purely what the app surfaces.

## Why this is a real phase, not a config edit

A full review on 2026-05-29 surfaced a blocker the docs do not mention: **the
committed repository does not build.** Nine modules that the web layer imports
are absent from disk and were never present in any git commit:

- `src/lib/leagues.ts` — `LEAGUE_META`, `leagueBySlug` (the league registry)
- `src/lib/query-types.ts` — `SeasonStatsPayload`, `MatchDayPayload`, `StandingTableEntry`
- `src/lib/tokens.ts` — the `colors` palette used by `TeamCrest` / `Sparkline`
- `src/app/SectionHeader.tsx`, `GnGMark.tsx`, `FilterBar.tsx`, `FollowTeamCTA.tsx`
- `src/app/styleguide/BreakpointBadge.tsx`, `LeagueFilterDemo.tsx`

The data, editorial, audio, and Trigger.dev layers are intact and clean. The
live Vercel site (built from a complete tree before these files were lost)
still serves real editorial data frozen at 2026-05-04. But locally nothing
compiles, so no scope change is verifiable until the tree is whole again.

## Phases

### Phase A — Make the repo build again ✓ COMPLETE
No secrets required; fully reproducible offline.

- `pnpm install`.
- Reconstruct the nine missing modules from their call sites, the
  `claude_design/` reference, and the live deployed HTML.
- Recreate `env.example` documenting the required environment variables.
- **Done when:** `pnpm typecheck`, `pnpm lint`, and `pnpm build` are all green
  at the *current* five-league scope. Building before changing scope proves the
  reconstruction is faithful rather than a fresh invention.

### Phase B — Verify Champions League data ✓ COMPLETE
Requires `FOOTBALL_DATA_TOKEN` in `.env.local`.

- Probe `/competitions/CL/{matches,standings,scorers}` for a recent date.
- Confirm CL is on the free tier; capture the league-phase standings shape
  (single 36-team table vs. groups, presence of a `TOTAL` standings group,
  matchday semantics, and how knockout stages report).
- Record findings in `DECISIONS.md`. This determines exactly how the standings
  table and race-watch render for CL.

### Phase C — Scope rewrite to PL + CL ✓ COMPLETE
Autonomous code change.

- `src/lib/football-types.ts`: `LeagueCode = "PL" | "CL"`; `LEAGUES = ["PL", "CL"]`.
- `src/editorial/types.ts` `LEAGUE_NAMES` and `src/lib/leagues.ts` `LEAGUE_META`:
  Premier League + UEFA Champions League (slug `champions-league`).
- `src/editorial/prompts.ts`: genericize "top five European leagues" /
  "cross-league overview" wording to the new scope. **VOICE.md rules unchanged.**
- `src/app/leagues/[slug]/FullStandingsTable.tsx`: add CL league-phase zone
  rules (1–8 qualify, 9–24 knockout play-off, 25–36 eliminated) and degrade
  gracefully to a results-only view when no standings table exists (knockouts).
  Update the zone legend.
- Home page + `layout.tsx`: replace "five leagues" copy and metadata.
- The four domestic leagues fall out of scope automatically once removed from
  `LEAGUES` / `LEAGUE_META` / `LEAGUE_NAMES`.

### Phase D — Backfill + generate CL content ← CURRENT
Requires `FOOTBALL_DATA_TOKEN`, Supabase service key, Anthropic key.

- Adapt `scripts/historical-backfill.ts` / `scripts/run-once.ts` for CL.
- Populate `match_results` (team history) and generate editorials for recent
  CL dates so the live site has content under the new scope.

### Phase E — Verify, document, ship

- Re-run typecheck / lint / build; run the dev server and visually verify the
  PL and CL pages; confirm `/leagues/champions-league` returns 200.
- Update `README.md`, `ROADMAP.md`, `DATA.md`; append a `DECISIONS.md` entry
  for the re-scope.
- Going-live ops (paid ElevenLabs tier, Trigger.dev redeploy/unpause, Vercel
  deploy) remain maintainer-owned and are out of scope for the code work.

## What only the maintainer can do

The code work above is fully autonomous. These steps need credentials/spend
and are flagged, not automated:

- Provide secrets in `.env.local` so Phases B and D can run.
- Paid ElevenLabs tier (production audio), Trigger.dev dashboard
  (env vars + unpausing the daily schedule), and the Vercel deploy.
