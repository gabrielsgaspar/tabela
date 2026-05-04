// Supabase client factory.
// Two exports with a hard boundary between them:
//
//   createServerClient  — service role key, bypasses RLS.
//   createBrowserClient — anon key, subject to RLS.
//
// ┌─────────────────────────────────────────────────────────────┐
// │  createServerClient  is for scripts/ and src/trigger/ ONLY. │
// │  NEVER import it from src/app/ or any client component.     │
// │  The service role key bypasses every RLS policy.            │
// └─────────────────────────────────────────────────────────────┘
//
// The separation is enforced by convention and code review rather than
// a compile-time barrier. Before adding any import of this module inside
// src/app/, confirm you are importing createBrowserClient only.
//
// Background: DECISIONS.md 2026-05-04 "Anon client for all website reads"
// records why the service role key is excluded from the Vercel environment.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ---- createServerClient --------------------------------------------------
// Uses SUPABASE_SERVICE_ROLE_KEY (not prefixed NEXT_PUBLIC_).
// Appropriate for: the daily-report Trigger.dev task, scripts/run-once.ts,
// scripts/backfill.ts, and any future admin scripts.
// persistSession: false — task runners are stateless; no session store needed.

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "This client is only for use in scripts/ and src/trigger/.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

// ---- createBrowserClient -------------------------------------------------
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (safe to expose; governed by RLS).
// Appropriate for: src/app/ server components, server actions, and any
// future API routes that perform read-only queries for the website.
// Phase 4 will add SELECT policies so the anon role can read
// match_days, season_stats, and editorials.

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  }
  return createClient<Database>(url, key);
}
