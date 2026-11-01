# Accessibility

Target WCAG 2.2 AA. Charts must work for people who cannot see color, cannot use a mouse, or
use a screen reader.

## Contrast

- Text: 4.5:1 against its background (`ink`, `ink-2`, `muted`, `*-ink` tokens).
- Marks the reader must see (lines, bars, axis, focus ring): 3:1 against the card
  (WCAG 1.4.11 Non-text Contrast).
- Inactive or "other" marks are ghosts: `ghost(color)` gives a soft fill plus a 1px edge in the
  full color, so the edge carries 3:1 and the shape stays readable. Do not dim with opacity.
- The only exception: a mark may fall under 3:1 when its exact value is printed as text right
  beside it (for example CategoryBreakdown's hover tint, where the list prints each value).
  Note the exception in the QA notes.
- Sequential ramps (heatmaps): step 1 is at least 1.5:1 on the card, zero is at least 1.2:1
  from step 1, and each step is at least 1.3:1 from the next, so neighbors never merge. The key
  prints each step's value range so color is never the only cue.
- Check with the harness: `node contrast.mjs`. Zero FAILs before shipping. It checks text,
  marks (which includes the ghost edges, since they use the full mark color) and the ramps.
- Run `./test.sh` too: it checks the aria wiring, keyboard, tooltips and reduced motion in a real
  browser.

## Do not rely on color alone (WCAG 1.4.1)

- Change pills use an arrow and a sign as well as green or red.
- Status is written in words: "Over the limit by $600", "Behind pace by $2,400".
- Over-limit units are striped, not just red. "No data" cells are outlined, not just pale.
- Dumbbells use a hollow dot for before and a solid dot for after, named in the key.
- Forecasts are dashed. Compare lines are gray and labeled.
- Series are labeled directly, so color is a helper, not the only key.
- Polarity matters: a drop in costs is green. Pass `polarity="down-good"`.

## Structure for screen readers

- The plot wrapper has `role="group"`, `aria-roledescription="chart"` and an `aria-label`
  that states the title, the size of the data and how to navigate.
- The SVG itself is `aria-hidden`. The data lives in a real `<table>` (`DataTable`), visually
  hidden by default and shown with "View data". Apple's Audio Graphs guidance and Carbon both
  ask for a data table alternative.
- Progress and budgets use `role="progressbar"` or `role="meter"` with `aria-valuetext` in words.
- Sparklines in tables have `role="img"` and a label like "rising, from 1,600 to 2,040".
- The live region announces the active point while navigating.
- Loading cards set `aria-busy`. Errors use plain words and a "Try again" button.

## Motion

- Respect `prefers-reduced-motion`: no entry animation, no shimmer, values jump straight to the
  end state (`useReducedMotion`, `useTween`, `.wc-skeleton`).

## Zoom and text size

- Cards reflow at 320px width and 400% zoom without horizontal scrolling, except data tables,
  which may scroll inside their card.
- Never set text below 12px. Never put text in an image.
- Text spacing (WCAG 1.4.12): wider line, letter and word spacing must not clip or overflow. A test checks it.

## Color blindness check

`contrast.mjs` simulates protan, deutan and tritan vision with Machado 2009 at full strength. It
then measures the gap between key pairs with CIEDE2000. Each pair must stay at ΔE 10 or more in
every theme. Pairs checked: accent and compare, positive and negative, and `cat-1` to `cat-4`.
The worst pair today is `cat-1` and `cat-3` under tritan, at 11.6. Colors 5 to 8 are not checked
in pairs. Use them only with direct labels.

## Forced colors

In Windows High Contrast, `tokens.css` maps the tokens to system colors (`Canvas`, `CanvasText`,
`Highlight`, `GrayText`). Categories take turns between two system colors, so labels and dashes
must carry the meaning. Focus keeps a 2px outline.

## Data table limits

`DataTable` shows at most 500 rows (`TABLE_ROW_CAP`), so a 10,000-point chart stays fast. The
caption says rows are cut, and CSV download keeps every row. The View data table does not sort.
SparkTable does, with `aria-sort`.

## Sound

Press S on a chart that supports it (`TrendAreaChart`, `SmallMultiples`). `sound.ts` plays the
series as notes from 220 to 880 Hz, at most 60 notes, in about 2 seconds. Esc or leaving the
chart stops it. This follows Highcharts sonification and Apple Audio Graphs.

## Target size

Every button is at least 24px on its smaller side (WCAG 2.5.8, level AA). A test checks this. We
do not meet the 44px AAA and Apple size on the compact card buttons.

## Patterns and more contrast

`ChartPrefs` (prefs.tsx) gives readers two switches for the whole page.

- **Patterns.** Each category slot gets its own texture: solid, diagonal, dots, rows, cross,
  columns, back diagonal, checks. Marks opt in with `data-wc-pat` (use `catPat(i)`), and keys
  pass `pat` to `Swatch`, `TipRow` and `LegendKey` so the key shows the same texture. A series
  with a custom color skips it. Textures help in grayscale, on paper and for color blind readers.
- **More contrast.** Labels reach 7:1 (AAA), dividers and the card ring 3:1, gridlines darken.
  The OS setting `prefers-contrast: more` turns it on without the switch. The category colors
  stay the same: they already pass 3:1 and the CVD check. `contrast.mjs` checks both themes.

## Screen reader runs

None yet. `voiceover-test-script.md` is a 10-minute script for macOS VoiceOver. The same steps
work in NVDA.

## Known gaps

See `chartability-audit.md`. In short: only StackedBars has a series picker, no chart can switch
type, and no real screen reader run has been done.
