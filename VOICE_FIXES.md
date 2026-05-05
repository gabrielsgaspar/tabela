# VOICE_FIXES.md

Proposal for prompt-level fixes to the three voice issues identified in VERIFICATION_REPORT_2.md.

**Corpus:** 119 match captions, 39 league overviews, 12 day overviews — all 170 editorials in the live DB as of 2026-05-04.

---

## 1. Recurring phrases

Full phrase-frequency analysis across the 119-caption corpus and all 51 overviews.

### The "pressure on" family — 26 captions (22%), 12+ overviews

This is not one cliché. It is a family of interchangeable surface variants generated from a single template slot:

| Variant | Captions | Overviews |
|---------|----------|-----------|
| "keeps the pressure firmly on" | 8 | 3 |
| "keeps the pressure on" | 7 | 4 |
| "keeping the pressure firmly on" | 2 | 0 |
| "keeping the pressure on" | 7 | 5 |
| "kept the pressure on" | 1 | 1 |
| "keeping pressure on" | 1 | 0 |
| **Total** | **26** | **13** |

Selected instances (captions only, to show spread):

- *"Auxerre's comfortable victory… keeps the pressure firmly on the sides above them in Ligue 1."* (FL1, 2026-05-03)
- *"Sassuolo's win over Milan… keeps the pressure firmly on a side that can ill afford late-season stumbles."* (SA, 2026-05-03)
- *"Newcastle's commanding win… keeps the pressure on the top of the Premier League table."* (PL, 2026-05-02)
- *"Barcelona came from behind… keeping the pressure on Real Madrid with four games left."* (PD, 2026-05-02)
- *"Athletic turned a half-time lead… keeping pressure on the teams above them in La Liga."* (PD, 2026-05-02)
- *"Arsenal held Newcastle… keeping the pressure firmly on the teams above them."* (PL, 2026-04-25)
- *"Fulham's first-half lead held firm… a result that keeps the pressure on both clubs with four matchdays remaining."* (PL, 2026-04-25)
- *"Liverpool swept Crystal Palace aside… keeping the pressure firmly on the title race."* (PL, 2026-04-25)
- *"Tottenham ground out a second-half winner… keeping the pressure on the sides above them."* (PL, 2026-04-25)
- *"Leverkusen came from behind… keeping the pressure on at the top."* (BL1, 2026-04-25)
- *"Bayern's comeback… keeps the pressure on every rival still watching."* (BL1, 2026-04-25)
- *"Heidenheim's win… keeps the pressure on in what remains a tight Bundesliga relegation picture."* (BL1, 2026-04-25)
- *"Lille took all three points… keeping the pressure on at the top of Ligue 1."* (FL1, 2026-04-26)
- *"PSG were in complete control… keeping the pressure on Ligue 1's leading scorers."* (FL1, 2026-04-25)
- *"Atlético turned around a deficit… a comeback that keeps the pressure on at the top."* (PD, 2026-04-25)
- *"Barcelona's win… keeps the pressure firmly on Mbappé's Real Madrid with six games remaining."* (PD, 2026-04-25)
- *"Real Madrid kept the pressure on at the top with a home win over Alavés."* (PD, 2026-04-21)
- *"Freiburg picked up three points… keeping pressure on the teams above them with four games left."* (BL1, 2026-04-19)
- *"Paris FC turned a half-time stalemate… keeping the pressure on in Ligue 1 matchday 30."* (FL1, 2026-04-19)
- *"Aston Villa edged a seven-goal thriller… keeping the pressure on the sides above them."* (PL, 2026-04-19)
- *"Manchester City ground out a narrow win… keeping the pressure on with four games left."* (PL, 2026-04-22)
- *"Barcelona kept the pressure on at the top of La Liga with a controlled win."* (PD, 2026-04-22)
- *"PSG put Nantes to the sword… keeping the pressure firmly on Ligue 1's chasing pack."* (FL1, 2026-04-22)
- *"Real Madrid secured a second-half victory… keeping the pressure on with four games remaining."* (PD, 2026-05-03)
- *"Lyon's second-half turnaround… keeps them firmly in the Ligue 1 conversation with seven matchdays remaining."* (FL1, 2026-04-25)
- *"Aston Villa edged a seven-goal thriller at Villa Park on matchday 33, keeping the pressure on the sides above them."* (PL, 2026-04-19)

### "[N] games/matchdays remaining" as caption-ending filler — ~20 captions (17%)

This phrase appears as the terminal clause in roughly 1 in 6 captions, almost always paired with the "pressure on" template but also appearing alone:

