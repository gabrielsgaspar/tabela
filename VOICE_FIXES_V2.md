# VOICE_FIXES_V2.md

**Date:** 2026-05-05  
**Corpus:** 180 editorials — 124 match captions, 43 league overviews, 13 day overviews — across 13 dates (2026-04-19 through 2026-05-04).  
**Status of V1 fixes:** All four diffs from `VOICE_FIXES.md` were applied to `src/editorial/prompts.ts` and committed. This document builds on that baseline; it does not repeat the V1 diffs.

---

## 1. V1 Fix Status

### What was applied

The four diffs from `VOICE_FIXES.md`:

1. **VOICE_BLOCK extended** — two new `✗` lines banning the "pressure on" family and countdown-as-filler.
2. **Caption format block replaced** — removed the "momentum or stakes" invitation; added four observational questions and five named rhetorical shapes with worked examples and three bad examples.
3. **League overview format block** — replaced "imagined table" framing with an explicit ban on positional inferences; named "needed the points", "can ill afford", "fighting to stay up", "survival" as banned phrases.
4. **Day overview format block** — removed "contrasting relegation pictures" from the guidelines; added explicit ban on urgency framing without standings data; named "Needs to win", "cannot afford to drop points", "could prove decisive in the title race" as banned.

### What the data shows

Four dates were regenerated with the updated prompts: 2026-04-19, 2026-04-25, 2026-05-03. The production run on 2026-05-04 also used the new prompts. Phrase counts across those four dates:

| Phrase family | Count (post-fix dates) | Pre-fix rate |
|---|---|---|
| "pressure on" (any variant) | **0** | 26 captions (22%), 13 overviews |
| "N games/matchdays remaining" as stakes | **0** | ~20 captions (17%) |
| "sends a statement" | **0** | 5 captions |
| "needed the points" | **0** | 3+ overviews |
| "can ill afford" | **0** | 4 instances |
| "relegation" | **1** (self-referential, see §2.3) | 4 instances |
| "survival" | **0** | 5 instances |

All primary targets eliminated. The V1 diffs are working and should be retained unchanged.

---

## 2. New Patterns in Post-Fix Output

These patterns were not present in the original 60-sample audit and are not addressed by the V1 diffs.

---

### 2.1 — "Two goals clear before the break" as replacement template

**Frequency:** 8 of 24 sampled captions from 2026-05-03 alone (33%). Present in 2026-05-04 too.

The model absorbed shape 4 ("half-time as the whole story") from the caption format block and is applying it mechanically to a large proportion of matches. The "pressure on" template has been replaced by a structurally identical new template:

```
[Team] were [N] goals clear [before the break / at half-time] and [outcome] —
[losing team] [had/found/could find] no [route back / answer / foothold] [in this game].
```

**Instances from 2026-05-03 alone:**

- *"Mainz were two goals clear before St. Pauli had touched the ball in the second half — the hosts pulled one back but the game was already settled."*
- *"Paris FC were two goals clear of Brest before the break on matchday 32 — the second half was a formality Brest had no answer for."*
- *"Lyon were two goals clear at half-time and pulled further away in the second — a difficult afternoon for Rennes."*
- *"Betis were two goals clear of Oviedo before the break and won 3–0 — an afternoon Oviedo had no realistic route back into from the first whistle."*
- *"Celta were two goals clear before the break and never looked troubled — Elche's consolation came too late to make an afternoon of it."*
- *"Bournemouth were two goals clear before the break and Crystal Palace had no realistic route back into this game at the Vitality."*
- *"Tottenham were two goals clear before Villa touched the ball in the second half — the hosts pulled one back, but the afternoon was already decided at the break."*

And from 2026-05-04:
- *"Nottingham were two goals clear at Stamford Bridge before the break — Chelsea, with João Pedro's 15-goal season behind them, never found a way back."*

**Why it forms:** The format block named "half-time as the whole story" as one of five shapes, and the five shapes are listed as equally valid alternatives. When multiple matches in a single league produce halftime leads, the model defaults to the same shape for all of them rather than distributing across shapes.

**Why it is a problem:** A reader going through a league's five results on the same day will encounter the same structural scaffold five times. The caption prompt says each caption should have a distinct texture; the current guidance allows the same shape to repeat indefinitely.

---

### 2.2 — "The data does not confirm" / data-limitation meta-commentary in editorial copy

**Frequency:** 3 overviews from post-fix dates; one explicit fourth-wall break in a day overview.

The model, when using scorer data in overviews, is surfacing its own data constraints directly in the editorial text:

- *"Whether either man was decisive here the data does not confirm — but the result was."* (PD league overview, 2026-05-03)
- *"Whether either man was on the scoresheet today is not confirmed by the available data, but the result was characteristically controlled."* (SA league overview, 2026-05-03)
- *"Whether Iglesias added to his tally is not confirmed by the available data, but Celta's comfort was evident in the scoreline."* (PD league overview, 2026-05-03)
- *"the top of the Italian table remains unsettled heading into the final stretch — though without standings data, what matters here is the shape of it: Inter winning, Juventus dropping points, Milan losing to a side below them."* (Day overview, 2026-05-03 — explicit fourth-wall break)

