# world-class-charts

18 React chart and KPI components with every state, dark mode and brand theming built in. 11 plotted charts add arrow-key navigation; the other 7 carry their values as text and have no key model. They draw plain SVG and HTML, so there is no chart library to install.

Built for React 19 and Tailwind CSS v4. MIT licensed.

## Install

Pick one.

**Copy the source (simplest).** Copy `src/` into your app, for example to `components/charts/`.

**Install from GitHub.**

```bash
npm i github:willmather95/world-class-charts
```

The package ships TypeScript source, not a build. Your bundler compiles it. Vite works as is. On Next.js, add it to `next.config`:

```js
transpilePackages: ["world-class-charts"]
```

You need `react` and `tailwindcss` v4 in your app. Both are peer dependencies. TypeScript users also need `@types/react` and `moduleResolution: "bundler"`.

## Add tokens.css

Import `tokens.css` once, in your global CSS, right after Tailwind.

If you copied the source:

```css
@import "tailwindcss";
@import "./components/charts/tokens.css";
```

If you installed the package, use the package path. Also add `@source`, because Tailwind does not scan `node_modules`. The path is relative to this CSS file, so adjust it to match your project:

```css
@import "tailwindcss";
@import "world-class-charts/tokens.css";
@source "../node_modules/world-class-charts/src";
```

## Import the components

Everything comes from one entry point. With the copied source, import from your own folder:

```tsx
import { KpiSparkCard, TrendAreaChart } from "./components/charts";
```

With the package:

```tsx
import { KpiSparkCard, TrendAreaChart } from "world-class-charts";

const revenue = [
  { date: new Date(2026, 0, 15), value: 4200, compare: 3600 },
  { date: new Date(2026, 1, 15), value: 4900, compare: 3900 },
  { date: new Date(2026, 2, 15), value: 5600, compare: 4100 },
];

export function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <KpiSparkCard
        title="Signups"
        value={1284}
        delta={0.142}
        note="last 30 days"
        series={[90, 104, 98, 121, 133, 128, 142]}
      />
      <TrendAreaChart
        title="Monthly revenue"
        subtitle="Up 37% on last year"
        data={revenue}
        kind="currency"
        valueLabel="2026"
        compareLabel="2025"
      />
    </div>
  );
}
```

Write the takeaway in `subtitle`. The title names the measure. The subtitle says what it means.

Date labels use the runtime's time zone. When you server-render, the server and browser can disagree and React will report a hydration error. Pin the zone on the server, or render date charts on the client only.

## Components

| Component | Use it for |
|---|---|
| `TrendAreaChart` | One measure over time, with compare line, target and forecast |
| `PairedBars` | Two measures per period, such as in vs out |
| `StackedBars` | Parts of a total over time |
| `DeltaBars` | This vs last per item, or change around zero |
| `GoalProgress` | Progress to a goal, with a pace marker |
| `BudgetCard` | Used vs limit |
| `CategoryBreakdown` | Share by category |
| `RadialBars` | A hero ring of wedges |
| `CalendarHeatmap` | Activity by day |
| `SparkTable` | Ranked table with sparklines |
| `KpiSparkCard` | One hero number with a sparkline |
| `StatStrip` | 2 to 5 headline numbers in a row |
| `RangeBars` | Low to high, or before vs after |
| `SankeyFlow` | Where a total goes |
| `SmallMultiples` | One measure split by group |
| `BulletChart` | Actual vs target on bands |
| `Waterfall` | How a start value becomes an end value |
| `SlopeChart` | Before vs after for a few items |

Shared parts are exported too: `ChartCard`, `Tip`, `DataTable`, `ChartPrefs` and the `format.ts` number and date helpers.

## Dark mode and theming

Add `class="dark"` or `data-theme="dark"` to a parent element. The tokens switch for you.

To apply a brand, remap the `--wc-*` tokens. Never pass hex values to a chart. Start from `src/themes/brand-example.css`, then follow `docs/references/theming.md`. With the package, import the example as `world-class-charts/themes/brand-example.css`.

## Use it as an agent skill

`docs/SKILL.md` is a ready-made skill for Claude Code and other agents that read `SKILL.md` files. The file is in `docs/`, so link that folder, not the repo root. Clone the repo, then symlink:

```bash
git clone https://github.com/willmather95/world-class-charts ~/world-class-charts
mkdir -p ~/.claude/skills
ln -s ~/world-class-charts/docs ~/.claude/skills/world-class-charts
```

The templates stay in the clone, in `src/` one level above `SKILL.md`. The checker in `docs/harness/` works through the link.

## Docs

- `docs/SKILL.md`: the full recipe, from picking a chart to shipping it
- `docs/references/`: guides for chart choice, formatting, labeling, interaction, accessibility, states, responsive layout, motion, dark mode, Recharts and QA
- `docs/harness/`: the checker, with a strict typecheck, a contrast test, Playwright and axe tests, and a Recharts demo

The checker lives in the repo, not in the installed package (the package ships `src`, `SKILL.md` and the references). Clone the repo to run it. It uses your installed Chrome, or set `CHROME_PATH`:

```bash
cd docs/harness
npm i
./build.sh
node contrast.mjs
./test.sh --project=chromium
```

## License

MIT. See [LICENSE](LICENSE).