- *"…with four games remaining."* (PD, 2026-05-03)
- *"…with four games of the season remaining."* (PD, 2026-05-03)
- *"…only two Bundesliga matchdays remaining to salvage their campaign."* (BL1, 2026-05-03)
- *"…with just two matchdays remaining."* (BL1, 2026-05-02, appears twice)
- *"…a timely three points with two matchdays remaining."* (BL1, 2026-05-02)
- *"…with just two Bundesliga matchdays remaining in the season."* (BL1, 2026-05-02)
- *"…with four matchdays remaining."* (PL, 2026-04-25, appears twice)
- *"…with six games remaining."* (PD, 2026-04-25)
- *"…seven matchdays remaining."* (FL1, 2026-04-25)
- *"…with seven matches to play."* (FL1, 2026-04-25)
- *"…with four games left."* (BL1, 2026-04-19; PL, 2026-04-22)
- *"…with five games of the La Liga season remaining."* (PD, 2026-04-22; PD, 2026-04-23)
- *"…with just five games remaining."* (PD, 2026-04-23)
- *"…with three matchdays left in Serie A."* (SA, 2026-05-01)

This is not a voice violation in isolation — stating that N games remain is a fact — but it is invariably used as a substitute for actual observation. Every caption that ends this way has no specific claim about the match itself: the result's meaning is asserted via season-position framing, not demonstrated.

### "sends a statement" — 5 captions (4%)

A small number but concentrated in a short time window (May 2–May 3 and April 19–24):

- *"Paris FC turned Matchday 32 into a statement, putting Brest to the sword."* (FL1, 2026-05-03)
- *"Atlético Madrid's second-half turnaround at Mestalla sends a statement with four matchdays of La Liga still to play."* (PD, 2026-05-02)
- *"Levante's Matchday 33 win over Sevilla sends a statement with just five games of the La Liga season remaining."* (PD, 2026-04-23)
- *"Nottingham Forest's emphatic Matchday 34 victory at Sunderland sends a clear statement to every side still watching the top end of the table."* (PL, 2026-04-24)
- *"Nottingham's commanding second-half turnaround on Matchday 33 sends a statement to the Premier League's top-half contenders."* (PL, 2026-04-19)

VOICE.md does not explicitly ban this phrase, but it is a textbook case of hollow drama. "Sends a statement" states that the result has meaning without saying what the meaning is.

### "a result that does [little/nothing] for" — 5 captions

- *"Lille drop two points at home to Le Havre on matchday 32, a result that does little good for either side's end-of-season ambitions."* (FL1, 2026-05-03)
- *"Genoa held Atalanta to a goalless draw… a result that does little to help either side's ambitions this late in the season."* (SA, 2026-05-02)
- *"Bologna and Cagliari shared nothing… a goalless draw that will satisfy neither side at this late stage of the season."* (SA, 2026-05-03)
- *"A point apiece at Selhurst Park… a result that suited neither side particularly well."* (PL Apr 20 overview)
- *"a blank scoresheet at Cornellà… Espanyol and Levante share a point neither side could afford to waste."* (PD, 2026-04-27)

### Other recurring phrases (3+ instances, listed for completeness)

| Phrase | Captions | Overviews | Notes |
|--------|----------|-----------|-------|
| "came from behind to" | 8 | 5 | Often appropriate; not always formulaic |
| "dropped/dropping two points" | 5 | 4 | Factual, but overused |
| "the kind of result that" | 1 | 9 | Mostly in overviews; VOICE.md warns against "hollow drama" |
| "this late in the season" / "at this stage of the season" | 6 | 5 | Always attached to implied stakes |
| "put [team] to the sword" | 3 | 1 | Low count; not systematic |
| "took all three points" | 6 | 3 | Factual filler with no editorial weight |

---

## 2. The caption template pattern

The dominant mechanical template, abstracted from the corpus:

```
[Team] [action verb phrase] [on Matchday N / at venue], [stakes clause]
```

Where the stakes clause is almost always one of:

```
keeps/keeping the pressure [firmly] on [target] [with N games remaining]
a [adjective] result/win with [N] matchdays remaining
sends a statement [to audience]
a result that does [little/something] for [team's] [ambitions]
```

**Full formula:** Team + Action + Matchday Reference + Stakes Claim Without Data

Roughly 45 of 119 captions (38%) fit the four-part formula. Roughly 26 (22%) use the "pressure on" variant. Roughly 20 (17%) use the "N games remaining" variant. These two overlap in about 12 captions.

