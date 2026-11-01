# Recharts mapping

Keep Recharts if the app already uses it. Keep our tokens, `ChartCard` states, `format.ts`,
the `Tip` look and the ghost rule. Recharts only draws the marks.

A working app lives in `docs/harness/recharts-demo/` (Vite + React + Tailwind v4, Recharts 3).
It renders a trend area, paired bars, stacked bars and the loading, empty and error states,
in light and dark.

```bash
cd docs/harness/recharts-demo && npm i && npm run build   # sync templates, tsc strict, vite build
node shot.mjs out.png 1440   # needs Playwright from the parent harness (npm i there)
```

Open `dist/` over http, not `file://`. Vite emits module scripts, and Chrome blocks those from file URLs.

## Prop map

| Ours | Recharts |
|---|---|
| Series color | `stroke={c.accent}` / `fill={cat(i)}` (`c` and `cat` from `lib.ts`, never hex) |
| Compare line | `<Line stroke={c.compare} strokeDasharray="4 4" dot={false} activeDot={false} />` |
| Area fill | `linearGradient` from `c.accent` at 0.22 to 0, `stroke` 2px |
| Grid | `<CartesianGrid stroke={c.grid} vertical={false} />` |
| Axes | `axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 12 }}` |
| Y ticks | `ticks` from `niceTicks()`, `tickFormatter={axisFormatter(ticks, kind)}` |
| Tooltip | `<Tooltip content={<RechartsTip kind="currency" />} isAnimationActive={false} />` |
| Crosshair | Lines: `cursor={{ stroke: c.axis }}`. Bars: `cursor={{ fill: c.surface2, radius: 10 }}` |
| Active dot | `activeDot={{ r: 4, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}` |
| Bar corners | `radius={[4, 4, 0, 0]}`, top segment only in a stack |
| Stack gaps | `stroke={c.surface} strokeWidth={2}` on each stacked `Bar` |
| Ghost rule | A custom `shape` that reads `useIsTooltipActive()` and `useActiveTooltipLabel()` (see `GhostBar` in the demo). Inactive bars keep a full-color 1px edge and a 22% fill. Never use `fillOpacity` |
| Keyboard | `accessibilityLayer` (on by default in Recharts 3): Tab to the chart, arrows move the tooltip |
| Reduced motion | `isAnimationActive={!useReducedMotion()}` on every series |
| States | Wrap the chart in `ChartCard` and pass `status`, `empty`, `onRetry` and `table`. Never render an empty Recharts frame |
| Sizing | `ResponsiveContainer` inside a fixed-height div, so the card keeps its height |

## What Recharts does not give you

- **Live region.** Its accessibility layer moves the tooltip but does not announce it. Render
  `ActiveAnnouncer` (in `docs/harness/recharts-demo/src/RechartsTip.tsx`) inside your tooltip
  content. It passes a `say(row)` sentence to a polite live region. Keep the "View data" table
  (`table` on `ChartCard`) so screen readers get every number.
- **Bounded tooltip.** Use these props on every `Tooltip`:
  `{ allowEscapeViewBox: { x: false, y: false }, offset: 14, isAnimationActive: false,
  wrapperStyle: { zIndex: 10, outline: "none" } }`. The tip then stays inside the card and does
  not slide. Recharts places the tooltip one move after the pointer arrives, so tests should
  move the mouse twice before they read it.
- **Direct labels.** Use `LabelList` or a custom `label` for line-end labels. Fall back to
  `LegendKey` above the plot, never Recharts' `Legend` below it.

## shadcn charts

shadcn's `ChartContainer` is Recharts with a CSS variable map. Point its `config` colors at
`var(--wc-cat-1)` and so on, and use the same map above.
