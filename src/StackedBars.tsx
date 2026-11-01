"use client";
// Stacked columns, in counts ("stacked") or shares ("percent", every column sums to 100%).
// Only the bottom segment shares a baseline, so put the series that matters most first.
// Thin surface gaps separate segments (Atlassian). Direct labels sit to the right of the last
// column on wider cards; on phones a key moves above the plot. Totals sit on top in counts mode.
// States: loading, error, empty, single column, zero-total column (drawn as an empty slot).
// picker: toggle chips (aria-pressed) above the plot let the reader hide parts; totals follow.
import { useState } from "react";
import { ChartCard, LegendKey, SparseNote, Swatch, Tip, TipRow, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, fmtPercent, type NumKind } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { barPath, c, cat, catPat, maxTicksFor, niceTicks, pickIndices, scaleLinear, sizeOf, sum, useTween, useWidth } from "./lib";

export type StackSeries = { key: string; label: string; color?: string };
export type StackPoint = { label: string; values: number[] };

export function StackedBars({
  title, subtitle, series, data, mode = "stacked", kind = "number", height = 240, picker = false, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  /** Bottom to top. Keep to 5 or fewer; group the rest. */
  series: StackSeries[];
  data: StackPoint[];
  mode?: "stacked" | "percent";
  kind?: NumKind;
  height?: number;
  /** Show toggle chips so the reader can hide and show parts. The table keeps every part. */
  picker?: boolean;
  source?: string;
}) {
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());
  const on = (k: number) => !hidden.has(k);
  const toggle = (k: number) => setHidden((h) => {
    const next = new Set(h);
    if (next.has(k)) next.delete(k); else if (series.length - next.size > 1) next.add(k); // keep one
    return next;
  });
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const n = data.length;
  const colors = series.map((s, i) => s.color ?? cat(i));
  // Pattern slot for the pattern toggle (prefs.tsx). Custom colors opt out: the fill would not match.
  const pat = (k: number) => (series[k].color ? undefined : catPat(k));
  const shownV = (d: StackPoint) => d.values.map((v, k) => (on(k) ? v : 0));
  const totals = data.map((d) => sum(shownV(d)));
  const allTotals = data.map((d) => sum(d.values));
  const norm = data.map((d, i) => shownV(d).map((v) => (mode === "percent" ? (totals[i] ? v / totals[i] : 0) : v)));
  const anim = useTween(norm.flat());
  const direct = size !== "sm" && series.length <= 6;
  const vis = series.map((_, k) => k).filter(on);
  // Summary facts: the biggest part over the whole range and the peak period.
  const partSum = series.map((_, k) => sum(data.map((d) => d.values[k] ?? 0)));
  const grand = sum(partSum);
  const big = partSum.indexOf(Math.max(...partSum));
  const peak = allTotals.indexOf(Math.max(...allTotals));
  const sumText = n && grand > 0 ? ` Largest part: ${series[big]?.label}, ${fmtPercent(partSum[big] / grand)} of the total.${mode === "stacked" && n > 1 ? ` Peak: ${data[peak].label}, ${fmt(allTotals[peak], kind)}.` : ""}` : "";
  const labelW = direct ? Math.min(120, width * 0.2) : 0;
  const axisW = size === "sm" ? 36 : 44, padT = mode === "stacked" ? 20 : 8, padB = 26;
  const plotX = axisW, plotW = Math.max(40, width - axisW - labelW);
  const plotH = height - padT - padB;
  const ticks = mode === "percent" ? [0, 0.25, 0.5, 0.75, 1] : niceTicks(0, Math.max(1, ...totals), plotH < 170 ? 3 : 4);
  const fmtAxis = axisFormatter(ticks, mode === "percent" ? "percent" : kind);
  const y = scaleLinear(0, ticks[ticks.length - 1], padT + plotH, padT);
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(4, Math.min(40, slot * 0.58));
  const nav = usePlotNav(n, (px) => Math.floor((px - plotX) / slot), 1, undefined, { values: () => totals });
  const h = nav.active;
  const xLabels = new Set(pickIndices(n, maxTicksFor(plotW, 52)));
  const segs = (i: number) => {
    let acc = 0;
    return series.map((_, k) => { const v = anim[i * series.length + k] ?? 0; const s = { y0: acc, y1: acc + v }; acc += v; return s; });
  };
  // Direct labels: center on the last column's segments, then push apart to avoid overlap.
  const last = n - 1;
  const lab = n ? segs(last).map((s, k) => ({ k, y: y((s.y0 + s.y1) / 2) })) : [];
  for (let k = 1; k < lab.length; k++) if (lab[k - 1].y - lab[k].y < 15) lab[k].y = lab[k - 1].y - 15;
  const table = n ? {
    caption: title,
    columns: ["Period", ...series.map((s) => s.label), "Total"],
    rows: data.map((d, i) => [d.label, ...d.values.map((v) => (mode === "percent" ? `${fmt(v, kind, { compact: false })} (${fmtPercent(allTotals[i] ? v / allTotals[i] : 0)})` : fmt(v, kind, { compact: false }))), fmt(allTotals[i], kind, { compact: false })]),
  } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0 || sum(totals) === 0} skeleton="bars" bodyHeight={height + (direct ? 0 : 28)} {...state}>
      {picker ? (
        <div role="group" aria-label="Show parts" className="wc-noprint mb-3 flex flex-wrap gap-1.5">
          {series.map((s, k) => (
            <button key={s.key} type="button" aria-pressed={on(k)} onClick={() => toggle(k)}
              className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 transition-colors duration-[var(--wc-dur-press)] focus-visible:outline-2 focus-visible:outline-wc-focus ${on(k) ? "bg-wc-surface-2 text-wc-ink ring-wc-hairline" : "text-wc-muted ring-wc-hairline line-through decoration-1"}`}>
              <Swatch color={on(k) ? colors[k] : "var(--wc-track)"} pat={on(k) ? pat(k) : undefined} />
              {s.label}
            </button>
          ))}
        </div>
      ) : !direct && <div className="mb-3"><LegendKey items={series.map((s, i) => ({ label: s.label, color: colors[i], pat: pat(i) }))} /></div>}
      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="chart" aria-label={`${title}. ${n} periods, ${vis.length === series.length ? `${series.length} parts each` : `showing ${vis.length} of ${series.length} parts`}.${sumText} Arrow keys move between periods.`} style={{ ...nav.bind.style, height }}>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={plotX} x2={plotX + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? c.axis : c.grid} />
              <text x={plotX - 8} y={y(t) + 4} fontSize="12" textAnchor="end" fill={c.muted} className="tabular-nums">{fmtAxis(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x0 = plotX + slot * i + (slot - barW) / 2;
            // The active column gets a surface-2 band and a bold label. Other columns keep full
            // color: dimming a stack below 3:1 would hide the segment edges.
            return (
              <g key={d.label}>
                {i === h && <rect x={plotX + slot * i + 2} y={padT - (mode === "stacked" ? 18 : 6)} width={slot - 4} height={plotH + (mode === "stacked" ? 18 : 6)} rx={10} fill={c.surface2} />}
                {segs(i).map((s, k) => {
                  const top = y(s.y1), bottom = y(s.y0);
                  const hh = bottom - top;
                  if (hh < 0.5) return null;
                  const isTop = k === series.length - 1 || segs(i).slice(k + 1).every((q) => q.y1 - q.y0 <= 0);
                  if (isTop) return <path key={k} d={barPath(x0, bottom - 1.5, barW, Math.max(1, hh - 1.5), Math.min(4, barW / 4))} fill={colors[k]} data-wc-pat={pat(k)} />;
                  return <rect key={k} x={x0} y={top} width={barW} height={Math.max(0, hh - 1.5)} rx={1} fill={colors[k]} data-wc-pat={pat(k)} />;
                })}
                {mode === "stacked" && slot >= 34 && totals[i] > 0 && (
                  <text x={x0 + barW / 2} y={y(totals[i]) - 6} textAnchor="middle" fontSize="12" fontWeight={500} fill={c.ink2} className="tabular-nums">{fmt(totals[i], kind)}</text>
                )}
                {(xLabels.has(i) || i === h) && <text x={x0 + barW / 2} y={height - 6} fontSize="12" textAnchor="middle" fill={i === h ? c.ink : c.muted} fontWeight={i === h ? 600 : 400}>{d.label}</text>}
              </g>
            );
          })}
          {direct && lab.filter((l) => on(l.k)).map((l) => (
            <g key={l.k}>
              <rect x={plotX + plotW + 8} y={l.y - 5} width={3} height={10} rx={1.5} fill={colors[l.k]} data-wc-pat={pat(l.k)} />
              <text x={plotX + plotW + 16} y={l.y + 4} fontSize="12" fill={c.ink2}>{series[l.k].label}</text>
            </g>
          ))}
        </svg>
        {h != null && data[h] && (
          <Tip x={plotX + slot * h + slot / 2 + barW / 2} y={padT + 4} bound={plotX + plotW}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{data[h].label}</div>
            {[...series].map((s, k) => ({ s, k })).filter(({ k }) => on(k)).reverse().map(({ s, k }) => (
              <TipRow key={s.key} pat={pat(k)} color={colors[k]} label={s.label} value={`${fmt(data[h].values[k], kind, { compact: false })}${mode === "percent" ? ` \u00b7 ${fmtPercent(totals[h] ? data[h].values[k] / totals[h] : 0)}` : ""}`} />
            ))}
            <div className="mt-1.5 flex justify-between gap-3 border-t border-white/10 pt-1.5 text-[12px]"><span className="text-wc-tip-muted">Total</span><b className="font-medium">{fmt(totals[h], kind, { compact: false })}</b></div>
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={h != null && data[h] ? `${data[h].label}: ${vis.map((k) => `${series[k].label} ${fmt(data[h].values[k], kind)}`).join(", ")}. Total ${fmt(totals[h], kind)}` : ""} />
      </div>
      {n === 1 && <SparseNote>One period so far.</SparseNote>}
    </ChartCard>
  );
}
