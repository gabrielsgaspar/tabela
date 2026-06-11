"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";
import type { SignInState } from "./types";

const initial: SignInState = { status: "idle" };

export default function SignInForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);

  if (state.status === "sent") {
    return (
      <p className="font-serif italic text-[18px] text-ink2">
        Check your inbox — we&rsquo;ve sent you a one-time sign-in link.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <label
        htmlFor="email"
        className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3"
      >
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="rule-strong-b bg-transparent py-2 text-[18px] text-ink outline-none focus:border-pitch"
      />
      {state.status === "error" && (
        <p className="text-[14px] text-crimson">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start bg-ink text-paper px-5 py-2.5 text-[13px] font-mono uppercase tracking-[0.14em] disabled:opacity-55"
      >
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
