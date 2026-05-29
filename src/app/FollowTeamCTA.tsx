// The "follow a team" call-to-action band at the foot of the home page.
//
// A dark pitch-green section that pitches the upcoming weekly-brief feature.
// The feature isn't built yet, so the button is a disabled "Coming soon"
// placeholder — see PHASE_6_PROPOSED_FEATURES.md for the planned sign-up flow.

export default function FollowTeamCTA() {
  return (
    <section className="rule-t bg-pitch text-paper2">
      <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-20">
        <div
          className="text-[11px] font-mono uppercase tracking-[0.18em] mb-3"
          style={{ color: "rgba(242,238,229,0.6)" }}
        >
          The give-and-go
        </div>
        <h2 className="h-serif text-[36px] md:text-[52px] leading-[1.0] text-paper max-w-[18ch]">
          Follow a team. We&rsquo;ll tell you how Sunday changed everything else,
          too.
        </h2>
        <p
          className="mt-5 text-[17px] max-w-[56ch]"
          style={{ color: "rgba(242,238,229,0.78)" }}
        >
          Pick a club. Every Monday we&rsquo;ll send a one-page brief: their
          result, what it did to the table, and the one fixture elsewhere that
          quietly mattered.
        </p>
        <p
          className="mt-3 text-[13px] font-mono"
          style={{ color: "rgba(242,238,229,0.5)" }}
        >
          Club following and weekly briefs are coming in a future update.
        </p>
        <button
          type="button"
          disabled
          className="mt-7 h-11 px-5 rounded-full bg-mustard text-pitch text-[14px] font-medium inline-flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          Coming soon
        </button>
      </div>
    </section>
  );
}
