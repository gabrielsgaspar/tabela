# HISTORY_TEST_REPORT_RERUN.md — Phase 3.5 Eval (Rerun with refined prompt)

Generated: 2026-05-05T17:16:35.945Z
Test editorials: 31 pairs across 7 dates

## Executive Summary

**Overall: ❌ FAIL**

| Criterion | Threshold | Actual | Result |
|---|---|---|---|
| (a) No invented facts | Zero tolerance | 1 horizon violation(s) | ❌ FAIL |
| (b) No horizon violations | Zero tolerance | 1 violation(s) | ❌ FAIL |
| (c) Calibrated use (≤1 failure) | ≤1 calibration failure | 8 failure(s) | ❌ FAIL |
| (d) Enrichment ≥60% | ≥60% recognisably richer | 58% (18/31) | ❌ FAIL |

## Test Set Overview

| Date | League | Pattern | Matches | With history ref | Horizon violations |
|---|---|---|---|---|---|
| 2024-08-24 | PL | control | 7 | 2/7 | 0 |
| 2024-12-28 | SA | streak | 4 | 4/4 | 0 |
| 2025-04-19 | FL1 | streak | 3 | 3/3 | 0 |
| 2025-09-27 | PD | streak | 4 | 2/4 | 0 |
| 2025-11-01 | BL1 | streak | 6 | 6/6 | 0 |
| 2025-12-30 | PL | streak | 6 | 5/6 | 1 |
| 2026-04-03 | FL1 | h2h | 1 | 1/1 | 0 |

## Statistics

- Total match pairs generated: **31**
- Matches with striking history: **23** (74%)
- LIKELY_PASS (striking + history ref detected): **18**
- NEUTRAL (no striking history, no over-use): **4**
- POTENTIAL_FAIL_NO_USE: **4** PL/Crystal Palace 0–2 West Ham, PL/Man City 4–1 Ipswich Town, PL/Tottenham 4–0 Everton, PL/Nottingham 0–2 Everton
- POTENTIAL_FAIL_OVER_USE: **4** SA/Empoli 1–2 Genoa, FL1/Monaco 0–0 Strasbourg, BL1/Union Berlin 0–0 Freiburg, BL1/Heidenheim 1–1 Frankfurt
- FAIL_HORIZON: **1**
- Enrichment rate (LIKELY_PASS / total): **58%** (threshold: 60%)

## Calibration Failure Log

### PL / Chelsea 2–2 Bournemouth — FAIL_HORIZON

**Horizon violations:**
- Multi-season superlative (dataset covers only 2 seasons)
**Enriched:** "A fourth meeting between these sides producing no winner — Chelsea and Bournemouth have now drawn twice and split the remaining two across three seasons."
**Control:** "Chelsea and Bournemouth shared the points on matchday 19, a draw that neither side managed to turn into a win despite level terms at Stamford Bridge."

### PL / Crystal Palace 0–2 West Ham — POTENTIAL_FAIL_NO_USE

**Striking history was available but enriched caption shows no history reference.**
Striking reasons: home no wins in dataset, away no wins in dataset
**Enriched:** "Two sides without a point between them on matchday two — West Ham took all three, while Crystal Palace are still looking for their first."
**Control:** "West Ham took three points at Selhurst Park on matchday 2, with Crystal Palace offering no route back into a game they never led."

### PL / Man City 4–1 Ipswich Town — POTENTIAL_FAIL_NO_USE

**Striking history was available but enriched caption shows no history reference.**
Striking reasons: away no wins in dataset
**Enriched:** "Ipswich have now conceded six goals across their opening two Premier League matches, against Liverpool and Man City."
**Control:** "Ipswich Town's afternoon at the Etihad on matchday 2 ended in a four-goal defeat, a scoreline that left no ambiguity about the distance between the two sides."

### PL / Tottenham 4–0 Everton — POTENTIAL_FAIL_NO_USE

**Striking history was available but enriched caption shows no history reference.**
Striking reasons: home no wins in dataset, away no wins in dataset
**Enriched:** "Everton have now conceded seven goals across their opening two league matches, against Brighton and Tottenham."
**Control:** "Everton left White Hart Lane on matchday 2 with nothing — Tottenham's four-goal margin made the afternoon's one-sidedness impossible to dispute."

### PL / Nottingham 0–2 Everton — POTENTIAL_FAIL_NO_USE

**Striking history was available but enriched caption shows no history reference.**
Striking reasons: H2H: 3 prior meetings in dataset
**Enriched:** "Everton's second win over Nottingham this season, both by a margin of two goals or more, completing a league double over the same opponent."
**Control:** "Everton took all three points at Nottingham on matchday 19, a clean sheet away from home the sharper measure of their afternoon's work."

### SA / Empoli 1–2 Genoa — POTENTIAL_FAIL_OVER_USE

**No striking history but enriched caption appears to reference historical context.**
**Enriched:** "Genoa's three points end a run of four matches without a win, at the expense of an Empoli side that has now lost three of their last five."
**Control:** "Genoa took three points from Empoli on matchday 18, a win that only the final scoreline separates from a more comfortable afternoon for the visitors."

