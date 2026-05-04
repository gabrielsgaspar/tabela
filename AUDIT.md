# AUDIT.md — Phase 6 pre-ship review

**Date:** 2026-05-04  
**Basis:** Code review of all source files, prompt analysis, design spec study
(`claude_design/`), and VOICE.md. The live deployment was not accessible for
this audit — items marked **[live verification needed]** require a browser
session against the running site before the finding can be confirmed or
dismissed. Items without that marker are structural (derivable from the code
itself).

---

## Format

Each entry: **severity** (high / med / low), **effort** (S < 2 hrs / M < 1 day / L > 1 day), category, and the reason it matters.

---

## Editorial quality

### EQ-1 — League overviews have no standings data in the prompt
**Severity: high | Effort: M**

`buildLeagueOverviewPrompt` and `buildDayOverviewPrompt` receive results and
top scorers, but no standings. The prompt explicitly tells Claude not to
reference table positions. This means the model has to write about "an imagined
table" — it can note that a team won but cannot contextualise whether that win
was in a title race, a relegation fight, or mid-table irrelevance. The overviews
will read as competent but unanchored. The reference paragraph in VOICE.md
("the gap from second to fifth had narrowed to four points") is exactly the kind
of sentence that requires standings data. Without it, Claude defaults to
match-by-match narrative glue instead of the cross-result analysis that defines
the voice.

The fix is in `generate.ts`: pass a `standings` slice (top 6 + bottom 3) into
the overview prompts and update `buildLeagueOverviewPrompt` to include it. The
no-invention rule still applies — Claude references what it receives.

### EQ-2 — Caption quality degrades severely on low-scoring draws
**Severity: high | Effort: S**

A 0–0 with no scorer data leaves Claude with: two team names, a matchday
number, a half-time score of 0–0, and five season scorers who may not play for
either team. The caption must be 15–25 words, must not restate the score, and
must not describe events. There is genuinely almost nothing to say. The likely
output pattern: variations on "two teams who need different things from the table
played to a draw that suited neither" — accurate, inoffensive, and indistinguishable
from the same caption for a different 0–0 next week.

Fix: add an explicit instruction for low-data situations. Something like: "If the
match is a 0–0 and scorer context is thin, use the opponent's season position or
head-to-head history as an anchor — even a one-sentence acknowledgement of what
the draw means for the title or survival race is better than generic mood-setting."
This requires standings data (EQ-1) to be reliable.

### EQ-3 — Day overview opening structures will converge
**Severity: med | Effort: S**

