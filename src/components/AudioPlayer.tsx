"use client";

/**
 * AudioPlayer — inline episode player.
 *
 * Phase 5: wired to a real HTMLAudioElement. The component owns its own
 * <audio> ref internally — no shared state, no context. Self-contained.
 *
 * Props:
 *   audioUrl    — if absent the component renders AudioPlayerError immediately.
 *   durationSec — optional initial duration (0 if unknown). Updated from
 *                 audio.duration once metadata loads, so the scrubber works
 *                 before the full file buffers.
 *
 * What is wired (Phase 5):
 *   - onloadedmetadata  → updates dur state from audio.duration
 *   - ontimeupdate      → tracks t (currentTime) in real time
 *   - onplay / onpause  → reflects actual play/pause state
 *   - onended           → resets to beginning
 *   - onwaiting/onplaying → buffering spinner on play button
 *   - onerror           → falls back to AudioPlayerError
 *   - Scrub-by-pointer (mouse + touch) → audio.currentTime
 *   - Speed control     → audio.playbackRate
 *   - Chapter clicks    → audio.currentTime = c.t
 *
 * Autoplay restriction: audio.play() is only ever called after a user gesture
 * (the play button click). The returned Promise is caught so a browser rejection
 * (low-power mode, tab policy) resets state cleanly without a console error.
 *
 * Companion exports:
 *   AudioPlayerSkeleton — dark shimmer card
 *   AudioPlayerError    — quiet failure state
 */

import { useState, useRef, useEffect } from "react";

export interface ChapterMark {
  /** Position in seconds */
  t: number;
  label: string;
}

export interface AudioPlayerProps {
  title: string;
  /** Initial duration in seconds. Defaults to 0 (unknown). Will be updated
   *  from audio.duration once metadata loads — scrubber works immediately. */
  durationSec?: number;
  host?: string;
  chapters?: ChapterMark[];
  /** Public URL of the mp3. Absent → renders AudioPlayerError. */
  audioUrl?: string;
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
  durationSec = 0,
  host,
  chapters = [],
  audioUrl,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user is actively dragging the scrubber.
  const isDragging = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  // dur is initialised from the prop but overwritten by onloadedmetadata.
  const [dur, setDur] = useState(durationSec);
  const [speed, setSpeed] = useState<Speed>(1);
  // buffering: true while audio is stalled waiting for data after play() was called.
  const [buffering, setBuffering] = useState(false);
  // hasError: true if the audio element fires an error event.
  const [hasError, setHasError] = useState(false);

  // Wire audio element events on mount.
  // audioRef.current is null if audioUrl is absent (the early return below
  // prevents the <audio> element from ever rendering). The null check guards
  // against that case cleanly.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDur(audio.duration);
    const onTimeUpdate = () => {
      // Skip updates while the user is scrubbing to avoid jitter.
      if (!isDragging.current) setT(audio.currentTime);
    };
    const onPlay = () => { setPlaying(true); setBuffering(false); };
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setT(0); };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => { setPlaying(true); setBuffering(false); };
    const onError = () => { setHasError(true); setBuffering(false); setPlaying(false); };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, []); // mount/unmount only — audioUrl is stable for the lifetime of this instance

  // Sync speed → audio.playbackRate whenever the user cycles speed.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  // ── After all hooks, conditional rendering ────────────────────────────────

  // No audioUrl or a load error → show the error fallback.
  if (!audioUrl || hasError) {
    return <AudioPlayerError title={title} />;
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const pct = dur > 0 ? (t / dur) * 100 : 0;

  const currentChapter =
    chapters.length > 0
      ? ([...chapters].reverse().find((c) => c.t <= t) ?? chapters[0])
      : null;

  const metaParts: string[] = [];
  if (host) metaParts.push(host);
  metaParts.push(dur > 0 ? fmt(dur) : "–:––");
  if (currentChapter) metaParts.push(currentChapter.label);
  const metaLine = metaParts.join(" · ");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      setBuffering(true);
      // audio.play() returns a Promise. Catch browser rejections (autoplay policy,
      // low-power mode) and reset state so the UI stays consistent.
      audio.play().catch(() => {
        setBuffering(false);
        // playing will stay false because onPlay never fired.
      });
    }
  };

  // Compute seek position from a pointer's clientX.
  const seekTo = (clientX: number) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // Use audio.duration directly (most current value) rather than dur state.
    const totalDur = audio.duration || dur;
    if (!totalDur) return;
    audio.currentTime = pct * totalDur;
    setT(pct * totalDur); // immediate visual update during drag
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    // Capture pointer so we still receive events if cursor leaves the element.
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    seekTo(e.clientX);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = SPEED_CYCLE.indexOf(prev);
      return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/*
        Hidden audio element. preload="metadata" loads just enough to get the
        duration and first frame without buffering the full file.
        Not display:none — hidden by being audio (no visual rendering).
      */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

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
              onClick={handlePlayPause}
              aria-label={
                buffering ? "Loading audio…" : playing ? "Pause" : "Play"
              }
              className="flex-shrink-0 w-16 h-16 md:w-[74px] md:h-[74px] rounded-full bg-mustard text-pitch flex items-center justify-center transition-transform duration-150 hover:scale-[1.04] active:scale-[0.98]"
              style={{ boxShadow: "0 6px 18px -6px rgba(212,162,76,0.6)" }}
            >
              {buffering ? (
                /* Buffering spinner — two-tone ring matching the mustard button */
                <span
                  className="w-5 h-5 rounded-full border-[2.5px] animate-spin"
                  style={{
                    borderColor: "rgba(15,61,46,0.25)",
                    borderTopColor: "#0F3D2E",
                  }}
                  aria-hidden="true"
                />
              ) : playing ? (
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
            {/*
              The track div is the interactive scrub target.
              - role="slider" with aria values for accessibility.
              - touchAction: "none" prevents the browser from intercepting
                touch-drag for scroll when the user means to scrub.
              - cursor-pointer shows seek affordance on desktop.
              - Pointer capture via setPointerCapture ensures drag still works
                if the pointer leaves the element.
            */}
            <div
              ref={trackRef}
              className="relative h-[6px] rounded-full cursor-pointer"
              style={{
                background: "rgba(242,238,229,0.18)",
                touchAction: "none",
              }}
              role="slider"
              tabIndex={0}
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Playback progress"
              aria-valuetext={`${fmt(t)} of ${dur > 0 ? fmt(dur) : "unknown"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-mustard pointer-events-none"
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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-paper pointer-events-none"
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
              <span>{dur > 0 ? `−${fmt(dur - t)}` : "–:––"}</span>
            </div>
          </div>

          {/* Controls row */}
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            {/* Left: skip + speed */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  audio.currentTime = Math.max(0, audio.currentTime - 15);
                }}
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
                onClick={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  audio.currentTime = Math.min(
                    audio.duration || dur,
                    audio.currentTime + 15
                  );
                }}
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
                      onClick={() => {
                        const audio = audioRef.current;
                        if (!audio) return;
                        audio.currentTime = c.t;
                        setT(c.t);
                      }}
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
    </>
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