The last one is the most damaging: the model narrates its own constraint in first person, inside the editorial. The reader doesn't need to know what data the system lacks. This is a new failure mode — the V1 prompts established that the model must not invent facts, but they did not establish that it must not expose its own constraints. The editorial voice is that of an informed writer, not a data system. An informed writer who doesn't know who scored simply doesn't raise the subject; they don't explain why they're not raising it.

The "data does not confirm" phrasing is also factually clumsy: the scorer list *is* in the prompt, so the data absolutely is there; what is missing is the per-match event, which is a different thing.

---

### 2.3 — Residual "title race / relegation picture" language in overview disclaimers

**Frequency:** 1 instance (2026-05-04 PD league overview).

*"Matchday 34 offered a contained snapshot rather than a sweeping picture of the title race or relegation picture."*

This appears in the PD league overview for 2026-05-04 — a one-match matchday where the model ran out of material and filled with a meta-observation about its own data. The phrase "relegation picture" is technically within a negative framing ("rather than a sweeping picture of… the relegation picture"), but it is still present and reflects the same pattern as 2.2: the model talking about what it cannot discuss, rather than saying nothing.

A well-written overview of a one-match day simply covers the one match and stops. It does not frame its brevity as a limitation.

---

### 2.4 — "The kind of X that" — V1 pattern resurfacing in overviews

**Frequency:** 1 confirmed instance in post-fix overviews; present in earlier old-prompt overviews too.

*"It is the kind of away performance that defines a side's season."* (PL league overview, 2026-05-04)

VOICE.md's original audit flagged "the kind of result that" appearing 9 times in overviews. This is the same construct with different nouns. The V1 VOICE_BLOCK extended the banned list for captions but the "the kind of X that" pattern was not explicitly named. It surfaces in overviews where the model reaches for resonance it cannot earn from the available data.

---

### 2.5 — "A difficult afternoon" / "no afternoon to speak of" filler

**Frequency:** 3 instances across post-fix captions and overviews.

- *"a difficult afternoon for Rennes"* (FL1 caption, 2026-05-03)
- *"a difficult afternoon to absorb"* (PD league overview, 2026-05-04)
- *"the visitors had no afternoon to speak of"* (SA caption, 2026-05-04)

Low frequency individually, but they function identically to "a result that does little for X's ambitions" from the V1 audit — abstract framing applied to the losing team when the model has no specific observation to make. "A difficult afternoon" is less common and less harmful than the V1 patterns, but it is in the same family. Watch for growth across a larger post-V2 corpus.

---

## 3. V1 Proposal Reassessment

All four V1 diffs are confirmed appropriate on the 180-editorial corpus. No rollback or modification is required. The problems they targeted (pressure on, countdown filler, stakes without data) are gone.

One V1 proposal that is working better than expected: the four observational questions in the caption format block ("What did the half-time score tell us? What does the scoreline say about the losing team's afternoon?…") are producing better-grounded captions. The problem is not that the questions are wrong but that the model applies one of the five shapes to the exclusion of the others. The fix is additive.

---

## 4. Proposed V2 Diffs

Three surgical additions to `src/editorial/prompts.ts`. The V1 text stays unchanged; these are appended to or inserted into the relevant blocks.

---

### Diff V2-1 — VOICE_BLOCK: ban "the kind of X that" and meta-commentary

**Append to the VOICE_BLOCK `✗` list (after the existing countdown-filler ban):**

```
✗ Do not use: "the kind of result/performance/win that" — this phrase signals resonance
  without earning it. State what the result was; let the reader draw the inference.
✗ Do not expose your data limitations in editorial copy. If you cannot confirm something,
  omit it — do not write "the data does not confirm" or "whether X happened is not
  confirmed". You are a writer, not a data system. A writer who does not know who scored
  simply does not raise the subject.
```

**Rationale:** Pattern 2.2 is not a prompt-gap problem — the model is over-complying with the no-invention rule by narrating it aloud. Naming this explicitly is the only reliable fix. The "kind of X that" ban targets pattern 2.4 before its frequency grows.

---

### Diff V2-2 — Caption format block: anti-repetition rule for shape selection

**Append to the "Five shapes" section, immediately after the five examples:**

```
Shape rotation rule: each caption for a given league on a given day should use a
different shape. If multiple matches produced half-time leads, do not describe all of
them as "[Team] were N goals clear before the break." Choose one match for that frame
and find a different angle for the others. A reader working through all five results
should encounter five structurally distinct sentences.
```

**Rationale:** Pattern 2.1. The model has learned shape 4 well and over-applies it. The fix is not to remove the shape (it produces good output) but to require variety across a single matchday's captions.

---

### Diff V2-3 — League overview and day overview format blocks: brevity rule for thin days