### FL1 / Monaco 0–0 Strasbourg — POTENTIAL_FAIL_OVER_USE

**No striking history but enriched caption appears to reference historical context.**
**Enriched:** "Strasbourg took a point from Monaco, who had put three past them at the Stade de la Meinau back in November."
**Control:** "Monaco and Strasbourg shared nothing on matchday 30 — a blank scoresheet that suited neither side at the Stade Louis II."

### BL1 / Union Berlin 0–0 Freiburg — POTENTIAL_FAIL_OVER_USE

**No striking history but enriched caption appears to reference historical context.**
**Enriched:** "Freiburg's last clean sheet away from home came in September — this goalless draw at Union Berlin extends that wait no further."
**Control:** "Union Berlin and Freiburg played out a goalless draw on matchday 9, a stalemate that neither side found a way to break across the full ninety minutes."

### BL1 / Heidenheim 1–1 Frankfurt — POTENTIAL_FAIL_OVER_USE

**No striking history but enriched caption appears to reference historical context.**
**Enriched:** "Heidenheim held Frankfurt to a draw on matchday 9, denying a side that had put seven past them across their two previous meetings this calendar year."
**Control:** "Heidenheim and Frankfurt shared the points on matchday 9, a draw that left both sides unable to find a winning goal across the full ninety minutes."

## Detailed Results by Date

### 2024-08-24 [PL] — Premier League

**Test rationale:** Control — Matchday 2. Teams have played at most 1 prior match. No meaningful streaks possible. Tests that enriched captions do NOT over-use history when nothing is striking.
**Pattern type:** control
**Matches generated:** 7

#### Aston Villa 0–2 Arsenal (matchday 2) — · NEUTRAL

**Team history injected:**
- Home (Aston Villa FC): W×1 (1 consecutive wins since 2024-08-17); last win 2024-08-17 vs West Ham 2-1
- Away (Arsenal FC): W×1 (1 consecutive wins since 2024-08-17); last win 2024-08-17 vs Wolverhampton 2-0
- Home season: 2024-25: P1 W1 D0 L0 | 3 pts
- Away season: 2024-25: P1 W1 D0 L0 | 3 pts
- H2H: no prior meetings in dataset
- Striking history: **NO**

**Control (no history):**
> "Arsenal left Villa Park with a clean sheet on matchday 2 — Aston Villa created nothing the scoreline did not already make plain."

**With history (hist_v1):**
> "Arsenal kept Aston Villa scoreless at Villa Park on matchday two, backing up their opening-day clean sheet against Wolverhampton."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Brighton Hove 2–1 Man United (matchday 2) — · NEUTRAL

**Team history injected:**
- Home (Brighton & Hove Albion FC): W×1 (1 consecutive wins since 2024-08-17); last win 2024-08-17 vs Everton 3-0
- Away (Manchester United FC): W×1 (1 consecutive wins since 2024-08-16); last win 2024-08-16 vs Fulham 1-0
- Home season: 2024-25: P1 W1 D0 L0 | 3 pts
- Away season: 2024-25: P1 W1 D0 L0 | 3 pts
- H2H: no prior meetings in dataset
- Striking history: **NO**

**Control (no history):**
> "Brighton made it two wins from two on matchday 2, with Man United leaving the Amex having given up the lead they could not hold."

**With history (hist_v1):**
> "Brighton handed Man United their first defeat of the season, taking three points from a side that had kept a clean sheet on matchday one."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Crystal Palace 0–2 West Ham (matchday 2) — ⚠ POTENTIAL FAIL (no use)

**Team history injected:**
- Home (Crystal Palace FC): L×1 (1 consecutive losses since 2024-08-18); no wins in dataset
- Away (West Ham United FC): L×1 (1 consecutive losses since 2024-08-17); no wins in dataset
- Home season: 2024-25: P1 W0 D0 L1 | 0 pts
- Away season: 2024-25: P1 W0 D0 L1 | 0 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — home no wins in dataset, away no wins in dataset

**Control (no history):**
> "West Ham took three points at Selhurst Park on matchday 2, with Crystal Palace offering no route back into a game they never led."

**With history (hist_v1):**
> "Two sides without a point between them on matchday two — West Ham took all three, while Crystal Palace are still looking for their first."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Fulham 2–1 Leicester City (matchday 2) — ✓ LIKELY PASS

**Team history injected:**
- Home (Fulham FC): L×1 (1 consecutive losses since 2024-08-16); no wins in dataset
- Away (Leicester City FC): D×1 (1 consecutive draws since 2024-08-19); no wins in dataset
- Home season: 2024-25: P1 W0 D0 L1 | 0 pts
- Away season: 2024-25: P1 W0 D1 L0 | 1 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — home no wins in dataset, away no wins in dataset

**Control (no history):**
> "Fulham beat Leicester City at Craven Cottage on matchday 2, with the Foxes unable to find an equaliser after pulling one back."

**With history (hist_v1):**
> "Fulham's first points of the season came against a Leicester side still searching for their first win back in the top flight."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Man City 4–1 Ipswich Town (matchday 2) — ⚠ POTENTIAL FAIL (no use)

