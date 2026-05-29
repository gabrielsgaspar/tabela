// Design tokens as TypeScript constants.
//
// These mirror the `@theme` block in src/app/globals.css exactly. The CSS
// variables drive Tailwind utilities; this module exists for the cases that
// cannot read a CSS variable — SVG presentation attributes and inline style
// props in components like TeamCrest and Sparkline. Keep the two in sync: if a
// colour changes in globals.css, change it here too.

export const colors = {
  paper: "#FAF7F2",
  paper2: "#F2EEE5",
  ink: "#111111",
  ink2: "#3A3A38",
  ink3: "#6B6B66",
  rule: "rgba(26,26,24,0.12)",
  rule2: "rgba(26,26,24,0.22)",
  pitch: "#0F3D2E",
  pitch2: "#1A5A45",
  mustard: "#D4A24C",
  mustard2: "#B5862E",
  crimson: "#B33A2E",
} as const;

export type ColorToken = keyof typeof colors;
