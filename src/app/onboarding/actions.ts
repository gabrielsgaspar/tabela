"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/auth/server";
import { COMPETITIONS } from "@/lib/leagues";
import type { OnboardingState } from "./types";

const VALID_CODES = new Set<string>(COMPETITIONS.map((c) => c.code));
const ALL_CODES = COMPETITIONS.map((c) => c.code);

// Writes the three account rows from the onboarding form and marks the user
// onboarded. Order matters: app_user first, since follow/user_prefs FK to it.
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Your session expired. Please sign in again." };
  }

  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";
  const briefingTime = String(formData.get("briefing_time") ?? "").trim() || "07:00";

  // Selected competition follows; default to all in-scope if none were ticked
  // (cold-start guard — every user receives a briefing).
  const selected = formData
    .getAll("competitions")
    .map((v) => String(v))
    .filter((c) => VALID_CODES.has(c));
  const competitions = selected.length > 0 ? selected : ALL_CODES;

  // 1. app_user — mark onboarded.
  const { error: userErr } = await supabase.from("app_user").upsert(
    {
      id: user.id,
      timezone,
      briefing_local_time: briefingTime,
      onboarded_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (userErr) {
    return { status: "error", message: `Could not save your profile: ${userErr.message}` };
  }

  // 2. user_prefs — defaults; don't clobber existing prefs on re-onboard.
  const { error: prefsErr } = await supabase
    .from("user_prefs")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (prefsErr) {
    return { status: "error", message: `Could not save your preferences: ${prefsErr.message}` };
  }

  // 3. follow — replace the user's competition follows with the new selection.
  const { error: delErr } = await supabase
    .from("follow")
    .delete()
    .eq("user_id", user.id)
    .eq("kind", "competition");
  if (delErr) {
    return { status: "error", message: `Could not update your follows: ${delErr.message}` };
  }

  const { error: insErr } = await supabase
    .from("follow")
    .insert(competitions.map((ref) => ({ user_id: user.id, kind: "competition", ref })));
  if (insErr) {
    return { status: "error", message: `Could not save your follows: ${insErr.message}` };
  }

  redirect("/");
}
