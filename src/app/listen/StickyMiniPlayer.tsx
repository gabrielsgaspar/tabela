"use client";

// StickyMiniPlayer — fixed bottom bar that appears when an episode is playing.
//
// Phase 4B — visual-only playback: the rAF timer advances `t` but no real
// <audio> element exists. Phase 5 will wire the audio_url to an HTMLAudioElement.
//
// Controls: play/pause · progress bar · time display · speed (1×/1.25×/1.5×/2×) · close.

import { useEffect, useRef } from "react";
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
  | { type: "tick"; dt: number };

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "select":
      if (state.episode?.id === action.episode.id) {
        return { ...state, playing: !state.playing };
      }
      // Phase 4B: no real duration from DB; 300s placeholder so the scrubber
      // isn't completely stuck. Phase 5 will replace with episode.duration_sec.
      return { ...state, episode: action.episode, t: 0, dur: 300, playing: true };
    case "toggle":
      return { ...state, playing: !state.playing };
    case "close":
      return { ...state, episode: null, playing: false, t: 0 };
    case "cycleSpeed": {
      const idx = SPEED_CYCLE.indexOf(state.speed);
      return { ...state, speed: SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length] };
    }
    case "tick": {
      const next = state.t + action.dt * state.speed;
      if (next >= state.dur) return { ...state, t: state.dur, playing: false };
      return { ...state, t: next };
    }
  }
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface StickyMiniPlayerProps {
  state: PlayerState;
  dispatch: (action: PlayerAction) => void;
}

export default function StickyMiniPlayer({ state, dispatch }: StickyMiniPlayerProps) {
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // rAF loop for simulated playback.
  useEffect(() => {
    if (!state.playing || !state.episode || state.dur === 0) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      dispatch({ type: "tick", dt });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // Only re-subscribe when playing state or episode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing, state.episode?.id]);

  if (!state.episode) return null;

  const pct = state.dur > 0 ? (state.t / state.dur) * 100 : 0;
  const ep = state.episode;

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

          {/* Episode info + progress */}
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
            <div
              className="mt-2 h-[3px] rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(242,238,229,0.2)" }}
            >
              <div
                className="h-full rounded-full bg-mustard transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Time + speed — desktop only */}
          <div
            className="hidden md:flex flex-col items-end text-[11px] font-mono tabular-nums leading-snug gap-1"
            style={{ color: "rgba(242,238,229,0.7)" }}
          >
            <span>
              {fmt(state.t)} / {fmt(state.dur)}
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
