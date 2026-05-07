# DATA.md

Sources, shapes, storage. Read this before writing anything that touches match data.

## Primary data source — Football-Data.org

We use [Football-Data.org](https://www.football-data.org/) on the free tier for the MVP.

**Why:** free, ungated for the five leagues we care about, no credit card.

**Limits to plan around:**

- 10 requests per minute. Build fetch logic with backoff; never burst.
- **No goal events on the free tier.** Final scores yes, but who scored / assisted / minute-by-minute — not available. This is the single biggest constraint and shapes Phase 1's "is this enough?" decision.
- **No detailed player stats** (no shots, no xG, no duels). Top scorers and assists in the season *are* available via `/competitions/{code}/scorers`.
- API returns UTC times.

**If the free tier proves insufficient,** the migration target is API-Football (RapidAPI). Note this in `DECISIONS.md` with the trigger that forced the change.

### Auth

Header: `X-Auth-Token: $FOOTBALL_DATA_TOKEN`

### API base

`https://api.football-data.org/v4`

## Leagues

| Code | League | Country |
|------|--------|---------|
| `PL`  | Premier League | England |
| `PD`  | La Liga (Primera División) | Spain |
| `BL1` | Bundesliga | Germany |
| `SA`  | Serie A | Italy |
| `FL1` | Ligue 1 | France |

> **Note.** `SA` is Italian Serie A. Brazilian Série A is `BSA` and is **not** on the free tier. Tabela's MVP scope is the top five European leagues.

## Endpoints we use

| Purpose | Endpoint | Notes |
|---------|----------|-------|
| Yesterday's matches | `GET /competitions/{code}/matches?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Use same date for both for a single day |
| Current standings | `GET /competitions/{code}/standings` | Updated after each matchday |
| Top scorers (season) | `GET /competitions/{code}/scorers?limit=20` | Includes goals and assists |
| League info | `GET /competitions/{code}` | Current matchday, season dates |

## Sample response shapes

Always match these in TypeScript types. Do not paraphrase.

### `/competitions/{code}/matches`

```json
{
  "matches": [
    {
      "id": 497390,
      "utcDate": "2026-05-02T14:00:00Z",
      "status": "FINISHED",
      "matchday": 36,
      "homeTeam": { "id": 57, "name": "Arsenal FC", "shortName": "Arsenal", "tla": "ARS", "crest": "..." },
      "awayTeam": { "id": 397, "name": "Brighton & Hove Albion FC", "shortName": "Brighton Hove", "tla": "BHA", "crest": "..." },
      "score": {
        "fullTime": { "home": 2, "away": 0 },
        "halfTime": { "home": 1, "away": 0 }
      }
    }
  ]
}
```

### `/competitions/{code}/scorers`

```json
{
  "scorers": [
    {
      "player": { "id": 38004, "name": "Erling Haaland", "nationality": "Norway" },
      "team":   { "id": 65, "name": "Manchester City FC" },
      "goals": 24,
      "assists": 5,
      "playedMatches": 30
    }
  ]
}
```

## Storage (Phase 3+)

We persist daily snapshots so the website can be browsed and so Claude has memory across runs.

**Choice:** Supabase (Postgres + Storage). Free tier covers the MVP.

**Tables (initial sketch — confirm in Phase 3 PLAN.md):**

- `match_days(date, league_code, payload jsonb, created_at)` — raw daily fetch results.
- `season_stats(league_code, season, snapshot_date, payload jsonb)` — running totals (top scorers, standings) per snapshot, so we can show trends and Claude can reference them.
- `editorials(date, league_code | null, kind, headline, body, audio_url, created_at)` — Claude-generated summaries, including audio file URL.
- `teams_followed(user_id, team_id)` — for the "follow a team" feature (deferred until auth exists).

**Audio files:** Supabase Storage bucket `episodes/`, path pattern:
- `{date}/{kind}.mp3` — for `day_overview` (empty slug, no trailing dash)
- `{date}/{kind}-{slug}.mp3` — for `league_overview` (slug = lowercase league code, e.g. `pl`)

Examples: `2026-05-06/day_overview.mp3`, `2026-05-06/league_overview-pl.mp3`

## Season memory store

The "Igor Thiago is currently 2nd top scorer" trick requires Claude's editorial generation step to read the *current* season state when writing about today's matches. The pattern:

1. Daily task fetches matches.
2. Daily task fetches updated standings and top scorers, writes a fresh row to `season_stats`.
3. Editorial generation reads the latest `season_stats` row plus today's matches, passes both into Claude as structured context.

Without this, Claude either invents context or stays generic. Plan it from the start.

## Time and date handling

- All API dates are UTC.
- "Yesterday" = the calendar day before *the task's run timestamp*, in UTC.
- The website displays dates in the user's local timezone, but storage and queries are UTC.
- Date keys in storage: `YYYY-MM-DD` strings, UTC.

## Open questions

- Does the free tier rate-limit allow all five leagues fetched in one run? (10 req/min × ~3 endpoints × 5 leagues = 15 requests; should fit in 2 min with sequential fetches.)
- Top scorers endpoint — does it include assists on free tier? (Confirmed yes per docs, verify in Phase 1.)
- How do we handle a partial-data day (some leagues fetch fine, one fails)? (Phase 1 should design for graceful degradation.)