**Why the template forms:** The caption prompt says "Focus on what the result means: the opponent's standing, the stage of the season, the matchday number, anything the score implies about momentum or stakes." The word *stakes* invites stakes claims. The phrase *stage of the season* invites countdown references. Without actual standings data, the model cannot say what the result genuinely means positionally, so it reaches for abstract urgency framing instead.

**What the VOICE.md reference caption looks like:**

> "Arsenal needed seventy-eight minutes to break Brighton down, but Saka's curling finish from the left was worth the wait — their fifth straight league win at home."

Structure: **Specific timing → specific player → specific action → specific record.** No matchday countdown. No "pressure on." Four concrete details. The current template has zero of these.

**Five rhetorical shapes the model is not currently using, with examples:**

1. **What the score required** — describe the game's texture, not its stakes:
   > "Mainz found themselves two goals ahead before the break and spent the second half defending what they had — a St. Pauli side that pulled one back but never truly threatened to change the story."

2. **Scorer as observer** — use the scorer list to note something about the match without attributing a goal:
   > "For a Dortmund side that has run most of its season through Guirassy's 15 goals, a blank afternoon at Gladbach against a well-organised defence is one of the more telling results of matchday 32."

3. **The loser's read** — describe what the result means from the losing team's perspective, factually:
   > "Verona led at half-time and still lost: Juventus collected all three points at home in a match that only started going their way after the break."

4. **Half-time as the whole story** — let the half-time/full-time gap carry the editorial weight:
   > "Betis were two goals clear of Oviedo at the break and won 3–0 — a half from which Oviedo never recovered and had no realistic reason to expect they would."

5. **Scoreline observation without stakes** — treat the scoreline as a fact that speaks for itself:
   > "Six goals shared at Le Havre on matchday 31, with neither side holding a lead for more than a few minutes at a time."

---

## 3. Stakes phrases that require banning or conditioning on standings

These phrases appear in the corpus and are used to imply league position, urgency, or desperation without standings data in the prompt input. They are listed in order of frequency.

### High frequency — add to VOICE_BLOCK explicitly

| Phrase | Where | Count | Problem |
|--------|-------|-------|---------|
| "keeps the pressure on" (any form) | Captions + overviews | 39 | Implied positional stakes |
| "with [N] games/matchdays remaining" as a stakes signal | Captions | ~20 | Countdown as substitute for observation |
| "sends a statement [to X]" | Captions | 5 | Hollow drama — what statement? |
| "a result that does [little/nothing] for [X]'s ambitions" | Captions | 5 | Implies known ambitions = implied position |
| "at this late stage of the season" + stakes claim | Captions | 6 | Always paired with implied urgency |

### Medium frequency — add to league overview and day overview format blocks

| Phrase | Where | Count | Problem |
|--------|-------|-------|---------|
| "needed the points" | Overviews | 3 | Direct standings inference |
| "can ill afford" | Captions + overviews | 4 | Direct stakes inference |
| "fighting to stay in the division" | Overviews | 3 | Relegation inference without data |
| "relegation picture" | Overviews | 4 | Positional claim |
| "survival" (in any stakes context) | Overviews | 5 | Positional claim |
| "a six-pointer" | Overviews | 1 | Explicit positional framing |
| "leaves [team] with little time/room to recover" | Captions + overviews | 4 | Stakes inference |
| "the kind of result that can reshape [title race / relegation battle]" | Day overviews | 2 | Double-stakes inflation without data |

### VOICE.md has explicit bans on:

> "must-win, do-or-die, season on the line, turning point, arguably, perhaps"

The phrases above are not on this list but operate on exactly the same mechanism: they substitute urgency language for specific observation. The fix is to extend the ban list in the VOICE_BLOCK to cover the pressure-on family and the stakes-without-data family.

---

## 4. Proposed prompt diffs

Three surgical changes to `src/editorial/prompts.ts`. No structural changes to the pipeline or schema.

### Diff 1 — VOICE_BLOCK: extend the don't list and add a data-boundary rule

**Current (lines 82–86 of prompts.ts):**
```
✗ Do not use: amazing, incredible, unbelievable, stunning, shocking
✗ Do not use: must-win, do-or-die, season on the line, turning point, arguably, perhaps
```

**Replace with:**
```
✗ Do not use: amazing, incredible, unbelievable, stunning, shocking
✗ Do not use: must-win, do-or-die, season on the line, turning point, arguably, perhaps
✗ Do not use: keeps/keeping the pressure on, sends a statement, little time to recover,
  can ill afford, needed the points, or any phrase that implies a team's league position,
  urgency, or desperation — you do not have standings data, so you cannot know.
✗ Do not use countdowns as a substitute for observation: "with N games remaining" and
  "this late in the season" are filler when there is nothing else to say. If you have
  nothing specific to observe about the match, write a shorter sentence, not a vaguer one.
```

