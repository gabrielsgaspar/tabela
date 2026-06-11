"use client";

// Browser Supabase client for client components that need the current session
// (anon key, session via cookies). Server actions cover most flows, so this is
// here for client-side session reads as later workstreams need them.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabaseAuthEnv } from "./env";

export function createAuthBrowserClient() {
  const { url, anonKey } = supabaseAuthEnv();
  return createBrowserClient<Database>(url, anonKey);
}
