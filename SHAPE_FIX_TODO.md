# SHAPE_FIX_TODO.md

Deferred architectural fix for caption shape monoculture. Created 2026-05-05 during the Voice V2 test loop.

---

## Problem

The caption prompt includes a shape repetition rule: within a single league on a single day, no two captions should open with the same sentence structure. In particular, the "[Team] were N goals clear before the break" template (shape 4) should appear at most once per league per day.

The rule cannot be reliably enforced as written, because **each caption is generated in a separate stateless API call**. The model processes one match in isolation and has no knowledge of what was written for any other match in the same league that day. A rule saying "if you already used shape 4, don't use it again" is meaningless to a model that has never used anything yet.

The prompt's hard-cap rule provides a useful distributional bias (confirmed in eval: violation rate dropped from 33% to 0% in the last run), but it is not a guarantee. On a matchday where three or more matches in the same league all had 2-goal half-time leads, the model will likely repeat the template regardless of the rule's wording.

---

## Proper fix

In `src/trigger/pipeline.ts`, the caption loop is:

```ts
const captionJobs = data.matches.map(async (match) => {
  const pkg = buildMatchCaptionPrompt({ context, match, topScorers });
  const caption = await generate<MatchCaption>(pkg);
  // ...
});
await Promise.all(captionJobs);
```

Because all caption calls are launched in parallel (`Promise.all`), each has no knowledge of any prior caption's output.

**Fix:** Process captions sequentially within a league and pass the opening sentence of each completed caption as context to the next call. The `buildMatchCaptionPrompt` function in `src/editorial/prompts.ts` would accept an optional `priorCaptionOpenings: string[]` parameter and append them to the format block as:

```
Shapes already used by earlier captions in this league today:
  "[opening of caption 1]"
  "[opening of caption 2]"
Do not open with a structurally similar sentence.
```

This is deterministic — the model is told exactly what has already been written — and does not require the model to infer or remember anything across calls.

**Code scope:**
- `src/trigger/pipeline.ts`: change `Promise.all` on caption jobs to a sequential `for...of` loop that accumulates opening sentences (already sequential at the league level for rate-limiting reasons; the inner caption loop is what needs to change)
- `src/editorial/prompts.ts`: add optional `priorCaptionOpenings` parameter to `buildMatchCaptionPrompt` and `MatchEditorialInput`
- `scripts/eval-voice-v2.ts`: same change to the eval script's caption loop

Estimated effort: ~20 lines of code across three files.

---

## Priority and sequencing

**Priority:** Medium. This is a voice-quality improvement, not a correctness bug. The prompt's soft bias has meaningfully reduced violation frequency. The proper fix eliminates the remainder.

**Not blocking:** Phase 4 (website), Phase 5 (audio), or any other downstream work. The production editorial pipeline continues to function; captions are occasionally structurally repetitive within a league, not factually wrong.

**Suggested sequencing:** Address in a small voice-quality follow-up session, either before Phase 4 ships or alongside it. Do not bundle into a Phase 4 PR — keep prompt/pipeline work and UI work in separate commits.

---

## Acceptance criteria (when this is addressed)

Run `scripts/eval-voice-v2.ts` on 2026-05-03 (the highest-density shape-4 date) after the fix. Verify via DB query that no league on that date has more than one caption opening with a structurally equivalent sentence. Zero violations required; ≤ 1 per league is not acceptable given the fix makes zero trivially achievable.
