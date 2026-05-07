# Phase 6 Audit

> Produced 2026-05-07. Do not modify. Findings are discussed and prioritised
> before fixes are written.

---

## 1. Documentation Drift

### CLAUDE.md — line 11

`Next.js 15 · Trigger.dev v3` — both wrong.

- Actual Next.js version: **16.2.4** (DECISIONS.md 2026-05-04 note, line 284;
  README.md line 15; `package.json` `"next": "^16.2.4"`).
- Actual Trigger.dev SDK version: **4.4.5** (`@trigger.dev/sdk` in
  `package.json`). The embedded block appended to CLAUDE.md even heads itself
  "Trigger.dev Basic Tasks (v4)" — CLAUDE.md contradicts itself on the same
  page.

**Fix:** update the stack line in CLAUDE.md to `Next.js 16 · Trigger.dev v4`.

---

### README.md — line 18

`**Phase 1 in progress.**` — the status section was never updated. We are on
Phase 6. Every sentence in that paragraph is stale (data pipeline under
development, website under active development, etc.).

README.md line 15 also says `Trigger.dev v3`. Same issue as above.

**Fix:** replace the Status section to reflect current state (site live, Phase 6
pre-launch).

---

### DECISIONS.md — line 21 (Stack decision entry)

"Single Next.js **15** project. Trigger.dev **v3** tasks…" — stale. DECISIONS is
append-only so this should not be edited; a clarifying note should be appended
instead.

**Fix:** append a short 2026-05-07 note: "The initial stack entry references
Next.js 15 and Trigger.dev v3. Actual resolved versions are Next.js 16.2.4 and
`@trigger.dev/sdk` 4.4.5 (v4 SDK). No breaking changes; App Router patterns are
identical."

---

### DATA.md — line 102 (`teams_followed` schema sketch)

The sketch shows `teams_followed(user_id, team_id)` — two columns. The actual
migration (`0_initial_schema.sql:98–106`) adds `id bigserial` and
`created_at timestamptz` and calls the unique constraint
`teams_followed_user_team_uniq`. More importantly, `PHASE_6_PROPOSED_FEATURES.md`
proposes replacing this with a new `user_team_follows` table that adds
`team_name text` and `league_code text` columns and puts a proper FK on
`auth.users`. DATA.md describes neither the currently migrated shape nor the
planned Phase 6 shape.

This is low-stakes (the table has no production rows and no code reads it), but
DATA.md is the schema source of truth and it is wrong.

**Fix:** update DATA.md §Storage tables to show the actual `teams_followed`
schema. Add a note that the Phase 6 "Follow a team" commit will replace it with
`user_team_follows`.

---

### DATA.md — line 104 (Storage path)

Documents the path as `{date}/{kind}-{slug}.mp3`. This is the *intended* path,
but the current `src/audio/upload.ts:22` implementation produces
`{date}/day_overview-.mp3` (trailing dash) when `slug` is `""`. The production
DB already has one row with `audio_url` ending in `day_overview-.mp3` (editorial
id 263). DATA.md does not flag this edge case.

**Fix:** update DATA.md note on audio storage paths to document the edge case
and the fix direction (see §4 for the code fix).

---

### ROADMAP.md — Phase 6 "features" block (lines 166–170)

The Phase 6 features block lists: Follow a team, Country flag filter, Season
leaderboards, email digest, OG images — as Phase 6 deliverables. But
`PHASE_6_PROPOSED_FEATURES.md` explicitly defers all of these to post-launch:
"These are post-launch feature ideas. Captured during Phase 6 planning but
deferred until the site has real users."

ROADMAP.md and PHASE_6_PROPOSED_FEATURES.md contradict each other on the scope
of Phase 6.

**Fix:** replace the "Phase 6 features" block in ROADMAP.md with a one-line
pointer: "Post-launch feature candidates are captured in
`PHASE_6_PROPOSED_FEATURES.md`."

---

### ROADMAP.md — Phase 6 "Fresh session note" (lines 147–148)

