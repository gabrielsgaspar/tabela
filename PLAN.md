# PLAN.md — Phase 3.5: Historical Memory

Goal: give the editorial layer factual historical context per team so captions and overviews can make claims like "Wolves' first win since November" or "Arsenal's third clean sheet in four matches." The current pipeline has no view of anything older than the last three weeks.

Two moving parts: a historical match backfill and a helper-query layer that surfaces relevant history per prompt. Phase 3.5 is purely additive — no production editorials regenerated, schedule stays paused throughout.

Sits between Phase 3 (storage/pipeline, done) and Phase 4 (website).

---

## Six commits, in order

---

### Commit 1 — Investigate free-tier historical scope; update DECISIONS.md and ROADMAP.md

**What this commit does:** No code. Investigation and documentation only.

**Investigation: three test requests to run before deciding backfill scope**

```bash
# 1. Current season (2025/26) — expect 200.
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.football-data.org/v4/competitions/PL/matches?dateFrom=2025-08-16&dateTo=2025-08-16" \
  -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"

# 2. Prior season (2024/25) — free tier may 403 or return empty.
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.football-data.org/v4/competitions/PL/matches?dateFrom=2024-08-16&dateTo=2024-08-16" \
  -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"

# 3. Wide date-range request: one full calendar month.
#    The backfill script will use monthly chunks; verify the API accepts this width.
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.football-data.org/v4/competitions/PL/matches?dateFrom=2025-08-01&dateTo=2025-08-31" \
  -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"
```

Document findings in **DECISIONS.md**:
- Whether prior seasons are accessible (403 = no; 200 + data = yes).
- Whether month-wide date ranges work or are capped.
- The confirmed backfill window (e.g. "current season only, from 2025-08-02").

**Branching on the outcome — the agent handles all three cases without pausing for instructions:**

| Outcome | Action |
|---|---|
| Prior season fully accessible (200 + match data) | Proceed with prior + current season scope. Default: backfill 2024/25 in full plus 2025/26 to yesterday. Document the extended window in DECISIONS.md and set `--from` in Commit 3 accordingly. |
| Prior season partially accessible (some dates 200, some 403 or empty) | Backfill current season fully. For the prior season, fetch month by month, skip any month that 403s or returns zero matches, and document the gap (which months are missing) in DECISIONS.md. Commit 3's script must handle per-month 403s gracefully and log them as warnings rather than hard failures. |
| Prior season unavailable (403 or empty for all tested dates) | Default to current season only. Document the constraint in DECISIONS.md and proceed. No action on Commit 3 needed beyond what was already planned. |

Default to "do the smaller thing successfully." If partial access is confirmed, a gap in DECISIONS.md is the right outcome — not a stalled session waiting for instructions.

**Update ROADMAP.md:**
- Insert Phase 3.5 block between Phase 3 and Phase 4.
- Mark Phase 3.5 `← CURRENT`. Phase 3 stays `✅ DONE`. Phase 4 loses `← CURRENT`.

**Files changed:** `DECISIONS.md`, `ROADMAP.md`.

---

### Commit 2 — Schema migration: match_results table

**Why a dedicated table, not JSONB indexes on match_days:**

`match_days.payload` stores a `MatchesResponse` blob — an array of match objects inside JSONB. Querying "most recent win for team 57" against JSONB requires either unnesting the array on every query or a generated expression index over `jsonb_array_elements`. Both paths are brittle and make the helper-layer code hard to read.

A flat table with explicit columns and standard btree indexes is simpler, faster, and makes the SQL straightforward. `match_days` stays as the raw archive (source of truth for the full API payload). `match_results` is the denormalized read model for team-history queries.

**New table:**

