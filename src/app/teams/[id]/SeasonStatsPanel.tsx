// SeasonStatsPanel — dark pitch-green section with season aggregate stats.
//
// Server component. Matches the design exactly:
//   - Dark bg-pitch background, paper-coloured text
//   - Eyebrow + h-serif intro copy
//   - dl grid: Played | Wins | Draws | Losses | Goals Scored | Goals Against |
//     GD | Clean Sheets
//
// Inline rgba() values for muted/border colours are taken directly from the
// claude_design/src/team-page.jsx reference (no Tailwind opacity modifier needed).

export interface SeasonStatsPanelProps {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
}

export default function SeasonStatsPanel({
  teamName,
  played,
  wins,
  draws,
  losses,
  goalsFor,
  goalsAgainst,
  goalDifference,
  cleanSheets,
}: SeasonStatsPanelProps) {
  const gdDisplay =
    goalDifference > 0 ? `+${goalDifference}` : String(goalDifference);

  const stats = [
    { label: "Played",         value: played },
    { label: "Wins",           value: wins },
    { label: "Draws",          value: draws },
    { label: "Losses",         value: losses },
    { label: "Goals scored",   value: goalsFor },
    { label: "Goals against",  value: goalsAgainst },
    { label: "GD",             value: gdDisplay },
    { label: "Clean sheets",   value: cleanSheets },
  ];

  return (
    <section className="rule-t bg-pitch text-paper2">
      <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">

        {/* Intro */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-6">
            <div
              className="text-[11px] font-mono uppercase tracking-[0.18em] mb-3"
              style={{ color: "rgba(242,238,229,0.6)" }}
            >
              The season, in figures
            </div>
            <h2
              className="h-serif text-[36px] md:text-[52px] leading-[1.0] text-paper"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {teamName}, by the numbers.
            </h2>
          </div>
          <p
            className="lg:col-span-6 text-[16px] md:text-[18px] leading-[1.55]"
            style={{ color: "rgba(242,238,229,0.78)" }}
          >
            Every figure from this league season.
          </p>
        </div>

        {/* Stats grid */}
        <dl className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-10 gap-y-0">
          {stats.map((s) => (
            <div
              key={s.label}
              className="py-4"
              style={{ borderTop: "1px solid rgba(242,238,229,0.18)" }}
            >
              <dt
                className="text-[11px] font-mono uppercase tracking-[0.14em]"
                style={{ color: "rgba(242,238,229,0.6)" }}
              >
                {s.label}
              </dt>
              <dd className="mt-2 num text-[34px] md:text-[40px] font-medium tracking-tighter2 text-paper">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

      </div>
    </section>
  );
}
