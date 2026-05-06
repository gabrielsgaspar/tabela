# Phase 6 — Proposed Post-Launch Features

> **Note:** These are post-launch feature ideas. Captured during Phase 6 planning but
> deferred until the site has real users to inform their priority and design.

---

## What we were planning

Two sequential tracks:

**Pre-launch sequence** — operational steps (done by you) plus one small code commit (B4),
required before the daily schedule is unpaused. Code work is Commit 1 only.

**Phase 6 features** — the differentiators that make Tabela feel like a finished product.
Four discrete commits, ordered from simplest to most complex.

---

## Pre-launch sequence (ordered)

These must complete, in order, before the daily schedule is unpaused.

| # | Item | Who | Code? |
|---|------|-----|-------|
| 1 | ElevenLabs Creator tier upgrade (~$22/mo) | You | No — billing UI |
| 2 | Phase 5 B3: trigger `daily-report-one-shot`, verify `audio_url` populated, curl one mp3 for 200 | You | No — Trigger.dev dashboard |
| 3 | Phase 5 B4: `/listen` ISR fix (Commit 1 below) | Claude | Yes |
| 4 | Production voice swap: update `ELEVENLABS_VOICE_ID` in Trigger.dev Production from Sarah to chosen voice | You | No — dashboard env var |
| 5 | Unpause daily schedule `sched_wqapcm3eta5zi6huqsm83` | You | No — Trigger.dev dashboard |

**Commit 1 (B4) gate:** do not write Commit 1 until B3 is confirmed (real `audio_url` rows in DB). Committing the ISR fix before rows exist would make the deployed page stale on the empty state.

---

## Commits

### Commit 1 — Phase 5 B4: `/listen` ISR fix

**Gate:** B3 complete — real `audio_url` rows confirmed in Supabase.

**Files:** `src/app/listen/page.tsx`

Two changes:

1. Add at the top of the file (after imports, before function declarations):
   ```ts
   export const revalidate = 3600;
   ```
   Rationale: daily task runs at 07:00 UTC, audio rows appear minutes after. 1-hour ISR means the episode list is at most 60 minutes stale — acceptable for a daily briefing. `force-dynamic` would hit Supabase on every request (unnecessary). The build currently prerendered this page because it found zero `audio_url` rows; `revalidate = 3600` converts it to ISR without adding server load.

2. Remove the `DEV-ONLY` block (lines 151–172 in current `page.tsx`):
   ```ts
   // Remove entirely:
   if (process.env.NODE_ENV === "development" && episodes.length === 0) {
     // ... MDN test audio injection ...
   }
   ```
   The block was gated on `episodes.length === 0`. Once B3 populates real rows the
   condition would never be true in production — but removing it is cleaner and
   matches the "Remove once B3 confirms real audio_url rows are in the DB" comment
   that was placed there deliberately.

**Vercel deploy:** push to `main` → Vercel auto-deploys. No manual trigger needed.

**Verification:** `curl -s -o /dev/null -w "%{http_code}" https://tabela-topaz.vercel.app/listen` → `200`. Open `/listen` in browser — confirm episode list is visible (not the "No episodes yet" empty state).

---

### Commit 2 — Season leaderboards page

**New route:** `/leaderboards`

**New files:**
- `src/app/leaderboards/page.tsx` — server-rendered page

**Changed files:**
- `src/lib/queries.ts` — add `getAllLeagueSeasonStats` (fetch latest snapshot for all 5 leagues in one query, same 10-row deduplication pattern as `getLatestSeasonStats`)
- `src/app/page.tsx` — add "View all leaderboards →" link from the Stat Leaders section header
- `src/components/Masthead.tsx` — consider whether to add Leaderboards to nav; check the design reference `claude_design/` before touching nav

**What the page shows:**

Top section per league (5 blocks, one per league):
- Top 5 goalscorers: player name, team name, team crest, goals
- Top 5 assisters (if the `season_stats` payload includes them — check the `SeasonStatsPayload` type first; if not present in the payload, omit assisters silently)

The data comes from the `season_stats` table, already available via the existing anon-key client. No new Supabase queries beyond the one in `getLatestSeasonStats`. No migrations needed.

**Layout:** single-column sections separated by `rule-t`, each league headed with flag + league name + link to `/leagues/[slug]`. Use existing `StatLeaderCard` component for the leader, a plain ranked list for positions 2–5. No new components needed — compose from `StatLeaderCard`, `SectionHeader`, `Masthead`, `Footer`.

**Routing:** link from the home page `SectionHeader` ("The leaders") deck row and from each league page's stat section.

---

### Commit 3 — Open graph images

**Goal:** each page produces a correct `og:image` so sharing a link on Slack, Twitter, or iMessage shows a real preview card instead of nothing.

**New files:**
- `src/app/opengraph-image.tsx` — Next.js `ImageResponse` for the home/fallback OG image
- `src/app/leagues/[slug]/opengraph-image.tsx` — league-specific OG image
- `src/app/teams/[id]/opengraph-image.tsx` — team-specific OG image

**`ImageResponse` design (for all three):**

