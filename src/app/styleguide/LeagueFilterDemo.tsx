"use client";

// Styleguide-only wrapper for LeagueFilterChip. The chips carry onClick
// handlers, so they must live in a client component — this isolates that
// boundary so the styleguide page itself can stay a server component.
//
// Top row: interactive multi-select (toggles local state).
// Bottom row: display-only chips with no onClick (the shape a server
// component renders across the RSC boundary).

import { useState } from "react";
import LeagueFilterChip from "@/components/LeagueFilterChip";
import { LEAGUE_META } from "@/lib/leagues";

export default function LeagueFilterDemo() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["PL"]));

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[10px] text-ink3 uppercase tracking-wider mb-3">
          Interactive — multi-select
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {LEAGUE_META.map((league) => (
            <LeagueFilterChip
              key={league.code}
              label={league.name}
              flag={league.flag}
              selected={selected.has(league.code)}
              onClick={() => toggle(league.code)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="font-sans text-[10px] text-ink3 uppercase tracking-wider mb-3">
          Display-only — no onClick
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <LeagueFilterChip label="All" selected />
          {LEAGUE_META.map((league) => (
            <LeagueFilterChip
              key={league.code}
              label={league.name}
              flag={league.flag}
              selected={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