**Team history injected:**
- Home (Manchester City FC): W×1 (1 consecutive wins since 2024-08-18); last win 2024-08-18 vs Chelsea 2-0
- Away (Ipswich Town FC): L×1 (1 consecutive losses since 2024-08-17); no wins in dataset
- Home season: 2024-25: P1 W1 D0 L0 | 3 pts
- Away season: 2024-25: P1 W0 D0 L1 | 0 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — away no wins in dataset

**Control (no history):**
> "Ipswich Town's afternoon at the Etihad on matchday 2 ended in a four-goal defeat, a scoreline that left no ambiguity about the distance between the two sides."

**With history (hist_v1):**
> "Ipswich have now conceded six goals across their opening two Premier League matches, against Liverpool and Man City."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Southampton 0–1 Nottingham (matchday 2) — ✓ LIKELY PASS

**Team history injected:**
- Home (Southampton FC): L×1 (1 consecutive losses since 2024-08-17); no wins in dataset
- Away (Nottingham Forest FC): D×1 (1 consecutive draws since 2024-08-17); no wins in dataset
- Home season: 2024-25: P1 W0 D0 L1 | 0 pts
- Away season: 2024-25: P1 W0 D1 L0 | 1 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — home no wins in dataset, away no wins in dataset

**Control (no history):**
> "Nottingham Forest took all three points at St Mary's on matchday 2, with Southampton unable to find a way through a defence that kept its clean sheet intact."

**With history (hist_v1):**
> "Nottingham took their first win of the season at Southampton, who are yet to score across their opening two matches."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Tottenham 4–0 Everton (matchday 2) — ⚠ POTENTIAL FAIL (no use)

**Team history injected:**
- Home (Tottenham Hotspur FC): D×1 (1 consecutive draws since 2024-08-19); no wins in dataset
- Away (Everton FC): L×1 (1 consecutive losses since 2024-08-17); no wins in dataset
- Home season: 2024-25: P1 W0 D1 L0 | 1 pts
- Away season: 2024-25: P1 W0 D0 L1 | 0 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — home no wins in dataset, away no wins in dataset

**Control (no history):**
> "Everton left White Hart Lane on matchday 2 with nothing — Tottenham's four-goal margin made the afternoon's one-sidedness impossible to dispute."

**With history (hist_v1):**
> "Everton have now conceded seven goals across their opening two league matches, against Brighton and Tottenham."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2024-12-28 [SA] — Serie A

**Test rationale:** Atalanta entering with W×11 — the longest winning streak in the dataset. Atalanta vs Lazio ended 1-1 (streak broken). Lazio vs Verona also has H2H 4W-0L. Rich SA day for history.
**Pattern type:** streak
**Matches generated:** 4

#### Cagliari 0–3 Inter (matchday 18) — ✓ LIKELY PASS

**Team history injected:**
- Home (Cagliari Calcio): L×3 (3 consecutive losses since 2024-12-08); last win 2024-11-29 vs Verona 1-0
- Away (FC Internazionale Milano): W×4 (4 consecutive wins since 2024-11-23); last win 2024-12-23 vs Como 1907 2-0
- Home season: 2024-25: P17 W3 D5 L9 | 14 pts
- Away season: 2024-25: P16 W11 D4 L1 | 37 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — away W×4

**Control (no history):**
> "Inter left Cagliari without a foothold on matchday 18, winning by three goals on an afternoon the hosts never threatened to shape."

**With history (hist_v1):**
> "Inter's fourth consecutive win, and Cagliari — who had not kept a clean sheet since late November — were given no reason to end that run."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Empoli 1–2 Genoa (matchday 18) — ⚠ POTENTIAL FAIL (over-use)

**Team history injected:**
- Home (Empoli FC): L×2 (2 consecutive losses since 2024-12-13); last win 2024-12-08 vs Verona 4-1
- Away (Genoa CFC): L×1 (1 consecutive losses since 2024-12-21); last win 2024-12-01 vs Udinese 2-0
- Home season: 2024-25: P17 W4 D7 L6 | 19 pts
- Away season: 2024-25: P17 W3 D7 L7 | 16 pts
- H2H: no prior meetings in dataset
- Striking history: **NO**

**Control (no history):**
> "Genoa took three points from Empoli on matchday 18, a win that only the final scoreline separates from a more comfortable afternoon for the visitors."

**With history (hist_v1):**
> "Genoa's three points end a run of four matches without a win, at the expense of an Empoli side that has now lost three of their last five."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Lazio 1–1 Atalanta (matchday 18) — ✓ LIKELY PASS

**Team history injected:**
- Home (SS Lazio): W×1 (1 consecutive wins since 2024-12-21); last win 2024-12-21 vs Lecce 2-1
- Away (Atalanta BC): W×11 (11 consecutive wins since 2024-10-05); last win 2024-12-22 vs Empoli 3-2
- Home season: 2024-25: P17 W11 D1 L5 | 34 pts
- Away season: 2024-25: P17 W13 D1 L3 | 40 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — away W×11

**Control (no history):**
> "Lazio and Atalanta shared the points on matchday 18, a draw that neither side could turn into a win across ninety minutes."

