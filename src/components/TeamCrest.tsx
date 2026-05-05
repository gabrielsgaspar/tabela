"use client";

/**
 * TeamCrest — club crest image with a typographic fallback.
 *
 * Client component (required for onError state).
 *
 * The real crest is a next/image loaded from the Football-Data CDN
 * (https://crests.football-data.org/{id}.png). When the image is absent
 * or fails to load, the component renders a shaped fallback monogram.
 *
 * Fallback trigger conditions:
 *   1. src is null / undefined — fallback rendered immediately.
 *   2. src is present but fails at runtime — onError fires, state flips.
 *
 * Shape variants (fallback only):
 *   circle   — rounded-full (default)
 *   roundel  — circle with a 1px inner-ring border at inset-[3px]
 *   shield   — SVG shield path matching the JSX source's ShieldShape
 *
 * Colour props (fallback only):
 *   bg / fg  — hex colour strings. Absent = paper2 / ink3 defaults.
 *   mono     — single character string. When present, renders in font-serif
 *              font-semibold instead of the derived mono abbreviation.
 *
 * Design decisions:
 *   - Shape/colour/mono props have no effect when a real crest image loads.
 *   - Abbreviation algorithm strips continental prefixes, takes up to 3
 *     word initials. Edge cases (single-word, hyphenated) produce 1-2 chars.
 */

import Image from "next/image";
import { useState } from "react";
import { colors } from "@/lib/tokens";

export interface TeamCrestProps {
  src: string | null | undefined;
  alt: string;
  size: number;
  /** Fallback shape, applied only when src is null/errored. Default: 'circle'. */
  shape?: "circle" | "roundel" | "shield";
  /**
   * Fallback background colour (hex or CSS colour string).
   * Default: paper2 (#F2EEE5).
   */
  bg?: string;
  /**
   * Fallback text / monogram colour (hex or CSS colour string).
   * Default: ink3 (#6B6B66).
   */
  fg?: string;
  /**
   * Single character for the fallback monogram, e.g. "A" for Arsenal.
   * When present, overrides the derived abbreviation and renders in serif.
   */
  mono?: string;
}

// ---- ShieldShape SVG --------------------------------------------------------
// Ported from claude_design/src/primitives.jsx — do not modify the source.

function ShieldShape({
  size,
  bg,
  fg,
  abbr,
  label,
}: {
  size: number;
  bg: string;
  fg: string;
  abbr: string;
  label: string;
}) {
  const stroke =
    bg.toUpperCase() === "#FFFFFF" ? "rgba(0,0,0,0.22)" : "none";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <path
        d="M4 2 H36 Q40 2 40 6 V24 Q40 36 20 42 Q0 36 0 24 V6 Q0 2 4 2 Z"
        fill={bg}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontFamily="Newsreader, Georgia, serif"
        fontWeight="700"
        fontSize="20"
        fill={fg}
        style={{ letterSpacing: "-0.02em" }}
      >
        {abbr}
      </text>
    </svg>
  );
}

// ---- abbreviation helper ----------------------------------------------------

function getAbbreviation(name: string): string {
  const stripped = name
    .replace(
      /^(AFC|FC|AC|AS|SS|SC|CD|UD|RCD|CF|SD|RC|SL|SK|BV|SV|VfB|VfL|FSV|TSG|RB|1\.\s*)\s+/i,
      ""
    )
    .trim();

  const words = stripped
    .split(/[\s\-&]+/)
    .filter((w) => w.length > 0 && !/^(de|del|della|von|van|the)$/i.test(w));

  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ---- main export ------------------------------------------------------------

export default function TeamCrest({
  src,
  alt,
  size,
  shape = "circle",
  bg,
  fg,
  mono,
}: TeamCrestProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    const abbr = mono ?? getAbbreviation(alt);
    const isSerifMono = !!mono;
    const effectiveBg = bg ?? colors.paper2;
    const effectiveFg = fg ?? colors.ink3;

    // Shield — full SVG path, no wrapper needed
    if (shape === "shield") {
      return (
        <ShieldShape
          size={size}
          bg={effectiveBg}
          fg={effectiveFg}
          abbr={abbr}
          label={alt}
        />
      );
    }

    // Circle / roundel
    const isRoundel = shape === "roundel";
    const fontSize = isSerifMono
      ? Math.max(10, Math.round(size * 0.46))
      : Math.max(8, Math.round(size * 0.35));

    return (
      <div
        style={{ width: size, height: size, background: effectiveBg, fontSize }}
        className="relative inline-flex items-center justify-center rounded-full shrink-0"
        role="img"
        aria-label={alt}
      >
        {isRoundel && (
          <span
            className="absolute inset-[3px] rounded-full pointer-events-none"
            style={{ border: `1px solid ${effectiveFg}`, opacity: 0.7 }}
          />
        )}
        <span
          style={{ color: effectiveFg }}
          className={`${
            isSerifMono ? "font-serif font-semibold" : "num font-medium"
          } leading-none select-none`}
        >
          {abbr}
        </span>
      </div>
    );
  }

  // Real crest image
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  );
}
