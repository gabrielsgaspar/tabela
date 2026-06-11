// Refreshes the Supabase auth session on every request so server components and
// actions always see a current session. It does NOT gate routes — each page
// decides its own auth needs (e.g. /onboarding redirects to /sign-in).
//
// Next 16 renamed the `middleware` file convention to `proxy`; the signature and
// matcher config are unchanged. Standard @supabase/ssr pattern: read request
// cookies, touch the session so expired tokens get rotated, and write any
// refreshed cookies onto the response.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthEnv } from "@/lib/auth/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = supabaseAuthEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the session — rotates an expired access token into response cookies.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static asset files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