**With history (hist_v1):**
> "Atalanta's eleven-match winning run ends at the Olimpico, held by a Lazio side that gave them nothing to work with."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Parma 2–1 Monza (matchday 18) — ✓ LIKELY PASS

**Team history injected:**
- Home (Parma Calcio 1913): L×3 (3 consecutive losses since 2024-12-06); last win 2024-12-01 vs Lazio 3-1
- Away (AC Monza): L×3 (3 consecutive losses since 2024-12-09); last win 2024-10-21 vs Verona 3-0
- Home season: 2024-25: P17 W3 D6 L8 | 15 pts
- Away season: 2024-25: P17 W1 D7 L9 | 10 pts
- H2H: no prior meetings in dataset
- Striking history: **YES** — away 68d since last win

**Control (no history):**
> "Parma beat Monza on matchday 18, a single goal the margin between two sides who both found the net at the Tardini."

**With history (hist_v1):**
> "Parma end a run of three consecutive defeats, while Monza's last win on the road dates back to late October."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2025-04-19 [FL1] — Ligue 1

**Test rationale:** Two simultaneous massive streaks in Ligue 1: Montpellier L×9 (lost 1-5 vs Marseille) and PSG W×9 (won 2-1 vs Le Havre). Tests multi-team streak detection on the same day.
**Pattern type:** streak
**Matches generated:** 3

#### PSG 2–1 Le Havre (matchday 30) — ✓ LIKELY PASS

**Team history injected:**
- Home (Paris Saint-Germain FC): W×9 (9 consecutive wins since 2025-02-01); last win 2025-04-05 vs Angers SCO 1-0
- Away (Le Havre AC): L×1 (1 consecutive losses since 2025-04-13); last win 2025-04-06 vs Montpellier 2-0
- Home season: 2024-25: P28 W23 D5 L0 | 74 pts
- Away season: 2024-25: P29 W8 D3 L18 | 27 pts
- H2H: 1 prior meetings: 2024-08-16 Le Havre AC 1-4 Paris Saint-Germain FC
- Striking history: **YES** — home W×9

**Control (no history):**
> "PSG took three points from Le Havre on matchday 30, a one-goal margin that tells of a closer afternoon than the hosts might have wanted."

**With history (hist_v1):**
> "PSG's ninth consecutive win — Le Havre, who had beaten Montpellier and Nantes in their previous two away trips, found the Parc des Princes a different proposition entirely."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Marseille 5–1 Montpellier (matchday 30) — ✓ LIKELY PASS

**Team history injected:**
- Home (Olympique de Marseille): L×1 (1 consecutive losses since 2025-04-12); last win 2025-04-06 vs Toulouse 3-2
- Away (Montpellier HSC): L×9 (9 consecutive losses since 2025-01-31); last win 2025-01-26 vs Toulouse 2-1
- Home season: 2024-25: P29 W16 D4 L9 | 52 pts
- Away season: 2024-25: P28 W4 D3 L21 | 15 pts
- H2H: 1 prior meetings: 2024-10-20 Montpellier HSC 0-5 Olympique de Marseille
- Striking history: **YES** — away L×9, away 83d since last win

**Control (no history):**
> "Montpellier arrived at the Vélodrome on matchday 30 and left having conceded five — an afternoon that was never going to be theirs."

**With history (hist_v1):**
> "Montpellier's ninth consecutive defeat, and a team now 22 goals conceded without reply across their last five matches."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Monaco 0–0 Strasbourg (matchday 30) — ⚠ POTENTIAL FAIL (over-use)

**Team history injected:**
- Home (AS Monaco FC): W×1 (1 consecutive wins since 2025-04-12); last win 2025-04-12 vs Marseille 3-0
- Away (RC Strasbourg Alsace): D×1 (1 consecutive draws since 2025-04-12); last win 2025-04-06 vs Stade de Reims 1-0
- Home season: 2024-25: P29 W16 D5 L8 | 53 pts
- Away season: 2024-25: P29 W14 D8 L7 | 50 pts
- H2H: 1 prior meetings: 2024-11-09 RC Strasbourg Alsace 1-3 AS Monaco FC
- Striking history: **NO**

**Control (no history):**
> "Monaco and Strasbourg shared nothing on matchday 30 — a blank scoresheet that suited neither side at the Stade Louis II."

**With history (hist_v1):**
> "Strasbourg took a point from Monaco, who had put three past them at the Stade de la Meinau back in November."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2025-09-27 [PD] — La Liga

**Test rationale:** Real Madrid entering with W×9, then lost 2-5 to Atletico in the Derbi Madrileño. Dramatic end to a dominant run — tests whether the model grounds the upset in historical context.
**Pattern type:** streak
**Matches generated:** 4

#### Atleti 5–2 Real Madrid (matchday 7) — ✓ LIKELY PASS

**Team history injected:**
- Home (Club Atlético de Madrid): W×1 (1 consecutive wins since 2025-09-24); last win 2025-09-24 vs Rayo Vallecano 3-2
- Away (Real Madrid CF): W×9 (9 consecutive wins since 2025-05-14); last win 2025-09-23 vs Levante 4-1
- Home season: 2025-26: P6 W2 D3 L1 | 9 pts
- Away season: 2025-26: P6 W6 D0 L0 | 18 pts
- H2H: 2 prior meetings: 2025-02-08 Real Madrid CF 1-1 Club Atlético de Madrid; 2024-09-29 Club Atlético de Madrid 1-1 Real Madrid CF
- Striking history: **YES** — away W×9

