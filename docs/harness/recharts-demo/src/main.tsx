// world-class-charts on Recharts: the documented mapping (references/recharts.md) in a real app.
// Same tokens, ChartCard states, format.ts and Tip markup. Recharts only draws the marks.
import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, useActiveTooltipLabel, useIsTooltipActive } from "recharts";
import "./app.css";
import { ChartCard, LegendKey, DeltaPill } from "./templates/ChartCard";
import { axisFormatter, fmt, pctChange } from "./templates/format";
import { c, cat, niceTicks, useReducedMotion } from "./templates/lib";
import { ActiveAnnouncer, RechartsTip } from "./RechartsTip";
import { LiveRegion } from "./templates/interaction";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const revenue = months.map((m, i) => ({ m, now: [42, 45, 44, 51, 55, 53, 60, 64, 62, 70, 74, 81][i] * 1000, last: [38, 40, 41, 43, 44, 47, 48, 50, 52, 55, 57, 60][i] * 1000 }));
const inOut = months.slice(6).map((m, i) => ({ m, in: [6200, 6400, 6100, 6900, 7000, 7300][i], out: [5100, 5900, 6300, 5400, 5600, 5200][i] }));
const spend = months.slice(6).map((m, i) => ({ m, home: [1800, 1800, 1850, 1850, 1900, 1900][i], living: [900, 1100, 950, 1200, 1000, 1150][i], fun: [300, 450, 280, 520, 390, 610][i] }));

// Shared axis props: no axis line, no tick marks, muted 12px labels. Grid is horizontal only.
const tick = { fill: c.muted, fontSize: 12 };
const xAxis = { dataKey: "m", axisLine: false, tickLine: false, tick, tickMargin: 8 } as const;
const grid = <CartesianGrid stroke={c.grid} vertical={false} />;
/** Same nice ticks as the SVG templates, so axes read the same in both stacks. */
const yAxisFor = (max: number, kind: "currency" | "number" = "currency") => {
  const ticks = niceTicks(0, max, 4);
  return { axisLine: false, tickLine: false, tick, width: 48, ticks, domain: [0, ticks[ticks.length - 1]] as [number, number], tickFormatter: axisFormatter(ticks, kind) };
};
// Tooltip kept inside the plot (never clipped by the card edge), offset off the cursor.
const tipProps = { allowEscapeViewBox: { x: false, y: false }, offset: 14, isAnimationActive: false, wrapperStyle: { zIndex: 10, outline: "none" } } as const;
/** Live region plus the visible key hint for a Recharts card. Recharts owns the focus; we only speak. */
function useAnnounce() {
  const [text, setText] = useState("");
  return { text, setText, region: <LiveRegion text={text} /> as ReactNode };
}
const table = (caption: string, cols: string[], rows: (string | number)[][]) => ({ caption, columns: cols, rows });

