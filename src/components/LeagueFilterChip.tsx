"use client";

/**
 * LeagueFilterChip — pill-shaped filter toggle for league selection.
 *
 * Client component (onClick handler, aria-pressed state).
 *
 * Selected:   bg-ink text-paper border-ink — dark filled, newspaper-ink weight.
 * Unselected: transparent background, border-rule border, hover darkens border
 *             and text to ink. Both states carry a border so the chip doesn't
 *             shift size on selection.
 *
 * Height is fixed at h-9 (36px) with inline-flex items-center so the chip
 * doesn't resize when the flag emoji has different metrics across platforms.
 *
 * The chip is purely presentational — it receives `selected` as a prop and
 * calls `onClick`. The parent owns the filter state. On the home page (Phase 4B)
 * this will typically be a URL search param; on the styleguide it is useState.
 */

export interface LeagueFilterChipProps {
  label: string;
  /** Optional country flag — typically an emoji, e.g. "🏴󠁧󠁢󠁥󠁮󠁧󠁿" or "🇩🇪" */
  flag?: string;
  selected: boolean;
  /**
   * Optional — omit when rendering display-only chips from a server component.
   * Server components cannot pass function props across the RSC boundary.
   * Interactive chips in page layouts are always wrapped in a client component.
   */
  onClick?: () => void;
}

export default function LeagueFilterChip({
  label,
  flag,
  selected,
  onClick,
}: LeagueFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group inline-flex items-center gap-2 px-3 h-9 rounded-full",
        "border whitespace-nowrap text-[13px] font-medium",
        "transition-all duration-200 cursor-pointer",
        selected
          ? "bg-ink text-paper border-ink shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "bg-transparent text-ink2 border-rule hover:border-rule2 hover:text-ink",
      ].join(" ")}
    >
      {flag && (
        <span className="text-base leading-none" aria-hidden="true">
          {flag}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
