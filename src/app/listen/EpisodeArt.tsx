// EpisodeArt — typography-only episode thumbnail. No images, no state.
//
// Works in both server and client component trees — no "use client" needed.
//
// Palettes (from claude_design/src/podcasts-page.jsx):
//   day_overview    pitch bg (#0F3D2E) / paper fg (#FAF7F2) / mustard accent (#D4A24C)
//   league_overview paper bg (#FAF7F2) / ink fg (#111111)   / pitch accent (#0F3D2E)
//
// Glyphs:
//   day_overview    — day number extracted from date (e.g. date "2026-05-06" → "6")
//   league_overview — league_code (e.g. "PL", "BL1")
//
// Size variants:
//   lg — full column width, max 480px, used in the page hero
//   sm — 80×80px, used in StickyMiniPlayer thumbnail

export interface EpisodeArtProps {
  kind: string;
  date: string;
  league_code: string | null;
  headline: string | null;
  size?: "lg" | "sm";
}

const PALETTES: Record<string, { bg: string; fg: string; accent: string }> = {
  day_overview:    { bg: "#0F3D2E", fg: "#FAF7F2", accent: "#D4A24C" },
  league_overview: { bg: "#FAF7F2", fg: "#111111", accent: "#0F3D2E" },
};

function glyphFor(kind: string, date: string, league_code: string | null): string {
  if (kind === "day_overview") {
    const d = new Date(`${date}T12:00:00Z`);
    return String(d.getUTCDate());
  }
  if (kind === "league_overview") {
    return league_code ?? "·";
  }
  return "·";
}

function kindLabel(kind: string): string {
  return kind === "day_overview" ? "Daily" : "League";
}

function formatArtDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export default function EpisodeArt({
  kind,
  date,
  league_code,
  headline,
  size = "sm",
}: EpisodeArtProps) {
  const p = PALETTES[kind] ?? PALETTES.day_overview;
  const glyph = glyphFor(kind, date, league_code);
  const isLg = size === "lg";
  const glyphSize = isLg ? 140 : 36;

  return (
    <div
      className={[
        "relative rounded-[10px] overflow-hidden",
        isLg ? "w-full max-w-[480px]" : "w-[80px] h-[80px] shrink-0",
      ].join(" ")}
      style={{
        backgroundColor: p.bg,
        aspectRatio: isLg ? "1 / 1" : undefined,
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 p-3 md:p-5 flex flex-col justify-between">
        {/* Top row: kind label + date */}
        <div className="flex items-center justify-between gap-1">
          <span
            className="text-[8px] md:text-[10px] font-mono uppercase tracking-[0.16em]"
            style={{ color: p.fg, opacity: 0.7 }}
          >
            Tabela · {kindLabel(kind)}
          </span>
          {isLg && (
            <span
              className="text-[10px] font-mono"
              style={{ color: p.fg, opacity: 0.7 }}
            >
              {formatArtDate(date)}
            </span>
          )}
        </div>

        {/* Large glyph */}
        <div
          className="font-medium leading-[0.85] tracking-tighter2 select-none"
          style={{ color: p.fg, fontSize: glyphSize }}
        >
          {glyph}
        </div>

        {/* Bottom row: title + accent dot */}
        <div className="flex items-end justify-between gap-2">
          {isLg && headline && (
            <div
              className="h-serif leading-[1.1] text-[14px] md:text-[18px] max-w-[80%]"
              style={{ color: p.fg }}
            >
              {headline}
            </div>
          )}
          <div
            className="w-2 h-2 rounded-full shrink-0 ml-auto"
            style={{ backgroundColor: p.accent }}
          />
        </div>
      </div>
    </div>
  );
}
