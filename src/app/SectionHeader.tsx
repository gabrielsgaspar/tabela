// Section header used across the home, league, and team pages.
//
// Layout: a small mono eyebrow, a large serif title, and an optional deck
// (standfirst). The outer row uses justify-between so a caller can place an
// action element to the right via `action`.

import type { ReactNode } from "react";

export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  deck?: string;
  /** Optional element rendered at the right of the header row. */
  action?: ReactNode;
}

export default function SectionHeader({
  eyebrow,
  title,
  deck,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink3 mb-2">
          {eyebrow}
        </div>
        <h2 className="h-serif text-[32px] md:text-[44px] leading-[1.0] text-ink">
          {title}
        </h2>
        {deck && (
          <p
            className="mt-3 text-[15px] text-ink2 max-w-[52ch]"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            {deck}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
