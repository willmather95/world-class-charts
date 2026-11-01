"use client";
// Range and dumbbell rows: where something sits between two values, per category.
// variant "range": a floating bar from `from` (low) to `to` (high), with an optional marker tick
//   (average, today, median) labeled in the key. For price bands, min-max, salary ranges.
// variant "dumbbell": a hollow dot for `from` (before) and a solid dot for `to` (after), joined by
//   a line. For before vs after per item. Hollow vs solid plus the key, so color is never the only cue.
// Position, not length, carries the value, so the axis does not have to start at zero. Rows are
// labeled directly (value on the right), one tab stop, Up/Down or Left/Right move between rows.
// States: loading, error, empty, single row, missing value (row says "No data").
import { ChartCard, DeltaPill, LegendKey, SparseNote, Tip, TipRow, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, fmtDelta, pctChange, type NumKind, type Polarity } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, niceTicks, scaleLinear, sizeOf, useTween, useWidth } from "./lib";

export type RangeRow = { label: string; from: number | null; to: number | null; marker?: number | null };

export function RangeBars({
  title, subtitle, data, variant = "range", kind = "number", polarity = "up-good", sort = true,
  fromLabel, toLabel, markerLabel = "Average", source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: RangeRow[];
  variant?: "range" | "dumbbell";
  kind?: NumKind;
  /** Dumbbell only: is `to` above `from` good? Colors the change pill. */
  polarity?: Polarity;
  /** Sort rows by `to`, largest first. Turn off when order has meaning (age bands, steps). */
  sort?: boolean;
  /** Key names. Range defaults to "Low" and "High", dumbbell to "Before" and "After". */
  fromLabel?: string;
  toLabel?: string;
  markerLabel?: string;
  source?: string;
}) {
  const dumb = variant === "dumbbell";
  const fromL = fromLabel ?? (dumb ? "Before" : "Low");
  const toL = toLabel ?? (dumb ? "After" : "High");
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const rows = data.map((d) => ({ ...d }));
  if (sort) rows.sort((a, b) => (b.to ?? -Infinity) - (a.to ?? -Infinity));
  const n = rows.length;
  const hasMarker = !dumb && rows.some((r) => r.marker != null);
  const anim = useTween(rows.flatMap((r) => [r.from ?? 0, r.to ?? 0, r.marker ?? 0]), { from: "target" });
  const known = rows.flatMap((r) => [r.from, r.to, r.marker]).filter((v): v is number => v != null);
  const lo = known.length ? Math.min(...known) : 0, hi = known.length ? Math.max(...known) : 1;
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
  const ticks = niceTicks(lo - pad < 0 && lo >= 0 ? 0 : lo - pad, hi + pad, size === "sm" ? 3 : 4);
  const fmtAxis = axisFormatter(ticks, kind);
  // Layout: label column, plot, value column. Phones put the label above the bar.
  const stacked = size === "sm";
  const labelW = stacked ? 0 : Math.min(150, Math.round(width * 0.24));
  const valueW = dumb ? (stacked ? 0 : 128) : stacked ? 0 : 112;
  const rowH = stacked ? 50 : 38, padT = 4, axisH = 22;
  // Keep 16px at the ends in stacked mode so the first and last tick labels never clip.
  const x0 = stacked ? 16 : labelW + 12, x1 = width - (valueW ? valueW + 16 : 18);
  const x = scaleLinear(ticks[0], ticks[ticks.length - 1], x0, x1);
  const plotH = n * rowH;
  const height = padT + plotH + axisH;
  const nav = usePlotNav(n, (_px, py) => Math.floor((py - padT) / rowH), 1, undefined, { values: () => rows.map((r) => r.to) });
  const h = nav.active;
  const barY = (i: number) => padT + i * rowH + (stacked ? 34 : rowH / 2);
  const range = (r: RangeRow) => (r.from == null || r.to == null ? "No data" : `${fmt(r.from, kind)} to ${fmt(r.to, kind)}`);
  const say = (r: RangeRow) => dumb
    ? `${r.label}: ${fromL.toLowerCase()} ${r.from == null ? "no data" : fmt(r.from, kind)}, ${toL.toLowerCase()} ${r.to == null ? "no data" : fmt(r.to, kind)}${r.from != null && r.to != null ? `, ${changeWords(r.from, r.to)}` : ""}`
    : `${r.label}: ${range(r)}${r.marker != null ? `, ${markerLabel.toLowerCase()} ${fmt(r.marker, kind)}` : ""}`;
  const table = n ? {
    caption: title,
    columns: dumb ? ["Item", fromL, toL, "Change"] : ["Item", fromL, toL, ...(hasMarker ? [markerLabel] : [])],
    rows: rows.map((r) => {
      const f = (v: number | null | undefined) => (v == null ? "No data" : fmt(v, kind, { compact: false }));
      if (dumb) { const ch = r.from != null && r.to != null ? pctChange(r.to, r.from) : null; return [r.label, f(r.from), f(r.to), ch == null ? "n/a" : fmtDelta(ch)]; }
      return [r.label, f(r.from), f(r.to), ...(hasMarker ? [f(r.marker)] : [])];
    }),
  } : undefined;
  const key = dumb
    ? [{ label: fromL, color: c.compare, dashed: true }, { label: toL, color: c.accent }]
    : [{ label: `${fromL} to ${toL}`, color: c.accent }, ...(hasMarker ? [{ label: markerLabel, color: c.ink }] : [])];
  const d = h != null ? rows[h] : null;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0} skeleton="rows" bodyHeight={Math.max(160, height + 28)} {...state}>
      <div className="mb-3"><LegendKey items={key} /></div>
      <div ref={wrap}>
        <div {...nav.bind} role="group" aria-roledescription="chart" aria-label={`${title}. ${n} rows. Arrow keys move between rows.`} style={{ ...nav.bind.style, height }}>
          <svg width={width} height={height} className="block" aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={padT} y2={padT + plotH} stroke={c.grid} />
                <text x={x(t)} y={height - 6} fontSize="12" textAnchor="middle" fill={c.muted} className="tabular-nums">{fmtAxis(t)}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const on = i === h;
              const yy = barY(i);
              const a = x(anim[i * 3] ?? 0), b = x(anim[i * 3 + 1] ?? 0), m = x(anim[i * 3 + 2] ?? 0);
              const missing = r.from == null || r.to == null;
              const ch = !missing && dumb ? pctChange(r.to as number, r.from as number) : null;
              return (
                <g key={r.label}>
                  {on && <rect x={0} y={padT + i * rowH + 1} width={width} height={rowH - 2} rx={8} fill={c.surface2} />}
                  <text x={stacked ? 0 : labelW} y={stacked ? padT + i * rowH + 16 : yy + 4} fontSize="13" textAnchor={stacked ? "start" : "end"} fill={on ? c.ink : c.ink2} fontWeight={on ? 600 : 400}>{r.label}</text>
                  {missing ? (
                    <text x={x0} y={yy + 4} fontSize="12" fill={c.muted}>No data</text>
                  ) : dumb ? (
                    <>
                      <line x1={Math.min(a, b) + 5} x2={Math.max(a, b) - 5} y1={yy} y2={yy} stroke={c.compare} strokeWidth={2} strokeLinecap="round" />
                      <circle cx={a} cy={yy} r={5} fill={c.surface} stroke={c.compare} strokeWidth={2} />
                      <circle cx={b} cy={yy} r={on ? 6.5 : 5.5} fill={c.accent} stroke={c.surface} strokeWidth={1.5} className="wc-motion transition-[r] duration-[var(--wc-dur-focus)]" />
                    </>
                  ) : (
                    <>
                      <rect x={Math.min(a, b)} y={yy - 5} width={Math.max(3, Math.abs(b - a))} height={10} rx={5} fill={c.accent} />
                      {r.marker != null && <rect x={m - 1.5} y={yy - 9} width={3} height={18} rx={1.5} fill={c.ink} stroke={c.surface} strokeWidth={1.5} paintOrder="stroke" />}
                    </>
                  )}
                  {!stacked && !missing && (
                    <text x={width - 4} y={yy + 4} fontSize="13" textAnchor="end" fill={c.ink} fontWeight={500} className="tabular-nums">
                      {dumb ? fmt(r.to as number, kind) : `${fmt(r.from as number, kind)}\u2013${fmt(r.to as number, kind)}`}
                      {dumb && ch != null && <tspan dx={8} fontSize="12" fill={toneInk(r.to as number, r.from as number, polarity)}>{fmtDelta(ch)}</tspan>}
                    </text>
                  )}
                  {stacked && !missing && (
                    <text x={width - 4} y={padT + i * rowH + 16} fontSize="12" textAnchor="end" fill={c.ink} fontWeight={500} className="tabular-nums">
                      {dumb ? `${fmt(r.from as number, kind)} \u2192 ${fmt(r.to as number, kind)}` : `${fmt(r.from as number, kind)}\u2013${fmt(r.to as number, kind)}`}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {d && (
            <Tip x={x(d.to ?? ticks[0])} y={barY(h as number) - 72} bound={width}>
              <div className="mb-1 text-[12px] text-wc-tip-muted">{d.label}</div>
              <TipRow color={dumb ? c.compare : c.accent} dashed={dumb} label={fromL} value={d.from == null ? "No data" : fmt(d.from, kind, { compact: false })} />
              <TipRow color={c.accent} label={toL} value={d.to == null ? "No data" : fmt(d.to, kind, { compact: false })} />
              {!dumb && d.marker != null && <TipRow color={c.ink} label={markerLabel} value={fmt(d.marker, kind, { compact: false })} />}
              {d.from != null && d.to != null && (
                <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-white/10 pt-1.5 text-[12px]">
                  <span className="text-wc-tip-muted">{dumb ? "Change" : "Spread"}</span>
                  <b className="font-medium">{dumb ? (kind === "percent" ? fmtDelta((d.to - d.from) * 100, "points") : fmtDelta(d.to - d.from, kind, { compact: false })) : fmt(d.to - d.from, kind, { compact: false })}</b>
                </div>
              )}
            </Tip>
          )}
          <LiveRegion at={nav.pos} text={d ? say(d) : ""} />
        </div>
      </div>
      {dumb && stacked && d && d.from != null && d.to != null && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-wc-muted">{d.label}: <DeltaPill delta={pctChange(d.to, d.from)} polarity={polarity} /></p>
      )}
      {n === 1 && <SparseNote>One row so far. Add more to compare.</SparseNote>}
    </ChartCard>
  );
}

function changeWords(from: number, to: number) {
  const ch = pctChange(to, from);
  return ch == null ? "new" : ch === 0 ? "no change" : `${ch > 0 ? "up" : "down"} ${fmtDelta(Math.abs(ch)).replace(/^\+/, "")}`;
}
function toneInk(to: number, from: number, polarity: Polarity) {
  if (polarity === "neutral" || to === from) return c.muted;
  return (to > from) === (polarity === "up-good") ? c.positiveInk : c.negativeInk;
}