```sql
CREATE TABLE match_results (
  match_id        BIGINT PRIMARY KEY,   -- Football-Data.org match ID
  date            DATE NOT NULL,
  league_code     TEXT NOT NULL,
  matchday        INT,
  home_team_id    INT NOT NULL,
  home_team_name  TEXT NOT NULL,
  home_team_short TEXT NOT NULL,
  away_team_id    INT NOT NULL,
  away_team_name  TEXT NOT NULL,
  away_team_short TEXT NOT NULL,
  home_score      INT,   -- NULL if not FINISHED; only FINISHED rows populated
  away_score      INT,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Covering indexes for team-history queries: find all matches for a team, newest first.
CREATE INDEX match_results_home_team_date ON match_results (home_team_id, date DESC);
CREATE INDEX match_results_away_team_date ON match_results (away_team_id, date DESC);
-- For date-range queries and league filtering.
CREATE INDEX match_results_date_league ON match_results (date, league_code);
```

**RLS:** Enable RLS on `match_results`. Add anon SELECT policy (same pattern as `match_days` — migration `0002_rls_read_policies`). The pipeline writes using the service role key.

**Migration file:** created via `supabase migration new add_match_results_table`, then SQL applied via `execute_sql` MCP before snapshotting.

**Files changed:** `supabase/migrations/<timestamp>_add_match_results_table.sql`.

---

### Commit 3 — Historical backfill script (scripts/historical-backfill.ts)

**Fetching strategy: monthly chunks**

One API call per league per calendar month returns all matches in that range. This is far more efficient than one call per day (which would be ~280 calls for a full season vs. 50 monthly calls).

The response for a month is split by date in-process: we upsert each day's slice into `match_days` (existing pattern) and each finished match into `match_results` (new table).

**Runtime estimate (two-season scope: 2024-08-01 → yesterday):**

| | |
|---|---|
| 2024/25 | 10 months × 5 leagues = 50 requests (~7 min) |
| 2025/26 | 10 months × 5 leagues = 50 requests (~7 min) |
| Total API requests | ~100 |
| Rate limit (effective) | 8 req/min |
| API call time | ~14 min |
| DB upserts | ~500 `match_days` rows + ~3,600 `match_results` rows |
| DB time | ~1 minute |
| **Total** | **~14–16 minutes** |

Acceptable as a one-time local run. No chunking or progress checkpointing needed at this scale.

**Extending to three seasons:** `--from` accepts any valid `YYYY-MM-DD` date with no lower-bound restriction. Passing `--from 2023-08-01` will backfill 2023/24 in addition to the two default seasons (~150 API calls, ~22–24 min total). Commit 1's investigation confirmed 2023/24 is accessible on the free tier.

**Script interface:**

```bash
# Default: current season from its start to yesterday.
pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts

# Explicit range — re-run a contiguous window without touching dates outside it.
pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \
  --from 2025-08-01 --to 2026-05-04

# Surgical retry for specific failed dates — non-contiguous, comma-separated.
# Use this after a partial run: copy the failed dates from the end-of-run summary,
# pass them here. Only those dates are fetched and written; everything else is skipped.
pnpm exec tsx --env-file=.env.local scripts/historical-backfill.ts \
  --dates 2025-11-04,2026-01-12
```

`--dates` takes precedence over `--from`/`--to` if both are passed. Season start date derived using the same `deriveSeason()` logic already in `src/trigger/pipeline.ts`.

**Idempotency:**
- `match_days`: upsert on `(date, league_code)`. Re-running overwrites the payload — safe because historical match data does not change after FINISHED.
- `match_results`: upsert on `match_id`. Re-running is a no-op for existing rows.

**Backfilling from existing match_days:** The Phase 3 pipeline already persisted the last ~3 weeks into `match_days`. The backfill script will also populate `match_results` from its own fetch. Any already-fetched dates are idempotent — the script will re-fetch and upsert cleanly. No special migration step needed to populate `match_results` from existing `match_days` rows; the re-fetch is fast (3 weeks ≈ 3 monthly requests per league, covered in the normal run).

**Progress logging:**

