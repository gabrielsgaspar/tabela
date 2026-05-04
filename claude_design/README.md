# claude_design/

Visual reference for Tabela. Output from Claude Design, May 2026.

**Do not edit these files.** They are the visual spec for Phase 4 (the website).
Treat them like a Figma file: read, reference, copy tokens and components into
the actual app — but do not modify the references themselves.

## Files

- `Tabela.html` — Home page (masthead, league filter, today's matches, today's
  narrative + audio, stat leaders, race watch, follow-a-team CTA, footer).
- `Tabela_-_Team__League___Archive.html` — Team page, league overview,
  podcast/archive page.

## Design tokens (canonical)

```
COLOR
  paper       #FAF7F2
  paper-2     #F2EEE5
  ink         #111111
  ink-2       #3A3A38
  ink-3       #6B6B66
  pitch       #0F3D2E   (primary brand)
  pitch-2     #1A5A45
  mustard     #D4A24C   (accent / live indicator)
  crimson     #B33A2E   (loss / negative — sparingly)

TYPE
  Display:  Newsreader (serif, opsz 48–72), 600/700
  Body:     DM Sans, 400/500/600
  Tabular:  JetBrains Mono, 500/600 — scores, stats

SPACING (4-px base): 4 8 12 16 20 24 32 40 56 80 120
RADII: xs 4 / sm 6 / md 10 / lg 16 / pill 999
```

These tokens are implemented in `src/app/globals.css` (`@theme` block) and
mirror exactly what is in the HTML files above. Do not redefine them inline
anywhere else in the codebase.