**Append to the league overview format block Guidelines (after the no-urgency-inference rule):**

```
- On a day with only one or two matches, write only what those matches warrant. Do not
  pad the overview with observations about what the day "could not tell us" — if there
  is only one game, cover it fully and stop. Do not frame brevity as a limitation.
```

**Append to the day overview format block Guidelines (after the no-invention rule):**

```
- Do not explain what you cannot discuss. If standings data is absent, write from the
  scores and scores alone — do not signal the absence ("though without standings data…",
  "a sweeping picture of the title race or relegation picture was not available today").
  The editorial voice assumes a reader; it does not address the reader's expectations
  about what information the writer has.
```

**Rationale:** Patterns 2.2, 2.3. The first rule targets thin-day padding (the PD one-match overview). The second targets the fourth-wall break in the day overview. Both are the same failure mode: the model filling space by narrating its constraints rather than simply producing less text.

---

## 5. Proposed Test Loop

### Why these three dates

| Date | What it tests |
|---|---|
| **2026-05-03** | Highest density of "two goals clear before the break" — 5 leagues, at least 7 instances of the new template. Primary test for Diff V2-2 (shape rotation). Also the date with the most data-limitation meta-commentary in overviews. Tests Diff V2-3. |
| **2026-04-26** | Old-prompt date, not yet regenerated. 20 editorials. Tests V1 fixes are still holding on new date AND tests V2-1/V2-2 on fresh output. |
| **2026-05-04** | Production run date. 9 editorials. One "title race or relegation picture" meta-phrase (tests Diff V2-3). One-match La Liga day tests the thin-day brevity rule. |

### Method — write to experimental kind labels, not overwrite

The regenerated editorials are written to the DB using `kind` values suffixed with `_v2`:
- `match_caption_v2`
- `league_overview_v2`
- `day_overview_v2`

These do not conflict with the production `kind` values and are ignored by the website query. The `editorials` table's UNIQUE constraint is on `(date, league_code, kind, slug)` — a different `kind` value creates a new row rather than an upsert conflict.

### Script

A new script `scripts/eval-voice-v2.ts` that:

1. Accepts a `--date YYYY-MM-DD` argument.
2. Reads match data from `match_days` and scorer context from `season_stats` for that date (same as the main pipeline).
3. Runs the V2-updated prompt functions to generate new editorial text.
4. Writes results to the DB with `_v2` kind suffixes (not the production kinds).
5. Prints a markdown side-by-side diff to stdout: old `body` (from DB) vs. new `body` (from V2 generation).

### Comparison query (after eval script runs)

```sql
-- Captions: old vs new side-by-side for a given date
SELECT
  o.slug,
  o.league_code,
  o.body AS current_caption,
  n.body AS v2_caption
FROM editorials o
JOIN editorials n
  ON o.slug = n.slug
  AND o.date = n.date
  AND o.league_code IS NOT DISTINCT FROM n.league_code
WHERE o.date = '2026-05-03'
  AND o.kind = 'match_caption'
  AND n.kind = 'match_caption_v2'
ORDER BY o.league_code, o.slug;
```

Repeat with `league_overview` / `league_overview_v2` and `day_overview` / `day_overview_v2`.

### Pass criteria for the V2 evaluation

| Criterion | Target |
|---|---|
| "two goals clear before the break" (or equivalent) used for more than one caption per league per date | ≤ 0 violations |
| "the data does not confirm" / "not confirmed by the available data" | 0 |
| "without standings data" (or any explicit data-limitation narration) | 0 |
| "the kind of X that" | 0 |
| "difficult afternoon" / "no afternoon to speak of" | ≤ 1 across full eval date |
| All V1 pass criteria still met (pressure on = 0, countdown = 0, named stakes phrases = 0) | 0 |

### Fail handling

If any V2 criterion fails, re-read the specific diff and check whether the wording was concrete enough. The model responds to examples more reliably than to abstract prohibitions — if a pattern persists, add a bad example to the relevant format block before re-running. Do not regenerate without diagnosing which specific guideline failed.

---

## 6. What is NOT proposed for V2

**"Allusive memory" (historical references)** — flagged in VERIFICATION_REPORT_2.md as unused across 60 samples. This remains a data gap rather than a prompt gap: the prompts cannot elicit historical references when no historical data is passed as input. This is a Phase 4 candidate: add a `context.records` field to `EditorialContext` seeded from a small static dataset of notable per-league records. Do not add prompt guidance for it until the data is there.

**"came from behind to"** — appears 8 times in captions but is often the most accurate description of the match shape. It is not systematically formulaic in the way "pressure on" was; it describes a specific result type. Leave it unless frequency grows.

**"took all three points"** — low-editorial-weight filler, appears ~6 times. Not worth a prompt change at this frequency; worth noting in the next audit if it grows above 10%.

---

*This document proposes changes only. No files have been modified.*  
*Awaiting approval before touching `src/editorial/prompts.ts`.*
