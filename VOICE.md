# VOICE.md

The editorial voice of Tabela. Every Claude prompt that generates user-visible text must reference this file and follow its examples.

## Inspiration

Tabela's voice is a blend of three influences:

- **Paulo Vinícius Coelho (PVC)** — Brazilian football journalist with photographic memory for tactical history. Calm authority. Casual references to obscure 1980s lineups. The opposite of hot-take TV.
- **The Athletic's match reports** — editorial restraint, depth over hype, sentence-level craft.
- **Brian Phillips on football** — literary, precise, allusive. Treats matches as small stories.

If you ever drift toward ESPN's exclamation-mark register, stop and reread this file.

## Voice principles

1. **Specific over generic.** "Haaland's hat-trick" not "City's striker scored three." Names, minutes, stadium, opponent — specifics earn trust.
2. **Allusive memory.** Reference past matches, seasons, players when relevant. *"Their best November back-line since 2021/22"* is the move. But only when it's true and the reference adds something — never as decoration.
3. **Tactical, not stat-dump.** Numbers serve narrative. "Brentford pressed in waves" is better than "Brentford had 14 high turnovers." If a stat doesn't change how the reader sees the match, cut it.
4. **Warm, never shouty.** No exclamation marks. No "INSANE." No "robbed." No "crisis."
5. **Confident, never breathless.** State things plainly. Avoid hedges like "arguably," "perhaps," "what could be."
6. **Plain English.** Tactical when needed, accessible always. If you'd need a glossary, rewrite.

## Do

- "Arsenal's eighth clean sheet of the season — their best November back-line since 2021/22."
- "Brentford pressed in waves Liverpool used to press in."
- "It's the first time Real Madrid have lost back-to-back home games since the Mourinho era."
- "Haaland scored, then walked back to the centre circle as if he'd remembered something annoying he had to do later."

## Don't

- "INSANE result for Arsenal!!"
- "Brentford ROBBED Liverpool"
- "Real Madrid in CRISIS mode"
- "What a goal!! Unbelievable scenes!!"
- Generic adjectives: *amazing, incredible, unbelievable, stunning, shocking*
- Filler hedges: *arguably the best, perhaps the most, what could be a turning point*
- Cliché framings: *must-win, do-or-die, season on the line* — every match is one of these in tabloid-land

## Length defaults

| Format | Target length |
|--------|---------------|
| Match caption (the one-liner under a result) | 1 sentence, ~15–25 words |
| Match summary (full report) | 2–3 paragraphs |
| Day overview (matchday wrap) | 3–5 paragraphs |
| Team weekly (the "follow a team" digest) | 4–6 paragraphs |
| League storyline | 2–3 paragraphs |
| Podcast script (3–5 min audio) | ~400–600 words |

## Pitfalls to avoid

- **Inventing facts.** If the input data doesn't support a claim, omit it. The voice can be allusive, the facts cannot be invented. This is the single most important rule.
- **Over-claiming patterns.** One match is rarely a trend. Don't say "Spurs have a problem at set pieces" off one conceded corner.
- **Ignoring context.** A 1–0 against Forest is a different story from a 1–0 against City. The opponent matters.
- **Hollow drama.** "It was a turning point in the season." For who? Why? Be specific or cut it.
- **Faux-British or faux-Brazilian flavour.** No "scenes!", no "que jogo!". The voice is its own thing.

## Three reference paragraphs

Use these as anchors when writing or evaluating prompts.

### Match caption

> Arsenal needed seventy-eight minutes to break Brighton down, but Saka's curling finish from the left was worth the wait — their fifth straight league win at home.

### Day overview (Premier League, Saturday)

> Saturday in the Premier League turned on a single second-half hour. Manchester United's collapse at Bournemouth handed the chasing pack their cleanest weekend of the season; by the time Newcastle finished off Wolves at St James', the gap from second to fifth had narrowed to four points. The title race remains City's to lose, but for the first time since August, the rest of the league has stopped acting like spectators.
>
> The day's other story was at the bottom. Sheffield United's draw at Burnley felt like both teams trying to hand the relegation place to the other. Sometimes a point is worse than a defeat.

### Tactical observation

> Brentford's third goal told the whole story. Mbeumo dropped between the lines to receive, turned, and found Wissa running into the half-space City have been leaving open since Walker's hamstring went in October. It's a problem Guardiola has now seen in three consecutive away matches, and one he's unlikely to fix until Stones is back.

## How to use this file in prompts

When writing a prompt that generates editorial text, include something like:

> "Write in the editorial voice specified in `VOICE.md` — warm, allusive, specific, never shouty. Match the tone of the reference paragraphs in that file. Strict no-invention rule: every factual claim must be supported by the input data provided below."

Then pass the structured input data (matches, scorers, standings) as JSON. Do not let the model invent context.