The day overview prompt says "Select the two or three results that mattered most."
Without guidance on varying the opening move, Claude will default to a consistent
pattern: one long first paragraph establishing the marquee result, one shorter
paragraph mentioning a contrasting match, one paragraph on "the bottom end."
After two weeks this becomes recognisable. The VOICE.md paragraph from Brian
Phillips starts in the middle of things ("Saturday in the Premier League turned
on a single second-half hour") — not with the biggest result.

Fix: add 3–4 opening-structure seeds to the prompt. "You may open on: the result
that will define a season, the result that surprised no one but mattered anyway,
a number (a clean sheet count, a run of draws, a sequence), or a place (a
stadium, a city, a rivalry). Vary across days."

### EQ-4 — Audio writes and reading writes are different things  
**Severity: med | Effort: S**

The prompts are designed for reading on screen. Sentences like "Arsenal 2–0
Brighton (half-time: 1–0)" are clear visually; spoken aloud they become
awkward ("Arsenal two-nil Brighton half-time one-nil"). The league overview
will be synthesised verbatim. Pre-processing (Commit 2 of Phase 5) handles
score expansion, but deeper issues remain: em-dashes become unspoken pauses
in some TTS engines; a sentence like "It was the first time — and very possibly
the last — that..." does not listen like it reads. The writing itself isn't
wrong, but it was never written for ears.

Fix: either write a second "audio script" variant per editorial, or add an
audio-aware rewrite step in `pre-process.ts` that converts em-dashes to commas,
expands bracketed clarifications, and removes parenthetical asides that collapse
without visual punctuation.

### EQ-5 — "Allusive memory" limited by Phase 3 memory depth  
**Severity: low | Effort: L**

The "Igor Thiago is 2nd top scorer" memory trick works for season-to-date stats.
But the VOICE.md ideal — "their best November back-line since 2021/22" — requires
multi-season historical data the pipeline never fetches. This is a structural
ceiling, not a bug. Flag it as a known voice limitation so nobody confuses "the
model is following the rules" with "the voice is fully realised."

No fix within Phase 6 scope. Consider archiving season_stats rows across seasons
so future Claude calls can reference them; a multi-season summary prompt is a
Phase 7 item.

---

## SEO and shareability

### SS-1 — No open graph images
**Severity: high | Effort: M**

Every editorial link shared to a friend renders as a plain URL or a generic site
preview. This is the single biggest friction point between "I want to share this"
and "my friend clicks it." The design already has a strong visual identity —
paper background, Newsreader headline, pitch-green Tabela mark — that would make
a compelling card. Next.js has `@vercel/og` for generating edge-rendered OG
images. A route at `/api/og?headline=...&date=...&league=...` is ~50 lines of
JSX.

### SS-2 — No RSS feed
**Severity: high | Effort: S**

The "morning paper" metaphor is word-for-word what RSS readers were built for.
Someone who uses Reeder, NetNewsWire, or Feedly will look for a feed. Without
one, the daily habit has to form entirely through muscle memory or browser
bookmarks — both fragile. An Atom feed at `/feed.xml` listing the last 30 day
overviews (headline, published date, body excerpt, canonical URL) takes one
Next.js route handler and costs nothing to operate.

### SS-3 — Static `<title>` and `<meta description>` on interior pages  
**Severity: med | Effort: S**

The root layout sets a fixed title ("Tabela — The morning paper for European
football"). Every league page, team page, and individual editorial presumably
inherits this or has a hand-rolled dynamic `generateMetadata`. If that wiring
was done correctly in Phase 4B it is already fine — **[live verification
needed]**. If not: a tab labelled "Tabela — The morning paper for European
football" for `/leagues/pl` is a missed signal. Expected: "Premier League —
Tabela" or "Manchester City — Tabela".

### SS-4 — No sitemap.xml or robots.txt  
**Severity: low | Effort: XS**

Google will find the site eventually. A sitemap accelerates it and prevents
crawl budget waste on dynamic routes. `next-sitemap` or a hand-written route
at `/sitemap.xml` listing home, five league pages, the listen page, and the most
recent 30 editorials covers 95% of the value. `robots.txt` should exist and
allow all; search engines will assume permissive access otherwise, but having
the file prevents surprises.

### SS-5 — No structured data (Article schema)  
**Severity: low | Effort: S**

Editorial pages benefit from `Article` or `NewsArticle` JSON-LD. Adds rich
snippets in search, enables Google Discover eligibility. Low-risk addition to
`<head>` in each editorial page's `generateMetadata`.

---

## Accessibility

### A11Y-1 — Audio player has no transcript
**Severity: high | Effort: M**

Every synthesised audio file plays from a `body` string in the database. That
string is the transcript — it already exists. Yet the `<AudioPlayer>` component
does not expose it. A "Read transcript" disclosure widget below the player
(collapsed by default, `<details>/<summary>`) is the minimum. This is both an
accessibility requirement and a fallback for environments where audio is
unavailable (office, commute on mute).

### A11Y-2 — FilterBar chip `aria-pressed` / `aria-selected` missing  
**Severity: med | Effort: S** **[live verification needed]**

The `<LeagueFilterChip>` component communicates active state visually (pitch
background vs paper background). Screen readers need `aria-pressed="true"` (if
it's a toggle button) or `role="tab"` with `aria-selected="true"` (if the filter
is tab-like). Without this, a keyboard-only user hears "England" for every chip
with no indication of which one is active.

### A11Y-3 — MatchCard score layout needs screen reader framing  
**Severity: med | Effort: S** **[live verification needed]**

A match card likely renders two rows (home team / away team) with a score on the
right. Screen readers will read this left-to-right as "Arsenal [crest image alt]
2 Brighton [crest image alt] 0" or worse in document order. The semantic HTML
should use a `<dl>` or `<table>` with a visually hidden summary sentence:
"Arsenal 2, Brighton 0, full time." A `<span class="sr-only">` above the visual
layout handles this without touching the design.

### A11Y-4 — Crimson used for losses — needs non-colour indicator  
**Severity: low | Effort: S** **[live verification needed]**

If the RaceWatch component or sparklines use crimson to indicate a negative
trend, colour alone is insufficient for WCAG 2.1 AA. A secondary indicator —
a down-arrow, a `▽` character, or a `title` attribute — is needed alongside.

### A11Y-5 — Audio player keyboard nav for progress scrubbing  
**Severity: low | Effort: S** **[live verification needed]**

The `<AudioPlayer>` progress bar is likely a custom `<div>` with a click handler.
Keyboard users cannot scrub through the audio. Replacing it with `<input
type="range">` (styled to match the design) gives keyboard and screen reader
support for free. The `.audio-track` / `.audio-fill` style approach still works
if the range input's appearance is reset and the fill is drawn via a CSS custom
property tied to `value`.

---

## Performance

### PERF-1 — Font loading and CLS risk  
**Severity: med | Effort: S** **[live verification needed]**

Three font families load via `next/font/google` (Newsreader variable, DM Sans
variable, JetBrains Mono static). `next/font` self-hosts and injects `font-display:
swap` by default, which eliminates the third-party DNS round trip but can still
cause layout shift when variable fonts load — especially for the `.display`
headline with `font-variation-settings: "opsz" 72`, which affects letter spacing
and line height. Verify LCP and CLS scores with Lighthouse or WebPageTest. If
CLS > 0.05 on the home page headline, consider `font-display: optional` for
Newsreader (at the cost of occasional fallback-font render on cold load).

### PERF-2 — Team crest images have no explicit dimensions in HTML  
**Severity: med | Effort: S** **[live verification needed]**

`<TeamCrest>` passes `size` to `next/image`, so `width` and `height` props are
set — this should be fine. However if any fallback code path renders a bare
`<img>` without dimensions, the browser cannot reserve layout space, causing
CLS. Verify the fallback initial-letter `<span>` uses the same `width`/`height`
as the image it replaces. **[live verification needed]**

### PERF-3 — Home page data fetching makes ≥ N+1 Supabase calls  
**Severity: med | Effort: M** **[live verification needed]**

If the home page fetches the latest date, then fetches editorials for that date,
then fetches match_day payloads per league separately, and then fetches
season_stats per league — that is 1 + 1 + 5 + 5 = 12 sequential Supabase
round-trips in a server component. At ~1–3ms per Supabase edge call they are
fast, but they are sequential and add up. Consider consolidating with
`Promise.all` for the parallel calls (the five league fetches can run
concurrently) and a single `editorials` query for all kinds on the date.

### PERF-4 — Static pages not marked `revalidate = 86400`  
**Severity: low | Effort: XS** **[live verification needed]**

League pages and the home page render yesterday's results — data that does not
change after the daily task runs. If they are fully dynamic (no `revalidate`),
Vercel re-renders them on every request, wasting CPU and increasing TTFB. Setting
`export const revalidate = 3600` (or 86400 for league pages, which rarely change
intra-day) gives ISR behaviour and dramatically reduces cold-start latency.
Already planned for team pages; verify it is in place for home and league pages.

---

## Visual polish

### VP-1 — No empty state for non-match days  
**Severity: high | Effort: S**

International breaks, cup weeks, and August/May shoulder season produce days with
no finished league matches. The home page needs a designed empty state — not an
error, not a blank page. Something sparse and on-brand: the Tabela wordmark, a
short serif line ("The leagues rest today."), a `<GngMark>`, and the date of the
next scheduled fixture if available. This is the first thing a subscriber sees
when they form the habit and check on a rest day.

### VP-2 — Audio player "dormant" state looks like broken UI  
**Severity: med | Effort: S** **[live verification needed]**

When `audioUrl` is null, the player renders with a disabled play button and a
`title="Audio coming soon"` tooltip. From a user's perspective "Audio coming soon"
is unexplained friction — they don't know when or why. For any day that has audio
enabled (after Phase 5), the player should only appear when audio is actually
available. For days before Phase 5 backfill or dates without audio, suppress the
player entirely. Show it only when `audioUrl` is non-null.

### VP-3 — The "follow a team" CTA in the footer is a dead end  
**Severity: med | Effort: M**

The design spec shows a follow-a-team section near the footer. Currently in Phase
6 scope, but the CTA presumably exists in the HTML pointing at an unbuilt auth
flow. A visitor who sees it and taps it gets either a 404 or a dead `href`.
Options: (a) build a cookie/localStorage-based "pin a team" that customizes the
home page's default filter — no auth needed — or (b) hide the CTA until auth
exists. Option (a) delivers more value; option (b) is one line of conditional
rendering.

### VP-4 — No loading state during page navigation  
**Severity: low | Effort: S** **[live verification needed]**

Next.js App Router does not add a global progress indicator during navigation.
For Supabase-heavy pages (league page fetching multiple rows, team page
searching editorials by body text), the transition from clicking a link to seeing
content can be a second or more with no feedback. A simple route progress bar
(NProgress or the new React `useTransition`-based approach) adds perceived
performance without changing actual latency. Optional, but noticeable on slow
connections.

---

## Reliability

### REL-1 — No alerting when the daily task produces no editorials
**Severity: high | Effort: S**

The Trigger.dev task logs errors per league, but if the entire run silently
produces zero editorials (e.g., ANTHROPIC_API_KEY has expired, or the model
returns an unexpected tool response), the site shows yesterday's content forever
with no indication. There is no dead man's switch.

Minimum fix: a sanity check at the end of the task — if `editorials` rows for
today's date are zero, send a `console.error` or, better, a Trigger.dev alert.
The Trigger.dev SDK supports `task.fail()` which marks the run as failed in the
dashboard and can trigger email notifications.

### REL-2 — Football-Data.org outage produces partial data silently  
**Severity: high | Effort: S**

Per-league try/catch means a league-level failure is swallowed: the day's output
contains four leagues instead of five, with no indication to the user. The site
renders normally — it just has a gap. A league with no results on a match day is
ambiguous: did they not play, or did the fetch fail?

Fix: add a `fetchStatus` field to the match_days row (`"ok" | "error" | "no_matches"`)
so the website can render "No Bundesliga data today — we're looking into it"
rather than silently omitting the section.

### REL-3 — Anthropic API rate-limits during a run with ~50+ caption calls
**Severity: med | Effort: S**

A typical Saturday produces ~40–50 finished matches across five leagues.
With captions generated per match + five league overviews + one day overview, that
is 50+ Anthropic API calls in a single task run. The Anthropic Claude API has
per-minute rate limits; on a busy matchday all five leagues may generate
concurrently in the trigger task. If calls are parallelised without a
concurrency cap, the task will hit rate limits and fail partway through.

Fix: add a concurrency limit on the editorial generation loop — generate no more
than 5 captions in parallel at a time, with a small delay between batches. The
`p-limit` npm package or a simple queue handles this.

### REL-4 — No retry for failed editorial rows (non-audio)  
**Severity: med | Effort: S**

`scripts/resynthesize.ts` handles audio retries. There is no equivalent for
editorial text failures — if the Anthropic call fails mid-run for one match, that
editorial row is never created. The resynthesize pattern should be extended to
editorial generation: a `scripts/regenerate.ts` that queries for match_days rows
with no corresponding editorial, and retries generation.

### REL-5 — `maxDuration: 300` may be tight for busy matchdays  
**Severity: low | Effort: XS**

The Trigger.dev config sets `maxDuration: 300` (5 minutes). On a Saturday with
all five leagues active, 50+ serial Anthropic caption calls + five league
overviews + one day overview + audio synthesis for six pieces = potentially
close to 5 minutes. If the task exceeds the limit it is killed mid-run,
producing partial output (some leagues have editorials, others do not). Consider
raising to `600` or splitting the audio synthesis into a separate chained task.

---

## Follow-a-team

### FAT-1 — Cookie/localStorage "pin a team" is the right v1 approach
**Severity: med | Effort: M**

The ROADMAP calls for Supabase Auth + weekly digest for Phase 6. But auth is
expensive to ship correctly (email verification, session management, password
reset, legal considerations). A localStorage-based "pin a team" — one team,
stored on device, no account — can deliver the core personalisation loop
immediately:

- The home page reads the pinned team from a cookie on the server (or from a
  query param the client sets) and renders that team's matches prominently.
- The team page shows a "Following / Follow" toggle button.
- No backend changes required; no email required.

This is not a replacement for auth — it is a proof-of-concept for the habit loop
that makes someone come back daily. Build it first; add auth when the habit is
proven.

### FAT-2 — Weekly digest needs email infrastructure not yet planned  
**Severity: low | Effort: L**

The README promises a weekly digest. The F1 reference repo used Resend for email.
Resend is not in the stack. Before building the digest, decide: (a) use Resend
(adds a new paid service, ~$20/month for the MVP scale), (b) use Supabase Edge
Functions + SMTP, or (c) deprioritise until the follow-a-team habit is proven.
No decision needed now, but note it in DECISIONS.md before touching email code.

---

## Audio

### AUD-1 — Pronunciation dictionary is empty at Phase 5 ship
**Severity: high | Effort: S**

`PRONUNCIATION_OVERRIDES` in `pre-process.ts` starts empty by design. The first
day George reads a Bundesliga lineup he will mispronounce Florian Wirtz,
Granit Xhaka, and possibly Leverkusen. The first La Liga overview will produce
a recognisably wrong "Vineecius Joor". The first Serie A piece will stumble on
Calhanoglu and Lautaro Martínez.

This is known and fixable before it becomes embarrassing. Populate the dictionary
before the first live synthesis run. Candidates:

| Name | Common mispronunciation | Phonetic target |
|------|------------------------|-----------------|
| Vinicius Jr. | "Vin-ISH-ee-us" | "Vee-NEE-see-us" |
| Wirtz | "Wurts" | "Virts" |
| Xhaka | "Zha-ka" | "Sha-ka" |
| Calhanoglu | "Cal-han-oh-gloo" | "Cha-HAHN-oh-loo" |
| Szoboszlai | "So-bos-lie" | "So-bos-LAY" |
| Mbappé | "Em-BAPP-ay" or "Em-BAPP" | "Em-bah-PAY" |
| Lautaro | "Low-taro" | "Low-TAH-ro" |
| Güler | "Gyoo-ler" | "Gyoo-LEHR" |

### AUD-2 — ElevenLabs voice not yet audition-tested  
**Severity: high | Effort: XS**

George (`jsCqWAovK2LkecY7zXl4`) was chosen based on the API description.
It has not been tested against actual Tabela copy — specifically the VOICE.md
reference paragraphs. The voice might be right or it might be entirely wrong
for the editorial register. Fifteen minutes in the ElevenLabs Playground with
the actual reference text is necessary before the first public synthesis.

### AUD-3 — No em-dash → pause conversion in pre-processing  
**Severity: med | Effort: S**

The editorial output uses em-dashes (`—`) as structural punctuation: "Arsenal
made it five straight home wins — Brighton never looked like ending the streak."
Without SSML support (confirmed absent from the SDK), an em-dash is either
skipped silently or read as a word by ElevenLabs. Adding a simple `text.replace(/—/g, ', ')` 
in `pre-process.ts` — before synthesis — converts editorial rhythm into
audio rhythm without SSML. A comma is not identical to an em-dash pause but it
produces the right prosodic break.

---

## Ship list — the 5–8 things that actually matter

The audit surfaces 24 items. We will not do 24 things. These 7 are the ones that
determine whether the product is worth sharing with a friend, ranked by
leverage:

### 1. Pronunciation dictionary (AUD-1)
**Severity: high | Effort: S**  
First-day audio with mangled player names is a trust-killer that takes five
minutes to prevent. Populate the dictionary before the first public synthesis.
Do this before anything else.

### 2. Open graph images (SS-1)
**Severity: high | Effort: M**  
Every "send to a friend" passes through a link preview. Without an OG image, the
link is a grey rectangle. This is the highest-leverage single item for the
product's primary sharing mode. `@vercel/og` + a route at `/api/og` takes less
than a day.

### 3. RSS feed (SS-2)
**Severity: high | Effort: S**  
The "morning paper" promise requires a way to subscribe. RSS is the shortest path
to "I get this daily without thinking about it." An afternoon of work.

### 4. Standings data in prompts (EQ-1)
**Severity: high | Effort: M**  
The overviews are the marquee editorial product. They are structurally limited
without table positions. This is the fix that most directly closes the gap
between the voice Tabela aspires to and what it currently produces. Do this
early in Phase 6 so subsequent editorial output actually earns the compliment.

### 5. Audio player shows only when audio exists (VP-2)
**Severity: med | Effort: S**  
"Audio coming soon" is unexplained noise. Suppressing the player when
`audioUrl === null` is two lines of conditional rendering. Do it before Phase 5
audio starts filling in, so the transition from "no audio" to "audio exists" is
seamless rather than jarring.

### 6. Empty state for no-match days (VP-1)
**Severity: high | Effort: S**  
The site breaks the habit loop on international breaks and rest days. An
on-brand "no matches today" page closes the loop and shows the product has been
thought through.

### 7. Cookie-based team follow (FAT-1)
**Severity: med | Effort: M**  
The follow-a-team CTA is currently a dead end in the design. A
localStorage/cookie implementation — no auth, no email, just device-local
pinning that affects the home page filter default — is the right Phase 6 version.
It proves the habit loop without the auth overhead.

---

## Items that did not make the ship list (and why)

- **Dynamic page metadata (SS-3):** likely already done in Phase 4B; verify
  rather than re-implement. Not a ship blocker.
- **Sitemap (SS-4):** SEO nicety, not a friend-sharing blocker. Phase 7.
- **Audio transcript (A11Y-1):** important for accessibility but not a launch
  blocker; the editorial body IS the transcript and can be exposed with minimal
  effort — but audio is so new that fixing pronunciation first is the right order.
- **REL-1 / REL-2 alerting:** operational polish; doesn't affect a friend's
  first visit. Add after the product is proven worth running reliably.
- **FilterBar aria-pressed (A11Y-2):** needed but not a friend-sharing blocker.
  Add in Phase 6 alongside the rest of the a11y pass.
- **Email digest (FAT-2):** too much infrastructure risk without knowing if
  the habit forms first. Needs a DECISIONS.md entry before any code.
- **Font CLS (PERF-1):** verify with Lighthouse first; may already be
  acceptable given next/font self-hosting.
