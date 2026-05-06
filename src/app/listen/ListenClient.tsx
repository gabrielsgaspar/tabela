"use client";

// ListenClient — client boundary for the /listen page.
//
// Holds all mutable state so that EpisodeFilters, EpisodeList, and
// StickyMiniPlayer can share it without a React Context:
//   · filter state    — kind, leagueFilter, searchQuery
//   · player state    — selectedEpisode, playing, t, dur, speed
//
// The server component (page.tsx) fetches episodes and passes them here as a
// prop. All filter logic runs in the client on the static array — no network
// round-trips on filter changes.

import { useReducer, useState, useMemo } from "react";
import EpisodeFilters, { type KindFilter } from "./EpisodeFilters";
import EpisodeList, { filterCount } from "./EpisodeList";
import StickyMiniPlayer, { playerReducer } from "./StickyMiniPlayer";
import type { PlayerState } from "./StickyMiniPlayer";
import type { ListenEpisode } from "@/lib/queries";

const INITIAL_PLAYER: PlayerState = {
  episode: null,
  playing: false,
  t: 0,
  dur: 0,
  speed: 1,
};

interface ListenClientProps {
  episodes: ListenEpisode[];
}

export default function ListenClient({ episodes }: ListenClientProps) {
  // Filter state
  const [kind, setKind] = useState<KindFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  // Player state via reducer (matches StickyMiniPlayer's PlayerAction union)
  const [playerState, dispatch] = useReducer(playerReducer, INITIAL_PLAYER);

  // Filtered count for the result label in EpisodeFilters
  const filteredCount = useMemo(
    () => filterCount(episodes, kind, leagueFilter, query),
    [episodes, kind, leagueFilter, query]
  );

  return (
    <>
      <EpisodeFilters
        kind={kind}
        onKindChange={setKind}
        leagueFilter={leagueFilter}
        onLeagueChange={setLeagueFilter}
        query={query}
        onQueryChange={setQuery}
        total={episodes.length}
        filtered={filteredCount}
      />

      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14 pb-32">
          <EpisodeList
            episodes={episodes}
            kind={kind}
            leagueFilter={leagueFilter}
            query={query}
            playerState={playerState}
            dispatch={dispatch}
          />
        </div>
      </section>

      <StickyMiniPlayer state={playerState} dispatch={dispatch} />
    </>
  );
}
