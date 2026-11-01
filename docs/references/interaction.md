# Tooltips, crosshair, keyboard and touch

All of this lives in `src/interaction.tsx` (`usePlotNav`, `nearestIndex`, `LiveRegion`) and
`src/ChartCard.tsx` (`Tip`, `TipRow`).

## Tooltip

- Dark, high-contrast panel (`tip-bg`), 12px radius, small shadow.
- First line: the full date or category in muted text. Then one row per series:
  color swatch, name, value. Then a derived line when useful ("Net", "Total").
- Exact values in the tooltip (`compact: false`). The axis can be compact; the tooltip cannot.
- The tooltip stays inside the plot (`bound`). It never covers the axis labels.
- It flips to the left of the point when there is no room on the right.
- No delay on show, no animation on move beyond 120ms. Hide on pointer leave and on Esc.

## Crosshair

- A 1px vertical line in `axis` at the active x, plus a dot on each line at that x.
- On bars, highlight the active column with a `surface-2` band behind it instead.
- Never dim the other marks with opacity. At 45% most series fall below 3:1 and the chart turns
  to mush. When the rest must step back, draw them as ghosts (`ghost()` in lib.ts: a soft fill
  plus a 1px edge in the full color, so the edge keeps 3:1). PairedBars, RadialBars and
  SankeyFlow do this. The one exception: a mark may drop below 3:1 when its value is printed
  as text next to it (CategoryBreakdown's hover tint, where the list prints every value).

## Pointer and touch

- The whole plot is the hit area. Map x to the nearest point (`nearestIndex`), never require
  hitting a 2px line.
- `touch-action: pan-y` so a vertical swipe still scrolls the page and a horizontal drag scrubs.
- On touch, the active point stays after lifting the finger. Tap outside to clear.
- Hit targets for buttons and sort headers are at least 24px (WCAG 2.5.8), 44px preferred on phones.

## Keyboard

- The plot is one tab stop (`tabIndex=0`) with a visible focus ring in `focus`.
- Left and Right move one point. Home and End jump to the first and last. Esc clears.
- Grids (calendar heatmap) use Left and Right for a week and Up and Down for a day.
- Rows (RangeBars) and flows (SankeyFlow) treat Up/Down and Left/Right the same: next or previous item.
- On focus with nothing active, select the latest point, which is usually the one people want.
- Each move updates an `aria-live="polite"` region with a full sentence, then the position
  ("March 2026: 2026 $6,120, 2025 $4,980. 3 of 12."). Pass `nav.pos` to `LiveRegion` as `at`.
- H and L jump to the highest and lowest value and say "Highest" or "Lowest" first. Pass
  `opts.values` when the jump should use something other than the sound values (Sankey uses
  flow size, slope uses the change, waterfall skips the totals).
- N and P step through notes (annotations and events) and wrap: "Note 2 of 3". Pass
  `opts.marks` with the note indexes.
- PageUp and PageDown jump a tenth of the points. S plays the series as pitch.

## Shareable state

Wrap a chart in `<ShareState id="revenue">` and the active point goes to `?wc.revenue=5` and the
table sort to `?wc.revenue.sort=2d`. Both come back on reload. Writes wait 250ms, because Safari
throws after about 100 history writes in 10 seconds. Esc removes the point. Charts outside a
`ShareState` never touch the URL. Use short, stable ids.

## Reader choices

- `StackedBars picker` adds "Show parts" chips (`aria-pressed`). A hidden part drops out of the
  bars, the totals and the live text. The table keeps every part. The last part cannot be hidden.
- `ChartPrefs` (prefs.tsx) adds two toggles for the whole page: Patterns and More contrast. Put
  one near the top of a dashboard, not one per card. Choices stay in `localStorage`.

## Sorting and toggles

- Sortable table headers are real `<button>`s inside `<th>` with `aria-sort`. The View data
  table and SparkTable both sort. Value columns go high to low, low to high, then back to the
  original order. The label column flips the original order. A polite line says "Sorted by
  Revenue, high to low."
- Sort buttons only exist while the table shows, so the hidden table adds no tab stops.
- "View data" in the card footer toggles the table for everyone, not just screen readers.
