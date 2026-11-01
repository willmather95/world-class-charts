"use client";
// Trend over time: one accent line with a soft area, an optional gray comparison line, a target
// line, annotations, event markers, a forecast range and an uncertainty band (low/high per point).
// Direct labels at the line ends instead of a legend. Long series (thousands of points) are drawn
// with LTTB downsampling; the table, tooltip and keys still use every point. Press S to hear it.
// States: loading, error, empty (0 points), single point (dot + note), sparse (2-3 points: straight
// segments with markers). Keyboard, touch and a table fallback built in.
import { useId } from "react";
import { ChartCard, DeltaPill, SparseNote, Stat, Tip, TipRow, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, fmtDate, pctChange, timeTicks, type Grain, type NumKind, type Polarity } from "./format";
import { LiveRegion, nearestIndex, usePlotNav } from "./interaction";
import { c, linePath, lttb, maxTicksFor, monotonePath, niceTicks, pickIndices, scaleLinear, sizeOf, soft, useTween, useWidth, type Pt } from "./lib";

/** low/high: an uncertainty band (forecast range, confidence interval). Say what it is in bandLabel. */
export type TrendPoint = { date: Date | string; value: number; compare?: number | null; low?: number | null; high?: number | null };

export function TrendAreaChart({
  title, subtitle, data, grain = "month", kind = "number", polarity = "up-good",
  valueLabel = "This period", compareLabel = "Last period",
  target, annotations = [], events = [], forecastFrom, bandLabel = "Likely range", height = 240, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  grain?: Grain;
  kind?: NumKind;
  polarity?: Polarity;
  valueLabel?: string;
  compareLabel?: string;
  /** Horizontal reference line: a goal, budget or benchmark. */
  target?: { value: number; label: string };
  /** Short notes pinned to points. Keep to 1-2. */
  annotations?: { index: number; text: string }[];
  /** Vertical rules for dated events (launch, outage, price change). Keep to 1-3. */
  events?: { index: number; text: string }[];
  /** Index where actuals end and forecast begins. Drawn dashed in a shaded range. */
  forecastFrom?: number;
  /** Plain words for the low/high band, e.g. "80% forecast range". Printed on the chart. */
  bandLabel?: string;
  height?: number;
  source?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const hintId = `${gid}-hint`;
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const n = data.length;
  const dates = data.map((d) => (d.date instanceof Date ? d.date : new Date(d.date)));
  const hasCmp = n > 0 && data.every((d) => d.compare != null);

  const vals = useTween([...data.map((d) => d.value), ...(hasCmp ? data.map((d) => d.compare as number) : [])]);
  const v = vals.slice(0, n);
  const cv = hasCmp ? vals.slice(n) : [];

  const axisW = size === "sm" ? 40 : 48;
  const padT = 18, padB = 36;
  const plotW = Math.max(40, width - axisW);
  const plotH = height - padT - padB;
  const hasBand = data.some((d) => d.low != null && d.high != null);
  const all = [...data.map((d) => d.value), ...(hasCmp ? data.map((d) => d.compare as number) : []), ...(hasBand ? data.flatMap((d) => [d.low ?? d.value, d.high ?? d.value]) : []), target?.value ?? 0];
  const lo = Math.min(0, ...all);
  const ticks = niceTicks(lo, Math.max(...all, 0) * 1.04, plotH < 170 ? 3 : 4);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const fmtAxis = axisFormatter(ticks, kind);
  const y = scaleLinear(yMin, yMax, padT + plotH, padT);
  const x = (i: number) => (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);

  const nav = usePlotNav(n, (px) => nearestIndex(px, plotW, n), 1, () => data.map((d) => d.value), { marks: () => [...annotations, ...events].map((a) => a.index) });
  const h = nav.active;

  const lastActual = forecastFrom != null ? Math.min(forecastFrom, n - 1) : n - 1;
  const latest = data[lastActual];
  const baseline = hasCmp ? latest?.compare ?? null : data[0]?.value ?? null;
  const delta = latest && baseline != null && n > 1 ? pctChange(latest.value, baseline) : null;

  const table = n ? {
    caption: `${title}, by ${grain}`,
    columns: ["Period", valueLabel, ...(hasCmp ? [compareLabel] : []), ...(hasBand ? [bandLabel] : [])],
    rows: data.map((d, i) => [fmtDate(dates[i], grain) + (forecastFrom != null && i > forecastFrom ? " (forecast)" : ""), fmt(d.value, kind, { compact: false }), ...(hasCmp ? [fmt(d.compare as number, kind, { compact: false })] : []), ...(hasBand ? [d.low != null && d.high != null ? `${fmt(d.low, kind, { compact: false })} to ${fmt(d.high, kind, { compact: false })}` : ""] : [])]),
  } : undefined;

  const summary = n
    ? `${title}. ${n} ${grain}s from ${fmtDate(dates[0], grain)} to ${fmtDate(dates[n - 1], grain)}. Latest ${fmt(latest.value, kind)}. Low ${fmt(Math.min(...data.map((d) => d.value)), kind)}, high ${fmt(Math.max(...data.map((d) => d.value)), kind)}. ${n > 1 ? (latest.value > data[0].value ? "Up" : latest.value < data[0].value ? "Down" : "Flat") + " since the start." : ""}`
    : title;

  const pts: Pt[] = v.map((val, i) => [x(i), y(val)]);
  const sparse = n < 4;
  // Long series: draw about 2 points per pixel column at most (LTTB keeps peaks and dips).
  const dense = n > plotW * 2;
  const keepIdx = (a: number, b: number, ys: number[]) => {
    const idx = Array.from({ length: b - a }, (_, k) => a + k);
    if (!dense) return idx;
    return lttb(idx.map((i) => ys[i]), Math.max(3, Math.round(((b - a) / n) * plotW * 1.5))).map((k) => idx[k]);
  };
  const thin = (a: number, b: number, src: Pt[], ys: number[]) => keepIdx(a, b, ys).map((i) => src[i]);
  const path = (p: Pt[]) => (sparse ? linePath(p) : dense ? linePath(p) : monotonePath(p));
  const actualPts = thin(0, lastActual + 1, pts, v);
  const fcPts = forecastFrom != null ? thin(lastActual, n, pts, v) : [];
  const cmpPts: Pt[] = cv.map((val, i) => [x(i), y(val)]);
  const cmpDraw = hasCmp ? thin(0, n, cmpPts, cv) : [];
  const bandIdx = hasBand ? keepIdx(0, n, v).filter((i) => data[i].low != null && data[i].high != null) : [];
  const bandPath = bandIdx.length > 1
    ? `${linePath(bandIdx.map((i) => [x(i), y(data[i].high as number)] as Pt))}L${bandIdx.slice().reverse().map((i) => `${x(i).toFixed(1)},${y(data[i].low as number).toFixed(1)}`).join("L")}Z`
    : "";
  const base = y(Math.max(yMin, 0));
  const area = actualPts.length > 1 ? `${path(actualPts)}L${x(lastActual)},${base}L0,${base}Z` : "";

  // Dense series: tick at period starts (month, or day for hourly data) instead of at evenly
  // spaced raw points, so labels land on round dates ("Feb", "Mar"), not "16, 3, 19".
  const maxT = maxTicksFor(plotW, size === "sm" ? 64 : 76);
  const starts = dense ? dates.map((d, i) => (i && d.getMonth() !== dates[i - 1].getMonth() ? i : -1)).filter((i) => i > 0) : [];
  const xTicks = dense && starts.length >= 2 ? pickIndices(starts.length, maxT).map((k) => starts[k]) : pickIndices(n, maxT);
  // Format only the ticks that draw. The year sub-label shows when the year changes between ticks.
  const tickLabels = dense && starts.length >= 2
    ? timeTicks(xTicks.map((i) => new Date(dates[i].getFullYear(), dates[i].getMonth(), 1)), "month")
    : timeTicks(xTicks.map((i) => dates[i]), grain);
  const labels = new Map(xTicks.map((i, k) => [i, tickLabels[k]]));

  // Direct labels at the right end of each line, nudged apart if they collide.
  let yA = pts[lastActual]?.[1] ?? 0;
  let yC = cmpPts[n - 1]?.[1] ?? 0;
  if (hasCmp && Math.abs(yA - yC) < 16) { const mid = (yA + yC) / 2; const s = yA <= yC ? -1 : 1; yA = mid + s * 8; yC = mid - s * 8; }

  const bandAt = (i: number) => (data[i]?.low != null && data[i]?.high != null ? `${fmt(data[i].low as number, kind)} to ${fmt(data[i].high as number, kind)}` : "");
  const live = h != null && data[h] ? `${fmtDate(dates[h], grain)}: ${valueLabel} ${fmt(data[h].value, kind)}${hasCmp ? `, ${compareLabel} ${fmt(data[h].compare as number, kind)}` : ""}${bandAt(h) ? `, ${bandLabel.toLowerCase()} ${bandAt(h)}` : ""}${events.find((e) => e.index === h) ? `. ${events.find((e) => e.index === h)!.text}` : ""}` : "";

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0} skeleton="line" bodyHeight={height + 64} keys={annotations.length + events.length ? "N, P: notes. S plays sound." : "S plays sound."} {...state}>
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        {latest && (
          <Stat
            label={forecastFrom != null ? `${valueLabel}, latest actual` : valueLabel}
            value={fmt(latest.value, kind, { compact: false })}
            extra={n > 1 && <DeltaPill delta={delta} polarity={polarity} label={hasCmp ? `vs ${compareLabel.toLowerCase()}` : "since start"} />}
          />
        )}
        {n > 1 && <span className="pb-1 text-[12px] text-wc-muted">{hasCmp ? `vs ${compareLabel.toLowerCase()}` : `since ${fmtDate(dates[0], grain)}`}</span>}
      </div>

      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="chart" aria-label={summary} aria-describedby={hintId} style={{ ...nav.bind.style, height }}>
        <span id={hintId} className="sr-only">Use left and right arrow keys to read each value. Page up and page down jump further. Press S to hear the trend as rising and falling tones.{hasBand ? ` The shaded band shows the ${bandLabel.toLowerCase()}.` : ""}</span>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={c.accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {forecastFrom != null && n > 1 && (
            <g>
              <rect x={x(lastActual)} y={padT} width={plotW - x(lastActual)} height={plotH} fill={c.surface2} />
              {/* Keep the label inside the plot: right-align it when the forecast band is narrow. */}
              {plotW - x(lastActual) >= 60
                ? <text x={x(lastActual) + 6} y={padT + 12} fontSize="12" fill={c.muted}>Forecast</text>
                : <text x={plotW - 4} y={padT + plotH - 8} fontSize="12" textAnchor="end" fill={c.muted}>Forecast</text>}
            </g>
          )}

          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? c.axis : c.grid} strokeWidth={1} />
              <text x={plotW + 8} y={y(t) + 4} fontSize="12" fill={c.muted} className="tabular-nums">{fmtAxis(t)}</text>
            </g>
          ))}

          {target && (
            <g>
              <line x1={0} x2={plotW} y1={y(target.value)} y2={y(target.value)} stroke={c.axis} strokeDasharray="5 4" />
              <text x={4} y={y(target.value) - 6} fontSize="12" fill={c.ink2} fontWeight={500}>{target.label} {fmt(target.value, kind)}</text>
            </g>
          )}

          {(() => {
            // Event labels sit above the plot. When two would touch, the later one drops into
            // the plot beside its rule, so labels never overlap at phone widths.
            let prevEnd = -Infinity;
            return events.filter((e) => e.index < n).sort((a, b) => a.index - b.index).map((e) => {
              const ex = x(e.index), w = e.text.length * 6.6;
              const anchor = ex < w / 2 + 4 ? "start" : ex > plotW - w / 2 - 4 ? "end" : "middle";
              const left = anchor === "start" ? ex : anchor === "end" ? ex - w : ex - w / 2;
              const inside = left < prevEnd + 8;
              if (!inside) prevEnd = left + w;
              return (
                <g key={`ev-${e.index}`}>
                  <line x1={ex} x2={ex} y1={padT - 2} y2={padT + plotH} stroke={c.axis} strokeDasharray="2 3" />
                  {inside
                    ? <text x={ex + 4} y={padT + 12} fontSize="12" fill={c.ink2} fontWeight={500} stroke={c.surface} strokeWidth={3} paintOrder="stroke">{e.text}</text>
                    : <text x={ex + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0)} y={padT - 6} textAnchor={anchor} fontSize="12" fill={c.ink2} fontWeight={500}>{e.text}</text>}
                </g>
              );
            });
          })()}

          {bandPath && <path d={bandPath} fill={soft(c.accent, 18)} stroke="none" />}
          {bandPath && n > 1 && (() => {
            const i = bandIdx[Math.floor(bandIdx.length * 0.6)] ?? bandIdx[0];
            return <text x={x(i)} y={y(data[i].high as number) - 6} textAnchor="middle" fontSize="12" fill={c.accentInk}>{bandLabel}</text>;
          })()}

          {hasCmp && n > 1 && <path d={path(cmpDraw)} fill="none" stroke={c.compare} strokeWidth="1.5" strokeDasharray="1 0" />}
          {area && <path d={area} fill={`url(#fill-${gid})`} />}
          {actualPts.length > 1 && <path d={path(actualPts)} fill="none" stroke={c.accent} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />}
          {fcPts.length > 1 && <path d={path(fcPts)} fill="none" stroke={c.accent} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />}

          {/* Markers: always for sparse data, so a 2-point line still reads as two readings. */}
          {(sparse || n === 1) && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={n === 1 ? 6 : 4} fill={c.accent} stroke={c.surface} strokeWidth="2" />)}
          {n === 1 && <text x={pts[0][0]} y={pts[0][1] - 14} textAnchor="middle" fontSize="13" fontWeight={600} fill={c.ink}>{fmt(data[0].value, kind)}</text>}

          {/* Direct labels */}
          {n > 1 && h == null && !dense && (
            <g fontSize="12" fontWeight={500} textAnchor="end">
              <text x={x(lastActual) - 6} y={yA - 8} fill={c.accentInk}>{valueLabel}</text>
              {hasCmp && <text x={plotW - 6} y={yC + (yC > yA ? 18 : -8)} fill={c.muted}>{compareLabel}</text>}
            </g>
          )}

          {annotations.filter((a) => a.index < n).map((a) => {
            const [ax, ay] = pts[a.index];
            const up = ay - padT > 40;
            const anchor = ax < 60 ? "start" : ax > plotW - 60 ? "end" : "middle";
            return (
              <g key={a.index}>
                <line x1={ax} x2={ax} y1={ay - 6} y2={up ? ay - 22 : ay + 22} stroke={c.ink2} />
                <circle cx={ax} cy={ay} r="3.5" fill={c.surface} stroke={c.ink} strokeWidth="1.5" />
                <text x={ax} y={up ? ay - 27 : ay + 34} textAnchor={anchor} fontSize="12" fill={c.ink2}>{a.text}</text>
              </g>
            );
          })}

          {h != null && n > 1 && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={padT} y2={padT + plotH} stroke={c.axis} />
              {hasCmp && <circle cx={x(h)} cy={cmpPts[h][1]} r="4.5" fill={c.compare} stroke={c.surface} strokeWidth="2" />}
              <circle cx={x(h)} cy={pts[h][1]} r="5" fill={c.accent} stroke={c.surface} strokeWidth="2" />
            </g>
          )}

          {xTicks.map((i) => {
            const anchor = n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle";
            return (
              <g key={i} fontSize="12" textAnchor={anchor} fill={i === h ? c.ink : c.muted} fontWeight={i === h ? 600 : 400}>
                <text x={x(i)} y={padT + plotH + 18}>{labels.get(i)?.label}</text>
                {labels.get(i)?.sub && <text x={x(i)} y={padT + plotH + 32} fill={c.muted} fontWeight={400}>{labels.get(i)?.sub}</text>}
              </g>
            );
          })}
        </svg>

        {h != null && data[h] && n > 1 && (
          <Tip x={x(h)} y={Math.min(pts[h][1], hasCmp ? cmpPts[h][1] : Infinity) - 88} bound={plotW}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{fmtDate(dates[h], grain)}{forecastFrom != null && h > forecastFrom ? " (forecast)" : ""}</div>
            <TipRow color={c.accent} label={valueLabel} value={fmt(data[h].value, kind, { compact: false })} />
            {bandAt(h) && <div className="text-[12px] text-wc-tip-muted">{bandLabel}: {fmt(data[h].low as number, kind)} to {fmt(data[h].high as number, kind)}</div>}
            {hasCmp && <TipRow color={c.compare} label={compareLabel} value={fmt(data[h].compare as number, kind, { compact: false })} />}
            {hasCmp && (
              <div className="mt-1.5 border-t border-white/10 pt-1.5 text-[12px]">
                <DeltaPill delta={pctChange(data[h].value, data[h].compare as number)} polarity={polarity} label={`vs ${compareLabel.toLowerCase()}`} />
              </div>
            )}
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={live} />
      </div>
      {n === 1 && <SparseNote>One reading so far. The trend line appears after the next update.</SparseNote>}
      {n > 1 && n < 4 && <SparseNote>Only {n} readings so far, so each one is marked.</SparseNote>}
    </ChartCard>
  );
}