**Control (no history):**
> "Atleti put five past Real Madrid on matchday 7, a scoreline that tells its own story about how the derby unfolded."

**With history (hist_v1):**
> "Atleti ended Real Madrid's nine-game winning run with a performance that left no doubt about the result long before the final whistle."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Getafe 1–1 Levante (matchday 7) — · NEUTRAL

**Team history injected:**
- Home (Getafe CF): D×1 (1 consecutive draws since 2025-09-24); last win 2025-09-13 vs Real Oviedo 2-0
- Away (Levante UD): L×1 (1 consecutive losses since 2025-09-23); last win 2025-09-20 vs Girona 4-0
- Home season: 2025-26: P6 W3 D1 L2 | 10 pts
- Away season: 2025-26: P6 W1 D1 L4 | 4 pts
- H2H: no prior meetings in dataset
- Striking history: **NO**

**Control (no history):**
> "Getafe and Levante shared the points on matchday 7, a draw that neither side managed to turn into a win."

**With history (hist_v1):**
> "Levante took a point from Getafe on matchday 7, a team that had beaten Girona 4–0 just a week earlier."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Mallorca 1–0 Alavés (matchday 7) — ✓ LIKELY PASS

**Team history injected:**
- Home (RCD Mallorca): L×1 (1 consecutive losses since 2025-09-24); last win 2025-05-10 vs Valladolid 2-1
- Away (Deportivo Alavés): D×1 (1 consecutive draws since 2025-09-24); last win 2025-09-13 vs Athletic 1-0
- Home season: 2025-26: P6 W0 D2 L4 | 2 pts
- Away season: 2025-26: P6 W2 D2 L2 | 8 pts
- H2H: 2 prior meetings: 2025-03-02 RCD Mallorca 1-1 Deportivo Alavés; 2024-11-01 Deportivo Alavés 1-0 RCD Mallorca
- Striking history: **YES** — home 140d since last win

**Control (no history):**
> "Mallorca took three points from Alavés on matchday 7, a shutout that gave the visitors nothing to work with all afternoon."

**With history (hist_v1):**
> "Mallorca's first win since May came against Alavés, who arrived in Palma having lost just once in their previous five league outings."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Villarreal 1–0 Athletic (matchday 7) — · NEUTRAL

**Team history injected:**
- Home (Villarreal CF): W×2 (2 consecutive wins since 2025-09-20); last win 2025-09-23 vs Sevilla FC 2-1
- Away (Athletic Club): D×1 (1 consecutive draws since 2025-09-23); last win 2025-08-31 vs Real Betis 2-1
- Home season: 2025-26: P6 W4 D1 L1 | 13 pts
- Away season: 2025-26: P6 W3 D1 L2 | 10 pts
- H2H: 2 prior meetings: 2025-04-06 Villarreal CF 0-0 Athletic Club; 2024-12-08 Athletic Club 2-0 Villarreal CF
- Striking history: **NO**

**Control (no history):**
> "Athletic left the Estadio de la Cerámica with nothing on matchday 7, a single goal enough to separate the two sides across ninety minutes."

**With history (hist_v1):**
> "Villarreal's last clean sheet before today came on matchday 1; Athletic gave them nothing to defend against in north London."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2025-11-01 [BL1] — Bundesliga

**Test rationale:** Bayern W×10 at home to Leverkusen (won 3-0). Bayern vs Stuttgart H2H is 4W-0L (Stuttgart also plays this weekend). Tests sustained dominant form narrative.
**Pattern type:** streak
**Matches generated:** 6

#### Bayern 3–0 Leverkusen (matchday 9) — ✓ LIKELY PASS

**Team history injected:**
- Home (FC Bayern München): W×10 (10 consecutive wins since 2025-05-10); last win 2025-10-25 vs M'gladbach 3-0
- Away (Bayer 04 Leverkusen): W×4 (4 consecutive wins since 2025-09-27); last win 2025-10-26 vs Freiburg 2-0
- Home season: 2025-26: P8 W8 D0 L0 | 24 pts
- Away season: 2025-26: P8 W5 D2 L1 | 17 pts
- H2H: 2 prior meetings: 2025-02-15 Bayer 04 Leverkusen 0-0 FC Bayern München; 2024-09-28 FC Bayern München 1-1 Bayer 04 Leverkusen
- Striking history: **YES** — home W×10, away W×4

**Control (no history):**
> "Bayern shut out Leverkusen on matchday 9, a three-goal margin that left the champions with no foothold at any point of the afternoon."

**With history (hist_v1):**
> "Bayern's tenth consecutive win ended Leverkusen's four-match winning run — and it was never a contest."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Mainz 1–1 Bremen (matchday 9) — ✓ LIKELY PASS

