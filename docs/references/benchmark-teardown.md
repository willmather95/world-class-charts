# Benchmark teardown

What the best chart teams do, what we took and where it lives. Read on Oct 31, 2026. Every
link is in `sources.md`.

## What we adopted

| # | Practice | Who does it | Where it lives here |
|---|---|---|---|
| 1 | Small multiples on one shared scale | Tufte, Observable Plot facets, FT | `SmallMultiples.tsx` |
| 2 | Annotations in words, on the chart | Amanda Cox (NYT), Datawrapper | `events` prop in `TrendAreaChart` |
| 3 | Show uncertainty as a labeled band | NYT, Chartability | `forecastFrom` plus `bandLabel` ("80% forecast range") |
| 4 | Bullet graph built to the spec | Stephen Few | `BulletChart.tsx` |
| 5 | Waterfall and slope chart types | FT Visual Vocabulary | `Waterfall.tsx`, `SlopeChart.tsx` |
| 6 | Palette checked under simulated color blindness | Machado 2009, Datawrapper, Carbon | CVD section of `contrast.mjs` |
| 7 | Hear the shape of the data | Highcharts sonification, Apple Audio Graphs | `sound.ts`, S key |
| 8 | Data table and CSV behind every chart | Carbon, W3C WAI, Highcharts export | `DataTable`, 500-row DOM cap |
| 9 | Full keyboard model with a hint on focus | Highcharts, Material, Chartability | `usePlotNav`, key hint |
| 10 | Hold up under user styles | Chartability, WCAG 1.4.10 and 1.4.12 | forced colors CSS, spacing and reflow tests |

Also adopted:
- Numbers spoken in words, like "$1.2 million" (Apple, Highcharts point text). See `speak()`.
- LTTB thinning for long series, so 10,000 points stay fast and keep their peaks.
- axe in the Playwright tests, with no serious or critical issues allowed.
- A tooltip that stays inside the card (Observable Plot tip, Recharts `allowEscapeViewBox`).

## What each source taught

- **FT Visual Vocabulary.** Pick the chart by the question: change, ranking, part to whole or
  flow. It gave us waterfall and slope.
- **The Economist.** Their "mistakes" post shows truncated axes and dual axes misleading readers.
  So bars start at zero and we have no dual-axis template.
- **NYT (Amanda Cox).** The annotation layer is the most important part. So events are words on
  the chart, not just dots.
- **Observable Plot.** Facets share scales by default. The tip mark keeps tooltips in the frame.
- **Datawrapper.** Runs an automatic colorblind check and labels lines directly. It also puts a
  table and an alt text behind each chart.
- **Vega-Lite.** One theme config drives every mark. We do the same with `--wc-*` tokens.
- **Tremor and shadcn.** Cards with a value header and quiet axes. We match that look in
  `ChartCard`.
- **Visx.** Low-level parts beat chart props for custom work. So our templates are plain SVG you
  can edit.
- **Apple.** Audio Graphs and plain spoken values. The HIG says to keep charts simple and
  focused.
- **Stripe.** One chart per question, set heights and up to 3 per row.
- **Linear.** Dashboards answer a few questions well and do not show everything.
- **Vercel.** Smooth curves can lie about the data. So we use monotone curves that never
  overshoot.
- **IBM Carbon.** Palettes run in a set order chosen for contrast. Every chart has "View as data
  table".
- **Material 3.** Do not use color alone. Use real focus rings and give text alternatives.
- **Highcharts.** Keyboard steps through points, plus spoken descriptions, a table, export and
  sound.
- **Chartability.** A 50-item audit. Our results are in `chartability-audit.md`.
- **Tufte and Few.** Data-ink, small multiples, sparklines and the bullet graph.
- **W3C WAI.** A complex image needs a short label and a long text version, such as a table.

## What we chose not to adopt

- **Dual axes.** The Economist shows how they mislead. Use two charts instead.
- **3D and pie charts with many slices.** No benchmark recommends them.
- **Brush and zoom.** These are complex actions with no keyboard version (Chartability). They add
  a lot of code for small value on a dashboard.
- **Auto-generated chart text from an LLM.** It could state things the data does not support.
  Summaries are built from the numbers.

## Gaps against the best

- Highcharts lets you jump by series and announces "3 of 12". We do neither yet.
- Datawrapper tables can sort and search. Our `DataTable` cannot.
- Carbon and Highcharts offer pattern fills. We offer forced colors only.
