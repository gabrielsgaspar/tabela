"use client";

// FullStandingsTable — interactive standings table for the league page.
//
// Client component: rows expand on click (useState) to show form pips and a
// link to the team page. Zone colours (UCL, UEL, play-off, relegation) are
// rendered as a 3px coloured strip on the left of each row.
//
// Zone config follows the actual league qualification rules for 2025-26:
//   PL  : 1-4 UCL, 5-6 UEL, 18-20 rel
//   BL1 : 1-4 UCL, 5 UEL, 16 play-off, 17-18 rel
//   Others (PD, SA, FL1): 1-4 UCL, 5 UEL, 18-20 rel
//
// Columns (desktop): zone strip | Pos | Crest | Name | P | W | D | L | GF | GA | Pts
// Columns (mobile):  zone strip | Pos | Crest | Name | Pts

import { useState } from "react";
import TeamCrest from "@/components/TeamCrest";
import type { StandingTableEntry } from "@/lib/query-types";

// ── zone logic ────────────────────────────────────────────────────────────────

type Zone = "ucl" | "uel" | "playoff" | "rel" | null;

interface ZoneRule {
  ucl: [number, number];   // inclusive position range
  uel: [number, number];
  playoff?: number;        // single position (BL1 only)
  rel: [number, number];
}

const ZONE_RULES: Record<string, ZoneRule> = {
  PL:  { ucl: [1, 4], uel: [5, 6],  rel: [18, 20] },
  BL1: { ucl: [1, 4], uel: [5, 5],  playoff: 16, rel: [17, 18] },
  PD:  { ucl: [1, 4], uel: [5, 5],  rel: [18, 20] },
  SA:  { ucl: [1, 4], uel: [5, 5],  rel: [18, 20] },
  FL1: { ucl: [1, 4], uel: [5, 5],  rel: [18, 20] },
};

function zoneFor(pos: number, leagueCode: string): Zone {
  const rule = ZONE_RULES[leagueCode];
  if (!rule) return null;
  if (pos >= rule.ucl[0] && pos <= rule.ucl[1]) return "ucl";
  if (pos >= rule.uel[0] && pos <= rule.uel[1]) return "uel";
  if (rule.playoff != null && pos === rule.playoff) return "playoff";
  if (pos >= rule.rel[0] && pos <= rule.rel[1]) return "rel";
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

      {/* Zone legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono uppercase tracking-[0.12em] text-ink3">
        <LegendItem color="#0F3D2E" label="Champions League" />
        <LegendItem color="#1A5A45" label="Europa League" />
        {leagueCode === "BL1" && (
          <LegendItem color="#D4A24C" label="Play-off" />
        )}
        <LegendItem color="#B33A2E" label="Relegation" />
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
