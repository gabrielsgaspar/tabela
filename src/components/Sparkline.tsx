/**
 * Sparkline — small inline SVG line chart.
 *
 * Server component. Pure SVG output, no browser APIs.
 *
 * The draw-in animation lives in globals.css (.spark-path) and runs once
 * when the element enters the DOM. Because the animation is `forwards`
 * (holds end state) and the SVG element is never unmounted on re-render,
 * it naturally runs exactly once per page load. No React state needed.
 *
 * The `pathLength={200}` attribute normalises the path's geometric length
 * to 200 for stroke-dash calculations, matching the 200-unit values in the
 * `.spark-path` CSS class regardless of actual coordinate path length.
 *
 * Edge cases:
 *   - Empty array  → returns null (renders nothing; parent handles absence)
 *   - Single point → centred dot, no line (draw animation not applied)
 *   - All equal    → flat horizontal line at midpoint (no divide-by-zero)
 *
 * Judgment calls (JSX source unavailable):
 *   - No fill area under the line. The cleaner option per the brief; the
 *     design reference was not conclusive. A fill can be added by inserting
 *     a <polygon> with the same points plus baseline corners, at ~8% opacity.
 *   - `overflow: visible` on the SVG element so the final-point dot (r=2.5)
 *     doesn't clip against the viewBox edge when `highlightLast` is true.
 *   - preserveAspectRatio omitted (uses browser default "xMidYMid meet");
 *     the numeric width/height props control the exact rendered pixel size.
 */

import { colors } from "@/lib/tokens";

export interface SparklineProps {
  data: number[];
  /** Rendered pixel width. Default 80. */
  width?: number;
  /** Rendered pixel height. Default 20. */
  height?: number;
  /** Stroke colour. Default pitch-green from tokens. */
  color?: string;
  /** When true, renders a mustard dot at the last data point. */
  highlightLast?: boolean;
  /**
   * When true, renders a filled area under the line back to the baseline
   * at fillOpacity 0.06. Required by StatLeaderCard. Default false.
   */
  fill?: boolean;
}

export default function Sparkline({
  data,
  width = 80,
  height = 20,
  color = colors.pitch,
  highlightLast = false,
  fill = false,
}: SparklineProps) {
  // Empty — render nothing; callers decide how to handle absent data.
  if (data.length === 0) return null;

  const pad = 3; // inner padding so strokes don't clip at edges
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  function getY(val: number): number {
    // All-equal values: flat line at vertical midpoint (no divide-by-zero).
    if (range === 0) return pad + innerH / 2;
    return pad + (1 - (val - min) / range) * innerH;
  }

  // Single point — centred dot, animation not applicable.
  if (data.length === 1) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        <circle cx={width / 2} cy={height / 2} r={2.5} fill={color} />
      </svg>
    );
  }

  // Multiple points — build coordinate array once for both polyline and fill path.
  const coords = data.map((val, i) => ({
    x: pad + (i / (data.length - 1)) * innerW,
    y: getY(val),
  }));

  const points = coords
    .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");

  // Fill path: line coordinates + drop to baseline corners + close.
  const first = coords[0];
  const last = coords[coords.length - 1];
  const fillD = [
    `M${first.x.toFixed(2)},${first.y.toFixed(2)}`,
    ...coords.slice(1).map((c) => `L${c.x.toFixed(2)},${c.y.toFixed(2)}`),
    `L${last.x.toFixed(2)},${height}`,
    `L${first.x.toFixed(2)},${height}`,
    "Z",
  ].join(" ");

  // Last point for the optional highlight dot.
  const lastX = last.x;
  const lastY = last.y;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {fill && (
        <path d={fillD} fill={color} fillOpacity={0.06} stroke="none" />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={200}
        className="spark-path"
      />
      {highlightLast && (
        <circle cx={lastX} cy={lastY} r={2.5} fill={colors.mustard} />
      )}
    </svg>
  );
}