**Team history injected:**
- Home (1. FSV Mainz 05): L×4 (4 consecutive losses since 2025-09-27); last win 2025-09-20 vs Augsburg 4-1
- Away (SV Werder Bremen): W×1 (1 consecutive wins since 2025-10-24); last win 2025-10-24 vs Union Berlin 1-0
- Home season: 2025-26: P8 W1 D1 L6 | 4 pts
- Away season: 2025-26: P8 W3 D2 L3 | 11 pts
- H2H: 2 prior meetings: 2025-01-31 SV Werder Bremen 1-0 1. FSV Mainz 05; 2024-09-15 1. FSV Mainz 05 1-2 SV Werder Bremen
- Striking history: **YES** — home L×4

**Control (no history):**
> "Mainz and Bremen shared the points on matchday 9, a draw that neither side managed to turn into something more across ninety minutes."

**With history (hist_v1):**
> "Mainz took a point from their fifth game of a run that has brought them just one win since late September — Bremen could not press their advantage."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### RB Leipzig 3–1 Stuttgart (matchday 9) — ✓ LIKELY PASS

**Team history injected:**
- Home (RB Leipzig): W×2 (2 consecutive wins since 2025-10-18); last win 2025-10-25 vs Augsburg 6-0
- Away (VfB Stuttgart): W×5 (5 consecutive wins since 2025-09-19); last win 2025-10-26 vs Mainz 2-1
- Home season: 2025-26: P8 W6 D1 L1 | 19 pts
- Away season: 2025-26: P8 W6 D0 L2 | 18 pts
- H2H: 2 prior meetings: 2025-05-17 RB Leipzig 2-3 VfB Stuttgart; 2025-01-15 VfB Stuttgart 2-1 RB Leipzig
- Striking history: **YES** — away W×5

**Control (no history):**
> "Stuttgart's afternoon at Leipzig on matchday 9 produced one goal in reply — not enough to unsettle a home side that finished three clear."

**With history (hist_v1):**
> "Stuttgart's five-match winning run ended at Leipzig, who handed them only their second defeat of the season."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Union Berlin 0–0 Freiburg (matchday 9) — ⚠ POTENTIAL FAIL (over-use)

**Team history injected:**
- Home (1. FC Union Berlin): L×1 (1 consecutive losses since 2025-10-24); last win 2025-10-17 vs M'gladbach 3-1
- Away (SC Freiburg): L×1 (1 consecutive losses since 2025-10-26); last win 2025-09-20 vs Bremen 3-0
- Home season: 2025-26: P8 W3 D1 L4 | 10 pts
- Away season: 2025-26: P8 W2 D3 L3 | 9 pts
- H2H: 2 prior meetings: 2025-03-30 SC Freiburg 1-2 1. FC Union Berlin; 2024-11-08 1. FC Union Berlin 0-0 SC Freiburg
- Striking history: **NO**

**Control (no history):**
> "Union Berlin and Freiburg played out a goalless draw on matchday 9, a stalemate that neither side found a way to break across the full ninety minutes."

**With history (hist_v1):**
> "Freiburg's last clean sheet away from home came in September — this goalless draw at Union Berlin extends that wait no further."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### St. Pauli 0–4 M'gladbach (matchday 9) — ✓ LIKELY PASS

**Team history injected:**
- Home (FC St. Pauli 1910): L×5 (5 consecutive losses since 2025-09-19); last win 2025-09-14 vs Augsburg 2-1
- Away (Borussia Mönchengladbach): L×2 (2 consecutive losses since 2025-10-17); last win 2025-03-29 vs RB Leipzig 1-0
- Home season: 2025-26: P8 W2 D1 L5 | 7 pts
- Away season: 2025-26: P8 W0 D3 L5 | 3 pts
- H2H: 2 prior meetings: 2025-04-06 FC St. Pauli 1910 1-1 Borussia Mönchengladbach; 2024-11-24 Borussia Mönchengladbach 2-0 FC St. Pauli 1910
- Striking history: **YES** — home L×5, home 48d since last win, away 217d since last win

**Control (no history):**
> "M'gladbach put four past St. Pauli on matchday 9, an afternoon the hosts found no answer to across the full ninety minutes."

**With history (hist_v1):**
> "A sixth straight defeat for St. Pauli, who have not won since mid-September — M'gladbach's first victory since late March."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Heidenheim 1–1 Frankfurt (matchday 9) — ⚠ POTENTIAL FAIL (over-use)

**Team history injected:**
- Home (1. FC Heidenheim 1846): L×1 (1 consecutive losses since 2025-10-25); last win 2025-09-27 vs Augsburg 2-1
- Away (Eintracht Frankfurt): W×1 (1 consecutive wins since 2025-10-25); last win 2025-10-25 vs St. Pauli 2-0
- Home season: 2025-26: P8 W1 D1 L6 | 4 pts
- Away season: 2025-26: P8 W4 D1 L3 | 13 pts
- H2H: 2 prior meetings: 2025-04-13 Eintracht Frankfurt 3-0 1. FC Heidenheim 1846; 2024-12-01 1. FC Heidenheim 1846 0-4 Eintracht Frankfurt
- Striking history: **NO**

