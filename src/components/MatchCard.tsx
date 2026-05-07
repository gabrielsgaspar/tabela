/**
 * MatchCard — editorial match block.
 *
 * Server component. TeamCrest (client) is a permitted child.
 *
 * Rebuilt against claude_design/src/components.jsx (R1 remediation).
 * Structure (top to bottom):
 *   1. Top metadata row  — tag/matchday label (left), kickoff time or
 *      status label (right)
 *   2. Editorial headline — AI-generated title for this match (optional)
 *   3. Score grid         — grid-cols-[1fr_auto_1fr]: home team | score |
 *      away team. Score is 40–52px tabular numerals.
 *   4. xG row             — only rendered when xgHome and xgAway are
 *      both non-null (Football-Data free tier does not provide xG)
 *   5. Editorial caption  — capped at 62ch reading width
 *   6. Affordance row     — "Read the report" + "Lineups" + "Player ratings"
 *      (all href="#" in Phase 4A; routes wired in Phase 4B)
 *
 * Status handling:
 *   FINISHED          → full layout
 *   IN_PLAY / PAUSED  → live score + minute in metadata row; no headline,
 *                        caption, or affordances (no AI summary yet)
 *   TIMED / SCHEDULED → teams shown; kickoff time in score column; no score
 *   POSTPONED / CANCELLED / SUSPENDED → quiet label top-right; simplified
 *                        team row; no score grid
 *
 * Judgment calls (R1):
 *   - "Read the report", "Lineups", "Player ratings" affordances are
 *     href="#" placeholders. The source renders them for all finished
 *     matches; Phase 4B will route them to match report and team pages.
 *     "Lineups" and "Player ratings" are not yet data-backed — they are
 *     rendered as visual elements only, consistent with the source's intent.
 *   - xG is fully optional. Football-Data free tier does not provide it.
 *     When either xgHome or xgAway is null/undefined the entire xG row
 *     (including XgBar) is suppressed rather than showing placeholder dashes.
 *   - Team names use `name` (full name) not `shortName`, matching the source.
 *     On narrow viewports they truncate via `min-w-0 truncate`.
 *   - For SCHEDULED/TIMED the score column shows kickoff time at a quieter
 *     size — the time is the informational anchor when there is no score.
 *     The top-right still shows kickoffTime when available (consistent with
 *     the source's layout for all match states).
 *   - For POSTPONED/CANCELLED/SUSPENDED the status label moves to the
 *     top-right of the metadata row; a simplified team row replaces the
 *     score grid (no Home/Away sub-labels, smaller crests).
 *   - `first:pt-2` trims top padding on the first card in a list. Callers
 *     that render a single standalone card do not need to compensate.
 *   - `last:rule-b-0` drops the bottom border on the final card so the list
 *     doesn't end with a dangling hairline. Works in both Tailwind v3 and v4.
 *   - Loser opacity is `opacity-55` matching the source exactly. Draws show
 *     both teams at full opacity.
 */

import Link from "next/link";
import TeamCrest from "@/components/TeamCrest";

// ── types ────────────────────────────────────────────────────────────────────

export type MatchStatus =
  | "FINISHED"
  | "IN_PLAY"
  | "PAUSED"
  | "SCHEDULED"
  | "TIMED"
  | "POSTPONED"
  | "CANCELLED"
  | "SUSPENDED";

export interface TeamRef {
  id: number;
  name: string;
  shortName: string;
  crestUrl: string | null;
}

export interface MatchCardProps {
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  /** Match minute (only meaningful for IN_PLAY). */
  minute?: number | null;
  /** Pre-formatted kick-off time string, e.g. "20:00". Caller formats locale. */
  kickoffTime?: string | null;
  leagueCode: string;
  matchday?: number | null;
  /** AI-generated editorial title for this specific match. Shown above score. */
  headline?: string | null;
  /** Short context label, e.g. "Title race", "El Clásico". Pitch-green. */
  tag?: string | null;
  /** AI-written one-sentence editorial caption. */
  caption?: string | null;
  /**
   * Expected goals for home team. Football-Data free tier does not provide
   * xG — leave absent and the xG row will not render.
   */
  xgHome?: number | null;
  /** Expected goals for away team. See xgHome. */
  xgAway?: number | null;
}

// ── XgBar ────────────────────────────────────────────────────────────────────

