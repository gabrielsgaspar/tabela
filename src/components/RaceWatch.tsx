/**
 * RaceWatch — compact standings module showing the title race and drop zone.
 *
 * Server component. No interactivity.
 *
 * Takes full standings rows; slices top-3 and bottom-3 internally.
 * If the table has ≤ 6 rows (e.g. early season, test data), all rows
 * are shown without an ellipsis separator.
 *
 * Zone framing:
 *   Positions 1–3    → "Title Race" — pitch-green left border + position colour
 *   Positions (N-2)–N → "Drop Zone" — crimson left border + position colour
 *   Middle rows      → shown only as a "· · ·" ellipsis row (not rendered)
 *
 * The standings data lives in season_stats.payload (JSONB). This component
 * accepts a typed StandingRow[] prop; the Phase 4B wiring will extract and
 * normalise the payload before passing it here.
 *
 * Companion exports:
 *   RaceWatchSkeleton — loading shimmer
 *
 * Judgment calls (JSX source unavailable):
 *   - Zone thresholds: top-3 and bottom-3 are fixed regardless of league
 *     (actual relegation zones vary: 3 in PL/SA/FL1, 3 in PD, 2+1 play-off
 *     in BL1). Using bottom-3 for all leagues is a simplified editorial
 *     shorthand; the component does not claim to be a relegation calculator.
 *   - Zone labels: "Title Race" (pitch-green, top) and "Drop Zone" (crimson,
 *     bottom). The original JSX may use different wording.
 *   - Form letter display: left-to-right in order provided (caller's order).
 *     Most Football-Data.org API fields return most-recent-first; callers
 *     should reverse if they want oldest-to-newest left-to-right display.
 *   - `played` column shown on sm+. Hidden on mobile to keep the row tight.
 *   - Form hidden on mobile entirely; shown on sm+. On md+ 5 pips, sm+ up to 5.
 *   - Hover states: none. RaceWatch is presentational; team links added in 4B.
 *   - The "· · ·" row is aria-hidden (decorative separator).
 */

import Link from "next/link";
import TeamCrest from "@/components/TeamCrest";
import { leagueByCode } from "@/lib/leagues";

export interface StandingRow {
  position: number;
  teamId: number;
  teamName: string;
  teamShort: string;
  crestUrl: string | null;
  points: number;
  played: number;
  /** Comma-separated result string, e.g. "W,D,L,W,W". Up to 5 shown. */
  form: string | null;
}

export interface RaceWatchProps {
  leagueCode: string;
  leagueName: string;
  rows: StandingRow[];
}

// ---- helpers ----------------------------------------------------------------

type Zone = "top" | "mid" | "bottom";

function getZone(position: number, totalTeams: number): Zone {
  if (position <= 3) return "top";
  if (position > totalTeams - 3) return "bottom";
  return "mid";
}

function positionClass(zone: Zone): string {
  if (zone === "top") return "text-pitch font-semibold";
  if (zone === "bottom") return "text-crimson font-semibold";
  return "text-ink3";
}

function zoneBorderClass(zone: Zone): string {
  if (zone === "top") return "border-l-2 border-pitch";
  if (zone === "bottom") return "border-l-2 border-crimson";
  return "border-l-2 border-transparent";
}

// ---- form pip ---------------------------------------------------------------

function FormPip({ result }: { result: string }) {
  const cls =
    result === "W"
      ? "text-pitch font-semibold"
      : result === "L"
        ? "text-crimson"
        : "text-ink3";
  return (
    <span className={`num text-[10px] ${cls}`} aria-label={result}>
      {result}
    </span>
  );
}

// ---- single standing row ----------------------------------------------------

function Row({ row, zone }: { row: StandingRow; zone: Zone }) {
  const formPips = row.form
    ? row.form
        .split(",")
        .map((r) => r.trim().toUpperCase())
        .slice(0, 5)
    : [];

  return (
    <li
      className={`flex items-center gap-2 py-1.5 pl-2 pr-1 ${zoneBorderClass(zone)}`}
    >
      {/* Position */}
      <span
        className={`num text-xs w-4 shrink-0 text-right ${positionClass(zone)}`}
        aria-label={`Position ${row.position}`}
      >
        {row.position}
      </span>

      {/* Crest */}
      <Link href={`/teams/${row.teamId}`} className="shrink-0 hover:opacity-80 transition-opacity">
        <TeamCrest src={row.crestUrl} alt={row.teamShort} size={20} />
      </Link>

      {/* Team name */}
      <span className="font-sans text-sm text-ink truncate flex-1 min-w-0">
        {row.teamShort}
      </span>

      {/* Played — hidden on mobile */}
      <span
        className="num text-xs text-ink3 w-5 text-right shrink-0 hidden sm:block"
        aria-label={`${row.played} played`}
      >
        {row.played}
      </span>

      {/* Points */}
      <span
        className="num text-sm font-semibold text-ink w-6 text-right shrink-0"
        aria-label={`${row.points} points`}
      >
        {row.points}
      </span>

      {/* Form — hidden on mobile */}
      {formPips.length > 0 && (
        <div
          className="hidden sm:flex gap-0.5 w-14 justify-end shrink-0"
          aria-label={`Recent form: ${row.form}`}
        >
          {formPips.map((r, i) => (
            <FormPip key={i} result={r} />
          ))}
        </div>
      )}
    </li>
  );
}