**Control (no history):**
> "Heidenheim and Frankfurt shared the points on matchday 9, a draw that left both sides unable to find a winning goal across the full ninety minutes."

**With history (hist_v1):**
> "Heidenheim held Frankfurt to a draw on matchday 9, denying a side that had put seven past them across their two previous meetings this calendar year."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2025-12-30 [PL] — Premier League

**Test rationale:** Two streak-breaking moments: Wolverhampton L×11 vs Man United (D 1-1, streak ends); Aston Villa W×8 vs Arsenal (L 1-4, streak ends). Tests whether both are captured.
**Pattern type:** streak
**Matches generated:** 6

#### Arsenal 4–1 Aston Villa (matchday 19) — ✓ LIKELY PASS

**Team history injected:**
- Home (Arsenal FC): W×3 (3 consecutive wins since 2025-12-13); last win 2025-12-27 vs Brighton Hove 2-1
- Away (Aston Villa FC): W×8 (8 consecutive wins since 2025-11-09); last win 2025-12-27 vs Chelsea 2-1
- Home season: 2025-26: P18 W13 D3 L2 | 42 pts
- Away season: 2025-26: P18 W12 D3 L3 | 39 pts
- H2H: 3 prior meetings: 2025-12-06 Aston Villa FC 2-1 Arsenal FC; 2025-01-18 Arsenal FC 2-2 Aston Villa FC; 2024-08-24 Aston Villa FC 0-2 Arsenal FC
- Striking history: **YES** — away W×8, H2H: 3 prior meetings in dataset

**Control (no history):**
> "Arsenal put four past Aston Villa on matchday 19, a margin that left the visitors with little to show for a long afternoon at the Emirates."

**With history (hist_v1):**
> "Arsenal ended Aston Villa's eight-game winning run, a streak that had included a reverse fixture victory over this same opponent earlier in the season."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Burnley 1–3 Newcastle (matchday 19) — ✓ LIKELY PASS

**Team history injected:**
- Home (Burnley FC): D×2 (2 consecutive draws since 2025-12-20); last win 2025-10-26 vs Wolverhampton 3-2
- Away (Newcastle United FC): L×1 (1 consecutive losses since 2025-12-26); last win 2025-12-06 vs Burnley 2-1
- Home season: 2025-26: P18 W3 D3 L12 | 12 pts
- Away season: 2025-26: P18 W6 D5 L7 | 23 pts
- H2H: 1 prior meetings: 2025-12-06 Newcastle United FC 2-1 Burnley FC
- Striking history: **YES** — home 65d since last win

**Control (no history):**
> "Newcastle took three points at Burnley on matchday 19, a two-goal winning margin that Burnley's single reply never looked like closing."

**With history (hist_v1):**
> "Newcastle's second win over Burnley in less than a month, their third points of the season at any ground against a side they have now beaten twice."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Chelsea 2–2 Bournemouth (matchday 19) — ✗ FAIL (horizon)

**Team history injected:**
- Home (Chelsea FC): L×1 (1 consecutive losses since 2025-12-27); last win 2025-12-13 vs Everton 2-0
- Away (AFC Bournemouth): L×1 (1 consecutive losses since 2025-12-27); last win 2025-10-26 vs Nottingham 2-0
- Home season: 2025-26: P18 W8 D5 L5 | 29 pts
- Away season: 2025-26: P18 W5 D7 L6 | 22 pts
- H2H: 3 prior meetings: 2025-12-06 AFC Bournemouth 0-0 Chelsea FC; 2025-01-14 Chelsea FC 2-2 AFC Bournemouth; 2024-09-14 AFC Bournemouth 0-1 Chelsea FC
- Striking history: **YES** — away 65d since last win, H2H: 3 prior meetings in dataset

**Control (no history):**
> "Chelsea and Bournemouth shared the points on matchday 19, a draw that neither side managed to turn into a win despite level terms at Stamford Bridge."

**With history (hist_v1):**
> "A fourth meeting between these sides producing no winner — Chelsea and Bournemouth have now drawn twice and split the remaining two across three seasons."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- ⚠ Horizon violations: Multi-season superlative (dataset covers only 2 seasons)

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Man United 1–1 Wolverhampton (matchday 19) — ✓ LIKELY PASS

**Team history injected:**
- Home (Manchester United FC): W×1 (1 consecutive wins since 2025-12-26); last win 2025-12-26 vs Newcastle 1-0
- Away (Wolverhampton Wanderers FC): L×11 (11 consecutive losses since 2025-10-18); last win 2025-04-26 vs Leicester City 3-0
- Home season: 2025-26: P18 W8 D5 L5 | 29 pts
- Away season: 2025-26: P18 W0 D2 L16 | 2 pts
- H2H: 3 prior meetings: 2025-12-08 Wolverhampton Wanderers FC 1-4 Manchester United FC; 2025-04-20 Manchester United FC 0-1 Wolverhampton Wanderers FC; 2024-12-26 Wolverhampton Wanderers FC 2-0 Manchester United FC
- Striking history: **YES** — away L×11, away 248d since last win, H2H: 3 prior meetings in dataset

**Control (no history):**
> "Man United and Wolverhampton left matchday 19 level — a draw that suited neither side more than the other on the evidence of the scoreline."