function XgBar({ h, a }: { h: number; a: number }) {
  const total = h + a || 1;
  const hp = (h / total) * 100;
  return (
    <div className="w-24 md:w-32 h-[3px] bg-paper2 relative overflow-hidden shrink-0">
      <div
        className="absolute inset-y-0 left-0 bg-pitch"
        style={{ width: `${hp}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-mustard"
        style={{ width: `${100 - hp}%` }}
      />
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Label shown in the metadata row next to the tag (FT, HT, 45', Live). */
function statusLabel(
  status: MatchStatus,
  minute: number | null | undefined
): string | null {
  if (status === "FINISHED") return "FT";
  if (status === "PAUSED") return "HT";
  if (status === "IN_PLAY") return minute != null ? `${minute}'` : "Live";
  return null;
}

/** Quiet label for cancelled/suspended states shown top-right. */
function cancelLabel(status: MatchStatus): string {
  if (status === "POSTPONED") return "Postponed";
  if (status === "CANCELLED") return "Cancelled";
  return "Suspended";
}

// ── main export ───────────────────────────────────────────────────────────────

export default function MatchCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  minute,
  kickoffTime,
  matchday,
  headline,
  tag,
  caption,
  xgHome,
  xgAway,
}: MatchCardProps) {
  const isFinished = status === "FINISHED";
  const isLive = status === "IN_PLAY" || status === "PAUSED";
  const isScheduled = status === "SCHEDULED" || status === "TIMED";
  const isCancelled =
    status === "POSTPONED" ||
    status === "CANCELLED" ||
    status === "SUSPENDED";

  const hasScore = homeScore !== null && awayScore !== null;
  const hasXg = xgHome != null && xgAway != null;

  const winner =
    hasScore && isFinished
      ? homeScore! > awayScore!
        ? "home"
        : awayScore! > homeScore!
          ? "away"
          : "draw"
      : null;

  const mLabel = statusLabel(status, minute);

  // Tag text shown pitch-green when an explicit tag is provided;
  // "Matchday N" fallback renders in text-ink3.
  const tagText = tag ?? (matchday != null ? `Matchday ${matchday}` : null);
  const tagIsEditorial = !!tag;

  return (
    <article className="group py-7 first:pt-2 rule-b last:rule-b-0">

      {/* ── Top metadata row ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">

        {/* Left: tag · status/minute */}
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
          {tagText && (
            <span className={tagIsEditorial ? "text-pitch" : ""}>
              {tagText}
            </span>
          )}
          {tagText && mLabel && (
            <span className="text-rule2" aria-hidden="true">·</span>
          )}
          {mLabel && (
            <span className="flex items-center gap-1.5">
              {status === "IN_PLAY" && (
                <span className="live-dot" role="img" aria-label="Live" />
              )}
              {mLabel}
            </span>
          )}
        </div>

        {/* Right: kickoff time, or quiet status label for cancelled */}
        <div className="text-[11px] font-mono text-ink3">
          {isCancelled
            ? cancelLabel(status)
            : kickoffTime ?? null}
        </div>

      </div>

      {/* ── Editorial headline ───────────────────────────────────────── */}
      {headline && (
        <h3
          className="h-serif font-medium text-[22px] md:text-[26px] leading-[1.15] text-ink mb-5"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          {headline}
        </h3>
      )}

      {/* ── Score / team grid ────────────────────────────────────────── */}
      {!isCancelled && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6">

          {/* Home team */}
          <div
            className={[
              "flex items-center gap-3 min-w-0",
              isFinished && winner === "away" ? "opacity-55" : "",
            ].join(" ")}
          >
            <Link href={`/teams/${homeTeam.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
              <TeamCrest src={homeTeam.crestUrl} alt={homeTeam.name} size={36} />
            </Link>
            <div className="min-w-0">
              <div className="font-medium text-[15px] md:text-[16px] text-ink truncate">
                {homeTeam.name}
              </div>
              <div className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em]">
                Home
              </div>
            </div>
          </div>

          {/* Centre: score (finished/live) or kickoff (scheduled) */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {(isFinished || isLive) ? (
              <div
                className="flex items-center gap-3 md:gap-4"
                aria-label={`${homeScore ?? 0} to ${awayScore ?? 0}`}
              >
                <span className="num text-[40px] md:text-[52px] font-medium leading-none tracking-tighter2 text-ink tabular-nums">
                  {homeScore ?? 0}
                </span>
                <span
                  className="num text-[26px] md:text-[32px] text-ink3 -mt-1"
                  aria-hidden="true"
                >
                  –
                </span>
                <span className="num text-[40px] md:text-[52px] font-medium leading-none tracking-tighter2 text-ink tabular-nums">
                  {awayScore ?? 0}
                </span>
              </div>
            ) : (
              /* SCHEDULED / TIMED — kickoff time in score position */
              <span className="num text-[22px] md:text-[28px] font-medium text-ink3 tabular-nums">
                {kickoffTime ?? "TBC"}
              </span>
            )}
          </div>

          {/* Away team */}
          <div
            className={[
              "flex items-center gap-3 justify-end min-w-0",
              isFinished && winner === "home" ? "opacity-55" : "",
            ].join(" ")}
          >
            <div className="min-w-0 text-right">
              <div className="font-medium text-[15px] md:text-[16px] text-ink truncate">
                {awayTeam.name}
              </div>
              <div className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em]">
                Away
              </div>
            </div>
            <Link href={`/teams/${awayTeam.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
              <TeamCrest src={awayTeam.crestUrl} alt={awayTeam.name} size={36} />
            </Link>
          </div>

        </div>
      )}

      {/* Cancelled / postponed / suspended — simplified team row */}
      {isCancelled && (
        <div className="flex items-center gap-3 text-[14px] text-ink2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href={`/teams/${homeTeam.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
              <TeamCrest src={homeTeam.crestUrl} alt={homeTeam.name} size={22} />
            </Link>
            <span className="truncate">{homeTeam.name}</span>
          </div>
          <span className="text-ink3 shrink-0" aria-hidden="true">vs</span>
          <div className="flex items-center gap-2 min-w-0">
            <Link href={`/teams/${awayTeam.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
              <TeamCrest src={awayTeam.crestUrl} alt={awayTeam.name} size={22} />
            </Link>
            <span className="truncate">{awayTeam.name}</span>
          </div>
        </div>
      )}

      {/* ── xG row ──────────────────────────────────────────────────── */}
      {hasXg && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 text-[11px] font-mono text-ink3 uppercase tracking-[0.1em]">
          <div className="flex items-center gap-2">
            <span>xG</span>
            <span className="num text-ink2">{xgHome!.toFixed(1)}</span>
          </div>
          <XgBar h={xgHome!} a={xgAway!} />
          <div className="flex items-center gap-2 justify-end">
            <span className="num text-ink2">{xgAway!.toFixed(1)}</span>
            <span>xG</span>
          </div>
        </div>
      )}

      {/* ── Editorial caption ────────────────────────────────────────── */}
      {caption && (
        <p
          className="mt-5 text-[15px] md:text-[16px] leading-[1.6] text-ink2 max-w-[62ch]"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {caption}
        </p>
      )}

      {/* ── Affordance row (FINISHED only) ──────────────────────────── */}
      {isFinished && (
        <div className="mt-4 flex items-center gap-5">
          <a
            href="#"
            className="pass-link text-[13px] font-medium text-pitch inline-flex items-center gap-1.5"
          >
            Read the report
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path
                d="M2 6 L10 6 M6.5 2 L10 6 L6.5 10"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a href="#" className="pass-link text-[13px] text-ink3">
            Lineups
          </a>
          <a href="#" className="pass-link text-[13px] text-ink3">
            Player ratings
          </a>
        </div>
      )}

    </article>
  );
}

// ── loading skeleton ──────────────────────────────────────────────────────────

export function MatchCardSkeleton() {
  return (
    <div className="py-7 first:pt-2 rule-b animate-pulse" aria-hidden="true">

      {/* Top metadata row */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-2.5 w-20 bg-paper2 rounded" />
        <div className="h-2.5 w-10 bg-paper2 rounded" />
      </div>

      {/* Headline */}
      <div className="space-y-2 mb-5">
        <div className="h-6 w-4/5 bg-paper2 rounded" />
        <div className="h-6 w-3/5 bg-paper2 rounded" />
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6">
        {/* Home */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-paper2 shrink-0" />
          <div className="space-y-1.5 min-w-0">
            <div className="h-4 w-24 bg-paper2 rounded" />
            <div className="h-2.5 w-10 bg-paper2 rounded" />
          </div>
        </div>
        {/* Score */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-12 w-8 bg-paper2 rounded" />
          <div className="h-7 w-4 bg-paper2 rounded" />
          <div className="h-12 w-8 bg-paper2 rounded" />
        </div>
        {/* Away */}
        <div className="flex items-center gap-3 justify-end">
          <div className="space-y-1.5 min-w-0 text-right">
            <div className="h-4 w-24 bg-paper2 rounded ml-auto" />
            <div className="h-2.5 w-10 bg-paper2 rounded ml-auto" />
          </div>
          <div className="w-9 h-9 rounded-full bg-paper2 shrink-0" />
        </div>
      </div>

      {/* Caption */}
      <div className="mt-5 space-y-2">
        <div className="h-4 w-full bg-paper2 rounded" />
        <div className="h-4 w-4/5 bg-paper2 rounded" />
      </div>

      {/* Affordances */}
      <div className="mt-4 flex items-center gap-5">
        <div className="h-3.5 w-28 bg-paper2 rounded" />
        <div className="h-3.5 w-14 bg-paper2 rounded" />
        <div className="h-3.5 w-24 bg-paper2 rounded" />
      </div>

    </div>
  );
}
