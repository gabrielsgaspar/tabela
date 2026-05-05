/**
 * Footer — site footer.
 *
 * Server component. No props.
 *
 * Layout:
 *   Left column  — wordmark (Tabela. 36px display) + editorial tagline
 *   Right column — two-column nav: About/Archive/RSS + Newsletter/Podcast feed/Contact
 *   Bottom bar   — copyright · "Made with strong coffee…" (hidden on mobile) · version + date
 *
 * This is the source's actual structure. No invented league columns.
 * All href values are "#" placeholders; real routes are wired in Phase 4B.
 */

export default function Footer() {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });

  return (
    <footer className="bg-paper">
      <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">

        <div className="flex flex-col md:flex-row items-start justify-between gap-8">

          {/* Wordmark + tagline */}
          <div>
            <div
              className="display font-semibold text-ink leading-none"
              style={{ fontSize: 36, fontVariationSettings: '"opsz" 48' }}
              aria-label="Tabela"
            >
              Tabela<span className="text-mustard">.</span>
            </div>
            <p className="mt-2 text-[13px] text-ink3 max-w-[40ch] font-serif italic">
              Tabela is independent and ad-free. Written by humans, summarised
              by an AI we keep on a tight leash.
            </p>
          </div>

          {/* Two-column nav */}
          <nav className="flex items-start gap-10 text-[13px]" aria-label="Site navigation">
            <ul className="space-y-2">
              <li><a href="#" className="pass-link text-ink2">About</a></li>
              <li><a href="#" className="pass-link text-ink2">Archive</a></li>
              <li><a href="#" className="pass-link text-ink2">RSS</a></li>
            </ul>
            <ul className="space-y-2">
              <li><a href="#" className="pass-link text-ink2">Newsletter</a></li>
              <li><a href="#" className="pass-link text-ink2">Podcast feed</a></li>
              <li><a href="#" className="pass-link text-ink2">Contact</a></li>
            </ul>
          </nav>

        </div>

        {/* Copyright bar */}
        <div className="mt-10 rule-t pt-5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
          <span>© 2026 Tabela</span>
          <span className="hidden md:inline">
            Made with strong coffee, in São Paulo &amp; London.
          </span>
          <span>v0.4 · {dateStr}</span>
        </div>

      </div>
    </footer>
  );
}
