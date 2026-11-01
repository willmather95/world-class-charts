# Pre-ship QA checklist and rubric

Run the harness first, from `docs/harness`: `./build.sh` (typecheck + build), `node contrast.mjs`, `./test.sh`
(Playwright interaction tests), then screenshots at 1440, 768 and 390 in light and dark with
`shot.sh`. On Recharts, also `npm run build` in `recharts-demo/`. Look at every image. Then go
down this list.

## Checklist

**Choice and story**
- [ ] The chart answers one question, written as the subtitle takeaway.
- [ ] The chart type matches the question (`chart-choice.md`).
- [ ] Bars start at zero. Time runs left to right. Categories are sorted.
- [ ] One thing is highlighted. Everything else is quieter, by the ghost rule (soft fill plus a
      full-color edge), never by opacity.

**Numbers and labels**
- [ ] All numbers go through `format.ts`. Tabular figures. True minus sign.
- [ ] Axis ticks are nice, distinct, and use one decimal count.
- [ ] Dates show the year once, not on every tick.
- [ ] Series are labeled directly, or a key sits above the plot in the same order.
- [ ] Targets, forecasts and annotations are labeled in words.
- [ ] Every number has a source line (and "Updated ..." when data can go stale).

**States**
- [ ] Loading skeleton matches the chart shape and the card height does not jump.
- [ ] Error has words and "Try again". Empty has words and a next step.
- [ ] One point, two points, missing values, zero, and previous = 0 all render sensibly.

**Interaction and access**
- [ ] Hover, tap and arrow keys all reach every point. Esc clears. Focus ring is visible.
- [ ] The tooltip never covers the axis and never leaves the card.
- [ ] The live region reads a full sentence for the active point, then "3 of 12".
- [ ] H and L jump to the high and low. Charts with notes pass `marks` so N and P reach them.
- [ ] The label sums up the chart and names its top item (largest flow, part, rise or fall).
- [ ] "View data" shows a real table with the same numbers. Its headers sort, with `aria-sort`.
- [ ] Dashboards with a shareable view wrap charts in `ShareState`, so point and sort sit in the URL.
- [ ] One `ChartPrefs` per page. With Patterns on, every categorical mark and its key show a texture.
- [ ] `node contrast.mjs` has 0 FAILs in light, dark, More contrast and every brand theme.
- [ ] Nothing relies on color alone (arrows, signs, stripes, dashes, words).
- [ ] Reduced motion: no animation, no shimmer.
- [ ] Sequential ramps: every step distinct, step 1 at least 1.5:1 on the card, and a value key
      or outline so the reader never matches shades by eye alone.
- [ ] `node contrast.mjs` CVD pairs all at ΔE 10 or more (Machado 2009, CIEDE2000), all 28
      category pairs included.
- [ ] axe finds no serious or critical issues.
- [ ] No visible text under 12px. Every button at least 24px.
- [ ] Reflow at 320px. Forced colors still show marks, labels and focus.
- [ ] Text spacing (WCAG 1.4.12) causes no clipping.
- [ ] `./test.sh --repeat-each=3` passes in Chrome, Firefox and WebKit. Add a test when you add a
      chart or a key binding.
- [ ] Before a big launch, run `voiceover-test-script.md` (10 minutes) on a real Mac.
- [ ] For a full audit, use `chartability-audit.md` as the template.

**Layout**
- [ ] 390, 768 and 1440 all look intentional. No clipped labels. No horizontal page scroll.
- [ ] Cards take their content's height. No blank band under a short chart in a grid row.
- [ ] Dark mode looks designed, not inverted.
- [ ] `tsc --noEmit` passes with strict, noUnusedLocals and noUnusedParameters.

## Rubric (0-10)

Score each line 0, 0.5 or 1. Be honest: 1 means a design lead at Stripe or the FT would not
comment on it.

| # | Dimension | 1 point when |
|---|---|---|
| 1 | Right chart | Each chart is the best type for its question. |
| 2 | Clear story | Takeaway subtitle, one highlight, nothing extra. |
| 3 | Numbers | Formatting is consistent, exact where it matters, axes clean. |
| 4 | Labels | Direct labels, annotations and reference lines in words; no legend hunting. |
| 5 | States | Loading, error, empty, sparse and single point all designed. |
| 6 | Interaction | Pointer, touch and keyboard; bounded tooltip; crosshair. |
| 7 | Accessibility | AA contrast, no color-only meaning, table fallback, live region, reduced motion. |
| 8 | Responsive | Good at 390, 768 and 1440. |
| 9 | Theming and dark | Tokens only; brand swap and dark mode both pass. |
| 10 | Craft | Spacing, type, alignment and motion feel finished. |

- 9-10: ship it.
- 7-8: ship after fixing the lowest line.
- Under 7: do not ship.
