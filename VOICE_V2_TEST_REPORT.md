# VOICE_V2_TEST_REPORT.md

**Date:** 2026-05-05  
**Dates evaluated:** 2026-04-26 (20 captions, 4 overviews), 2026-05-03 (19 captions, 6 overviews), 2026-05-04 (5 captions, 3 overviews)  
**Total v2 editorials generated:** 57 (44 captions + 13 overviews, 0 generation failures)  
**Verdict: DO NOT COMMIT — two pass criteria failed, one new factual-error class found**

---

## Pass Criteria Results

| Criterion | Target | Result |
|---|---|---|
| "two goals clear before the break" (or equivalent) for >1 caption per league per date | 0 violations | **2 violations** ❌ |
| "the data does not confirm" / "not confirmed by the available data" | 0 | 0 ✅ |
| "without standings data" / any explicit data-limitation narration | 0 | 0 ✅ |
| "the kind of X that" | 0 | **2 hits** ❌ |
| "difficult afternoon" / "no afternoon to speak of" | ≤ 1 | 0 ✅ |
| All V1 pass criteria still met | 0 | 0 ✅ |

Two V2 criteria failed. The prompt changes should not be committed.

---

## 1. Shape Monoculture — Still Present (Criterion 1 fails)

### Violations on 2026-05-03

**PL (2/3 captions use shape 4):**

- Slug 538125 (Bournemouth v Crystal Palace): *"Bournemouth were two goals clear of Crystal Palace before the break, and the afternoon was effectively settled long before the final whistle on matchday 35."*
- Slug 538126 (Tottenham v Aston Villa): *"Tottenham were two goals clear at Villa Park before half-time — Aston Villa's second-half reply arrived too late to threaten a result already settled."*
- Slug 538132 (Man Utd v Liverpool): *"Liverpool trailed by two at Old Trafford before the break and, despite pulling it back to 2–2, could not prevent a third slipping past them."* ← inverted shape 4

**PD (2/4 captions use shape 4):**

- Slug 544542 (Betis v Oviedo): *"Betis were two goals clear of Oviedo before the break and won 3–0 — an afternoon Oviedo had no realistic route back into from the first whistle."*
- Slug 544543 (Celta v Elche): *"Celta were two goals clear of Elche at half-time on matchday 34, and the afternoon never offered Elche a realistic foothold."*

### Broader half-time saturation

The count of any halftime/break reference per league on 2026-05-03:

| League | Captions with break reference | Total captions |
|---|---|---|
| BL1 | 2 | 3 |
| FL1 | 4 | 5 |
| PD | 4 | 4 |
| PL | 3 | 3 |
| SA | 2 | 4 |

SA and FL1 avoid the specific "N goals clear" template, but the structural reliance on halftime as an organising frame is far broader than the rotation rule was intended to address.

### Root cause

The rotation rule says *"each caption for a given league on a given day must use a different shape"* and names shape 4 as the specific problem case. But the rule is abstract: the model complies in spirit (it tries variation) while still repeating shape 4 twice per league when two matches in that league had halftime leads. The rule needs a numeric hard cap and an explicit prohibition on the specific wording, not just an abstract "use different shapes" instruction.

### Fix

Replace the current rotation rule with:

```
Shape repetition rule: within a single league's captions for one day, no shape sentence
structure may appear more than once. Specifically — if you have already used "were N goals
clear before the break" (or any close variant) for one match in a league, you must find a
different angle for every other match in that league on the same day. Do not write:

  ✗ "Betis were two goals clear of Oviedo before the break and won 3–0…"
    "Celta were two goals clear of Elche at half-time…"

The second caption repeats the first caption's structure. Rewrite one:

  ✓ "Betis were two goals clear of Oviedo before the break and won 3–0…"
    "Celta led Elche 2–0 at half-time and never needed more — an afternoon that never
    offered the visitors a realistic foothold."

The same constraint applies to any other shape: two captions from the same league on the
same day should not open with the same construction or resolve with the same framing.
```

---

## 2. "The Kind of X That" — Rule Too Narrow (Criterion 4 fails)

### Hits