**Rationale:** The first ban targets the high-frequency cliché family. The second addresses the structural problem: the model uses countdown language when it has run out of real observations. Naming this explicitly is more effective than just banning individual phrases, because the model can generate infinite variants of the same template.

---

### Diff 2 — Caption format block: replace the stakes invitation with specific guidance and 5 example shapes

**Current (lines 246–253 of prompts.ts):**
```
FORMAT: MATCH CAPTION
One sentence, 15–25 words. Appears directly below the scoreline on the Tabela page.

Guidelines:
- Do not restate the score — it is already displayed above the caption.
- Do not describe how goals were scored (you do not have that data).
- Focus on what the result means: the opponent's standing, the stage of the season,
  the matchday number, anything the score implies about momentum or stakes.
- You may reference a player from the season scorer list as a league-level narrative
  thread (e.g. "the league's leading scorer is now on a team that...") but NEVER
  attribute a goal from this match to any specific player.
```

**Replace with:**
```
FORMAT: MATCH CAPTION
One sentence, 15–25 words. Appears directly below the scoreline on the Tabela page.

Guidelines:
- Do not restate the score — it is already displayed above the caption.
- Do not describe how goals were scored (you do not have that data).
- Do not claim what the result "means" for a team's position, urgency, or survival —
  you do not have standings data. The caption must be grounded in what the data shows:
  the score, the half-time score, the matchday number, the opponent.
- You may reference a player from the season scorer list as a league-level narrative
  thread, but NEVER attribute a goal from this match to any specific player.

What to observe instead of stakes:
  • What did the half-time score tell us? A 3–0 half-time lead is different from 1–0.
  • What does the scoreline say about the losing team's day?
  • What does a scorer's season total suggest about what the result cost their opponents?
  • What was unusual about the scoreline (high-scoring draw, comeback, clean sheet)?

Five shapes a caption can take — pick the one that fits the data:

  1. What the score required:
     "Mainz found themselves two goals clear before the break and spent the second half
      defending — St. Pauli pulled one back but could not find the second."

  2. Scorer as context, not as goalscorer:
     "For a Dortmund side that has run much of its season through Guirassy's 15 goals,
      a blank afternoon at Gladbach against a well-organised defence says something."

  3. The loser's read:
     "Verona led at half-time on matchday 35 and still lost — Juventus took three points
      from a game that only started going their way after the interval."

  4. Half-time as the story:
     "Betis were two goals clear of Oviedo before the break and won 3–0 — an afternoon
      Oviedo had little answer to from the first whistle."

  5. Scoreline observation:
     "Six goals shared at Le Havre on matchday 31, with neither side holding a lead for
      more than a few minutes at a time."

BAD examples — do not write captions like these:
  ✗ "Bayern's win keeps the pressure on at the top with three games remaining." — no
    standings data; "pressure on" is a cliché; countdown is filler.
  ✗ "Arsenal's Matchday 34 result sends a statement to the chasing pack." — hollow;
    what statement? What pack? The reader knows as little as you do.
  ✗ "Rayo Vallecano left Getafe with nothing on Matchday 34, a comfortable away win
    with four games of the season remaining." — describes what the loser didn't get,
    then uses a countdown to signal importance it cannot demonstrate.
```

**Rationale:** The current guideline tells the model to focus on "momentum or stakes" — which is exactly the invitation the model accepts to produce the template. Replacing it with specific observational shapes gives the model five concrete escape routes that do not require standings data.

---

### Diff 3 — League overview and day overview format blocks: add explicit no-urgency-inference rule

**Current league overview format block (lines 325–338 of prompts.ts):**
```
Guidelines:
- Find the story connecting the results — contrasts, patterns, what the day means
  for teams at the top and bottom of an imagined table.
- Synthesise; do not catalogue. A reader who saw the scores should still learn something.
- Do not open with a list of results — they appear above this text.
- Do not reference league table positions or points gaps (standings data not available).
- Do not invent goalscorers, match events, or stats. Write from scores, opponents,
  matchday numbers, and the seasonal scorer context.
```

