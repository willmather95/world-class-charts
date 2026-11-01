---
name: world-class-charts
description: >-
  Build charts, KPI cards and dashboards to the standard of the best product and newsroom work.
  Ships typed React + TS + Tailwind templates with
  every state, a semantic token layer for brand theming and dark mode, and a QA rubric. Use for
  any chart, KPI card or dashboard work, or when a chart looks flat, generic or default.
metadata:
  templates: 18 charts + shared card, tokens, format, interaction, sound (no chart library)
  checks: tsc strict, contrast.mjs (WCAG + CVD), Playwright and axe tests, Recharts demo tests, Chartability audit
  updated: 2026-10-31
---

# World-class charts

A world-class chart answers one question at a glance, labels itself, works for every reader and
every state, and fits the brand. This skill is the recipe and the parts.

## Recipe

1. **Write the question.** "Are we on pace for the quarter?" Then pick the chart with
   `references/chart-choice.md`. If a number answers it, use a stat, not a chart.
2. **Write the takeaway as the subtitle.** "Spending is up 12% since June." The title names the
   measure. The subtitle says what it means.
3. **Start from a template** (list below). Copy `src/` into the app (for example
   `components/charts/`; in the repo, `src/` sits one level above this file), add `@import "./tokens.css";` after `@import "tailwindcss";`, and
   import from `index.ts`. Templates are plain SVG and HTML: React 19, TS strict, Tailwind v4.
4. **Theme with tokens, never hex.** Map the brand onto the `--wc-*` roles with
   `references/theming.md` (8-step walkthrough, example in `src/themes/brand-example.css`).
5. **Format every number** through `format.ts` (`references/formatting.md`). Exact in tooltips,
   compact on axes, true minus sign, year once on time axes.
6. **Label directly.** Series names at line ends, one highlight, targets and annotations in words
   (`references/labeling.md`). A key only when labels cannot fit.
7. **Wire every state.** Pass `status`, `onRetry` and real empty text (`references/states.md`).
   Test one point, two points, missing values and zero.
8. **Check interaction and access.** Pointer, touch, arrow keys, live region, "View data" table,
   AA contrast, nothing by color alone (`references/interaction.md`, `references/accessibility.md`).
9. **Check 390, 768 and 1440, light and dark** (`references/responsive.md`,
   `references/dark-mode.md`, `references/motion.md`).
10. **Score it** with `references/qa-checklist.md`. Ship at 9 or more. At 7-8, fix the lowest line.

## Templates (`src/`)

| Template | For |
|---|---|
| `TrendAreaChart` | One measure over time: compare line, target, annotations, `events`, forecast with a labeled range (`bandLabel`) |
| `PairedBars` | Two measures per period (in vs out), active period lit |
| `StackedBars` | Parts of a total over time, `mode="stacked"` or `"percent"`, `picker` to hide parts |
| `DeltaBars` | This vs last per item (`compare`) or change around zero (`change`) |
| `GoalProgress` | Progress to a goal with "expected today" pace marker |
| `BudgetCard` | Used vs limit, `variant="dots"` or `"strip"`, warn and over states |
| `CategoryBreakdown` | Share by category as one strip plus a ranked list, "Other (n)" |
| `RadialBars` | A hero ring of wedges (months, places). Pair with numbers |
| `CalendarHeatmap` | Activity by day, no-data vs zero, keyboard grid |
| `SparkTable` | Ranked table with sortable headers, change pills and sparklines (`Spark`) |
| `KpiSparkCard` | One hero number, change pill, sparkline |
| `StatStrip` | 2 to 5 headline numbers in one row |
| `RangeBars` | Low to high per item (`variant="range"`) or before vs after (`"dumbbell"`), optional marker |
| `SankeyFlow` | Where a total goes: income to buckets to items. 2 to 4 columns, keyboard by flow |
| `SmallMultiples` | One measure split by group, every panel on one shared scale |
| `BulletChart` | Actual vs target on bands, built to Few's spec |
| `Waterfall` | How a start value becomes an end value, step by step |
| `SlopeChart` | Before vs after for a few items, rank changes stand out |

Shared parts: `ChartCard` (frame, states, skeletons, "View data" table, `Tip`), `interaction.tsx`
(`usePlotNav` with H/L/N/P jumps, `LiveRegion`, sortable `DataTable`, `ShareState` for URL state),
`prefs.tsx` (`ChartPrefs`: Patterns and More contrast toggles), `sound.ts` (S key plays the
series), `format.ts`, `lib.ts` (tokens `c`, `cat()`, `catPat()`, `seq()`, scales, `useTween`,
`useWidth`, `sizeOf`, `soft()`, `ghost()`), `tokens.css`.

Ghost rule: when one item is active, the rest keep a full-color 1px edge and a soft fill
(`ghost()`). Never dim with opacity. Cards take their content's height (`h-fit`), so a short
chart never leaves a blank band in a grid row.

Old names, if older code uses them: `SavingsAreaChart` is now `TrendAreaChart`, `CashFlowBars`
is now `PairedBars`, and the `spent` prop on `BudgetCard` is now `used`.

## Check your work

`docs/harness/` holds the checker. It is in the repo, not in the installed package, so clone the
repo to run it. Run `npm i` in that folder, then:

- `./build.sh` copies the templates, runs `tsc --noEmit` (strict) and builds the gallery.
- `node contrast.mjs` checks every text and mark pair in light, dark, the brand example and More
  contrast, plus all 28 category pairs for color blindness. Keep 0 fails.
- `./test.sh --repeat-each=3` builds, then runs the Playwright interaction tests (`tests/charts.spec.ts`):
  keyboard focus, arrows, Home/End, Esc, the heatmap's week and day moves, hover and tap
  tooltips that stay inside the card, aria labels, live regions, tables, states, reduced motion,
  axe, forced colors, 320 reflow, text spacing, 24px targets, sound, jumps, table sort, URL state,
  the picker and the display toggles. Runs in Chrome (`CHROME_PATH`), Firefox and WebKit. Add
  `--project=chromium` for a quick run. First time: `npx playwright install firefox webkit`.
- `./shot.sh 1440 4000 out.png light` (or `dark`, `brand`) screenshots with headless Chrome.
  Small widths render inside an exact-width iframe, so 390 is a real 390.
- `node gallery.mjs OUT_DIR` shoots the full gallery: 1440 light and dark, 768, 390 and brand.
- `recharts-demo/`: `npm run build` and `npx playwright test` prove the Recharts mapping works.

Look at the screenshots before you call it done.

## Recharts or another library

Keep the library if the app already uses one. Copy the tokens, the `Tip` style, the formatters,
the ghost rule and the state handling. `references/recharts.md` has the prop map and
`docs/harness/recharts-demo/` is a working Vite app that uses it.

## References

`chart-choice.md`, `theming.md`, `formatting.md`, `labeling.md`, `interaction.md`,
`accessibility.md`, `states.md`, `responsive.md`, `motion.md`, `dark-mode.md`, `recharts.md`,
`qa-checklist.md`, `catalog.md` (screenshot pattern to template), `chartability-audit.md`
(50-item audit and known gaps), `voiceover-test-script.md` (10-minute screen reader run),
`benchmark-teardown.md` (what we took from FT, NYT, Apple and
others), `sources.md`.
