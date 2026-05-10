# TASKS.md

A running backlog of ideas for Tabela beyond the current `ROADMAP.md` phase. Not a plan — items here are unscoped until they're picked up and promoted into a `PLAN.md` (or merged into `PHASE_6_PROPOSED_FEATURES.md`).

Format: each item has a short description, why it matters, and any known constraint (especially the Football-Data.org free-tier limits documented in `DATA.md`).

---

## Coverage

### Add Champions League and Europa League
Expand beyond the five domestic leagues. The European nights are when a lot of the season's narrative actually lives, and the audience that reads Tabela on a Tuesday morning probably wants the Madrid–City fallout.

- Football-Data.org competition codes: `CL` (UEFA Champions League), `EL` (Europa League). Confirm both are accessible on the free tier before committing — `DATA.md` only documents the domestic five.
- Schema impact: `match_days`, `match_results`, `season_stats` are all keyed by league code, so adding leagues is mostly an additive change. Editorial prompts and `LEAGUE_META` need entries.
- Open question: do European competitions get their own day overview, or are they folded into the domestic overview ("Real Madrid lost in Munich and then drew at home to Getafe — a bad week")? Worth deciding before the prompt work.

### Other competitions to consider later
- Domestic cups (FA Cup `FAC`, Copa del Rey `CDR`, Coppa Italia `CIT`, DFB-Pokal, Coupe de France) — adds editorial colour around midweek upsets.
- Conference League — only if Champions/Europa land cleanly first.
- World Cup / Euros windows — seasonal, not continuous.

---

## Editorial intelligence

### Identify the most important matches of the week
Right now every match gets the same editorial weight. A `Brighton 1–1 Fulham` and a `City 2–3 Arsenal` look the same in the rendered output. We should compute a per-match "stakes" score and let the editorial pipeline lean into the high-stakes ones (longer caption, lead position, callouts).

Signals to combine into the score:
- **Title race:** either team in the top 2–3, gap ≤ 6 points, ≤ 8 matches remaining.
- **Relegation:** either team in or within 3 points of the bottom three.
- **European qualification:** either team in or within 3 points of the league's UCL/UEL/UECL cutoff (cutoff varies by league — encode in `LEAGUE_META`).
- **Head-to-head history:** derby, recent meetings decided by 1 goal, prior cup tie this season.
- **Form deltas:** unbeaten run hitting an in-form opponent; a team trying to break a losing streak.
- **Goal-difference swings:** late-season matches where GD could decide tiebreakers.

Implementation sketch: a `match-stakes.ts` helper in `src/editorial/` that returns a numeric score plus a list of reasons (`["title-race", "relegation-six-pointer"]`). The prompt gets the reasons as structured input — it can allude to them but never invent the underlying facts (per the no-invention rule in `CLAUDE.md`).

### Storyline tracking across the season
Persist editorial themes across runs ("Wolves' relegation arc", "the Arteta–Guardiola subplot") so the daily overview can call back to them. Probably a `storylines` table or a tagged subset of `season_stats`. Needs design — don't build until we know the prompt benefits.

### Match previews for upcoming games
A short, voice-consistent preview the night before — what's at stake, recent form, one thing to watch. Distinct from the post-match editorial; should live in its own row type so it doesn't pollute the editorial archive.

---

## Upcoming games

### Show fixtures on the home page
Today's home page is yesterday-facing. Add an "On tonight" / "This weekend" rail so the site is useful before kickoff, not only after.

- Football-Data.org `/matches?dateFrom=…&dateTo=…` supports future fixtures. Already used; just needs a new query and component.
- Use the existing `MatchCard` skeleton state (no score yet) — visually, a fixture is a match card with `null` scores and a kickoff time instead of a final time.
- Order by stakes score (above) when more than ~6 are visible.

### Team page upcoming fixtures
The team page already has an "upcoming fixtures" section (per Phase 4B). Audit it — confirm it's pulling live data, not the same-day data we have for the home page. If it's already real, mark this done.

### Calendar / week view
A `/fixtures` route showing the next 7 days grouped by date, all five leagues + UCL/UEL once added. Lower priority than the home-page rail.

### Reminders / "watch this match" (post-auth)
Once "Follow a team" lands (Phase 6 Commit 4), let users opt in to a reminder email or push notification when a followed team is about to play. Worth doing only after we see whether anyone actually follows teams.

