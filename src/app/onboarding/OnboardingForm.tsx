"use client";

import { useActionState, useEffect, useRef } from "react";
import { completeOnboarding } from "./actions";
import type { OnboardingState } from "./types";

interface CompetitionOption {
  code: string;
  name: string;
}

const initial: OnboardingState = { status: "idle" };

export default function OnboardingForm({
  competitions,
}: {
  competitions: CompetitionOption[];
}) {
  const [state, formAction, pending] = useActionState(completeOnboarding, initial);
  const timezoneRef = useRef<HTMLInputElement>(null);

  // Auto-detect the browser's timezone once on mount and write it into the
  // uncontrolled input (a DOM write, not React state — no re-render, and the
  // server renders the "UTC" default so there's no hydration mismatch). The
  // user can still edit the field.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const input = timezoneRef.current;
      if (tz && input && input.value === "UTC") {
        input.value = tz;
      }
    } catch {
      // keep the UTC default
    }
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-8 max-w-md">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3 mb-2">
          Competitions to follow
        </legend>
        {competitions.map((c) => (
          <label
            key={c.code}
            className="flex items-center gap-3 text-[18px] text-ink"
          >
            <input
              type="checkbox"
              name="competitions"
              value={c.code}
              defaultChecked
              className="accent-pitch w-4 h-4"
            />
            {c.name}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="timezone"
          className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3"
        >
          Your timezone
        </label>
        <input
          ref={timezoneRef}
          id="timezone"
          name="timezone"
          defaultValue="UTC"
          className="rule-strong-b bg-transparent py-2 text-[18px] text-ink outline-none focus:border-pitch"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="briefing_time"
          className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3"
        >
          When to send your morning briefing
        </label>
        <input
          id="briefing_time"
          name="briefing_time"
          type="time"
          defaultValue="07:00"
          className="rule-strong-b bg-transparent py-2 text-[18px] text-ink outline-none focus:border-pitch w-40"
        />
      </div>

      {state.status === "error" && (
        <p className="text-[14px] text-crimson">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start bg-ink text-paper px-5 py-2.5 text-[13px] font-mono uppercase tracking-[0.14em] disabled:opacity-55"
      >
        {pending ? "Saving…" : "Finish setup"}
      </button>
    </form>
  );
}
