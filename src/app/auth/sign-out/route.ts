// Signs the user out and returns them to the sign-in page. POST-only so it
// can't be triggered by a link prefetch or an <img> request.

import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/auth/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/sign-in`, { status: 303 });
}
