"use client";

// Sticky league filter bar on the home page. Reads/writes the `?league=<slug>`
// search param: clicking a league chip filters the match groups, stat leaders,
// and race watch server-side (the home page re-renders from the new param).
//
// Uses useSearchParams, so the home page wraps it in a <Suspense> boundary.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import LeagueFilterChip from "@/components/LeagueFilterChip";
import { LEAGUE_META } from "@/lib/leagues";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("league");

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("league", slug);
    } else {
      params.delete("league");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="sticky-filter sticky top-0 z-30">
      <div className="max-w-content mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <LeagueFilterChip
              label="All"
              selected={!active}
              onClick={() => select(null)}
            />
            {LEAGUE_META.map((league) => (
              <LeagueFilterChip
                key={league.code}
                label={league.name}
                flag={league.flag}
                selected={active === league.slug}
                onClick={() => select(league.slug)}
              />
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.12em] text-ink3 whitespace-nowrap shrink-0">
            <span>{LEAGUE_META.length} competitions</span>
            <span className="text-rule2">·</span>
            <span>Yesterday</span>
          </div>
        </div>
      </div>
    </div>
  );
}
