"use client";

// StickyMiniPlayer — fixed bottom bar that appears when an episode is loaded.
//
// Phase 5: wired to a real <audio> element owned by ListenClient.
//
// This component is pure view + event source:
//   · It reads player state (episode, playing, t, dur, speed) from props.
//   · It dispatches PlayerActions back to ListenClient via `dispatch`.
//   · Seeking is handled via the `onSeek(t)` prop — ListenClient translates
//     that into audio.currentTime imperatively, then dispatches setTime.
//   · The rAF timer loop from Phase 4B is removed; time comes from
//     ontimeupdate events in ListenClient.
//
// Visibility: renders while an episode is selected (playing or paused).
// The sticky bar stays visible after pause so the user can resume.
// Dispatching 'close' removes the episode from state and hides the bar.

import { useRef } from "react";
import EpisodeArt from "./EpisodeArt";
import type { ListenEpisode } from "@/lib/queries";

const SPEED_CYCLE = [1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEED_CYCLE)[number];

export interface PlayerState {
  episode: ListenEpisode | null;
  playing: boolean;
  t: number;
  dur: number;
  speed: Speed;
}

export type PlayerAction =
  | { type: "select"; episode: ListenEpisode }
  | { type: "toggle" }
  | { type: "close" }
  | { type: "cycleSpeed" }
  | { type: "setTime"; t: number }
  | { type: "setDur"; dur: number }
  | { type: "ended" };

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "select":
      if (state.episode?.id === action.episode.id) {
        // Same episode: toggle play/pause.
        return { ...state, playing: !state.playing };
      }
      // Different episode: reset position and auto-play.
      // Rationale: user made an explicit selection gesture — requiring a second
      // click to start audio is unnecessary friction. Same behaviour as Spotify,
      // Apple Podcasts, Overcast. dur starts at 0 until onloadedmetadata fires.
      return { ...state, episode: action.episode, t: 0, dur: 0, playing: true };

    case "toggle":
      return { ...state, playing: !state.playing };

    case "close":
      return { ...state, episode: null, playing: false, t: 0, dur: 0 };

    case "cycleSpeed": {
      const idx = SPEED_CYCLE.indexOf(state.speed);
      return { ...state, speed: SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length] };
    }

    case "setTime":
      return { ...state, t: action.t };

    case "setDur":
      return { ...state, dur: action.dur };

    case "ended":
      // Audio ended naturally. Reset to start, pause.
      // No auto-advance — that is a Phase 6 feature.
      return { ...state, playing: false, t: 0 };
  }
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface StickyMiniPlayerProps {
  state: PlayerState;
  dispatch: (action: PlayerAction) => void;
  /** Called when the user drags or clicks the scrubber. ListenClient
   *  sets audio.currentTime and dispatches setTime for immediate feedback. */
  onSeek: (t: number) => void;
}

export default function StickyMiniPlayer({
  state,
  dispatch,
  onSeek,
}: StickyMiniPlayerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Guards against firing onSeek from PointerMove when not actively dragging.
  const isDragging = useRef(false);

  if (!state.episode) return null;

  const pct = state.dur > 0 ? (state.t / state.dur) * 100 : 0;
  const ep = state.episode;

  // Compute the seek position from a pointer event's clientX.
  const seekFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || !state.dur) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(fraction * state.dur);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    // Capture so the element keeps receiving events if the pointer leaves it.
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    seekFromPointer(e.clientX);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-3 px-3 md:px-6">
      <div className="max-w-content mx-auto">
        <div
          className="rounded-[12px] bg-pitch text-paper2 p-3 md:p-4 flex items-center gap-3 md:gap-4"
          style={{
            boxShadow:
              "0 12px 32px -10px rgba(15,61,46,0.55), 0 1px 0 rgba(0,0,0,0.05)",
          }}
          role="region"
          aria-label="Now playing"
        >
          {/* Thumbnail — hidden on xs */}
          <div className="hidden sm:block shrink-0">
            <EpisodeArt
              kind={ep.kind}
              date={ep.date}
              league_code={ep.league_code}
              headline={ep.headline}
              size="sm"
            />
          </div>

          {/* Play/pause */}
          <button
            type="button"
            onClick={() => dispatch({ type: "toggle" })}
            aria-label={state.playing ? "Pause" : "Play"}
            className="shrink-0 w-11 h-11 rounded-full bg-mustard text-pitch flex items-center justify-center hover:scale-105 transition-transform"
          >
            {state.playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="3" y="2" width="3" height="10" rx="0.6" fill="currentColor" />
                <rect x="8" y="2" width="3" height="10" rx="0.6" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 2 L12 7 L3 12 Z" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Episode info + interactive progress bar */}
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-mono uppercase tracking-[0.14em] leading-none mb-1"
              style={{ color: "rgba(242,238,229,0.6)" }}
            >
              Now playing · {ep.kind === "day_overview" ? "Daily" : "League"}
            </div>
            <div className="text-[14px] font-medium text-paper truncate">
              {ep.headline ?? ep.slug}
            </div>

            {/*
              Scrubber — interactive. The outer div has vertical padding for
              a larger touch target (11 px total hit area vs 3 px visual bar).
              touchAction: "none" prevents iOS from stealing the gesture for
              page scroll.
            */}
            <div
              ref={trackRef}
              className="mt-2 py-2 cursor-pointer"
              style={{ touchAction: "none" }}
              role="slider"
              tabIndex={0}
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Playback progress"
              aria-valuetext={`${fmt(state.t)} of ${state.dur > 0 ? fmt(state.dur) : "unknown"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(242,238,229,0.2)" }}
              >
                <div
                  className="h-full rounded-full bg-mustard"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Time + speed — desktop only */}
          <div
            className="hidden md:flex flex-col items-end text-[11px] font-mono tabular-nums leading-snug gap-1 shrink-0"
            style={{ color: "rgba(242,238,229,0.7)" }}
          >
            <span>
              {fmt(state.t)} / {state.dur > 0 ? fmt(state.dur) : "–:––"}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "cycleSpeed" })}
              aria-label={`Playback speed ${state.speed}×`}
              className="px-2 h-6 rounded-full text-[11px] font-mono hover:opacity-90"
              style={{ backgroundColor: "rgba(242,238,229,0.10)" }}
            >
              {state.speed}×
            </button>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={() => dispatch({ type: "close" })}
            aria-label="Close player"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-paper2/10 transition-colors"
            style={{ color: "rgba(242,238,229,0.7)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2 2 L10 10 M10 2 L2 10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
