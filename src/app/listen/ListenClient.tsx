"use client";

// ListenClient — client boundary for the /listen page.
//
// Holds all mutable state so EpisodeFilters, EpisodeList, and StickyMiniPlayer
// can share it without a React Context:
//   · filter state  — kind, leagueFilter, searchQuery
//   · player state  — selectedEpisode, playing, t, dur, speed  (playerReducer)
//
// Phase 5: owns the single hidden <audio> element for the page. All audio
// imperative calls (play, pause, seek, src change, playbackRate) happen here
// via useEffect hooks that react to playerState changes.
//
// The server component (page.tsx) fetches episodes and passes them here as a
// prop. All filter logic runs client-side on the static array — no extra
// network round-trips on filter changes.

import { useReducer, useState, useMemo, useEffect, useRef } from "react";
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
  // ── Filter state ────────────────────────────────────────────────────────
  const [kind, setKind] = useState<KindFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  // ── Player state ────────────────────────────────────────────────────────
  const [playerState, dispatch] = useReducer(playerReducer, INITIAL_PLAYER);

  // Single <audio> element for the page. Lives here so it is never unmounted
  // — StickyMiniPlayer conditionally renders null when no episode is selected,
  // which would destroy a nested audio element mid-play.
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Audio event wiring (mount / unmount) ────────────────────────────────
  // Registers the one-time event listeners that push audio state back into
  // the reducer. dispatch is guaranteed stable by React's useReducer.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () =>
      dispatch({ type: "setDur", dur: audio.duration });
    const onTimeUpdate = () =>
      dispatch({ type: "setTime", t: audio.currentTime });
    const onEnded = () => dispatch({ type: "ended" });

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []); // stable: mount once, tear down on unmount

  // ── Effect 1: sync episode → audio.src ─────────────────────────────────
  // Runs whenever the selected episode changes (including close → null).
  // Setting audio.src to '' pauses and unloads when the player is closed.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState.episode?.audio_url) {
      audio.src = playerState.episode.audio_url;
      // Explicit load() resets the element to HEAD state and begins loading
      // metadata. Required in some browsers after a programmatic src change.
      audio.load();
    } else {
      audio.pause();
      audio.src = "";
    }
  }, [playerState.episode?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: sync playing → audio.play() / audio.pause() ──────────────
  // Runs whenever playing flips, or when the episode changes (to auto-play
  // the incoming episode when the user selects a new one while already
  // listening). episode?.id is included so the effect re-runs for a new
  // episode even if playing was already true.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playerState.episode?.audio_url) return;
    if (playerState.playing) {
      audio.play().catch(() => {
        // Browser blocked the play attempt (autoplay policy, low-power mode).
        // Revert the playing flag so the UI shows the paused state correctly.
        dispatch({ type: "toggle" });
      });
    } else {
      audio.pause();
    }
  }, [playerState.playing, playerState.episode?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: sync speed → audio.playbackRate ───────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playerState.speed;
  }, [playerState.speed]);

  // ── Seek handler ─────────────────────────────────────────────────────────
  // Called by StickyMiniPlayer when the user drags or clicks the scrubber.
  // Sets audio.currentTime imperatively (bypasses the reducer) then dispatches
  // setTime so the scrubber updates immediately without waiting for the next
  // ontimeupdate event.
  const handleSeek = (newT: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = newT;
    dispatch({ type: "setTime", t: newT });
  };

  // ── Filter helpers ───────────────────────────────────────────────────────
  const filteredCount = useMemo(
    () => filterCount(episodes, kind, leagueFilter, query),
    [episodes, kind, leagueFilter, query]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        Hidden audio element — always mounted regardless of whether an episode
        is selected. preload="none" avoids loading any audio until the user
        explicitly picks an episode.
      */}
      <audio ref={audioRef} preload="none" />

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

      <StickyMiniPlayer
        state={playerState}
        dispatch={dispatch}
        onSeek={handleSeek}
      />
    </>
  );
}
