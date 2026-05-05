"use client";

/**
 * AudioPlayer — visual shell for the in-line episode player.
 *
 * Client component (play/pause toggle, skip buttons, speed, chapter nav).
 *
 * Phase 4A — visual only. The following are deferred to Phase 5 when a real
 * <audio> element and .mp3 URLs are available:
 *   - requestAnimationFrame time progression while playing
 *   - Scrub-by-mouse / scrub-by-touch on the progress track
 *   - Speed rate actually affecting playback
 *   - Chapter jumps seeking the audio position
 *
 * What IS wired in Phase 4A (display counter only, no audio):
 *   - Play/pause toggle: icon switches, playing state stored
 *   - Skip ±15s: advances/rewinds the `t` display counter
 *   - Chapter buttons: set `t` to that chapter's position
 *   - Speed button: cycles 1 → 1.25 → 1.5 → 2 → 1 (stored for display)
 *   - Chapter tick marks on scrubber at proportional positions
 *   - Scrubber fill and thumb position reflect `t`
 *
 * Appearance matches the JSX source exactly:
 *   - bg-pitch dark background with decorative circle
 *   - Mustard 74px play button with coloured shadow + hover:scale-[1.04]
 *   - h-serif title, semi-transparent metadata row
 *   - 6px scrubber, cream thumb with pitch ring, mustard fill
 *   - Elapsed / −remaining countdown
 *
 * Companion exports:
 *   AudioPlayerSkeleton — loading shimmer on dark background
 *   AudioPlayerError    — quiet failure state matching dark card
 */

import { useState } from "react";

export interface ChapterMark {
  /** Position in seconds */
  t: number;
  label: string;
}

export interface AudioPlayerProps {
  title: string;
  durationSec: number;
  host?: string;
  chapters?: ChapterMark[];
}

// ---- helpers ----------------------------------------------------------------

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const SPEED_CYCLE = [1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEED_CYCLE)[number];

// ---- main export ------------------------------------------------------------

