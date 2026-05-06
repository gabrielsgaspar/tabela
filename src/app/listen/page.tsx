// Listen page — server component for initial render and data fetch.
//
// Sections:
//   1. Masthead
//   2. Breadcrumb subnav (Home / Listen)
//   3. Hero section — latest audio-bearing editorial + big play button
//      Empty state if no episodes with audio_url exist yet (expected in Phase 4B)
//   4. ListenClient (client boundary) — filters + episode list + StickyMiniPlayer
//   5. Footer
//
// Query plan: one query.
//   Q1  editorials
//         WHERE audio_url IS NOT NULL
//           AND kind IN ('day_overview', 'league_overview')
//         ORDER BY date DESC LIMIT 60
//
// Phase 4B note: audio_url is null for all current editorial rows — the
// ElevenLabs synthesis pipeline (Phase 5) has not run. The page renders
// a graceful "coming soon" hero and no episode list. All structural
// components are in place for Phase 5 to activate.

import Link from "next/link";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EpisodeArt from "./EpisodeArt";
import ListenClient from "./ListenClient";
import GnGMark from "@/app/GnGMark";
import { createBrowserClient } from "@/lib/supabase";
import { getListenEpisodes } from "@/lib/queries";

// ── hero section ──────────────────────────────────────────────────────────────

function HeroEmpty() {
  return (
    <section className="rule-t bg-paper">
      <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="flex flex-col items-start gap-4">
          <GnGMark />
          <h2 className="h-serif text-[32px] md:text-[44px] leading-[1.0] text-ink">
            No episodes yet.
          </h2>
          <p
            className="font-serif italic text-[18px] md:text-[20px] text-ink2 max-w-[48ch]"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            Audio synthesis is coming in Phase 5 — check back once the
            ElevenLabs pipeline is wired. Written editions are already
            available on the home page.
          </p>
          <Link
            href="/"
            className="pass-link mt-2 text-[13px] font-mono uppercase tracking-[0.14em] text-pitch inline-flex items-center gap-2"
          >
            Read today&apos;s edition
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
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroEpisode({
  episode,
}: {
  episode: Awaited<ReturnType<typeof getListenEpisodes>>[number];
}) {
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${episode.date}T12:00:00Z`));

  const kindLabel =
    episode.kind === "day_overview" ? "Daily edition" : "League overview";

  // Excerpt: first paragraph of body
  const bodyExcerpt = (() => {
    const first = episode.body.split("\n\n")[0] ?? episode.body;
    return first.length > 240 ? first.slice(0, 237) + "…" : first;
  })();

  return (
    <section className="rule-t bg-paper">
      <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Art */}
          <div className="lg:col-span-5">
            <EpisodeArt
              kind={episode.kind}
              date={episode.date}
              league_code={episode.league_code}
              headline={episode.headline}
              size="lg"
            />
          </div>

          {/* Metadata + play */}
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink3 mb-3">
              {kindLabel} · {dateLabel}
            </div>
            <h2
              className="h-serif text-[36px] md:text-[52px] leading-[0.98] text-ink"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {episode.headline ?? "Today's edition"}
            </h2>
            <p
              className="mt-4 text-[16px] md:text-[18px] leading-[1.6] text-ink2 max-w-[60ch]"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              {bodyExcerpt}
            </p>
            {/* BigPlayButton is rendered inside ListenClient (needs player dispatch) */}
            <p
              className="mt-6 text-[13px] font-serif italic text-ink3"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              Press play on any episode in the list below to listen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function ListenPage() {
  const db = createBrowserClient();
  const episodes = await getListenEpisodes(db);
  const latestEpisode = episodes[0] ?? null;

  return (
    <div className="min-h-screen bg-paper">
      <Masthead dateLong="Listen" edition="Archive" />

      {/* ── Breadcrumb subnav ─────────────────────────────────────────── */}
      <div
        className="rule-t"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-paper2) 40%, transparent)",
        }}
      >
        <div className="max-w-content mx-auto px-5 md:px-8 py-3 flex items-center gap-3 text-[12px] font-mono uppercase tracking-[0.14em] text-ink3">
          <Link
            href="/"
            className="pass-link text-ink2 hover:text-ink transition-colors"
          >
            Home
          </Link>
          <span className="text-rule2" aria-hidden="true">
            /
          </span>
          <span className="text-ink">Listen</span>
        </div>
      </div>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <h1 className="h-serif text-[44px] md:text-[64px] leading-[0.95] text-ink">
            Listen
          </h1>
          <p
            className="mt-4 font-serif italic text-[20px] md:text-[24px] text-ink2 max-w-[44ch]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Every edition — daily match reviews, league overviews — as audio.
            Your morning commute, served.
          </p>
        </div>
      </section>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      {latestEpisode ? (
        <HeroEpisode episode={latestEpisode} />
      ) : (
        <HeroEmpty />
      )}

      {/* ── Episode list (client boundary) ────────────────────────────── */}
      {episodes.length > 0 && <ListenClient episodes={episodes} />}

      <Footer />
    </div>
  );
}
