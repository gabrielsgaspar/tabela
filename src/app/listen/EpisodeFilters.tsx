"use client";

// EpisodeFilters — sticky filter bar above the episode list.
//
// Filter state lives in the parent (ListenClient) so that EpisodeList can
// read the same values. This component is purely presentational — it receives
// state and callbacks as props; no local useState.
//
// Filters:
//   Kind: All · Daily (day_overview) · League (league_overview)
//   League: All + 5 league chips (hidden when kind = day_overview, since
//           day_overview rows are cross-league; shown for league_overview)
//   Search: text input, matches on headline + first line of body

import LeagueFilterChip from "@/components/LeagueFilterChip";
import { LEAGUE_META } from "@/lib/leagues";

export type KindFilter = "all" | "day_overview" | "league_overview";

interface EpisodeFiltersProps {
  kind: KindFilter;
  onKindChange: (k: KindFilter) => void;
  leagueFilter: string;
  onLeagueChange: (code: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  total: number;
  filtered: number;
}

const KIND_OPTS: { id: KindFilter; label: string }[] = [
  { id: "all",              label: "All" },
  { id: "day_overview",    label: "Daily" },
  { id: "league_overview", label: "League" },
];

export default function EpisodeFilters({
  kind,
  onKindChange,
  leagueFilter,
  onLeagueChange,
  query,
  onQueryChange,
  total,
  filtered,
}: EpisodeFiltersProps) {
  const showLeagueChips = kind !== "day_overview";

  return (
    <section
      className="rule-t sticky top-0 z-20"
      style={{
        backgroundColor:
          "color-mix(in oklch, var(--color-paper2) 80%, transparent)",
        backdropFilter: "saturate(1.05) blur(6px)",
      }}
    >
      <div className="max-w-content mx-auto px-5 md:px-8 py-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* Kind segmented control */}
          <div className="inline-flex items-center rounded-full p-0.5 bg-paper border border-rule shrink-0">
            {KIND_OPTS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onKindChange(opt.id)}
                aria-pressed={kind === opt.id}
                className={[
                  "h-8 px-3 rounded-full text-[13px] font-medium transition-colors",
                  kind === opt.id
                    ? "bg-ink text-paper"
                    : "text-ink2 hover:text-ink",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* League chips — only when relevant */}
          {showLeagueChips && (
            <>
              <span
                className="hidden md:inline-block text-rule2 mx-1"
                aria-hidden="true"
              >
                ·
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <LeagueFilterChip
                  label="All"
                  selected={leagueFilter === "all"}
                  onClick={() => onLeagueChange("all")}
                />
                {LEAGUE_META.map((l) => (
                  <LeagueFilterChip
                    key={l.code}
                    label={l.name}
                    flag={l.flag}
                    selected={leagueFilter === l.code}
                    onClick={() => onLeagueChange(l.code)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Search input — right-aligned on md+ */}
          <div className="ml-auto relative shrink-0">
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search episodes…"
              aria-label="Search episodes"
              className="h-9 w-40 md:w-56 pl-8 pr-3 rounded-full bg-paper border border-rule text-[13px] text-ink focus:outline-none focus:border-pitch placeholder:text-ink3"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
              aria-hidden="true"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M9.5 9.5 L13 13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

        </div>

        {/* Filter result count — only when narrowed */}
        {(kind !== "all" || leagueFilter !== "all" || query) && (
          <p className="mt-2 text-[11px] font-mono text-ink3">
            {filtered === total
              ? `${total} ${total === 1 ? "episode" : "episodes"}`
              : `${filtered} of ${total} ${total === 1 ? "episode" : "episodes"}`}
          </p>
        )}
      </div>
    </section>
  );
}
