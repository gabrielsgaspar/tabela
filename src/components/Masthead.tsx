/**
 * Masthead — primary brand surface of every Tabela page.
 *
 * Server component. No interactivity.
 * The audio cue chip is a presentational button in Phase 4A — no audio wired.
 *
 * Props:
 *   dateLong         — formatted date string, e.g. "Mon · 5 May 2026"
 *   edition          — edition label, e.g. "European edition" (hidden on mobile)
 *   number           — issue number, e.g. "No. 138" (hidden on sm and below)
 *   podLive          — when true, shows the "Today's pod live" live-dot indicator
 *   podcastDuration  — e.g. "4:24"; when present, renders the audio cue chip
 *
 * Design decisions:
 *   - Wordmark uses clamp(64px, 14vw, 168px) + fontVariationSettings opsz 72.
 *     This mirrors the source exactly and ensures fluid scaling across viewports.
 *   - Mustard trailing period is a deliberate brand element; do not omit.
 *   - GnG mark inlined via CSS classes defined in globals.css.
 *   - Audio chip uses group-hover for the play-circle scale animation.
 *   - Bottom border is rule-thick-b only (no rule-t) — matches the source.
 */

interface MastheadProps {
  /** Formatted date string, e.g. "Mon · 5 May 2026" */
  dateLong: string;
  /** Edition label, e.g. "European edition" — hidden on mobile */
  edition?: string;
  /** Issue number, e.g. "No. 138" — hidden on sm and below */
  number?: string;
  /** When true, shows the pulsing live-dot + "Today's pod live" in the dateline */
  podLive?: boolean;
  /** Podcast duration string, e.g. "4:24". Audio cue chip is omitted when absent. */
  podcastDuration?: string;
}

export default function Masthead({
  dateLong,
  edition,
  number,
  podLive,
  podcastDuration,
}: MastheadProps) {
  return (
    <header className="rule-thick-b">
      <div className="max-w-content mx-auto px-5 md:px-8 pt-6 pb-5">

        {/* Top dateline strip */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 mb-4">
          <div className="flex items-center gap-3">
            <span>{dateLong}</span>
            {edition && (
              <>
                <span className="hidden md:inline text-rule2">·</span>
                <span className="hidden md:inline">{edition}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {number && (
              <>
                <span className="hidden sm:inline">{number}</span>
                {podLive && <span className="hidden sm:inline text-rule2">·</span>}
              </>
            )}
            {podLive && (
              <span className="inline-flex items-center gap-1.5 text-pitch">
                <span className="live-dot" />
                <span>Today&apos;s pod live</span>
              </span>
            )}
          </div>
        </div>

        {/* Wordmark row */}
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <h1
              className="display font-semibold text-ink leading-[0.88] select-none"
              style={{
                fontSize: "clamp(64px, 14vw, 168px)",
                fontVariationSettings: '"opsz" 72',
                letterSpacing: "-0.025em",
              }}
              aria-label="Tabela"
            >
              <span>Tabela</span>
              <span className="text-mustard">.</span>
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="gng-mark" aria-hidden="true">
                <span className="gng-dot" />
                <span className="gng-line" />
                <span className="gng-dot" />
              </span>
              <p className="text-[13px] md:text-[15px] text-ink2 font-serif italic">
                The morning paper for European football.
              </p>
            </div>
          </div>

          {/* Audio cue chip — only rendered when podcastDuration is provided */}
          {podcastDuration && (
            <button
              className="hidden md:inline-flex flex-shrink-0 items-center gap-3 rule-t rule-b px-4 py-3 -my-px hover:bg-paper2 transition group"
              aria-label="Listen to today's edition"
            >
              <span className="w-9 h-9 rounded-full bg-pitch text-mustard flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
                  <path d="M3 2 L11 6.5 L3 11 Z" fill="currentColor" />
                </svg>
              </span>
              <span className="text-left">
                <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
                  Listen · {podcastDuration}
                </span>
                <span className="block text-[14px] font-medium text-ink">
                  Today&apos;s edition
                </span>
              </span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