This is meta-process instruction left in the document. It was useful for
bootstrapping this session but belongs in a private note, not in the permanent
roadmap.

**Fix:** remove the note once the audit and fix passes are committed.

---

## 2. Deferred Items Inventory

### Must-fix before launch

**D1 — Trailing-dash Storage path bug**
`src/audio/upload.ts:22` · `DECISIONS.md 2026-05-06 "empty slug"` entry

`buildStoragePath()` produces `day_overview-.mp3` instead of `day_overview.mp3`
because `slug` is `""` for `day_overview` rows and the template literal is
`` `${ref.kind}-${ref.slug}` ``. The production DB already contains one row with
the bad URL (`episodes/2026-05-04/day_overview-.mp3`). The fix is 3 lines in
`upload.ts` (documented in DECISIONS.md). Must land **before** ElevenLabs tier
upgrade and B3, because the first production synthesis run will write bad URLs
that are then harder to correct. Existing bad URL in the DB will need to be
re-synthesised or manually renamed.

```ts
// fix:
const suffix = ref.slug ? `-${ref.slug}` : "";
const filename = `${ref.kind}${suffix}.mp3`;
```

**D2 — ElevenLabs Creator tier upgrade** (operational, not code)
`ROADMAP.md:155` · `DECISIONS.md 2026-05-06 "ElevenLabs free-tier abuse
detection"` entry

Free-tier container IP abuse detection blocks all production synthesis attempts.
Creator tier ($22/mo) is the minimum viable tier for daily runs. Required before
any production audio exists.

**D3 — Production voice swap: Sarah → George** (operational)
`DECISIONS.md 2026-05-06 "Phase 5 B3: Production ELEVENLABS_VOICE_ID…"` entry

`ELEVENLABS_VOICE_ID` in Trigger.dev Production is currently
`EXAVITQu4vr4xnSDxMaL` (Sarah — verification stand-in). Must be changed to
`jsCqWAovK2LkecY7zXl4` (George) before the schedule is unpaused. The
`env.example` file documents the intended voice. The DECISIONS.md entry has an
explicit TODO for this.

**D4 — Phase 5 B3: production audio one-shot verification** (operational)
`ROADMAP.md:157`

Trigger `daily-report-one-shot` for a recent matchday (e.g. 2026-05-06) after
D1, D2, and D3 are complete. Verify `audio_url` populated on all `day_overview`
and `league_overview` rows for the target date. Curl one mp3 URL for `200
audio/mpeg`. No code involved — Trigger.dev dashboard action.

**D5 — `/listen` ISR fix (Phase 5 B4)**
`src/app/listen/page.tsx` · `ROADMAP.md:157` · `DECISIONS.md Phase 4B closure`

The listen page has no `revalidate` or `dynamic` directive. It was prerendered
as static HTML when no `audio_url` rows existed. After D4 populates rows, the
live site will continue showing the empty state until this is applied.

Two changes needed (per PHASE_6_PROPOSED_FEATURES.md Commit 1):
1. Add `export const revalidate = 3600` after imports.
2. Remove the DEV-ONLY MDN test audio block (lines 151–172) — gated on
   `NODE_ENV === "development"` so harmless in production, but scheduled for
   removal. Clean it up at the same time.

Gate: D4 confirmed (real `audio_url` rows in DB) before committing this, per
PHASE_6_PROPOSED_FEATURES.md.

**D6 — Stale empty-state copy in `/listen`**
`src/app/listen/page.tsx:44–50` (`HeroEmpty` component)

Text reads: *"Audio synthesis is coming in Phase 5 — check back once the
ElevenLabs pipeline is wired."* This is a visible user-facing string. After D4
and D5 land, this empty state will no longer appear in the normal path (episodes
will exist). But a first-time visitor before the first run after D5 would see it.
Regardless, a live public site should not reference internal phase numbers. Fix
in the same commit as D5.

Suggested replacement: *"The first audio edition is being prepared — check back
after 07:00 UTC."*

