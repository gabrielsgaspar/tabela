// Cookie-based Supabase client for the App Router server side: server
// components, server actions, and route handlers. Reads/writes the signed-in
// user's session via next/headers. Anon key + RLS — never the service role.
//
// Distinct from src/lib/supabase.ts:
//   createServerClient (there)     = service role, no session, scripts/trigger only.
//   createAuthServerClient (here)  = anon + the signed-in user's session.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { supabaseAuthEnv } from "./env";

export async function createAuthServerClient() {
  const { url, anonKey } = supabaseAuthEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In a Server Component the cookie store is read-only and .set throws;
        // swallow it — the middleware refreshes the session cookie per request.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // no-op: called from a Server Component render.
        }
      },
    },
  });
}