function Trend() {
  const reduced = useReducedMotion();
  const live = useAnnounce();
  const last = revenue[revenue.length - 1];
  return (
    <ChartCard
      title="Monthly revenue"
      subtitle={<>Up in 10 of 12 months, ahead of last year since spring.</>}
      source="Recharts demo. Sample data."
      keyHint="Left and right arrows move through months."
      table={table("Monthly revenue, by month", ["Month", "This year", "Last year"], revenue.map((d) => [d.m, fmt(d.now, "currency"), fmt(d.last, "currency")]))}
    >
      <div className="mb-3 flex items-end gap-3">
        <span className="text-[28px] font-medium tracking-[-0.02em] tabular-nums">{fmt(last.now, "currency")}</span>
        <DeltaPill delta={pctChange(last.now, last.last) ?? 0} label="vs Dec last year" />
      </div>
      <LegendKey items={[{ label: "This year", color: c.accent }, { label: "Last year", color: c.compare, dashed: true }]} />
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
            <defs>
              <linearGradient id="wc-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            <XAxis {...xAxis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...yAxisFor(Math.max(...revenue.map((d) => d.now)))} />
            <Tooltip {...tipProps} cursor={{ stroke: c.axis, strokeWidth: 1 }} content={<RechartsTip kind="currency" dashed={["last"]} />} />
            <ActiveAnnouncer<(typeof revenue)[number]> onChange={live.setText} say={(d) => `${d.m}: this year ${fmt(d.now, "currency")}, last year ${fmt(d.last, "currency")}`} />
            <Line type="monotone" dataKey="last" name="Last year" stroke={c.compare} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={!reduced} />
            <Area type="monotone" dataKey="now" name="This year" stroke={c.accent} strokeWidth={2} fill="url(#wc-area)" activeDot={{ r: 4, fill: c.accent, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={!reduced} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {live.region}
    </ChartCard>
  );
}

type BarShape = { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: { m: string } };
/** Ghost rule on Recharts: while a group is active (hover, tap or arrow keys), the other groups keep
 *  a full-color 1px edge and a soft fill. No opacity dimming. Reads Recharts' own tooltip state. */
function GhostBar({ x = 0, y = 0, width = 0, height = 0, fill = c.accent, payload }: BarShape) {
  const active = useIsTooltipActive();
  const label = useActiveTooltipLabel();
  const on = !active || label === payload?.m;
  const r = Math.max(0, Math.min(4, width / 2, height));
  return <path d={`M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`}
    fill={on ? fill : `color-mix(in srgb, ${fill} 22%, var(--wc-surface))`} stroke={fill} strokeWidth={1} />;
}

function Paired() {
  const reduced = useReducedMotion();
  const live = useAnnounce();
  return (
    <ChartCard
      title="Money in vs out"
      subtitle="More came in than went out in 5 of 6 months."
      source="Recharts demo. Sample data."
      keyHint="Left and right arrows move through months."
      table={table("Money in vs out", ["Month", "In", "Out"], inOut.map((d) => [d.m, fmt(d.in, "currency"), fmt(d.out, "currency")]))}
    >
      <LegendKey items={[{ label: "In", color: cat(0) }, { label: "Out", color: cat(2) }]} />
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={inOut} barGap={3} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer
>
            {grid}
            <XAxis {...xAxis} />
            <YAxis {...yAxisFor(Math.max(...inOut.map((d) => Math.max(d.in, d.out))))} />
            <Tooltip {...tipProps} cursor={{ fill: c.surface2, radius: 10 }} content={<RechartsTip kind="currency" />} />
            <ActiveAnnouncer<(typeof inOut)[number]> onChange={live.setText} say={(d) => `${d.m}: in ${fmt(d.in, "currency")}, out ${fmt(d.out, "currency")}, net ${fmt(d.in - d.out, "currency")}`} />
            {(["in", "out"] as const).map((k, s) => (
              <Bar key={k} dataKey={k} name={k === "in" ? "In" : "Out"} fill={cat(s * 2)} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced}
                shape={(p: BarShape) => <GhostBar {...p} />} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {live.region}
    </ChartCard>
  );
}

function Stacked() {
  const reduced = useReducedMotion();
  const live = useAnnounce();
  const keys = [{ k: "home", label: "Home" }, { k: "living", label: "Living" }, { k: "fun", label: "Fun" }];
  return (
    <ChartCard
      title="Spending by month"
      subtitle="Home stays flat. Fun drives the swings."
      source="Recharts demo. Sample data."
      keyHint="Left and right arrows move through months."
      table={table("Spending by month", ["Month", ...keys.map((x) => x.label), "Total"], spend.map((d) => [d.m, fmt(d.home, "currency"), fmt(d.living, "currency"), fmt(d.fun, "currency"), fmt(d.home + d.living + d.fun, "currency")]))}
    >
      <LegendKey items={keys.map((x, i) => ({ label: x.label, color: cat(i) }))} />
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spend} barCategoryGap="34%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
            {grid}
            <XAxis {...xAxis} />
            <YAxis {...yAxisFor(Math.max(...spend.map((d) => d.home + d.living + d.fun)))} />
            <Tooltip {...tipProps} cursor={{ fill: c.surface2, radius: 10 }} content={<RechartsTip kind="currency" total />} />
            <ActiveAnnouncer<(typeof spend)[number]> onChange={live.setText} say={(d) => `${d.m}: home ${fmt(d.home, "currency")}, living ${fmt(d.living, "currency")}, fun ${fmt(d.fun, "currency")}, total ${fmt(d.home + d.living + d.fun, "currency")}`} />
            {/* A 2px surface stroke separates stacked segments without a gap in the data. */}
            {keys.map((x, i) => (
              <Bar key={x.k} dataKey={x.k} name={x.label} stackId="s" fill={cat(i)} stroke={c.surface} strokeWidth={2} maxBarSize={36}
                radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={!reduced} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {live.region}
    </ChartCard>
  );
}

function Set({ dark }: { dark?: boolean }) {
  return (
    <section className={`${dark ? "dark" : ""} bg-wc-page px-6 py-10 font-wc text-wc-ink`}>
      <h2 className="mb-6 text-[13px] font-medium uppercase tracking-[0.08em] text-wc-muted">Recharts, {dark ? "dark" : "light"}</h2>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Trend />
        <Paired />
        <Stacked />
        <ChartCard title="Loading on Recharts" status="loading" skeleton="bars" bodyHeight={260} />
        <ChartCard title="No spending yet" empty emptyText="Spending shows up after your first transaction." skeleton="bars" bodyHeight={200} />
        <ChartCard title="Spending failed" status="error" errorText="We couldn't load spending. Check your connection." onRetry={() => {}} bodyHeight={200} />
      </div>
    </section>
  );
}

function App() {
  const mode = location.hash.slice(1);
  return (
    <main className={mode === "side" ? "grid grid-cols-2" : ""}>
      {mode !== "dark" && <Set />}
      {mode !== "light" && <Set dark />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