**D7 — Unpause daily schedule** (operational)
`ROADMAP.md:159` · Schedule ID `sched_wqapcm3eta5zi6huqsm83`

Trigger.dev dashboard action. Final step — only after D1–D6 are verified.

---

### Should-fix in Phase 6

**D8 — Footer nav links are `#` placeholders**
`src/components/Footer.tsx:45–52`

About, Archive, RSS, Newsletter, Podcast feed, Contact all have `href="#"`. Dead
links on a live public site. The site has real routes (`/leagues`, `/listen`,
`/teams`) that at least some of these could resolve to. "Archive" could point to
a date-browsing page (not yet built), but "About" could be a `#about` anchor, or
the links could simply be hidden until routes exist. The current state creates a
broken UX on every page footer.

Category: should-fix, low code cost.

**D9 — Footer version string**
`src/components/Footer.tsx:64`

Shows `v0.4`. We're on Phase 6, effectively pre-launch v1. The version string
is hardcoded and will require a manual update. Low priority but noticeable.

**D10 — Masthead audio cue chip never displayed on live site**
`src/components/Masthead.tsx:101–121` · `src/app/page.tsx:105`

The `Masthead` component renders the audio chip only when `podcastDuration` is
passed. No page currently passes `podcastDuration`. The chip is fully
implemented and tested in the styleguide but is invisible on every live page.
The design reference (`claude_design/Tabela.html`) shows the chip in the
masthead. Once D4/D5 land and episodes exist, the home page should compute the
duration of today's `day_overview` audio and pass it to `Masthead`.

This requires fetching `duration_sec` from the editorial row — which doesn't
exist as a DB column (see D11). Fix after audio is live and a
`duration_sec` column strategy is decided.

**D11 — `duration_sec` column promised but never added**
`DECISIONS.md Phase 4B closure` (line 373): "Phase 5 replaces it with the real
`duration_sec` column…"

The database schema (`database.types.ts`) has no `duration_sec` column on
`editorials`. The `ListenClient` and `StickyMiniPlayer` derive duration from the
`onloadedmetadata` event at runtime — this works fine for playback. But without a
persisted `duration_sec`, the `Masthead` audio chip cannot show a formatted
duration string from server-side data (it needs to hit the audio file first).
The DECISIONS.md note implies this was to be resolved in Phase 5 but it was not.

Category: should-fix in Phase 6 alongside D10. Requires a schema migration and a
pipeline change to store `bytes` / infer duration at synthesis time.

**D12 — Ripple effects section on team page**
`src/app/teams/[id]/page.tsx:13, 466–468`

Section comment: "DEFERRED (Phase 6)". The section would show how other
matchday results shifted a team's standing — a multi-query diff not yet
supported. The space is currently blank (no placeholder shown to the user, just
absent from the layout). Not a launch blocker — the team page is usable without
it — but notable as an incomplete section in a "finished product."

**D13 — Auto-advance in StickyMiniPlayer**
`src/app/listen/StickyMiniPlayer.tsx:75`

Comment: "No auto-advance — that is a Phase 6 feature." After one episode ends,
the player stops. Users must manually select the next episode. Fine for a first
launch, but degrade the listening experience.

**D14 — `match_summary` kind in schema but never generated**
`supabase/migrations/20260504175057_initial_schema.sql:62` ·
`src/editorial/prompts.ts:149` (tool name `write_match_summary`)

