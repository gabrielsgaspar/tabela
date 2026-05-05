/**
 * TrendArrow — tiny directional indicator for stat trend.
 *
 * Server component. Pure SVG — no unicode glyphs.
 *
 * States:
 *   delta > 0  — upward chevron in text-pitch (pitch-green)
 *   delta < 0  — downward chevron in text-crimson
 *   delta = 0  — horizontal flat line in text-ink3
 *
 * Extracted from the inline version in StatLeaderCard (R3) as the
 * canonical implementation. Used by StatLeaderCard; available for any
 * component that needs a compact trend indicator.
 */

export interface TrendArrowProps {
  delta: number;
}

export default function TrendArrow({ delta }: TrendArrowProps) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center text-pitch" title="Trending up">
        <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
          <path
            d="M1 7 L4.5 2 L8 7"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center text-crimson" title="Trending down">
        <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
          <path
            d="M1 2 L4.5 7 L8 2"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-ink3" title="No change">
      <svg width="9" height="3" viewBox="0 0 9 3" aria-hidden="true">
        <path
          d="M1 1.5 L8 1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
