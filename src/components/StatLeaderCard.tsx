/**
 * StatLeaderCard — magazine-sidebar stat card.
 *
 * Server component. TeamCrest and Sparkline are permitted children.
 *
 * Layout (top to bottom, matching JSX source):
 *   1. Category label (top-left) + stat type label (top-right)
 *   2. Player block: crest + player name + team name
 *   3. Stat number (bottom-left) | sparkline + trend + delta label (bottom-right)
 *   4. Optional editor's note at card bottom
 *
 * The player is identified before the number — magazine-sidebar convention where
 * the person is the story and the number is the attribution.
 *
 * Companion export:
 *   StatLeaderCardSkeleton — loading shimmer
 */

import Link from "next/link";
import TeamCrest from "@/components/TeamCrest";
import Sparkline from "@/components/Sparkline";
import TrendArrow from "@/components/TrendArrow";

export interface StatLeaderCardProps {
  /** Category label, top-left. E.g. "Top Scorer", "Most Assists". */
  category: string;
  /** Stat type label, top-right. E.g. "Goals", "Assists", "Clean Sheets". */
  statLabel: string;
  playerName: string;
  teamName: string;
  teamCrestUrl: string | null;
  /** The headline stat value, e.g. 22. Displayed large at bottom-left. */
  statValue: number;
  /**
   * Per-matchday trend data for the sparkline.
   * If omitted or empty, the sparkline is not rendered.
   */
  sparkData?: number[];
  /**
   * Trend direction: positive = up, negative = down, zero = flat.
   * Drives the TrendArrow icon beside the deltaLabel.
   * Omit to show no indicator.
   */
  delta?: number;
  /** Label beside the TrendArrow, e.g. "+3 since last week". */
  deltaLabel?: string;
  /** Editor's note at the card bottom. E.g. contextual commentary on the stat. */
  note?: string;
  /** When present, wraps the team crest in a link to the team page. */
  teamId?: number;
  /** When present, wraps the category label in a link (e.g. to a league page). */
  categoryHref?: string;
}

// ---- main export ------------------------------------------------------------

export default function StatLeaderCard({
  category,
  statLabel,
  playerName,
  teamName,
  teamCrestUrl,
  statValue,
  sparkData,
  delta,
  deltaLabel,
  note,
  teamId,
  categoryHref,
}: StatLeaderCardProps) {
  const hasSparkline = sparkData != null && sparkData.length > 0;
  const hasTrend = delta != null;

  return (
    <article className="rule-b py-5 first:pt-3">

      {/* Top row: category (left) + stat label (right) */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
          {categoryHref ? (
            <Link href={categoryHref} className="hover:text-ink2 transition-colors">
              {category}
            </Link>
          ) : category}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink3">
          {statLabel}
        </div>
      </div>

      {/* Player block: crest + name + team */}
      <div className="flex items-center gap-3 mb-3">
        {teamId ? (
          <Link href={`/teams/${teamId}`} className="shrink-0 hover:opacity-80 transition-opacity">
            <TeamCrest src={teamCrestUrl} alt={teamName} size={32} />
          </Link>
        ) : (
          <TeamCrest src={teamCrestUrl} alt={teamName} size={32} />
        )}
        <div className="min-w-0 flex-1">
          <div className="h-serif text-[19px] md:text-[20px] leading-tight text-ink">
            {playerName}
          </div>
          <div className="mt-0.5 text-[12px] text-ink3 truncate">{teamName}</div>
        </div>
      </div>

      {/* Bottom row: big number (left) + sparkline + trend (right) */}
      <div className="flex items-end justify-between gap-3">
        <div className="num text-[34px] font-medium leading-none tracking-tighter2 text-ink">
          {statValue}
        </div>
        {(hasSparkline || hasTrend) && (
          <div className="flex flex-col items-end gap-1">
            {hasSparkline && (
              <Sparkline data={sparkData!} width={84} height={26} fill highlightLast />
            )}
            {hasTrend && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink3">
                <TrendArrow delta={delta!} />
                {deltaLabel && <span>{deltaLabel}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor's note */}
      {note && (
        <p
          className="mt-3 text-[13px] leading-snug text-ink3"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {note}
        </p>
      )}

    </article>
  );
}

// ---- loading skeleton -------------------------------------------------------

export function StatLeaderCardSkeleton() {
  return (
    <article className="rule-b py-5 first:pt-3 animate-pulse" aria-hidden="true">
      {/* Top row */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="h-2.5 w-20 bg-paper2 rounded" />
        <div className="h-2.5 w-10 bg-paper2 rounded" />
      </div>
      {/* Player block */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-paper2 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-28 bg-paper2 rounded" />
          <div className="h-3 w-16 bg-paper2 rounded" />
        </div>
      </div>
      {/* Bottom row */}
      <div className="flex items-end justify-between gap-3">
        <div className="h-9 w-14 bg-paper2 rounded" />
        <div className="h-[26px] w-[84px] bg-paper2 rounded" />
      </div>
    </article>
  );
}
