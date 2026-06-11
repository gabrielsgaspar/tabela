// Magic-link return target. Supabase redirects here with a `code`; we exchange
// it for a session (the PKCE verifier cookie was set when the link was
// requested) and forward the user on — to onboarding by default.

import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/auth/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link`);
}