```
[PL] Aug 2025: fetched 52 matches, 42 FINISHED → 9 match_days rows, 42 match_results rows
[PL] Sep 2025: …
…
[PL] done — 10 months, 300 matches_results written
[PD] Aug 2025: …
```

**Atomicity per date:**

The Supabase JS client does not support client-side multi-table transactions. The approach is sequential writes per date with a shared try/catch:

```
for each month in range:
  fetch API → all matches for that month
  group matches by date
  for each date:
    try:
      upsert match_days row for this date      ← write 1
      upsert each FINISHED match into match_results  ← write 2
    catch error:
      log "[PL] 2025-10-23: failed — {error.message}. Skipping."
      continue to next date
```

Both writes for a date live inside the same try block. If either fails, neither is considered "done" — the script logs the failure and moves on. Because both writes are idempotent (upsert on conflict), a re-run will re-attempt the failed date cleanly; the successful dates from the first run will no-op. This prevents the drift scenario where `match_days` has a row but `match_results` is missing its matches.

The script exits with a non-zero code if any date failed, so the operator knows to re-run. It logs failed dates at the end in a summary:

```
Done. Written: 1,802 match_results across 248 dates. Failed dates: 2
  [PL] 2025-11-04 — network timeout (re-run to retry)
  [SA] 2026-01-12 — DB write error: ... (re-run to retry)
```

**What this script does NOT do:**
- No editorial generation. Raw match data only.
- No scorers or standings fetch. `season_stats` already has current-season scorer snapshots from the daily pipeline; historical scorer snapshots are not needed for Phase 3.5.

**Files changed:** `scripts/historical-backfill.ts`.

---

### Commit 4 — Helper-query layer (src/editorial/team-history.ts)

**Return types:**

```typescript
// A single finished match as returned from match_results.
interface HistoricalMatch {
  date: string;           // YYYY-MM-DD
  leagueCode: LeagueCode;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamShort: string;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamShort: string;
  homeScore: number;
  awayScore: number;
}

type ResultType = 'W' | 'D' | 'L';

interface Streak {
  type: ResultType;
  length: number;
  since: string;  // date of the first match in the streak
}

// Bundled context for one team.
interface TeamHistoryContext {
  dataFrom: string;             // earliest date in match_results for this team
  lastWin: HistoricalMatch | null;
  lastCleanSheet: HistoricalMatch | null;
  streak: Streak;
  last5: HistoricalMatch[];
}

// Head-to-head between two specific teams.
interface HeadToHeadContext {
  meetings: HistoricalMatch[];  // most recent first, up to limit
}
```

**Two public functions (both accept a Supabase client; pure queries, no side effects):**

```typescript
export async function getTeamHistory(
  db: SupabaseClient,
  teamId: number,
  beforeDate: string,  // exclusive upper bound — "before this match"
): Promise<TeamHistoryContext>

export async function getHeadToHead(
  db: SupabaseClient,
  homeTeamId: number,
  awayTeamId: number,
  beforeDate: string,
  limit?: number,       // default 5
): Promise<HeadToHeadContext>
```

`getTeamHistory` runs two queries: one for the last 5 matches (covers last win, last clean sheet, streak derivation, and last5 in a single result set), one for `dataFrom` (MIN(date) for the team in match_results). Total: 2 queries per team.

`getHeadToHead` is a single query: matches where (home = A and away = B) OR (home = B and away = A), ordered by date DESC, limited to N.

**Internal helpers (not exported):**
- `resultFor(teamId, match: HistoricalMatch): ResultType`
- `isCleanSheet(teamId, match: HistoricalMatch): boolean` — team conceded 0

**Performance:** All queries hit the indexed columns `home_team_id` and `away_team_id`. A full-season table across five leagues contains roughly 1,800 match rows. These queries resolve in single-digit milliseconds.

**Files changed:** `src/editorial/team-history.ts`.

---

### Commit 5 — Prompt enrichment (types.ts + prompts.ts + pipeline.ts)

**Input type change (src/editorial/types.ts):**

Add optional history fields to `MatchEditorialInput`:

