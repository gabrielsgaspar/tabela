import type { Metadata } from "next";
import Footer from "@/components/Footer";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in — Tabela",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3 mb-3">
          Tabela
        </p>
        <h1 className="display text-[40px] md:text-[56px] text-ink mb-4">
          Sign in
        </h1>
        <p className="font-serif text-[18px] text-ink2 mb-12 max-w-prose">
          We&rsquo;ll email you a one-time sign-in link. No passwords to remember.
        </p>
        <SignInForm />
      </main>
      <Footer />
    </div>
  );
}