The schema documents `match_summary` as a valid `kind` and the prompts file
defines a `write_match_summary` tool name — but the pipeline
(`src/trigger/pipeline.ts`) never calls it. Only `match_caption`,
`league_overview`, and `day_overview` are generated. This is consistent with
the DECISIONS.md 2026-05-04 audio scope note ("match summary synthesis is a
Phase 6 candidate"), but there is dead prompt code sitting in `prompts.ts` and a
documented `kind` value with zero rows in the DB.

Category: low priority; document the inconsistency and decide whether to remove
the dead code or leave it for future implementation.

---

### Nice-to-have / post-launch

These are captured in full in `PHASE_6_PROPOSED_FEATURES.md` and are out of
scope for the Phase 6 launch sequence. Listed here for completeness:

- **OG images** — no `og:image` on any route; links share with no preview card.
- **Season leaderboards page** — not built.
- **"Follow a team" auth + team picker** — FollowTeamCTA shows a static "Coming
  soon" button.
- **Weekly digest email** — Resend not integrated.
- **RSS and Podcast feed** — footer links exist but both go to `#`.
- **`/listen` episode pagination** — query capped at 60 rows; fine at launch,
  needs attention once the backlog exceeds ~12 days of audio.

---

## 3. Live Site Visual Review

The review is based on inspecting the component source against the design
reference files (`claude_design/Tabela.html`,
`claude_design/Tabela_-_Team__League___Archive.html`) and Tailwind breakpoint
logic. Direct browser testing at `tabela-topaz.vercel.app` is not available in
this session; items marked **[VERIFY]** should be confirmed in-browser.

### 375px viewport (iPhone SE)

**Masthead — audio chip hidden:**
`hidden md:inline-flex` on the audio cue chip means it is fully suppressed at
375px. The design reference (`Tabela.html`) shows the chip only in the desktop
masthead header, not on mobile — so this appears intentional. **[VERIFY]** that
the design reference mobile view omits the chip before assuming parity.

**Masthead — edition label and issue number hidden:**
Edition label uses `hidden md:inline` and the issue number uses `hidden sm:inline`.
At 375px both are suppressed, leaving only the date in the top strip. The design
reference shows this same behavior. Correct.

**Home page match grid:**
`grid-cols-1` at 375px — cards stack vertically. Matches the design. No issue.

**Stat leaders grid:**
`grid-cols-1` at 375px — single column. Fine.

**FollowTeamCTA:**
`lg:grid-cols-12` — single column at 375px and 768px. Layout is fine. The
"Coming soon" disabled button is visible and renders without clipping on narrow
viewports. However, the button carries `opacity-50 cursor-not-allowed` which
visually communicates "not available" clearly. **[VERIFY]** that the pitch-green
background renders correctly on iOS Safari, which sometimes clips `color-mix()`
expressions.

**`/listen` empty state:**
The `HeroEmpty` component renders a serif headline and italic paragraph. At
375px, the `h-serif text-[32px]` headline may be tight. **[VERIFY]** wrapping
looks natural rather than feeling forced at this size.

**FilterBar sticky behavior:**
The `sticky-filter.is-stuck` class adds backdrop blur and a border on scroll.
At 375px, the filter chips should still be horizontally scrollable (no
`overflow-x` truncation is visible in the component source). **[VERIFY]** that
chips don't overflow off-screen when all five league chips are shown.

---

### 768px viewport (iPad portrait)

**`md:` breakpoint activates at exactly 768px** — two-column grid for match
cards, stat leaders grid shifts to 2-up. This is the `md:grid-cols-2` boundary.

**FullStandingsTable (leagues page):**
The expansion panel client component uses `hover:bg-paper2` — on a touch device
at 768px, hover states don't fire until tap. The expansion itself is tap-triggered
(`onClick`), which is correct, but the hover affordance (background change on
row) may be confusing on tablet. **[VERIFY]** tap targets are at least 44px in
height for the expansion rows.

**Audio chip visibility:**
`hidden md:inline-flex` means the chip appears at 768px. If `podcastDuration` is
never passed (D10), the chip is still hidden even at 768px — this is a gap
between the design reference (which shows the chip) and the live site (which
never shows it). Not a viewport-specific issue; tracked as D10.

---

### 1240px viewport (desktop)

**Max-content width:**
`max-w-content` = 1240px. At this viewport the content fills the container
width exactly with no extra padding. **[VERIFY]** that the last column in three-
column grids (stat leaders, race watch) doesn't clip at exactly 1240px.

**Masthead wordmark size:**
`clamp(64px, 14vw, 168px)` — at 1240px, 14vw = 173.6px, which exceeds the 168px
cap. The wordmark renders at 168px. Correct and matches the design reference.

**Footer:**
Two-column nav becomes visible, copyright middle text visible. The `v0.4`
version string is visible at this width (see D9).

**Home page RaceWatch:**
`lg:grid-cols-3` activates at 1024px+ — three columns of RaceWatch components.
At 1240px this renders all five leagues in two rows (3+2). **[VERIFY]** the
second row (2 leagues) doesn't stretch to fill the three-column container in an
ugly way. A `lg:col-span-1` or similar might be needed to constrain alignment.

**Design reference drift — Masthead nav links:**
The `claude_design/Tabela.html` design reference shows no navigation links in
the masthead (it's wordmark-only). The live `Masthead.tsx` matches this. Correct.

**Design reference drift — Footer:**
The design reference footer includes "About / Archive / RSS" and "Newsletter /
Podcast feed / Contact" — the live footer matches this nav structure. Links are
`#` placeholders (D8), but the structure is correct.

---

## 4. Production Readiness

### Pre-launch sequence status

| Step | Item | Status |
|------|------|--------|
| 1 | ElevenLabs Creator tier upgrade | **NOT DONE** — hard blocker |
| 2 | Phase 5 B3: production audio one-shot | **NOT DONE** — blocked by step 1 |
| 3 | Trailing-dash Storage path fix (D1) | **NOT DONE** — must precede step 2 |
| 4 | Phase 5 B4: `/listen` ISR fix (D5/D6) | **NOT DONE** — blocked by step 2 |
| 5 | Production voice swap Sarah → George (D3) | **NOT DONE** |
| 6 | Unpause daily schedule | **NOT DONE** — blocked by all above |

**Note on step ordering:** D1 (trailing-dash fix) should land **before** step 2
(B3), not after. Once B3 writes audio files to Storage with the bad filename,
correcting them requires either renaming each file in Supabase Storage or
re-synthesising. It costs nothing to fix the code first.

---

### Trigger.dev production deploy status

DECISIONS.md (2026-05-06, redeploy entry) confirms version 20260506.1 was
deployed, which includes Phase 3.5 (historical memory) and Phase 5 (audio
synthesis / Phase D). The pre-condition in ROADMAP.md (lines 83–86) is
**satisfied**.

However: `pnpm trigger:deploy` requires the Docker credential workaround
documented in DECISIONS.md (2026-05-05). If this is run in a fresh terminal
without the workaround, the deploy will fail at the Depot image resolution step.
There is no script or Makefile target to automate this. If another deploy is
needed (e.g., to ship a bug fix), the developer must remember:

```bash
mkdir -p /tmp/trigger-docker-config && echo '{"auths":{}}' > /tmp/trigger-docker-config/config.json
DOCKER_CONFIG=/tmp/trigger-docker-config pnpm trigger:deploy
```

---

### Daily run failure visibility

- **Trigger.dev dashboard** shows each run's status, logs, and `PipelineResult`
  return value. The `editorialsFailed` and `audioFailed` counts are logged and
  returned. A failed run is visible if you look at the dashboard.
- **No automated alert** if a run fails silently or partially. There is no
  webhook, email, or Slack notification wired to Trigger.dev run failures. If
  the 07:00 UTC run fails on a day when there are matches, the site will silently
  show yesterday's editorial until someone notices.
- **No uptime monitoring** for the live site. If the Vercel deployment is broken
  or the Supabase project is paused/down, there is no alert.

This is the biggest operational gap for a single-person operation. A run failure
on a match-heavy day (a weekend) would produce no editorial for that day, and
the home page would continue showing stale data.

---

### Runbook gaps

No `RUNBOOK.md` exists. The information is spread across DECISIONS.md entries.
Things not documented anywhere in a single accessible place:

1. **What to do if a daily run fails:** Check Trigger.dev dashboard for the
   run log. Look at `editorialsFailed` in the result. Re-trigger manually with
   `daily-report-one-shot` and the correct date payload. There is no documented
   step-by-step for this.

2. **What to do if Football-Data.org is down:** The pipeline handles per-league
   failures gracefully (tries all leagues, logs errors, returns which leagues
   failed). A complete Football-Data.org outage would produce no match data and
   no editorial for that day. The home page shows the previous day's content
   with no indication to the user that today's data is absent. No fallback
   behavior exists. No documented mitigation.

3. **What to do if Claude API rate-limits:** Sequential league processing and the
   per-caption sequential loop were designed to stay within the 30k token/min
   org limit (DECISIONS.md 2026-05-04 entry). If the org limit is reduced or the
   API is degraded, editorials may fail partially. No documented mitigation.

4. **What to do if ElevenLabs synthesis fails:** Phase D is non-fatal — each
   synthesis failure is logged and counted in `audioFailed`, but the pipeline
   continues. A complete ElevenLabs outage means the audio synthesis step is
   skipped silently; editorials are still written. The `/listen` page would show
   no new episodes for that day. No documented mitigation.

5. **Schedule ID and project refs:** The Trigger.dev schedule ID
   (`sched_wqapcm3eta5zi6huqsm83`) and project ref (`TRIGGER_PROJECT_REF` in
   `.env.local`) are not in any source file. They live in `.env.local` and are
   referenced in DECISIONS.md. Finding them under pressure requires reading
   DECISIONS.md carefully.

---

### B4 sequencing issue (confirmed in code)

`src/app/listen/page.tsx` has **no** `export const revalidate` or
`export const dynamic` directive. The deployment note in DECISIONS.md Phase 4B
closure (line 375) explicitly flags this: "Once the Phase 5 pipeline populates
`audio_url`, the page will need to be dynamic (or ISR)." The page was
prerendered as static at the last Vercel build (when zero audio rows existed).
After B3 writes real rows, a user navigating to `/listen` will see the empty
state indefinitely until either:
- A new Vercel deployment triggers a rebuild, **or**
- The ISR fix (D5) is applied and deployed.

This is a hard dependency: D1 → D2/D3 → D4 (B3) → D5 (B4) → D7 (unpause).

---

## 5. Editorial Quality Spot-Check

Three editorials sampled from the production DB (latest available runs:
2026-05-04 and 2026-05-03). Read in the context of the full editorial chain
(league overviews + day overview), as a user would encounter them on the live
site.

---

### Sample 1 — day_overview 2026-05-04 — "Forest and Roma headline a day of away authority" (id: 263)

**Voice register:** strong. The lead is immediate and specific: "Going to
Stamford Bridge and winning by two goals is a statement of collective quality,
and Forest delivered it without the occasion appearing to weigh on them." This is
exactly the Voice.md register — specific, allusive, confident. "The margin was
honest" is a precise editorial judgement rather than a generic superlative.

**Thematic cohesion:** the away-team theme is earned, not imposed. The editorial
identifies the pattern (Forest, Lazio, Roma all won on their travels; City
salvaged a draw) and pays it off at the end: "The home side's advantage felt
fragile across the continent today." That's a clean structural move.

**No invented facts detected.** All results, scorelines, and matchday numbers
match what the pipeline would have received from Football-Data.org.

**Minor voice note:** "something altogether noisier" to describe the 3–3
Everton–City match is slightly informal. Not a violation, but at the edge of
Voice.md's "never shouty" principle. The voice is warm here rather than noisy,
which is acceptable.

**Overall:** passes. The Phase 3.5 enrichment (historical context) is not
strongly visible in the day overview — which is by design (DECISIONS.md notes
that league and day overviews do not receive history injection). The writing
stands on its own.

---

### Sample 2 — league_overview 2026-05-04 PL — "Nottingham and Everton both deny the favourites" (id: 257)

**Voice register:** excellent. The structural move — "two results that will be
remembered more for who lost than who won" — is a clean allusive framing. The
second paragraph names specific statistics from the scorer data (Haaland 25 goals,
Semenyo 15, Gibbs-White 13 goals/5 assists) and uses them to tell a story rather
than dump them.

**The closing paragraph:**
> "composure under pressure is not distributed by reputation. Forest, composed
> and clinical at Chelsea, and Everton, resilient enough to overturn a deficit
> against the division's most lethal forward line, both showed that the final
> weeks of the calendar reward teams who do not blink."

This is Voice.md at its best — specific, warm, no hedges, no clichés.

**No invented facts detected.**

**Overall:** passes with distinction. Best of the three samples.

---

### Sample 3 — day_overview 2026-05-03 — "Milan and Dortmund stumble as Madrid and Inter hold firm" (id: 55)

**Voice register:** mixed. Much of the writing is in register, but there is one
notable voice violation.

**Voice issue — internal data limitation surfacing in copy:**

> "which means the top of the Italian table remains unsettled heading into the
> final stretch — **though without standings data**, what matters here is the
> shape of it: Inter winning, Juventus dropping points, Milan losing to a side
> below them."

The phrase "**without standings data**" is an internal model caveat — it is
referencing the fact that the Supabase standings payload was unavailable or
incomplete for this run. This is *not* how editorial writing works. The reader
has no frame for "standings data" as a concept; it breaks the editorial frame
entirely and tells the reader that the AI is explaining its own constraints.

VOICE.md principle 5 — "Confident, never breathless. State things plainly" —
is violated here. The model should either write around the gap ("the table remains
unsettled — but that is the story at the top regardless of exact positions") or
omit the claim. Explaining its own data limitations in published copy is
architecturally wrong: it means the no-invention guardrail's fallback behaviour
is surfacing directly in the editorial body.

**Why this happened:** likely a snapshot_date where the `season_stats` payload
was missing or lacked a `standings` key, so the prompt received no standings
context. The day_overview prompt does not currently handle a missing-standings
case gracefully — it allows the model to acknowledge the gap in its output rather
than working around it.

**Additional voice note:** the phrase "whether the specific goalscorers here
remain unattributed" (in the FL1 league overview from 2026-05-03) and the
multiple instances of "Whether either man was decisive here the data does not
confirm" (BL1, SA overviews) suggest the model has a trained response for
missing per-match scorer data that produces slightly mechanical hedging when
repeated across multiple editorials in the same day. Reading five league
overviews in sequence reveals this pattern more clearly than any single editorial
shows it. It is not a factual error but it is a voice register issue — the
repeated hedge structure reads as boilerplate rather than editorial writing.

**Overall:** Sample 3 has one genuine voice violation (internal data limitation
in published copy) and a secondary pattern concern (repeated hedge phrasing).
The day overview for 2026-05-03 should not go to a first user as-is; however,
since the schedule has been paused and the site has not been promoted to a real
audience, this is a latent issue rather than a live one. The fix is prompt-level,
not launch-blocking (B3 and D7 are higher priority), but it should be addressed
before the site is shared.

---

## 6. Launch Sequence

An ordered checklist from "paused, ready" to "live, running daily, shared with
first user." Complete in this order.

---

### Code fixes (before any operational steps)

- [ ] **Fix 1 — Trailing-dash Storage path** (`src/audio/upload.ts:22`)  
  Change `buildStoragePath()` per the fix in DECISIONS.md 2026-05-06:  
  `const suffix = ref.slug ? `-${ref.slug}` : ""; const filename = `${ref.kind}${suffix}.mp3`;`  
  Also update the comment at the top of `upload.ts` to show correct example path
  (`episodes/2026-05-04/day_overview.mp3` not `day_overview-.mp3`).  
  **Deploy to Vercel + Trigger.dev production** (Vercel push, then Docker-workaround
  `pnpm trigger:deploy`).

---

### Operational steps (you, no code)

- [ ] **Step 1 — ElevenLabs Creator tier upgrade**  
  Go to elevenlabs.io → Billing → upgrade to Creator ($22/mo).  
  Confirm tier is active in the ElevenLabs dashboard before proceeding.

- [ ] **Step 2 — Voice swap in Trigger.dev Production**  
  Trigger.dev dashboard → Project → Environment: Production → Environment
  Variables.  
  Change `ELEVENLABS_VOICE_ID` from `EXAVITQu4vr4xnSDxMaL` (Sarah) to
  `jsCqWAovK2LkecY7zXl4` (George).  
  Confirm the change is saved.

---

### Audio verification (B3)

- [ ] **Step 3 — Production audio one-shot**  
  Trigger.dev dashboard → `daily-report-one-shot` → trigger with payload
  `{ "date": "2026-05-06" }` (or the most recent matchday with PL/La Liga
  results).  
  Wait for the run to complete (~5–10 min).  
  Check run logs for Phase D: confirm `[audio] day: N chars (~$X) — synthesising…`
  and `[audio] day: uploaded → https://…` lines.  
  Check Supabase → Table Editor → `editorials` → filter by `date = 2026-05-06`
  and `kind = 'day_overview'` or `league_overview` → confirm `audio_url` is
  populated.

- [ ] **Step 4 — Curl verify**  
  ```bash
  curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
    "https://ksmgtrbgrvqfhiijqsyd.supabase.co/storage/v1/object/public/episodes/2026-05-06/day_overview.mp3"
  ```
  Expected: `200 audio/mpeg`. If 200, audio is live and publicly accessible.

---

### Code fix (after B3 confirmed)

- [ ] **Fix 2 — `/listen` ISR fix + copy cleanup** (`src/app/listen/page.tsx`)  
  a. Add after imports: `export const revalidate = 3600;`  
  b. Remove DEV-ONLY block (lines 151–172).  
  c. Update `HeroEmpty` copy: replace "Audio synthesis is coming in Phase 5 —
     check back once the ElevenLabs pipeline is wired." with "The first audio
     edition is being prepared — check back after 07:00 UTC."  
  **Deploy to Vercel** (`git push main` — Vercel auto-deploys from main).  
  Verify: `curl -s -o /dev/null -w "%{http_code}\n" https://tabela-topaz.vercel.app/listen`
  → 200. Open in browser — confirm episode list shows real episodes, not the
  empty state.

---

### Final operational step

- [ ] **Step 5 — Unpause daily schedule**  
  Trigger.dev dashboard → Project → Schedules →
  `sched_wqapcm3eta5zi6huqsm83` → Enable.  
  Confirm `active: true` and `nextRun` is populated (next 07:00 UTC).

- [ ] **Step 6 — Monitor first daily run**  
  Check Trigger.dev dashboard the morning after unpausing. Confirm:  
  - `leaguesDataOk` has all five leagues (or the ones with matches that day).  
  - `editorialsWritten` > 0.  
  - `audioSynthesised` > 0.  
  - No unexpected `editorialsFailed` or `audioFailed` values.  
  Open the live site at `https://tabela-topaz.vercel.app` and confirm today's
  edition is live.

- [ ] **Step 7 — Share with first user**

---

### Optional but recommended before sharing

The following are not blockers but improve the experience for a first real user:

- [ ] **Footer dead links (D8):** replace `href="#"` with real routes for
  Archive (`/listen`), and hide or remove About/RSS/Newsletter/Podcast/Contact
  until those routes exist. Dead links on every page feel unfinished.
- [ ] **Footer version string (D9):** update `v0.4` to `v1.0` or remove.
- [ ] **Voice issue in 2026-05-03 day_overview (id: 55):** the "without
  standings data" phrase. The pipeline has been paused; this editorial is in the
  DB and will appear on the "yesterday" section of the home page if the date ever
  matches. It won't appear once new runs are live (the home page shows the
  latest date's data). Low urgency but worth a one-line DB update before
  sharing.

---

*End of audit. Agree on priorities before writing any fixes.*
