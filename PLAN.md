# PLAN.md — WS1: Accounts and preferences

> Phase plan for the second workstream of [EXPANSION.md](./EXPANSION.md) (§3).
> WS0 is complete (see `ROADMAP.md` + `DECISIONS.md` 2026-06-04). Written per
> `CLAUDE.md` ("start a new phase by writing a `PLAN.md`").

## Goal

Enough identity + stored preference to personalize briefings and attribute
behavioral events. This unblocks WS2–WS7. Three new tables, Supabase Auth
(email magic-link), an onboarding flow, and a `getUserContext` helper every
downstream workstream reads from.

## Current state (verified this session)

- Supabase is a **cloud** project (`ksmgtrbgrvqfhiijqsyd.supabase.co`) — the old
  localhost/Docker blocker (DECISIONS.md 2026-05-29) no longer applies.
- All WS1 credentials are present in `.env.local`/`.env`: anon key, service-role
  key, project ref, DB URL.
- `@supabase/supabase-js` is installed; **`@supabase/ssr` is not** — it's needed
  for cookie-based session handling in the Next.js App Router.
- Existing schema: `match_days`, `season_stats`, `editorials`, `match_results`,
  `teams_followed` (the last is the deferred follow sketch — auth never shipped,
  so it is empty). Migrations live in `supabase/migrations/`.
- `src/lib/supabase.ts` exports `createServerClient` (service role, scripts/trigger
  only) and `createBrowserClient` (anon, RLS). Neither does auth sessions yet.

## Decisions (flag-and-record per the EXPANSION.md intro)

1. **Auth library: `@supabase/ssr` + email magic-link, no passwords** (EXPANSION
   §3.1). The App Router needs cookie-based sessions across server components,
   server actions, and middleware; `@supabase/ssr` is the supported way. New
   dependency → record in `DECISIONS.md` (it's a library of an existing service,
   not a new paid service).
2. **`follow` supersedes `teams_followed`, but the old table is not dropped now.**
   `teams_followed` is referenced by `database.types.ts` and `FollowTeamCTA.tsx`
   and is empty. Dropping it is a separate cleanup once nothing references it.
   The migration adds `follow` and leaves `teams_followed` in place with a
   deprecation comment. No data migration runs automatically (FK to `app_user`
   would fail for any orphan row); the migration raises a NOTICE if rows exist.
3. **Account rows are provisioned by the app at onboarding, not by an
   `auth.users` trigger.** EXPANSION §3.2 step 3 writes `app_user`/`user_prefs`/
   `follow` from the onboarding UI. A `SECURITY DEFINER` trigger on `auth.users`
   is more fragile and harder to reason about under RLS; the app path is explicit
   and testable. (Revisit only if we need rows to exist before onboarding.)
4. **`getUserContext(db, userId)` takes the client as an argument** rather than
   constructing one, so the same helper serves both the per-user pipeline fan-out
   (service-role client, WS3) and the web app (the user's RLS-scoped session).

## What I will execute now (no new deps, no live-DB writes — all typecheck-clean)

- **`supabase/migrations/0004_accounts.sql`** — `app_user`, `follow`, `user_prefs`
  exactly per EXPANSION §3.1, with: owner-only RLS policies (`auth.uid()` = the
  row's user), `GRANT`s to the `authenticated` role, an `updated_at` trigger on
  `user_prefs`, and a guarded NOTICE about `teams_followed`.
- **`src/lib/database.types.ts`** — hand-add the three tables (matching the
  generated format) so `getUserContext` typechecks before the live regen. Marked
  with a note to reconcile via `pnpm supabase:gen-types` after the migration applies.
- **`src/lib/users.ts`** — `getUserContext(db, userId)` returning a typed
  `UserContext` (timezone, briefing time, follows split into competitions/teams,
  prefs) with the **cold-start guard**: a user following nothing defaults to all
  in-scope competitions (`COMPETITIONS`).
- **`DECISIONS.md`**, **`ROADMAP.md`**, **`TASKS.md`** updates.
- `tsc --noEmit` + `eslint src/` green.

## Maintainer / terminal-gated (I'll hand these off — you offered to run commands)

1. **Install the auth dep:** `pnpm add @supabase/ssr` (corepack's pnpm 11 trips on
   build-script approval for me; one `pnpm approve-builds` likely fixes it).
2. **Apply the migration to the cloud DB.** Either you run `pnpm supabase:push`,
   or — with your go-ahead — I apply it via the connected Supabase MCP
   (`apply_migration`). This is a live schema change, so I will **confirm before
   running it**.
3. **Enable email magic-link Auth** in the Supabase dashboard (Authentication →
   Providers → Email → enable magic link; set the site URL + redirect to
   `NEXT_PUBLIC_APP_URL`). Dashboard-only — your step.
4. **Regenerate types:** `pnpm supabase:gen-types` (reconciles the hand-added types).

## Next sub-phase (after 1–4 land, so it's verifiable against a running app)

- Auth client modules using `@supabase/ssr` (server client, browser client,
  `middleware.ts` for session refresh) — additive to `src/lib/supabase.ts`.
- Auth pages in `src/app/` (sign-in with magic link, `/auth/callback`, sign-out).
- Onboarding flow: pick competitions (PL/CL), optionally follow teams, set
  timezone (auto-detect + editable) and briefing time → writes `app_user` +
  `follow` + `user_prefs`.

## Acceptance criteria (EXPANSION §3.3)

- [ ] `tsc --noEmit` + `eslint src/` pass (this turn's deliverables).
- [ ] Migration creates the three tables with owner-only RLS (verified on apply).
- [ ] A new user can sign in, onboard, and get exactly one `app_user` + one
      `user_prefs` + ≥1 `follow` (verified once auth UI lands).
- [ ] RLS: user A cannot read user B's `follow`/`user_prefs` (verified on apply).
- [ ] `getUserContext` returns a typed object; cold-start guard defaults a
      follow-nothing user to all in-scope competitions.

## Out of scope for WS1

Spoiler layer (WS2), briefings (WS3+), the `event`/`metrics_daily` tables, and
the transparency/consent surfaces (WS6). Auth UI is the next sub-phase, not this
turn's executable slice.