---

## Specialised team stats

### What we have today
`season_stats` payload includes top scorers, assisters, basic position data. The team page shows an 8-stat grid.

### What we can add on the free tier
- **Form table:** points / goals scored / conceded over the last 5 and 10 matches. Computable from `match_results`, no new API calls.
- **Home vs away splits:** points and goal record split by venue. Same — derive from `match_results`.
- **Clean sheets / failed to score** counts.
- **Goal-time distribution:** which 15-min window do they score/concede in? Only useful if we get minute-level data — currently we don't (see free-tier limits).
- **Goals-from-set-pieces ratio:** also requires event-level data we don't have.
- **Discipline:** yellows / reds per match. Check whether the free-tier `/matches` payload includes booking events; if not, defer.

### Stats that need an API upgrade
xG, shots, possession %, pass completion, duels, expected goals against, pressing intensity, finishing over- vs under-performance — all of these are the things that make a stats page genuinely good, and none are on the Football-Data.org free tier. Migration target per `DATA.md` is API-Football (RapidAPI). Worth a `DECISIONS.md` entry when we commit to this, plus a cost-benefit check (paid API + more editorial substance vs. staying lean).

### League-context stats
- Where this team ranks in the league for each stat (3rd-fewest goals conceded, etc.).
- Rolling form vs league average.
- Strength-of-schedule for the next 6 fixtures, computed from current standings.

---

## Site and product

### Search
Search across editorials, teams, players. Postgres FTS over the `editorials` table is probably enough for v1; no new dependencies.

### Archive browsing
Calendar picker on `/archive` to jump to any date's editorial. Today's only entry point is `/listen` (audio) — text-archive equivalent is missing.

### RSS feed
Already noted in the design as a Footer link; ship a real feed for the daily overview + each league overview.

### Open Graph images
Already scoped as Commit 3 in `PHASE_6_PROPOSED_FEATURES.md`. Not duplicating here — flagged so we don't double-track.

### "Follow a team" + weekly digest
Already scoped as Commits 4 and 5 in `PHASE_6_PROPOSED_FEATURES.md`. Same — not re-listing.

---

## Editorial and voice

### Multi-voice / multi-language
Tabela is a Portuguese word and the brand has a Latin feel. A Portuguese-language edition (or Spanish, for La Liga) would be a real differentiator. ElevenLabs supports both; the prompt work is the heavier lift (a separate `VOICE_PT.md` and prompt set, not a translation pass).

### Voice variants
Currently one narrator (planned: Adam, per Phase 6). Consider a second narrator for European nights, or a women's-football edition with a different voice if/when we expand coverage.

### Editorial quality monitoring
A periodic eval harness (like the Phase 3.5 history eval) that samples recent editorials and flags voice drift, invented facts, or hedge phrases. Run weekly, post to Discord.

---

## Operations and infrastructure

### Observability beyond Discord notifications
Discord webhook tells us a run finished. It doesn't tell us about partial failures (e.g., one league fetched fine but the editorial generation hedged). A small `run_health` table that aggregates per-run signals (matches fetched, editorials generated, audio synthesised, voice audit pass/fail) would catch silent degradation.

### Backfill resilience
The historical backfill (Phase 3.5) is a one-shot script. If the schema changes or we add a league, we need a clean re-runnable path. Audit `scripts/historical-backfill.ts` for idempotency under schema drift before we add `CL`/`EL`.

### Caching / cost control
Anthropic and ElevenLabs costs scale with leagues. Doubling coverage (5 → 10 competitions) roughly doubles spend. Track per-run cost; consider whether some competitions get text-only (no audio).

---

## Out of scope (for now)

Documenting these so we don't keep re-litigating them:

- Live scores / minute-by-minute updates — Tabela is a *briefing*, not a livescore site.
- User-generated content (comments, predictions, fantasy) — different product.
- Mobile app — the web app is responsive and the audio is the mobile use case.
- Women's football coverage — a worthy project, but its own thing. Don't tack it on.

---

## How to use this file

- Add ideas freely; do not delete unless explicitly retired.
- When an item is ready to be built, write a `PLAN.md` (or extend `PHASE_6_PROPOSED_FEATURES.md`) and reference it back here.
- When an item ships, move it to a "Shipped" section at the bottom with the commit / phase reference — don't just delete it (we want the trail).
