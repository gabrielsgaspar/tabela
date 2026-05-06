"use client";

// EpisodeList — filtered, grouped-by-week episode rows.
//
// Client component: receives the full episode array, filter state, and
// player dispatch from the parent (ListenClient). All filtering + grouping
// runs in the client — no additional queries on filter change.
//
// Row layout: EpisodeArt (sm) · metadata + title + excerpt · play button

import { useMemo } from "react";
import EpisodeArt from "./EpisodeArt";
import type { PlayerAction, PlayerState } from "./StickyMiniPlayer";
import type { KindFilter } from "./EpisodeFilters";
import type { ListenEpisode } from "@/lib/queries";
import { LEAGUE_META } from "@/lib/leagues";
import GnGMark from "@/app/GnGMark";

// ── week grouping ─────────────────────────────────────────────────────────────

interface WeekGroup {
  weekLabel: string;
  mondayISO: string;
  episodes: ListenEpisode[];
}

function groupByWeek(episodes: ListenEpisode[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();

  for (const ep of episodes) {
    const d = new Date(`${ep.date}T12:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dow);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const key = monday.toISOString().slice(0, 10);
    const monLabel = monday.toLocaleDateString("en-GB", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    const sunLabel = sunday.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const weekLabel = `Week of ${monLabel} – ${sunLabel}`;

    if (!map.has(key)) {
      map.set(key, { weekLabel, mondayISO: key, episodes: [] });
    }
    map.get(key)!.episodes.push(ep);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.mondayISO < b.mondayISO ? 1 : -1
  );
}

function formatEpDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function excerpt(body: string): string {
  const first = body.split("\n\n")[0] ?? body;
  return first.length > 160 ? first.slice(0, 157) + "…" : first;
}

// ── EpisodeRow ────────────────────────────────────────────────────────────────

function EpisodeRow({
  episode,
  playerState,
  dispatch,
}: {
  episode: ListenEpisode;
  playerState: PlayerState;
  dispatch: (action: PlayerAction) => void;
}) {
  const isThis = playerState.episode?.id === episode.id;
  const isPlaying = isThis && playerState.playing;
  const leagueMeta = episode.league_code
    ? LEAGUE_META.find((l) => l.code === episode.league_code) ?? null
    : null;

  const kindLabel =
    episode.kind === "day_overview" ? "Daily" : "League";

  return (
    <li className="rule-b py-5 grid grid-cols-[auto_1fr_auto] gap-4 md:gap-6 items-center">
      {/* Art — mobile: small play disc; sm+: EpisodeArt */}
      <div className="flex items-center">
        <div className="hidden sm:block">
          <EpisodeArt
            kind={episode.kind}
            date={episode.date}
            league_code={episode.league_code}
            headline={episode.headline}
            size="sm"
          />
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "select", episode })}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="sm:hidden w-12 h-12 rounded-full bg-pitch text-mustard flex items-center justify-center hover:bg-pitch2 transition-colors"
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <rect x="2.5" y="1.5" width="2.5" height="9" rx="0.5" fill="currentColor" />
              <rect x="7" y="1.5" width="2.5" height="9" rx="0.5" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Metadata + title + excerpt */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 flex-wrap">
          <span className="text-pitch">{kindLabel}</span>
          <span className="text-rule2" aria-hidden="true">·</span>
          <span>{formatEpDate(episode.date)}</span>
          {leagueMeta && (
            <>
              <span className="text-rule2" aria-hidden="true">·</span>
              <span>
                {leagueMeta.flag} {leagueMeta.name}
              </span>
            </>
          )}
        </div>
        <h3
          className="h-serif text-[20px] md:text-[22px] leading-[1.2] text-ink"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          {episode.headline ?? episode.slug}
        </h3>
        <p
          className="mt-1.5 text-[14px] leading-[1.55] text-ink2 max-w-[68ch]"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {excerpt(episode.body)}
        </p>
      </div>

      {/* Play button — desktop */}
      <div className="hidden sm:flex items-center">
        <button
          type="button"
          onClick={() => dispatch({ type: "select", episode })}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-rule text-ink hover:border-pitch transition-colors"
        >
          <span className="w-7 h-7 rounded-full bg-pitch text-mustard flex items-center justify-center shrink-0">
            {isPlaying ? (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <rect x="2" y="1.5" width="2" height="7" rx="0.4" fill="currentColor" />
                <rect x="6" y="1.5" width="2" height="7" rx="0.4" fill="currentColor" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2.5 1.5 L8.5 5 L2.5 8.5 Z" fill="currentColor" />
              </svg>
            )}
          </span>
          <span className="text-[12px] font-medium">
            {isPlaying ? "Pause" : "Play"}
          </span>
        </button>
      </div>
    </li>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

interface EpisodeListProps {
  episodes: ListenEpisode[];
  kind: KindFilter;
  leagueFilter: string;
  query: string;
  playerState: PlayerState;
  dispatch: (action: PlayerAction) => void;
}

export default function EpisodeList({
  episodes,
  kind,
  leagueFilter,
  query,
  playerState,
  dispatch,
}: EpisodeListProps) {
  const filtered = useMemo(() => {
    return episodes.filter((ep) => {
      if (kind !== "all" && ep.kind !== kind) return false;
      if (leagueFilter !== "all" && ep.league_code !== leagueFilter) return false;
      if (query) {
        const haystack = `${ep.headline ?? ""} ${ep.body}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [episodes, kind, leagueFilter, query]);

  const groups = useMemo(() => groupByWeek(filtered), [filtered]);

  if (groups.length === 0) {
    return (
      <div className="py-12">
        <GnGMark />
        <p className="mt-4 font-serif italic text-[20px] text-ink2">
          No episodes match those filters.
        </p>
        <p className="mt-2 text-[13px] text-ink3">
          Try clearing the search or widening the filter.
        </p>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.mondayISO} className="mb-12">
          <div className="rule-strong-b pb-3 mb-2 flex items-baseline justify-between gap-4">
            <h2 className="h-serif text-[24px] md:text-[28px] text-ink">
              {group.weekLabel}
            </h2>
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 shrink-0">
              {group.episodes.length}{" "}
              {group.episodes.length === 1 ? "episode" : "episodes"}
            </span>
          </div>
          <ul>
            {group.episodes.map((ep) => (
              <EpisodeRow
                key={ep.id}
                episode={ep}
                playerState={playerState}
                dispatch={dispatch}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

// Export filtered count helper for EpisodeFilters' result count display.
export function filterCount(
  episodes: ListenEpisode[],
  kind: KindFilter,
  leagueFilter: string,
  query: string
): number {
  return episodes.filter((ep) => {
    if (kind !== "all" && ep.kind !== kind) return false;
    if (leagueFilter !== "all" && ep.league_code !== leagueFilter) return false;
    if (query) {
      const haystack = `${ep.headline ?? ""} ${ep.body}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  }).length;
}
