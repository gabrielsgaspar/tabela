# DEV.md — Developer workflow

## Supabase migrations

### First-time setup

After cloning, link the CLI to the remote project:

```bash
pnpm supabase:link
```

This reads `SUPABASE_PROJECT_REF` from `.env.local`. You need to have run
`pnpm install` first so the `supabase` CLI binary is available.

### Creating a new migration

```bash
supabase migration new <name>
```

This creates `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`. Edit the file,
then push.

### Pushing migrations to the remote database

```bash
pnpm supabase:push
```

Applies any unapplied migrations to the linked project. Safe to run repeatedly —
already-applied migrations are skipped.

### Regenerating TypeScript types after a schema change

```bash
pnpm supabase:gen-types
```

Overwrites `src/lib/database.types.ts`. Commit the result alongside the
migration that caused the schema change so they stay in sync.

### Resetting the local dev database

```bash
supabase db reset
```

Only relevant if you are running a local Supabase instance (`supabase start`).
Not needed for day-to-day work against the remote project.

## Environment variables

Copy `env.example` to `.env.local` and fill in real values. The file is
gitignored — never commit it.

Scripts that need env vars (run-once, backfill) load `.env.local` via the
`--env-file` flag on `tsx`. Trigger.dev tasks read vars from `.env.local`
when running locally via `pnpm trigger:dev`.

## Running the pipeline locally

```bash
# Fetch yesterday's matches and write to output/YYYY-MM-DD.json
pnpm run-once

# Fetch + generate editorial HTML to generated/YYYY-MM-DD.html
pnpm run-once -- --generate

# Fetch + generate + persist to Supabase for a specific date
pnpm run-once -- --generate --date 2026-05-02

# Backfill the last 7 days (fetch + generate + persist for each)
pnpm backfill

# Backfill an explicit date range
pnpm backfill -- --from 2026-04-26 --to 2026-05-02
```