```typescript
import type { TeamHistoryContext, HeadToHeadContext } from "./team-history";

export interface MatchEditorialInput {
  context: EditorialContext;
  match: Match;
  topScorers: ScorerEntry[];
  priorCaptionOpenings?: string[];
  // Phase 3.5 — optional. Omitted when match_results is not yet populated.
  homeTeamHistory?: TeamHistoryContext;
  awayTeamHistory?: TeamHistoryContext;
  headToHead?: HeadToHeadContext;
}
```

Fields are optional so existing callers (eval scripts) don't break.

**Prompt changes (src/editorial/prompts.ts):**

In `buildMatchCaptionPrompt`, inject a `TEAM HISTORY` section when any of the three fields are present. The section structure:

```
TEAM HISTORY (dataset covers {dataFrom} to {beforeDate}):

{homeTeam.shortName} (home):
  Current streak: {N} {W/D/L} (since {date})
  Last win: {date} vs {opponent}, {score} — or "none in dataset"
  Last clean sheet: {date} vs {opponent} — or "none in dataset"
  Last 5: [{W/D/L score opponent}, ...]

{awayTeam.shortName} (away):
  [same structure]

Recent meetings (last {N}):
  [{date}: {home} {score} {away}, ...]  — or "none in dataset"

Rules for using TEAM HISTORY:
- Use this context allusively when the data is striking: a streak of 4+, a last
  win more than 6 weeks ago, a head-to-head pattern spanning 3+ meetings.
- If nothing is striking, ignore it entirely — do not mention that you checked.
- Do not make claims about periods before {dataFrom}. The dataset begins there.
  "First win since November" is valid if last win is in November and dataFrom
  is before November. "Best run since 2023" is not valid — dataset does not
  cover 2023.
- Every historical claim must be traceable to the TEAM HISTORY block above.
```

The same structure (without head-to-head) is added to `buildLeagueOverviewPrompt`.

**Pipeline changes (src/trigger/pipeline.ts):**

In Phase B, for each match in the caption loop:
- Run five parallel DB reads: `getTeamHistory` for home and away, `getHeadToHead`, `getCurrentSeasonStats` for each team.
- Pass the results into `buildMatchCaptionPrompt` as optional history fields.
- If any history fetch fails, log a warning and generate the caption without history — never skip the caption.

**Editorial-kind decision (Commit 5 addendum):**

| Kind | History enriched? | Reason |
|---|---|---|
| Match captions | **Yes** | Per-match — history is tightly scoped and signals are clear |
| Match summaries | **Yes** | Per-match — same rationale |
| League overviews | **No** | A league overview spans 6–10 matches (up to 20 teams). Passing full `TeamHistoryContext` for every team would add 3,000–5,000 tokens of data to a single prompt, most of which would be noise. The overview's job is to synthesise the day, not recite per-team history. Captions handle the per-team narrative; the overview handles the cross-match themes. |
| Day overview | **No** | Cross-league; no team-specific focus. History per team would be even noisier here. |

`buildLeagueOverviewPrompt` and `buildDayOverviewPrompt` are unchanged.

**Files changed:** `src/editorial/types.ts`, `src/editorial/prompts.ts`, `src/trigger/pipeline.ts`.

---

### Commit 6 — Eval harness (scripts/eval-history-v1.ts) + HISTORY_TEST_REPORT.md

**Picking test dates:**

After the historical backfill runs, query `match_results` to identify 3–5 dates with interesting patterns. Criteria to check automatically in the eval script:
- A team ending a winless streak of ≥ 4 matches.
- A team continuing a winning streak of ≥ 4 matches.
- A fixture with at least 3 prior meetings in the dataset.

The script prints the selected dates and their rationale before generating editorials. The report documents the selection logic.

**Eval script pattern:** mirrors `scripts/eval-voice-v2.ts`.

