"use client";

// FullStandingsTable — interactive standings table for the league page.
//
// Client component: rows expand on click (useState) to show form pips and a
// link to the team page. Zone colours are rendered as a 3px coloured strip on
// the left of each row.
//
// Tabela's scope is the Premier League and the Champions League, so the zone
// meanings differ by competition:
//   PL : 1-4 UCL, 5-6 UEL, 18-20 relegation (domestic European/drop places)
//   CL : 1-8 direct to round of 16, 9-24 knockout play-off, 25-36 eliminated
//        (the single 36-team "league phase" introduced in 2024-25)
// The three strip colours are reused across both (green / mustard / crimson);
// the legend labels are competition-aware. The Champions League only has a
// table during the league phase — knockout rounds report no standings, and the
// league page already falls back to "Standings not available yet." in that case.
//
// Columns (desktop): zone strip | Pos | Crest | Name | P | W | D | L | GF | GA | Pts
// Columns (mobile):  zone strip | Pos | Crest | Name | Pts

import { useState } from "react";
import TeamCrest from "@/components/TeamCrest";
import type { StandingTableEntry } from "@/lib/query-types";

// ── zone logic ────────────────────────────────────────────────────────────────

type Zone = "ucl" | "uel" | "playoff" | "rel" | null;

// Each band is an inclusive position range. All optional so a competition can
// define only the bands that apply to it (CL has no separate UEL band).
interface ZoneRule {
  ucl?: [number, number];
  uel?: [number, number];
  playoff?: [number, number];
  rel?: [number, number];
}

const ZONE_RULES: Record<string, ZoneRule> = {
  PL: { ucl: [1, 4], uel: [5, 6], rel: [18, 20] },
  CL: { ucl: [1, 8], playoff: [9, 24], rel: [25, 36] },
};

function inRange(pos: number, range?: [number, number]): boolean {
  return range != null && pos >= range[0] && pos <= range[1];
}

function zoneFor(pos: number, leagueCode: string): Zone {
  const rule = ZONE_RULES[leagueCode];
  if (!rule) return null;
  if (inRange(pos, rule.ucl)) return "ucl";
  if (inRange(pos, rule.uel)) return "uel";
  if (inRange(pos, rule.playoff)) return "playoff";
  if (inRange(pos, rule.rel)) return "rel";
  return null;
}

// Inline hex values match the claude_design reference exactly.
function zoneColor(zone: Zone): string {
  if (zone === "ucl")     return "#0F3D2E";
  if (zone === "uel")     return "#1A5A45";
  if (zone === "playoff") return "#D4A24C";
  if (zone === "rel")     return "#B33A2E";
  return "transparent";
}

// ── FormPills ─────────────────────────────────────────────────────────────────
// Renders each result letter in a 24×24 circle.
// W = pitch bg, D = paper2 bg + border, L = crimson bg
// Form string is comma-separated, e.g. "W,D,L,W,W" (oldest → newest per design label).

function FormPills({ form }: { form: string | null }) {
  if (!form) return <span className="text-ink3 text-[12px]">—</span>;
  const results = form.split(",").filter(Boolean);
  return (
    <div className="flex items-center gap-1.5">
      {results.map((r, i) => {
        let cls = "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-medium ";
        if (r === "W") cls += "text-paper2";
        else if (r === "L") cls += "text-paper2";
        else cls += "text-ink2 ring-1 ring-rule2";

        const bg =
          r === "W" ? "#0F3D2E"
          : r === "L" ? "#B33A2E"
          : "transparent";

        return (
          <span key={i} className={cls} style={{ backgroundColor: bg }}>
            {r}
          </span>
        );
      })}
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export interface FullStandingsTableProps {
  rows: StandingTableEntry[];
  leagueCode: string;
}

export default function FullStandingsTable({
  rows,
  leagueCode,
}: FullStandingsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="mt-8 rule-t">

      {/* Column headers — desktop only */}
      <div className="hidden md:grid grid-cols-[8px_36px_28px_1fr_repeat(7,38px)] gap-3 px-3 py-3 text-[11px] font-mono uppercase tracking-[0.12em] text-ink3 rule-b">
        <span />
        <span>Pos</span>
        <span />
        <span>Club</span>
        <span className="text-right">P</span>
        <span className="text-right">W</span>
        <span className="text-right">D</span>
        <span className="text-right">L</span>
        <span className="text-right">GF</span>
        <span className="text-right">GA</span>
        <span className="text-right">Pts</span>
      </div>

      <ul>
        {rows.map((row, i) => {
          const zone = zoneFor(row.position, leagueCode);
          const isExpanded = expandedId === row.team.id;
          const isAlt = i % 2 === 1;

          return (
            <li key={row.team.id} className="rule-b">

              {/* Row button */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : row.team.id)}
                aria-expanded={isExpanded}
                className={[
                  "w-full text-left",
                  "grid grid-cols-[8px_36px_28px_1fr_auto] md:grid-cols-[8px_36px_28px_1fr_repeat(7,38px)]",
                  "gap-3 items-center px-3 py-3 transition-colors",
                  isAlt ? "bg-paper2/30" : "",
                  "hover:bg-paper2/60",
                ].join(" ")}
              >
                {/* Zone strip */}
                <span
                  className="h-7 w-[3px] rounded-sm shrink-0"
                  style={{ backgroundColor: zoneColor(zone) }}
                  aria-hidden="true"
                />

                {/* Position */}
                <span className="num text-[13px] text-ink2 tabular-nums">
                  {row.position}
                </span>

                {/* Crest */}
                <TeamCrest
                  src={row.team.crest || null}
                  alt={row.team.name}
                  size={24}
                />

                {/* Team name */}
                <span className="text-[14px] md:text-[15px] text-ink truncate">
                  {row.team.name}
                </span>

                {/* Mobile: Pts only */}
                <span className="md:hidden num text-[15px] font-medium text-ink tabular-nums">
                  {row.points}
                </span>

                {/* Desktop: full stats */}
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.playedGames}
                </span>
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.won}
                </span>
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.draw}
                </span>
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.lost}
                </span>
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.goalsFor}
                </span>
                <span className="hidden md:block num text-[13px] text-ink2 text-right tabular-nums">
                  {row.goalsAgainst}
                </span>
                <span className="hidden md:block num text-[15px] font-medium text-ink text-right tabular-nums">
                  {row.points}
                </span>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div
                  className="px-3 pb-5 pt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end"
                  style={{
                    backgroundColor:
                      "color-mix(in oklch, var(--color-paper2) 40%, transparent)",
                  }}
                >
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 mb-2">
                      Form (oldest → newest)
                    </div>
                    <FormPills form={row.form} />
                  </div>
                  <div className="flex items-center">
                    <a
                      href={`/teams/${row.team.id}`}
                      className="pass-link text-[13px] font-medium text-pitch inline-flex items-center gap-1.5"
                    >
                      Open team page
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
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Zone legend — labels are competition-aware. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono uppercase tracking-[0.12em] text-ink3">
        {leagueCode === "CL" ? (
          <>
            <LegendItem color="#0F3D2E" label="Round of 16" />
            <LegendItem color="#D4A24C" label="Knockout play-off" />
            <LegendItem color="#B33A2E" label="Eliminated" />
          </>
        ) : (
          <>
            <LegendItem color="#0F3D2E" label="Champions League" />
            <LegendItem color="#1A5A45" label="Europa League" />
            <LegendItem color="#B33A2E" label="Relegation" />
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="w-3 h-[3px] rounded-sm shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
