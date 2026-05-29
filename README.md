# Tabela

A daily editorial briefing on the Premier League and the UEFA Champions League.

Every morning a scheduled task fetches the previous day's matches, updates
season statistics, asks Claude to write a short editorial in a warm, allusive
voice, generates an audio version, and publishes the result to a Next.js site.

## Competitions

Premier League · UEFA Champions League

The app is scoped to the English top flight and the premier European
competition its clubs compete in. The four other major domestic leagues
(La Liga, Bundesliga, Serie A, Ligue 1) are out of scope; see `DECISIONS.md`
(2026-05-29) for the rationale.

## Stack

Next.js 16 · Trigger.dev v4 · Supabase (Postgres + Storage) · Anthropic Claude · ElevenLabs

## Status

**Phase 7 — refocus on Premier League + Champions League.** The app was
re-scoped from five domestic leagues to the Premier League and the UEFA
Champions League. The web layer, editorial prompts, and data scripts all
target the new scope, and the repo builds clean (`typecheck`, `lint`,
`build`). Remaining work is maintainer-owned: running the CL backfill with
real credentials, then the pre-launch operational checklist (ElevenLabs
upgrade, production audio verification, schedule unpause). See `ROADMAP.md`
for the current milestone and `DECISIONS.md` for architectural context.

## Project structure

| Path | What |
|------|------|
| `src/app/` | Next.js app router pages |
| `src/trigger/` | Trigger.dev scheduled tasks (daily report) |
| `src/football/` | Football-Data.org API client |
| `src/editorial/` | Claude prompt builders and generation pipeline |
| `src/audio/` | ElevenLabs synthesis pipeline |
| `src/lib/` | Shared types, Supabase clients, utilities |
| `scripts/` | One-off runners (`run-once`, `backfill`) |
| `supabase/` | Migrations and CLI config |
| `claude_design/` | Visual spec — reference only, do not modify |

## Getting started

```bash
cp env.example .env.local   # fill in values — see DEV.md for where to find each one
pnpm install
pnpm dev                    # Next.js dev server
pnpm trigger:dev            # Trigger.dev local task runner
pnpm typecheck
pnpm lint
```

## Docs

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project conventions — start here |
| `ROADMAP.md` | Phase milestones and current position |
| `DECISIONS.md` | Architectural decisions, append-only |
| `DATA.md` | API endpoints, data shapes, storage schema |
| `VOICE.md` | Editorial voice spec — read before touching prompts |
| `DEV.md` | Developer workflow (migrations, running the pipeline) |

## License

MIT