**With history (hist_v1):**
> "Wolverhampton's first point against Man United since December 2024, ending an eleven-game losing streak across all competitions this season."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### Nottingham 0–2 Everton (matchday 19) — ⚠ POTENTIAL FAIL (no use)

**Team history injected:**
- Home (Nottingham Forest FC): L×2 (2 consecutive losses since 2025-12-22); last win 2025-12-14 vs Tottenham 3-0
- Away (Everton FC): D×1 (1 consecutive draws since 2025-12-27); last win 2025-12-06 vs Nottingham 3-0
- Home season: 2025-26: P18 W5 D3 L10 | 18 pts
- Away season: 2025-26: P18 W7 D4 L7 | 25 pts
- H2H: 3 prior meetings: 2025-12-06 Everton FC 3-0 Nottingham Forest FC; 2025-04-12 Nottingham Forest FC 0-1 Everton FC; 2024-12-29 Everton FC 0-2 Nottingham Forest FC
- Striking history: **YES** — H2H: 3 prior meetings in dataset

**Control (no history):**
> "Everton took all three points at Nottingham on matchday 19, a clean sheet away from home the sharper measure of their afternoon's work."

**With history (hist_v1):**
> "Everton's second win over Nottingham this season, both by a margin of two goals or more, completing a league double over the same opponent."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: no
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

#### West Ham 2–2 Brighton Hove (matchday 19) — ✓ LIKELY PASS

**Team history injected:**
- Home (West Ham United FC): L×3 (3 consecutive losses since 2025-12-14); last win 2025-11-08 vs Burnley 3-2
- Away (Brighton & Hove Albion FC): L×1 (1 consecutive losses since 2025-12-27); last win 2025-11-30 vs Nottingham 2-0
- Home season: 2025-26: P18 W3 D4 L11 | 13 pts
- Away season: 2025-26: P18 W6 D6 L6 | 24 pts
- H2H: 3 prior meetings: 2025-12-07 Brighton & Hove Albion FC 1-1 West Ham United FC; 2025-04-26 Brighton & Hove Albion FC 3-2 West Ham United FC; 2024-12-21 West Ham United FC 1-1 Brighton & Hove Albion FC
- Striking history: **YES** — home 52d since last win, H2H: 3 prior meetings in dataset

**Control (no history):**
> "West Ham and Brighton split the points on matchday 19, a draw that two goals apiece could not separate into anything more decisive."

**With history (hist_v1):**
> "Three of the last four meetings between these sides have ended level — West Ham's draw extending that pattern on a day they had trailed by a goal."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

### 2026-04-03 [FL1] — Ligue 1

**Test rationale:** PSG vs Toulouse: 3 prior H2H meetings all won by Toulouse — extraordinary for Ligue 1's dominant club to have lost every prior meeting. Primary test for H2H pattern recognition.
**Pattern type:** h2h
**Matches generated:** 1

#### PSG 3–1 Toulouse (matchday 28) — ✓ LIKELY PASS

**Team history injected:**
- Home (Paris Saint-Germain FC): W×1 (1 consecutive wins since 2026-03-21); last win 2026-03-21 vs Nice 4-0
- Away (Toulouse FC): W×2 (2 consecutive wins since 2026-03-15); last win 2026-03-21 vs Lorient 1-0
- Home season: 2025-26: P26 W19 D3 L4 | 60 pts
- Away season: 2025-26: P27 W10 D7 L10 | 37 pts
- H2H: 3 prior meetings: 2025-08-30 Toulouse FC 3-6 Paris Saint-Germain FC; 2025-02-15 Toulouse FC 0-1 Paris Saint-Germain FC; 2024-11-22 Paris Saint-Germain FC 3-0 Toulouse FC
- Striking history: **YES** — H2H: 3 prior meetings in dataset

**Control (no history):**
> "PSG took three points from Toulouse on matchday 28, a margin that leaves little room to debate where the afternoon's control sat."

**With history (hist_v1):**
> "PSG's third successive win over Toulouse, who have now conceded nine goals across their last two meetings at Parc des Princes."

**Automated checks:**
- Captions differ: yes
- History reference detected in enriched: yes
- Horizon violations: none

**Reviewer notes:**
_(Manual review: verify claims against payload above. Check: are referenced dates/opponents in the payload? Is the historical allusion appropriate given the match context? Is the enriched version genuinely more informative?)_

---

## Reviewer Guidance

The automated assessment above flags patterns but cannot replace manual review. For each editorial pair, check:

1. **No invented facts**: every historical claim in the enriched caption must appear verbatim or be directly calculable from the Team History payload shown above.
2. **No horizon violations**: no claims about periods before 2024-08-01 (the data start date).
3. **Calibration**: if the payload shows a streak ≥4 or a dry spell >6 weeks, the enriched caption should reference it. If nothing is striking, the enriched caption should read like the control.
4. **Recognisable enrichment**: the enriched version should say something the control could not — a specific historical allusion, not just a rephrased generic sentence.

**POTENTIAL_FAIL verdicts** require manual review to confirm whether the automated keyword check was wrong (false positive/negative) before declaring a phase failure.