export default function AudioPlayer({
  title,
  durationSec,
  host,
  chapters = [],
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);

  const dur = durationSec;
  const pct = dur > 0 ? (t / dur) * 100 : 0;

  // Current chapter: last chapter whose start position is ≤ t
  const currentChapter =
    chapters.length > 0
      ? ([...chapters].reverse().find((c) => c.t <= t) ?? chapters[0])
      : null;

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = SPEED_CYCLE.indexOf(prev);
      return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    });
  };

  // Metadata line: host (if provided) · duration · current chapter label
  const metaParts: string[] = [];
  if (host) metaParts.push(host);
  metaParts.push(fmt(dur));
  if (currentChapter) metaParts.push(currentChapter.label);
  const metaLine = metaParts.join(" · ");

  return (
    <div
      className="bg-pitch text-paper2 rounded-[10px] p-5 md:p-6 relative overflow-hidden"
      style={{
        boxShadow:
          "0 1px 0 rgba(0,0,0,0.04), 0 12px 28px -16px rgba(15,61,46,0.45)",
      }}
      role="region"
      aria-label={`Audio: ${title}`}
    >
      {/* Decorative circle — visual texture, no semantic content */}
      <div
        className="absolute top-0 right-0 w-[140px] h-[140px] -mt-10 -mr-10 rounded-full pointer-events-none"
        style={{ background: "#13503A", opacity: 0.6 }}
        aria-hidden="true"
      />

      <div className="relative">
        {/* Live-dot header row */}
        <div
          className="flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.18em]"
          style={{ color: "rgba(242,238,229,0.62)" }}
        >
          <span className="live-dot" />
          <span>Today&apos;s edition</span>
          <span style={{ color: "rgba(242,238,229,0.32)" }}>·</span>
          <span>Podcast</span>
        </div>

        {/* Play button + title / metadata */}
        <div className="flex items-start gap-5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="flex-shrink-0 w-16 h-16 md:w-[74px] md:h-[74px] rounded-full bg-mustard text-pitch flex items-center justify-center transition-transform duration-150 hover:scale-[1.04] active:scale-[0.98]"
            style={{ boxShadow: "0 6px 18px -6px rgba(212,162,76,0.6)" }}
          >
            {playing ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                aria-hidden="true"
              >
                <rect x="5" y="3.5" width="4.5" height="15" rx="1" fill="currentColor" />
                <rect x="12.5" y="3.5" width="4.5" height="15" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                aria-hidden="true"
              >
                <path d="M5 3 L18 11 L5 19 Z" fill="currentColor" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0 pt-0.5">
            <div
              className="h-serif text-[22px] md:text-[26px] leading-tight text-paper"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {title}
            </div>
            <div
              className="mt-1 text-[13px] truncate"
              style={{ color: "rgba(242,238,229,0.7)" }}
            >
              {metaLine}
            </div>
          </div>
        </div>

        {/* Scrubber */}
        <div className="mt-5">
          <div
            className="relative h-[6px] rounded-full"
            style={{ background: "rgba(242,238,229,0.18)" }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Playback progress"
          >
            {/* Fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-mustard"
              style={{ width: `${pct}%` }}
            />
            {/* Chapter tick marks */}
            {chapters.map((c, i) => (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-[8px] rounded-full pointer-events-none"
                style={{
                  left: `${dur > 0 ? (c.t / dur) * 100 : 0}%`,
                  background: "rgba(242,238,229,0.5)",
                }}
                title={c.label}
              />
            ))}
            {/* Thumb */}
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-paper"
              style={{
                left: `${pct}%`,
                boxShadow: "0 0 0 2px #0F3D2E",
              }}
            />
          </div>

          {/* Time display */}
          <div
            className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums"
            style={{ color: "rgba(242,238,229,0.62)" }}
          >
            <span>{fmt(t)}</span>
            <span>−{fmt(dur - t)}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: skip + speed */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setT((prev) => Math.max(0, prev - 15))}
              aria-label="Skip back 15 seconds"
              className="h-8 px-3 rounded-full text-[12px] font-mono inline-flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{
                background: "rgba(242,238,229,0.10)",
                color: "rgba(242,238,229,0.85)",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M11 6 L4 6 M7 3 L4 6 L7 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              15
            </button>

            <button
              type="button"
              onClick={() => setT((prev) => Math.min(dur, prev + 15))}
              aria-label="Skip forward 15 seconds"
              className="h-8 px-3 rounded-full text-[12px] font-mono inline-flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{
                background: "rgba(242,238,229,0.10)",
                color: "rgba(242,238,229,0.85)",
              }}
            >
              15
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M1 6 L8 6 M5 3 L8 6 L5 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Playback speed: ${speed}×`}
              className="h-8 px-3 rounded-full text-[12px] font-mono transition-opacity hover:opacity-80"
              style={{
                background: "rgba(242,238,229,0.10)",
                color: "rgba(242,238,229,0.85)",
              }}
            >
              {speed}×
            </button>
          </div>

          {/* Right: chapter nav */}
          {chapters.length > 0 && (
            <div
              className="flex items-center gap-1 text-[11px] font-mono flex-wrap"
              style={{ color: "rgba(242,238,229,0.55)" }}
            >
              {chapters.map((c, i) => {
                const isCurrent = currentChapter?.t === c.t;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setT(c.t)}
                    aria-label={`Jump to chapter: ${c.label}`}
                    aria-pressed={isCurrent}
                    className="px-2 h-7 rounded-full transition-colors"
                    style={{
                      background: isCurrent
                        ? "rgba(242,238,229,0.14)"
                        : "transparent",
                      color: isCurrent
                        ? "rgba(242,238,229,0.95)"
                        : "rgba(242,238,229,0.55)",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- loading skeleton -------------------------------------------------------

export function AudioPlayerSkeleton() {
  return (
    <div
      className="bg-pitch rounded-[10px] p-5 md:p-6 relative overflow-hidden animate-pulse"
      style={{
        boxShadow:
          "0 1px 0 rgba(0,0,0,0.04), 0 12px 28px -16px rgba(15,61,46,0.45)",
      }}
      aria-hidden="true"
    >
      <div
        className="absolute top-0 right-0 w-[140px] h-[140px] -mt-10 -mr-10 rounded-full pointer-events-none"
        style={{ background: "#13503A", opacity: 0.6 }}
      />
      <div className="relative">
        {/* Live-dot header */}
        <div
          className="h-2.5 w-32 rounded mb-3"
          style={{ background: "rgba(242,238,229,0.15)" }}
        />
        {/* Play + title row */}
        <div className="flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-full flex-shrink-0"
            style={{ background: "rgba(242,238,229,0.12)" }}
          />
          <div className="flex-1 space-y-2 pt-0.5">
            <div
              className="h-6 w-4/5 rounded"
              style={{ background: "rgba(242,238,229,0.12)" }}
            />
            <div
              className="h-4 w-3/5 rounded"
              style={{ background: "rgba(242,238,229,0.08)" }}
            />
          </div>
        </div>
        {/* Scrubber */}
        <div
          className="mt-5 h-[6px] rounded-full"
          style={{ background: "rgba(242,238,229,0.12)" }}
        />
        {/* Controls */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className="h-8 w-16 rounded-full"
            style={{ background: "rgba(242,238,229,0.10)" }}
          />
          <div
            className="h-8 w-16 rounded-full"
            style={{ background: "rgba(242,238,229,0.10)" }}
          />
          <div
            className="h-8 w-12 rounded-full"
            style={{ background: "rgba(242,238,229,0.10)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ---- error state ------------------------------------------------------------

export function AudioPlayerError({ title }: { title: string }) {
  return (
    <div
      className="bg-pitch rounded-[10px] p-5 md:p-6 relative overflow-hidden"
      style={{
        boxShadow:
          "0 1px 0 rgba(0,0,0,0.04), 0 12px 28px -16px rgba(15,61,46,0.45)",
      }}
      role="region"
      aria-label={`Audio: ${title}`}
    >
      <div
        className="absolute top-0 right-0 w-[140px] h-[140px] -mt-10 -mr-10 rounded-full pointer-events-none"
        style={{ background: "#13503A", opacity: 0.6 }}
        aria-hidden="true"
      />
      <div className="relative">
        <div
          className="h-serif text-[22px] md:text-[26px] leading-tight text-paper"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          {title}
        </div>
        <p
          className="mt-3 text-[13px] font-serif italic"
          style={{ color: "rgba(242,238,229,0.7)" }}
        >
          Audio unavailable.
        </p>
      </div>
    </div>
  );
}
