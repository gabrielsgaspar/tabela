"use server";

import { headers } from "next/headers";
import { createAuthServerClient } from "@/lib/auth/server";
import type { SignInState } from "./types";

// Sends a one-time magic-link email. The link returns to /auth/callback, which
// exchanges the code for a session and forwards the user to onboarding.
export async function requestMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }

  const h = await headers();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent" };
}
