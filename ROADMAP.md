# ROADMAP.md

Build phases for Tabela. Mark `← CURRENT` next to the active phase. Each phase begins with a `PLAN.md` at the repo root that gets approved before code lands.

---

## Phase 0 — Bootstrap ✅ DONE

- [x] Project name: **Tabela**
- [x] Visual design via Claude Design (output in `claude_design/`)
- [x] Documentation skeleton: `README.md`, `CLAUDE.md`, `DATA.md`, `VOICE.md`, `ROADMAP.md`, `DECISIONS.md`
- [x] `.env.example`, `.gitignore`

---

## Phase 1 — Data pipeline ← CURRENT

**Goal:** prove we can fetch yesterday's matches across all five leagues from Football-Data.org and produce clean JSON.

- [ ] Fork/strip the [F1 race report repo](https://github.com/IAmTomShaw/f1-race-report) — keep TS skeleton, drop Python/FastF1, OpenAI, Resend, chart code.
- [ ] Get Football-Data.org token; wire into `.env.local`.
- [ ] Build `src/football/client.ts` with `getMatches`, `getStandings`, `getScorers`.
- [ ] Build `src/trigger/daily-report.ts` that loops over the five leagues and logs JSON.
- [ ] Add resilience: per-league try/catch, empty-day handling, raw JSON archive to `output/YYYY-MM-DD.json`.
- [ ] Sanity check: confirm what *is* and *isn't* on the free tier (goalscorer events especially). Log findings in `DECISIONS.md`.

**Done when:** running the task locally produces a clean JSON file with yesterday's matches across all five leagues, with sensible empty-day and error handling.

---

## Phase 2 — Editorial generation

**Goal:** Claude writes per-match captions and a day overview from the Phase 1 JSON, in the voice spec'd in `VOICE.md`.

- [ ] Build `src/editorial/prompts.ts` with the prompt templates (match caption, day overview, league storyline).
- [ ] Build `src/editorial/generate.ts` — takes structured input, returns structured output. Use the Anthropic TS SDK.
- [ ] Strict no-invention guardrails: prompts must instruct the model to cite only facts in the input.
- [ ] Output an HTML file locally that renders the day's results with captions and overview.

**Done when:** running locally produces an HTML page that reads like a thin first draft of the home page in `claude_design/`.

---

## Phase 3 — Storage and multi-run memory

**Goal:** persist daily snapshots so Claude has memory across runs and the website can browse history.

- [ ] Set up Supabase project. Create tables per `DATA.md` schema sketch.
- [ ] Persist daily fetch results (`match_days`).
- [ ] Persist running season state (`season_stats`).
- [ ] Editorial generation reads latest `season_stats` and passes it as context.
- [ ] Verify the "Igor Thiago is 2nd top scorer" trick works on real data.

**Done when:** today's editorial can correctly reference season-to-date stats from prior runs.

---

## Phase 4 — Website

**Goal:** ship the site Claude Design specced. Reads from Supabase, mobile-first, responsive.

- [ ] Scaffold Next.js 15 app at `src/app/`.
- [ ] Implement design tokens, components, and pages from `claude_design/`.
- [ ] Home page → today's edition.
- [ ] Team page, league page, podcast/archive page.
- [ ] Deploy to Vercel.

**Done when:** the live site renders the latest run's data and matches the design reference.

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
