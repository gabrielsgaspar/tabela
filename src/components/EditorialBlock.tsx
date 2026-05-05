/**
 * EditorialBlock — renders Claude's editorial output.
 *
 * Server component. No interactivity.
 *
 * The voice is the product; the typography must read like a newspaper.
 *   - Headline: `.h-serif` with three size tiers (sm / md / lg)
 *   - Dek (standfirst): larger than body copy, leading-snug, text-ink2, not italic
 *   - Body: `paragraphs` array (each element is its own <p>)
 *   - Kicker: `font-mono uppercase tracking-[0.16em]`, accepts JSX nodes for
 *     author credit + separator dots
 *   - Pull quote: left-border serif blockquote
 *
 * Backward-compat shims:
 *   - `overline?: string` — if provided without `kicker`, wrapped as a
 *     plain-text kicker. Remove once all callsites are updated.
 *   - `body?: string` — single-paragraph body. If `paragraphs` is also provided,
 *     `paragraphs` takes precedence. Remove once all callsites migrated.
 *
 * Companion exports:
 *   EditorialBlockSkeleton — loading shimmer
 *   EditorialBlockEmpty    — editorial hasn't run yet for this date
 *   EditorialBlockError    — query failed at the data layer
 */

export interface EditorialBlockProps {
  /** JSX kicker node above the headline — author credit, separator dots, etc. */
  kicker?: React.ReactNode;
  /** @deprecated Use `kicker` instead. Renders as a plain-text kicker. */
  overline?: string;
  headline: string;
  /**
   * Standfirst (dek) — renders larger than body copy, leading-snug, not italic.
   * Sits between headline and paragraphs.
   */
  dek?: string;
  /** Body paragraphs. Each string becomes its own <p>. Takes precedence over `body`. */
  paragraphs?: string[];
  /** @deprecated Use `paragraphs` instead. Renders as a single paragraph. */
  body?: string;
  /** Date + attribution line, e.g. "Monday, 5 May 2026 · Tabela". */
  byline?: string;
  /** Optional pull quote. Rendered in larger serif with a pitch-green left border. */
  pullQuote?: string;
  /**
   * Size tier controlling headline and dek font sizes.
   * - sm: 24/28px headline, 15px dek
   * - md: 28/36px headline, 16/18px dek
   * - lg: 34/48/56px headline, 17/20px dek (default)
   */
  size?: "sm" | "md" | "lg";
}

// Size tiers from the JSX source
const SIZES = {
  sm: {
    h: "text-[24px] md:text-[28px]",
    d: "text-[15px]",
  },
  md: {
    h: "text-[28px] md:text-[36px]",
    d: "text-[16px] md:text-[18px]",
  },
  lg: {
    h: "text-[34px] md:text-[48px] lg:text-[56px]",
    d: "text-[17px] md:text-[20px]",
  },
} as const;

// ---- main export ------------------------------------------------------------

export default function EditorialBlock({
  kicker,
  overline,
  headline,
  dek,
  paragraphs,
  body,
  byline,
  pullQuote,
  size = "lg",
}: EditorialBlockProps) {
  const { h: hClass, d: dClass } = SIZES[size] ?? SIZES.lg;

  // Resolve effective kicker: prop `kicker` wins; `overline` string is a fallback.
  const effectiveKicker = kicker ?? (overline ? <span>{overline}</span> : null);

  // Resolve effective body: `paragraphs` array wins over legacy `body` string.
  const effectiveParagraphs = paragraphs ?? (body ? [body] : []);

  return (
    <article className="text-ink">

      {/* Kicker */}
      {effectiveKicker && (
        <div className="flex items-center gap-2 mb-4 text-[11px] font-mono uppercase tracking-[0.16em] text-ink3">
          {effectiveKicker}
        </div>
      )}

      {/* Headline */}
      <h2
        className={`h-serif font-medium ${hClass} text-ink leading-[1.05]`}
        style={{ textWrap: "balance" } as React.CSSProperties}
      >
        {headline}
      </h2>

      {/* Dek (standfirst) */}
      {dek && (
        <p
          className={`mt-4 text-ink2 leading-snug ${dClass}`}
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {dek}
        </p>
      )}

      {/* Body paragraphs */}
      {effectiveParagraphs.map((p, i) => (
        <p
          key={i}
          className="mt-4 text-[16px] md:text-[17px] leading-[1.65] text-ink2"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {p}
        </p>
      ))}

      {/* Pull quote */}
      {pullQuote && (
        <blockquote className="mt-6 pl-5 border-l-2 border-pitch font-serif text-[20px] md:text-[24px] leading-snug text-ink">
          {pullQuote}
        </blockquote>
      )}

      {/* Byline */}
      {byline && (
        <p className="font-sans text-sm text-ink3 mt-4">{byline}</p>
      )}

    </article>
  );
}

// ---- loading skeleton -------------------------------------------------------

export function EditorialBlockSkeleton() {
  return (
    <section className="animate-pulse" aria-hidden="true">
      {/* Kicker */}
      <div className="h-3 w-32 bg-paper2 rounded mb-4" />
      {/* Headline — two lines */}
      <div className="h-9 w-4/5 bg-paper2 rounded mb-2" />
      <div className="h-9 w-3/5 bg-paper2 rounded mb-4" />
      {/* Dek */}
      <div className="h-5 w-full bg-paper2 rounded mb-1" />
      <div className="h-5 w-5/6 bg-paper2 rounded mb-4" />
      {/* Body paragraphs */}
      <div className="space-y-2.5">
        <div className="h-4 w-full bg-paper2 rounded" />
        <div className="h-4 w-full bg-paper2 rounded" />
        <div className="h-4 w-3/4 bg-paper2 rounded" />
      </div>
      {/* Byline */}
      <div className="h-3 w-40 bg-paper2 rounded mt-4" />
    </section>
  );
}

// ---- empty state ------------------------------------------------------------
// Renders when the editorial pipeline has not yet run for this date.

export function EditorialBlockEmpty({ date }: { date?: string }) {
  return (
    <section>
      <p className="font-sans text-sm text-ink3 italic">
        No editorial yet
        {date && (
          <>
            {" — "}
            <time dateTime={date}>{date}</time>
          </>
        )}
        .
      </p>
    </section>
  );
}

// ---- error state ------------------------------------------------------------
// Renders when the data layer returns an error. Keep it quiet; don't panic.

export function EditorialBlockError({ date }: { date?: string }) {
  return (
    <section>
      <p className="font-sans text-sm text-ink3">
        Could not load editorial
        {date && (
          <>
            {" for "}
            <time dateTime={date}>{date}</time>
          </>
        )}
        .
      </p>
    </section>
  );
}
