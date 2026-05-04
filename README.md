# Tabela

A daily editorial briefing on the top five European football leagues.

Every morning a scheduled task fetches the previous day's matches, updates
season statistics, asks Claude to write a short editorial in a warm, allusive
voice, generates an audio version, and publishes the result to a Next.js site.

## Leagues

Premier League · La Liga · Bundesliga · Serie A · Ligue 1

## Stack

Next.js 16 · Trigger.dev v3 · Supabase (Postgres + Storage) · Anthropic Claude · ElevenLabs

## Status

**Phase 1 in progress.** Foundations (docs, design tokens, type definitions,
editorial prompts) are in place. The data pipeline, database schema, and
website are under active development. See `ROADMAP.md` for the phase breakdown
and `DECISIONS.md` for architectural context.

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
