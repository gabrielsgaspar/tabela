# CLAUDE.md

Read this before doing anything in this repo.

## What is Tabela?

A daily editorial briefing on the top five European football leagues. Every morning a scheduled task fetches yesterday's matches, updates season stats, asks Claude to write a short summary, generates an audio version, and publishes to a Next.js site. See [README.md](./README.md) for the full pitch.

## Stack

Next.js 15 · Trigger.dev v3 · Supabase (Postgres + Storage) · Anthropic Claude · ElevenLabs · Football-Data.org

## Where things live

| Path | What |
|------|------|
| `src/app/` | Next.js app router pages |
| `src/trigger/` | Trigger.dev scheduled tasks (daily report) |
| `src/football/` | Football-Data.org API client |
| `src/editorial/` | Claude prompts, generation pipelines |
| `src/lib/` | Shared types and utilities |
| `claude_design/` | Visual spec — reference only, **do not modify** |
| `ROADMAP.md` | Current phase and what's next |
| `DECISIONS.md` | Architectural choices, append-only |
| `DATA.md` | API endpoints, schemas, data shapes |
| `VOICE.md` | Editorial voice — required reading before writing prompts |

## Current phase

Read [ROADMAP.md](./ROADMAP.md) to find out which phase we're on. Each phase starts with a `PLAN.md` at the repo root that you should write and have approved *before* writing code.

## Voice

Tabela's editorial voice is warm, knowledgeable, allusive — never shouty. Any prompt that generates user-visible text must reference [VOICE.md](./VOICE.md) and follow its examples. This is not optional polish; it's the product.

## ALWAYS

- Start a new phase by writing a `PLAN.md` and waiting for approval before coding.
- Read [VOICE.md](./VOICE.md) before writing or modifying any prompt that generates content.
- Use TypeScript strict mode. Match Football-Data.org response shapes exactly in types.
- Keep secrets out of code. Use `.env.local`. Never commit it.
- Use kebab-case for file names, PascalCase for React components, camelCase for variables.
- Run `pnpm typecheck` and `pnpm lint` before declaring a task done.
- Append to [DECISIONS.md](./DECISIONS.md) for any architectural choice (new dependency, new service, schema change, scheduling change).
- Update [ROADMAP.md](./ROADMAP.md) when a phase milestone is complete.

## NEVER

- Do not commit `.env`, `.env.local`, or any file containing real keys.
- Do not modify files in `claude_design/` — it's the visual reference.
- Do not invent match data. If an API call fails or returns nothing, surface it; do not fill the gap with plausible-looking placeholders.
- Do not let editorial prompts generate facts not present in the input data. The voice is allusive but the facts must be real.
- Do not introduce a new external service or paid dependency without updating `DECISIONS.md` first.
- Do not "improve" the visual design unilaterally. The look in `claude_design/` is the spec.
- Do not skip the phase plan. We work phase by phase.

## How to run

```bash
pnpm install
pnpm dev          # Next.js dev server (Phase 4+)
pnpm trigger:dev  # Trigger.dev local task runner (Phase 1+)
pnpm typecheck
pnpm lint
```

## Working in this repo

- **New phase?** Read `ROADMAP.md`, write `PLAN.md` for the phase, wait for approval.
- **Mid-phase?** Pick up where `ROADMAP.md`'s "current" marker says we are.
- **Stuck or unsure?** Check `DECISIONS.md` for prior context. Ask before making a new architectural call.

## A note on tone in code

Comments and commit messages should match the spirit of the project: clear, specific, no breathless hype. "Adds Football-Data client and basic match fetcher" not "AMAZING new data layer 🚀".