// ---- main export ------------------------------------------------------------

export default function RaceWatch({ leagueCode, leagueName, rows }: RaceWatchProps) {
  const leagueSlug = leagueByCode(leagueCode)?.slug;
  if (rows.length === 0) {
    return (
      <section>
        <p className="font-sans text-sm text-ink3 italic">
          Season not yet started.
        </p>
      </section>
    );
  }

  const total = rows.length;
  const showEllipsis = total > 6;
  const topRows = rows.slice(0, 3);
  const bottomRows = showEllipsis ? rows.slice(-3) : rows.slice(3);

  // Column header labels
  const colHeaders = (
    <div className="flex items-center gap-2 px-2 pb-1 rule-b mb-0.5">
      <span className="w-4 shrink-0" />
      <span className="w-5 shrink-0" aria-hidden="true" />
      <span className="font-sans text-[10px] text-ink3 uppercase tracking-wider flex-1">
        Club
      </span>
      <span className="font-sans text-[10px] text-ink3 uppercase tracking-wider w-5 text-right shrink-0 hidden sm:block">
        P
      </span>
      <span className="font-sans text-[10px] text-ink3 uppercase tracking-wider w-6 text-right shrink-0">
        Pts
      </span>
      <span className="font-sans text-[10px] text-ink3 uppercase tracking-wider w-14 text-right shrink-0 hidden sm:block">
        Form
      </span>
    </div>
  );

  return (
    <section aria-label={`${leagueName} standings`}>

      {/* League name */}
      <p className="font-sans text-xs text-ink3 uppercase tracking-wider mb-3">
        {leagueSlug ? (
          <Link href={`/leagues/${leagueSlug}`} className="hover:text-ink2 transition-colors">
            {leagueName}
          </Link>
        ) : leagueName}
      </p>

      {/* Title race */}
      <div className="mb-3">
        <p className="font-sans text-[10px] text-pitch uppercase tracking-wider font-semibold mb-1">
          Title Race
        </p>
        {colHeaders}
        <ul>
          {topRows.map((row) => (
            <Row key={row.teamId} row={row} zone={getZone(row.position, total)} />
          ))}
        </ul>
      </div>

      {/* Ellipsis separator */}
      {showEllipsis && (
        <div
          className="flex justify-center py-1.5 text-ink3 font-sans text-sm tracking-widest"
          aria-hidden="true"
        >
          · · ·
        </div>
      )}

      {/* Drop zone */}
      {bottomRows.length > 0 && (
        <div className="mt-1">
          <p className="font-sans text-[10px] text-crimson uppercase tracking-wider font-semibold mb-1">
            Drop Zone
          </p>
          {colHeaders}
          <ul>
            {bottomRows.map((row) => (
              <Row key={row.teamId} row={row} zone={getZone(row.position, total)} />
            ))}
          </ul>
        </div>
      )}

    </section>
  );
}

// ---- loading skeleton -------------------------------------------------------

export function RaceWatchSkeleton() {
  return (
    <section className="animate-pulse" aria-hidden="true">
      <div className="h-3 w-20 bg-paper2 rounded mb-4" />
      {/* Title race label */}
      <div className="h-2.5 w-16 bg-paper2 rounded mb-3" />
      {/* 3 skeleton rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 border-l-2 border-paper2 pl-2">
          <div className="w-4 h-3 bg-paper2 rounded" />
          <div className="w-5 h-5 bg-paper2 rounded-full" />
          <div className="h-3 flex-1 bg-paper2 rounded" />
          <div className="w-6 h-4 bg-paper2 rounded" />
        </div>
      ))}
      {/* Ellipsis */}
      <div className="h-3 w-8 bg-paper2 rounded mx-auto my-2" />
      {/* Drop zone label */}
      <div className="h-2.5 w-16 bg-paper2 rounded mb-3" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 border-l-2 border-paper2 pl-2">
          <div className="w-4 h-3 bg-paper2 rounded" />
          <div className="w-5 h-5 bg-paper2 rounded-full" />
          <div className="h-3 flex-1 bg-paper2 rounded" />
          <div className="w-6 h-4 bg-paper2 rounded" />
        </div>
      ))}
    </section>
  );
}