For each test date and league, the script generates **two** captions per match:
1. **hist_v1** — with the team_history block injected.
2. **hist_v1_control** — identical prompt, but with the team_history block omitted (as if the feature were not present). This is the current-baseline equivalent.

```
For each test date and league:
  Read match_days + match_results from DB (no API calls)
  For each match:
    call getTeamHistory + getHeadToHead
    generate WITH history → write to match_caption_hist_v1
    generate WITHOUT history → write to match_caption_hist_v1_control
```

Both writes go to experimental kind labels. Neither overwrites production kinds.

**HISTORY_TEST_REPORT.md structure for each test editorial:**

```
[PL / Arsenal v Brighton — 2026-04-14]
Team history injected:
  Arsenal: 4W streak since 2026-03-24; last clean sheet 2026-04-07 vs Fulham
  Brighton: 1L streak; last win 2026-04-07
  H2H: 3 meetings — Arsenal 2-0, Brighton 1-1, Arsenal 3-1
Control (no history):
  "Arsenal made it four straight with a routine 2-0 at the Emirates, ..."
With history:
  "Arsenal extended their winning run to four, keeping a fourth clean sheet in five ..."
Assessment:
  ✓ History used correctly — streak and clean sheet both in payload
  ✓ No claims outside dataset window
  ✓ Allusive, not mechanical — enrichment is visible but not forced
  Verdict: PASS — with-history version is richer
```

**Calibration failure definitions** — the following are explicit failures and must be flagged in the report:

| Failure type | Description | Example |
|---|---|---|
| **Under-threshold use** | References a streak of length 1 or 2 as if it's notable. A single result is not a streak; two results is a minimum pattern, not a talking point. | "Brighton come into this on the back of back-to-back wins" when H2H shows only 2 meetings |
| **Failure to use striking data** | A streak of length ≥ 5 that ended on the test date is ignored entirely. If a team's 6-game unbeaten run ended today, that is the story. Omitting it is a calibration failure. | Arsenal 6W streak ended by Brighton, caption says nothing about it |
| **Horizon violation** | Caption makes a historical claim about a period before `dataFrom`. | "Their best run since the 2023/24 season" when dataFrom is August 2025 |
| **Hallucinated specificity** | Caption cites a specific date, opponent, or score not present in the team_history payload. | "Their last win came at Anfield in February" when payload shows last win was vs Burnley |

**Phase pass criterion:**

All three of the following must hold:

1. **No calibration failures** of type "horizon violation" or "hallucinated specificity" across all test editorials. These are factual errors — zero tolerance.
2. **No more than 1** calibration failure of type "under-threshold use" or "failure to use striking data" across all test editorials. These are voice-quality errors — near-zero tolerance.
3. **The with-history version is recognisably richer than the control version on at least 60% of test editorials**, judged qualitatively. The 60% threshold accounts for matches where there simply isn't striking history to surface — in those cases the two versions should be roughly equivalent, which is acceptable.

If criteria 1 or 2 fail, tighten the prompt instructions before declaring the phase done. If criterion 3 fails, investigate whether the team_history payload is being constructed correctly and whether the prompt threshold ("streak of 4+") is calibrated right.

**Files changed:** `scripts/eval-history-v1.ts`, `HISTORY_TEST_REPORT.md`.

**Calibration refinement (post-commit-6, added 2026-05-05):**

After two eval runs (commit 6 + rerun), the original mechanical thresholds proved too strict for a mixed-quality penalty — they caught genuine failures but also flagged specific evocative editorial details as over-use. The refined criterion for (c) is:

- **Genuine failures (still zero tolerance):** generic filler ("a run of two defeats continued"), hollow qualifiers ("their only previous meeting"), horizon violations (season counts inferred from meeting counts), invented facts.
- **Acceptable below threshold:** specific verifiable detail — a notable prior meeting score/venue/opponent, a clean sheet gap referenced by month, a goal tally from two prior meetings — when it reads well and is directly traceable to the payload.

