import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import { createAuthServerClient } from "@/lib/auth/server";
import { COMPETITIONS } from "@/lib/leagues";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Set up your briefing — Tabela",
};

export default async function OnboardingPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Already onboarded? Send them to the paper.
  const { data: existing } = await supabase
    .from("app_user")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (existing?.onboarded_at) {
    redirect("/");
  }

  const competitions = COMPETITIONS.map((c) => ({ code: c.code, name: c.name }));

  return (
    <div className="min-h-screen bg-paper">
      <main className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3 mb-3">
          Welcome to Tabela
        </p>
        <h1 className="display text-[40px] md:text-[56px] text-ink mb-4">
          Set up your briefing
        </h1>
        <p className="font-serif text-[18px] text-ink2 mb-12 max-w-prose">
          Pick what you want to follow and when you&rsquo;d like your morning
          catch-up. You can change all of this later.
        </p>
        <OnboardingForm competitions={competitions} />
      </main>
      <Footer />
    </div>
  );
}