Keep it simple — text-only, on-brand. No external font loading (use system `serif` stack to avoid rate-limit issues on Vercel's OG generation). Layout:
```
┌─────────────────────────────────┐
│  Tabela.                        │  ← wordmark, Playfair-ish serif via system
│                                 │
│  [Page-specific headline]       │  ← h1 treatment, large
│                                 │
│  [Subtext — date, league name,  │
│   or team name]                 │
└─────────────────────────────────┘
```
Background: `#1a1a18` (pitch). Text: `#f2eed5` (paper). Accent: `#f5c842` (mustard) for the wordmark period.

Dimensions: `1200 × 630` (standard OG).

**`src/app/layout.tsx`** — ensure root metadata includes `openGraph.type`, `twitter.card`, and fallback `openGraph.images` pointing at the home OG route. Individual page files export their own `generateMetadata` where needed.

**No `og:description` work** — that's already handled by existing metadata exports or is out of scope.

---

### Commit 4 — "Follow a team": auth UI + preferences table

**Goal:** replace the static `FollowTeamCTA` placeholder with a live sign-up form. Users enter an email address and pick a team. The CTA becomes functional.

**Architecture decision:**

Use **Supabase Auth magic-link** (passwordless email). No OAuth providers — that's over-engineering for a newsletter-style follow feature. Users submit email → receive a magic link → arrive back at the site authenticated → team follow is saved.

This does not require a full auth session throughout the site. The only protected action is saving/removing a team follow. The rest of the site remains fully public.

**New Supabase migration:**

```sql
-- 0005_user_team_follows.sql
CREATE TABLE IF NOT EXISTS user_team_follows (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     integer NOT NULL,          -- Football-Data.org team ID
  team_name   text NOT NULL,
  league_code text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX user_team_follows_uniq ON user_team_follows (user_id, team_id);

-- RLS
ALTER TABLE user_team_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own follows"
  ON user_team_follows FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own follows"
  ON user_team_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own follows"
  ON user_team_follows FOR DELETE
  USING (auth.uid() = user_id);
```

**Changed files:**

`src/app/FollowTeamCTA.tsx` — convert from static server component to a client component boundary. The right column becomes a two-state UI:
- **Unauthenticated:** email input + "Follow a team" submit button. On submit: call `supabase.auth.signInWithOtp({ email })`. Show a "Check your inbox" confirmation.
- **Authenticated (session exists):** show a team picker (a `<select>` populated from `LEAGUE_META` teams — a flat list of all ~100 teams across the five leagues, grouped by league) + "Save" button. The team list comes from `match_results` (which has all team IDs and names). On save: call the Supabase client to insert a `user_team_follows` row.

`src/app/layout.tsx` — add Supabase Auth session context (use `@supabase/auth-helpers-nextjs` or `@supabase/ssr`; check what is already installed before adding a dependency).

**What this does NOT include:**
- The actual weekly digest email — that is Commit 5.
- A `/account` page or session management UI — out of scope.
- "Unfollow" UI — Phase 6 polish, not launch requirement.

---

### Commit 5 — "Follow a team": weekly digest job

**Goal:** every Monday at 07:30 UTC, the pipeline sends each follower a one-page email brief about their team's latest result and how the rest of the league shifted.

**New files:**
- `src/trigger/weekly-digest.ts` — Trigger.dev scheduled task

**Dependencies to add:**
- `resend` (the original F1-repo pattern, per ROADMAP.md)
  - Add `RESEND_API_KEY` to `.env.local` and to Trigger.dev Production env vars
  - Document in `DECISIONS.md` (new paid dependency)

**Task design:**

```
Schedule: cron("30 7 * * 1")  — 07:30 UTC every Monday
```

Per run:
1. Query `user_team_follows` for all rows (service role key, bypasses RLS).
2. For each unique team, get the most recent finished match from `match_results`.
3. For each unique team, get the team's current league stats from `season_stats`.
4. Group by user — build one email payload per user (some users may follow multiple teams; one email, multiple team sections).
5. Generate email body via a lightweight template (not Claude — this is a structured summary, not editorial prose). Keep it short: result, new position, league table top 3.
6. Send via Resend.

**Email format:** plain HTML, dark header with Tabela wordmark, one section per followed team, unsubscribe link (hard-coded `DELETE FROM user_team_follows WHERE user_id = $1` via a signed URL or Supabase magic-link flow — design this when implementing).

**Failure handling:** wrap each send in try/catch; log failures; never let one bad send kill the batch.

---

## What is NOT in Phase 6

- "Unfollow" UI or account management page
- RSS feed — mentioned as nav link in design; out of scope for now
- Podcast feed (`<podcast:guid>` etc.) — requires real audio backlog first
- Contact page
- Any changes to the editorial pipeline or voice
- Any changes to the visual design or Tailwind tokens

---

## Pre-conditions for each commit

| Commit | Gate condition |
|--------|---------------|
| Commit 1 | B3 confirmed: at least 6 `audio_url` rows in DB |
| Commit 2 | No gate — can land any time |
| Commit 3 | No gate — can land any time |
| Commit 4 | No gate — can land any time |
| Commit 5 | Commit 4 merged; Resend account created; `RESEND_API_KEY` obtained |

Commits 2, 3, and 4 are independent and can be written in any order.

---

## Commit sequence

```
Commit 1   /listen ISR fix + remove MDN dev block   src/app/listen/page.tsx
Commit 2   Season leaderboards page                  src/app/leaderboards/, src/lib/queries.ts
Commit 3   Open graph images                         src/app/**/opengraph-image.tsx
Commit 4   Follow a team: auth UI + DB table         src/app/FollowTeamCTA.tsx, migration 0005
Commit 5   Follow a team: weekly digest job          src/trigger/weekly-digest.ts
```