**Replace with:**
```
Guidelines:
- Find the story connecting the results — contrasts, patterns, what the scores collectively
  say about how the day played out.
- Synthesise; do not catalogue. A reader who saw the scores should still learn something.
- Do not open with a list of results — they appear above this text.
- Do not reference league table positions, points gaps, or urgency — standings data is
  not available. This means: do not say a team "needed the points", "can ill afford" a
  result, is "fighting to stay up", or was under "survival" pressure. You do not know
  where they stand. If the data does not say it, you cannot imply it.
- Do not invent goalscorers, match events, or stats. Write from scores, opponents,
  matchday numbers, and the seasonal scorer context.
```

**Current day overview format block (lines 378–391 of prompts.ts):**
```
Guidelines:
- Select the two or three results that mattered most across the five leagues.
  You do not need to mention every league that played.
- Find threads: parallel title races, contrasting relegation pictures, big results
  that shift the week's narrative.
- A reader who only reads this should understand what today meant for European football.
- Do not reference league table positions or points gaps (standings data not available).
- Do not invent goalscorers or match events. Write from scores, teams, and matchday numbers.
```

**Replace with:**
```
Guidelines:
- Select the two or three results that mattered most across the five leagues.
  You do not need to mention every league that played.
- Find threads: patterns in how the day went across leagues — not assertions about
  what the results will do to league tables you cannot see.
- A reader who only reads this should understand how European football played out today,
  not receive urgency framing that you cannot support with data.
- Do not reference league table positions, points gaps, title-race consequences, or
  relegation battles unless the data you have explicitly states a team's position.
  "Needs to win", "cannot afford to drop points", "could prove decisive in the title
  race" — none of these are available to you without standings. Omit them.
- Do not invent goalscorers or match events. Write from scores, teams, and matchday numbers.
```

**Rationale for Diff 3:** The current day overview prompt explicitly tells the model to "find threads: parallel title races, contrasting relegation pictures" — which directly invites the urgency framing without data. The word "relegation" should not be in a prompt that doesn't receive relegation data.

---

## 5. Evaluation step

After applying the three diffs, regenerate editorials for these three dates which already have match data in the DB and represent different patterns:

| Date | Why |
|------|-----|
| **2026-04-25** | 5 leagues with matches; produced the highest concentration of "pressure on" captions (10 in a single day) |
| **2026-04-19** | First date in the backfill; BL1 day with only 3 matches where captions still produced 3 "pressure on" instances |
| **2026-05-03** | Most recent complete matchday; all 5 leagues; includes the BL1 overview that contained "needed the points" and "relegation picture" |

**How to run the re-generation:**

```bash
pnpm exec tsx --env-file=.env.local scripts/backfill.ts -- --from 2026-04-25 --to 2026-04-25
pnpm exec tsx --env-file=.env.local scripts/backfill.ts -- --from 2026-04-19 --to 2026-04-19
pnpm exec tsx --env-file=.env.local scripts/backfill.ts -- --from 2026-05-03 --to 2026-05-03
```

(Each run will upsert existing editorials with the new prompt output.)

**Pass criteria (query after each run):**

```sql
-- Check for "pressure on" variants:
SELECT count(*) FROM editorials
WHERE date IN ('2026-04-25', '2026-04-19', '2026-05-03')
  AND (body ILIKE '%pressure on%' OR body ILIKE '%pressure firmly%');

-- Check for "N games/matchdays remaining" as standalone stakes:
SELECT slug, league_code, date, body FROM editorials
WHERE date IN ('2026-04-25', '2026-04-19', '2026-05-03')
  AND kind = 'match_caption'
  AND body ~ 'with \d+ (games|matchdays) (remaining|left)';

-- Check for stakes phrases:
SELECT slug, league_code, date, LEFT(body, 100) FROM editorials
WHERE date IN ('2026-04-25', '2026-04-19', '2026-05-03')
  AND (body ILIKE '%needed the points%'
    OR body ILIKE '%can ill afford%'
    OR body ILIKE '%sends a statement%'
    OR body ILIKE '%fighting to stay%'
    OR body ILIKE '%survival%'
    OR body ILIKE '%relegation picture%');
```

**Pass threshold:**
- "pressure on" variants: ≤ 2 across the three dates combined (was 26 in the full 119-caption corpus; proportional target for these 3 high-exposure dates is ≤ 2)
- "N games/matchdays remaining" as terminal stakes clause: ≤ 3
- Named stakes phrases (needed the points, can ill afford, sends a statement, fighting to stay, survival, relegation picture): 0

**Fail handling:** If any count exceeds the threshold, re-read the prompt diff and check whether the banned phrase list was correctly applied. Do not regenerate a second time without diagnosing which specific guideline the model is still violating.

---

*This document proposes changes only. No files have been modified. Awaiting approval before touching `src/editorial/prompts.ts`.*