- **PL league_overview_v2, 2026-05-03:** *"Hugo Ekitike, Liverpool's 11-goal forward, is the kind of **player** capable of dragging a side back into games, but it was United who left with three points."*
- **SA league_overview_v2, 2026-05-04:** *"…delivering the kind of **comprehensive afternoon** that leaves little to discuss tactically — it was simply a team in full control of everything from the opening exchanges."*

### Root cause

The V2-1 ban explicitly names only three nouns: `result`, `performance`, `win`. The model correctly avoided all three banned forms. But the pattern generalises to any noun — `player`, `afternoon`, `win`, `game`, `display`, etc. — and the model used two nouns not in the list.

This is a scope failure in the ban wording, not a failure to comply with what was written.

### Fix

Replace the current wording in the VOICE_BLOCK ban:

```
✗ Do not use: "the kind of result/performance/win that" — this phrase signals resonance
  without earning it. State what the result was; let the reader draw the inference.
```

With:

```
✗ Do not use: "the kind of [any noun] that" construction — "the kind of result that",
  "the kind of player that", "the kind of afternoon that", or any variation. This phrase
  signals resonance without earning it. State what the result was or what the player did;
  let the reader draw the inference.
```

---

## 3. Additional Finding: Prompt Example Causes Factual Error (new, high severity)

### What happened

The shape 5 worked example in the caption format block reads:

> *"Six goals shared at Le Havre on matchday 31, with neither side holding a lead for more than a few minutes at a time."*

On 2026-04-26, the real match was Le Havre 4–4 FC Metz, matchday 31. The model generated:

> Slug 542676: *"Six goals shared at Le Havre on matchday 31, with neither side holding a lead for more than a few minutes at a time."*

This is verbatim from the example. The actual score was 4–4 — **eight goals shared, not six**. The example was reproduced word-for-word with the wrong fact baked in.

### Why it happened

The example uses a real team name (Le Havre), a real matchday number (31), and a real fixture type. When the model processes a match that matches all three, it pattern-matches from the example rather than generating from the input data. The no-invention rule cannot catch this — the model believes it is using the example as a template, not inventing.

### Fix

The example in shape 5 must not use real team names or real matchday numbers. Replace the Le Havre example with a clearly fictional venue or team name so the model cannot pattern-match it against actual input:

```
Shape 5 example — replace:
  "Six goals shared at Le Havre on matchday 31, with neither side holding a lead for
  more than a few minutes at a time."

With:
  "Eight goals shared and neither side led for more than a few minutes — four each and
  the points split."
```

The replacement removes the venue reference entirely (the example does not need one), uses a number ("Eight") that does not match the original example, and is still a clear worked illustration of shape 5.

---

## 4. What Worked

- **V1 banned phrases:** confirmed 0 across all 57 v2 editorials. The V1 diffs are stable and should be retained unchanged.
- **Meta-commentary (V2-1 second rule):** 0 instances of "the data does not confirm", "whether X happened is not confirmed", or "without standings data". The second V2-1 rule is working correctly.
- **Thin-day brevity (V2-3):** The PD 2026-05-04 one-match overview (slug `pd`, 2026-05-04) covers the single match and stops cleanly with no padding or limitation-framing. The V2-3 league overview rule is working.
- **Day overview fourth-wall rule (V2-3):** 0 instances of explicit data-limitation narration in day overviews. Working correctly.
- **"Difficult afternoon":** 0 instances. Down from 3 in the V1 corpus.

---

## 5. Summary of Required Changes Before Committing

Three targeted edits to `src/editorial/prompts.ts` before the V2 changes can be committed:

1. **VOICE_BLOCK** — broaden "the kind of X that" ban from specific nouns to any noun (fix for §2 above).
2. **Caption format block, shape rotation rule** — replace abstract "different shape" instruction with explicit no-repeat rule + bad/good example (fix for §1 above).
3. **Caption format block, shape 5 example** — replace Le Havre with fictional venue or remove venue reference entirely (fix for §3 above).

After making these three edits, re-run eval on 2026-05-03 (the primary shape-monoculture date) and spot-check the PL and PD captions before committing.

---

*No files were modified in this evaluation pass. All findings are based on `_v2` kind editorials in the DB.*