Three prompt additions were made to prevent the specific failures observed: (1) lastCleanSheet added as a valid signal with ≥6-week threshold and no-venue-reference constraint; (2) HARD LIMIT #5 prohibiting season count inference from meeting count; (3) a BAD example for the season-count pattern. See DECISIONS.md 2026-05-05 entry for full rationale.

---

## Risks and open questions

**Free-tier scope (resolved in Commit 1):** If the free tier does not allow prior-season fetches, the backfill window is limited to the current season (Aug 2025 – present). This is sufficient for streaks and recency claims within the current season. The prompt must declare the data boundary clearly, and the model must not extrapolate beyond it.

**Wide date-range requests (resolved in Commit 1):** Football-Data.org may reject month-wide `dateFrom/dateTo` windows. If so, fall back to weekly chunks (≈40 requests per league per season instead of 10; runtime roughly 4× longer, ~30 min). Update Commit 3's implementation accordingly after Commit 1's findings.

**First-run bootstrap (no match_results data yet):** When Commit 5 lands but before Commit 3's backfill runs, `getTeamHistory` returns nulls/empty arrays. Because the history fields in `MatchEditorialInput` are optional, `buildMatchCaptionPrompt` omits the history block entirely in this state. The pipeline falls back to the current behaviour. No breakage.

**Token budget:** Adding a team_history block to each caption call adds roughly 200–400 tokens of input context per match. At Claude Sonnet input token pricing this is negligible at production scale (~20 matches/day). The 30k tokens/min org ceiling is unaffected — sequential caption generation keeps per-minute burst low.

**Over-reliance on history in the model:** Even with the "ignore if unremarkable" instruction, early eval runs may show the model reaching for history context when nothing notable is there. The eval harness is designed to catch this. Tighten the threshold wording in the prompt if needed before shipping.

---

## Production enablement

**When Phase 3.5 ships, the production daily task picks up the new prompt enrichment automatically.** No follow-up toggle or separate commit needed.

The mechanism: Commit 5 makes `homeTeamHistory`, `awayTeamHistory`, and `headToHead` optional fields on `MatchEditorialInput`. The pipeline (Commit 5) calls `getTeamHistory` and `getHeadToHead` before building each prompt. Once `match_results` is populated (Commit 3's backfill has run), those calls return data and the history block appears in production editorials from the next daily run onward.

Before the backfill runs, the fields are null/empty, the history block is omitted, and the pipeline behaves exactly as it does today. There is no flag to flip.

**Pre-conditions before resuming the schedule:**
1. Commit 3's backfill script must have run to completion (or near-completion — isolated date failures are acceptable).
2. Commit 6's eval must have passed all three phase criteria.
3. **`pnpm trigger:deploy` must be re-run** after Commits 4 and 5 land. Trigger.dev deploys a bundled snapshot of the code at deploy time — changes to `prompts.ts` and `pipeline.ts` do not reach the live scheduled task until a new deploy is pushed. The import chain is a single source of truth (`daily-report.ts` → `pipeline.ts` → `prompts.ts`, no forked copies), but the deployed bundle is pinned to the version at last deploy. This is a small action item, not a problem — just make it explicit.
4. ROADMAP.md updated to mark Phase 3.5 ✅ DONE and Phase 4 ← CURRENT.

The schedule (currently paused) is re-enabled at the start of Phase 4, not at the end of Phase 3.5, as originally planned.

---

## What this phase does NOT do

- Does not regenerate existing editorials. The 180+ editorials already in the DB are untouched.
- Does not change the website (Phase 4). Phase 4 will pick up enriched editorials naturally — the new editorial fields are backward-compatible.
- Does not resume the daily schedule. Schedule stays paused throughout Phase 3.5.
- Does not fetch historical scorer or standings data. `season_stats` already has current-season snapshots; multi-season scorer history is not needed for the claims this phase enables.
- Does not add multi-season history claims. The prompt explicitly declares the dataset boundary. Claims like "best November in five years" require data from five Novembers, which we do not have.
