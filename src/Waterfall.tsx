"use client";
// Waterfall: how a start value becomes an end value through signed steps (FT "deviation" /
// "part-to-whole over time"). Profit bridge, budget variance, net change in users.
// Totals are neutral gray. Steps are green or red by polarity, AND carry a signed label and float
// from the running total, so color is never the only cue. Dashed connectors join each step.
// One tab stop; arrows move between bars. States: loading, error, empty (no steps).
import { ChartCard, Tip, TipRow, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, fmtDelta, tone, type NumKind, type Polarity } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, maxTicksFor, niceTicks, scaleLinear, sizeOf, useTween, useWidth } from "./lib";

export type WaterfallStep = { label: string; value: number };

export function Waterfall({
  title, subtitle, start, steps, endLabel = "End", kind = "number", polarity = "up-good", height = 260, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  start: { label: string; value: number };
  steps: WaterfallStep[];
  endLabel?: string;
  kind?: NumKind;
  polarity?: Polarity;
  height?: number;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const tv = useTween([start.value, ...steps.map((s) => s.value)], { from: "target" });
  const run: number[] = [];
  tv.reduce((acc, v, i) => { const next = i === 0 ? v : acc + v; run.push(next); return next; }, 0);
  const endV = start.value + steps.reduce((a, s) => a + s.value, 0);
  const bars = [
    { label: start.label, lo: 0, hi: run[0], total: true, value: start.value },
    ...steps.map((s, i) => ({ label: s.label, lo: run[i], hi: run[i + 1], total: false, value: s.value })),
    { label: endLabel, lo: 0, hi: run[run.length - 1], total: true, value: endV },
  ];
  const n = bars.length;
  const empty = steps.length === 0;
  const axisW = size === "sm" ? 40 : 48, padT = 36, padB = 44;
  const plotW = Math.max(40, width - axisW), plotH = height - padT - padB;
  const all = bars.flatMap((b) => [b.lo, b.hi]);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all) * 1.06, plotH < 170 ? 3 : 4);
  const fmtAxis = axisFormatter(ticks, kind);
  const y = scaleLinear(ticks[0], ticks[ticks.length - 1], padT + plotH, padT);
  const slot = plotW / n, barW = Math.min(44, slot * 0.62);
  const cx = (i: number) => slot * i + slot / 2;
  const nav = usePlotNav(n, (px) => (px > plotW ? null : Math.floor(px / slot)), 1, undefined, { values: () => bars.map((b) => (b.total ? null : b.value)) });
  const h = nav.active;
  const colorOf = (b: (typeof bars)[number]) => {
    if (b.total) return c.compare;
    const t = tone(b.value, polarity);
    return t === "positive" ? c.positive : t === "negative" ? c.negative : c.compare;
  };
  // Labels fit side by side at about 46px a slot. Below that, odd bars lift their value label a
  // line and their name label drops a line, so neighbors never touch and every value still shows.
  const fit = maxTicksFor(plotW, 46) >= n;
  const stag = (i: number) => (!fit && i % 2 ? 1 : 0);
  const say = (i: number) => { const b = bars[i]; return b.total ? `${b.label}: ${fmt(b.value, kind)}` : `${b.label}: ${fmtDelta(b.value, kind)}, running total ${fmt(start.value + steps.slice(0, i).reduce((a, s) => a + s.value, 0), kind)}`; };
  const table = !empty ? {
    caption: title,
    columns: ["Step", "Change", "Running total"],
    rows: bars.map((b, i) => [b.label, b.total ? "" : fmtDelta(b.value, kind, { compact: false }), fmt(b.total ? b.value : start.value + steps.slice(0, i).reduce((a, s) => a + s.value, 0), kind, { compact: false })]),
  } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={empty} skeleton="bars" bodyHeight={height} {...state}>
      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="waterfall chart" aria-label={`${title}. From ${fmt(start.value, kind)} to ${fmt(endV, kind)} in ${steps.length} steps. Arrow keys move between steps.`} style={{ ...nav.bind.style, height }}>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? c.axis : c.grid} />
              <text x={plotW + 8} y={y(t) + 4} fontSize="12" fill={c.muted} className="tabular-nums">{fmtAxis(t)}</text>
            </g>
          ))}
          {bars.map((b, i) => {
            const top = y(Math.max(b.lo, b.hi)), bot = y(Math.min(b.lo, b.hi));
            const on = i === h;
            const down = !b.total && b.value < 0;
            return (
              <g key={`${b.label}-${i}`}>
                {on && <rect x={slot * i + 2} y={padT - 20} width={slot - 4} height={plotH + 20} rx={10} fill={c.surface2} />}
                {i < n - 1 && <line x1={cx(i) + barW / 2} x2={cx(i + 1) - barW / 2} y1={y(b.hi)} y2={y(b.hi)} stroke={c.axis} strokeDasharray="3 3" />}
                <rect x={cx(i) - barW / 2} y={top} width={barW} height={Math.max(1.5, bot - top)} rx={2} fill={colorOf(b)} />
                {(
                  <text x={cx(i)} y={down ? bot + 15 + stag(i) * 14 : top - 6 - stag(i) * 14} textAnchor="middle" fontSize="12" fontWeight={on || b.total ? 600 : 500} fill={b.total ? c.ink : c.ink2} className="tabular-nums">
                    {b.total ? fmt(b.value, kind) : fmtDelta(b.value, kind)}
                  </text>
                )}
                <text x={cx(i)} y={padT + plotH + 18 + stag(i) * 14} textAnchor="middle" fontSize="12" fill={on ? c.ink : c.muted} fontWeight={on ? 600 : 400}>{trim(b.label, Math.max(4, Math.floor((fit ? slot : slot * 2) / 7)))}</text>
              </g>
            );
          })}
        </svg>
        {h != null && (
          <Tip x={cx(h) + barW / 2} y={y(Math.max(bars[h].lo, bars[h].hi)) - 10} bound={plotW}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{bars[h].label}</div>
            <TipRow color={colorOf(bars[h])} label={bars[h].total ? "Total" : "Change"} value={bars[h].total ? fmt(bars[h].value, kind, { compact: false }) : fmtDelta(bars[h].value, kind, { compact: false })} />
            {!bars[h].total && <div className="mt-1 text-[12px] text-wc-tip-muted">Running total {fmt(start.value + steps.slice(0, h).reduce((a, s) => a + s.value, 0), kind, { compact: false })}</div>}
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={h != null ? say(h) : ""} />
      </div>
    </ChartCard>
  );
}
const trim = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}\u2026` : s);
