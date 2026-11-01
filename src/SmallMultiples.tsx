"use client";
// Small multiples: one small line per series, all on the SAME scale, in a grid (Tufte, Datawrapper).
// Use instead of a spaghetti line chart with 5+ series. The crosshair is synced: hover or move
// in any panel and every panel marks the same period; each header shows that period's value. One tab stop. Left/Right move in time,
// Up/Down move between panels, Home/End jump, S plays the active panel as sound, Esc clears.
// Gaps (null) break the line instead of drawing through missing data.
// States: loading, error, empty (no series or no dates), single period (dots + note).
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChartCard, SparseNote, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, fmtDate, fmtDelta, pctChange, timeTicks, tone, type Grain, type NumKind, type Polarity } from "./format";
import { LiveRegion } from "./interaction";
import { c, clamp, linePath, niceTicks, scaleLinear, sizeOf, soft, useWidth, type Pt } from "./lib";
import { playSeries, stopSound } from "./sound";

export type Multiple = { label: string; values: (number | null)[] };

export function SmallMultiples({
  title, subtitle, dates, series, grain = "month", kind = "number", polarity = "up-good",
  panelHeight = 84, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  dates: (Date | string)[];
  series: Multiple[];
  grain?: Grain;
  kind?: NumKind;
  polarity?: Polarity;
  panelHeight?: number;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(720);
  const size = sizeOf(width);
  const ds = dates.map((d) => (d instanceof Date ? d : new Date(d)));
  const n = ds.length, P = series.length;
  const empty = n === 0 || P === 0;
  const cols = Math.max(1, Math.min(P, size === "sm" ? 2 : size === "md" ? 3 : 4));
  const rowsN = Math.ceil(P / cols);
  const gapX = size === "sm" ? 14 : 20, gapY = 18, headH = 34, footH = 18;
  const panelW = (width - gapX * (cols - 1)) / cols;
  const cellH = headH + panelHeight + footH;
  const known = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const ticks = niceTicks(Math.min(0, ...known), Math.max(1, ...known), 2);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const fmtAxis = axisFormatter(ticks, kind);
  const y = scaleLinear(yMin, yMax, headH + panelHeight, headH + 4);
  const x = (t: number) => (n <= 1 ? panelW / 2 : 4 + (t / (n - 1)) * (panelW - 8));
  const origin = (p: number) => ({ px: (p % cols) * (panelW + gapX), py: Math.floor(p / cols) * (cellH + gapY) });
  const total = rowsN * cellH + (rowsN - 1) * gapY;
  const labels = timeTicks(ds, grain);

  const [act, setActRaw] = useState<{ p: number; t: number } | null>(null);
  const [why, setWhy] = useState("");
  const setAct: typeof setActRaw = (v) => { setWhy(""); setActRaw(v); };
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const col = clamp(Math.floor(mx / (panelW + gapX)), 0, cols - 1), row = clamp(Math.floor(my / (cellH + gapY)), 0, rowsN - 1);
    const p = row * cols + col;
    if (p >= P) return;
    const lx = mx - origin(p).px;
    setAct({ p, t: n <= 1 ? 0 : clamp(Math.round(((lx - 4) / (panelW - 8)) * (n - 1)), 0, n - 1) });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (empty) return;
    const cur = act ?? { p: 0, t: n - 1 };
    let next: typeof act = cur;
    switch (e.key) {
      case "ArrowRight": next = { ...cur, t: Math.min(n - 1, cur.t + 1) }; break;
      case "ArrowLeft": next = { ...cur, t: Math.max(0, cur.t - 1) }; break;
      case "ArrowDown": next = { ...cur, p: Math.min(P - 1, cur.p + 1) }; break;
      case "ArrowUp": next = { ...cur, p: Math.max(0, cur.p - 1) }; break;
      case "Home": next = { ...cur, t: 0 }; break;
      case "End": next = { ...cur, t: n - 1 }; break;
      case "Escape": next = null; stopSound(); break;
      case "s": case "S":
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault(); playSeries(series[cur.p].values.map((v) => v ?? NaN)); return;
      case "h": case "H": case "l": case "L": {
        // Highest or lowest point in the current panel.
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const hi = e.key.toLowerCase() === "h";
        let best = -1;
        series[cur.p].values.forEach((v, t) => { if (v == null || t >= n) return; const b = series[cur.p].values[best]; if (best < 0 || (hi ? v > (b as number) : v < (b as number))) best = t; });
        if (best < 0) return;
        e.preventDefault(); setActRaw({ ...cur, t: best }); setWhy(hi ? "Highest" : "Lowest"); return;
      }
      default: return;
    }
    e.preventDefault();
    setAct(next);
  };

  const at = (p: number, t: number) => series[p]?.values[t] ?? null;
  const lastOf = (s: Multiple) => { for (let t = s.values.length - 1; t >= 0; t--) if (s.values[t] != null) return t; return -1; };
  const say = act ? `${series[act.p].label}, ${fmtDate(ds[act.t], grain)}: ${at(act.p, act.t) == null ? "no data" : fmt(at(act.p, act.t) as number, kind)}` : "";
  const table = !empty ? {
    caption: `${title}, by ${grain}`,
    columns: ["Period", ...series.map((s) => s.label)],
    rows: ds.map((d, t) => [fmtDate(d, grain), ...series.map((s) => (s.values[t] == null ? "No data" : fmt(s.values[t] as number, kind, { compact: false })))]),
  } : undefined;
  const summary = `${title}. ${P} small charts on one shared scale from ${fmtAxis(yMin)} to ${fmtAxis(yMax)}, ${n} ${grain}s each. Arrow keys: left and right move in time, up and down move between charts.`;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={empty} skeleton="grid" bodyHeight={Math.max(200, total + 24)} keys="Up, Down change chart. S plays sound." {...state}>
      {/* Shared readout instead of a tooltip: the date here, each panel's value in its header. */}
      <p className="mb-3 flex flex-wrap justify-between gap-x-4 text-[12px] text-wc-muted">
        <span>Same scale in every panel: {fmtAxis(yMin)} to {fmtAxis(yMax)}.</span>
        <span aria-hidden className="font-medium text-wc-ink">{act ? fmtDate(ds[act.t], grain) : n ? `Latest: ${fmtDate(ds[n - 1], grain)}` : ""}</span>
      </p>
      <div ref={wrap}>
        <div
          tabIndex={0} data-wc-plot="" role="group" aria-roledescription="small multiples" aria-label={summary}
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => { if (e.pointerType === "mouse") setAct(null); }}
          onKeyDown={onKeyDown} onFocus={() => setAct((a) => a ?? { p: 0, t: n - 1 })} onBlur={() => { setAct(null); stopSound(); }}
          style={{ touchAction: "pan-y", height: total }}
          className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-wc-focus focus-visible:ring-offset-4 focus-visible:ring-offset-wc-surface"
        >
          <svg width={width} height={total} className="block overflow-visible" aria-hidden>
            {series.map((s, p) => {
              const { px, py } = origin(p);
              const on = act?.p === p;
              const li = lastOf(s);
              const last = li >= 0 ? (s.values[li] as number) : null;
              const shown = act ? at(p, act.t) : last;
              const firstV = s.values.find((v) => v != null) ?? null;
              const d = last != null && firstV != null && li > 0 ? pctChange(last, firstV) : null;
              const tn = d == null ? "neutral" : tone(d, polarity);
              // Split at gaps so missing data is never drawn as a line.
              const segs: Pt[][] = [];
              s.values.forEach((v, t) => { if (v == null) { segs.push([]); return; } if (!segs.length) segs.push([]); segs[segs.length - 1].push([x(t), y(v)]); });
              const base = y(Math.max(0, yMin));
              return (
                <g key={s.label} transform={`translate(${px},${py})`}>
                  {on && <rect x={-6} y={-4} width={panelW + 12} height={cellH + 4} rx={10} fill={c.surface2} />}
                  <text x={0} y={13} fontSize="12" fill={on ? c.ink : c.ink2} fontWeight={on ? 600 : 500}>{s.label}</text>
                  <text x={panelW} y={13} fontSize="13" textAnchor="end" fill={c.ink} fontWeight={600} className="tabular-nums">{shown == null ? "No data" : fmt(shown, kind)}</text>
                  {d != null && !act && <text x={panelW} y={28} fontSize="12" textAnchor="end" className="tabular-nums" fill={tn === "positive" ? c.positiveInk : tn === "negative" ? c.negativeInk : c.muted}>{fmtDelta(d)}</text>}
                  <line x1={0} x2={panelW} y1={y(yMax)} y2={y(yMax)} stroke={c.grid} />
                  <line x1={0} x2={panelW} y1={base} y2={base} stroke={c.axis} />
                  {segs.filter((g) => g.length > 1).map((g, k) => (
                    <g key={k}>
                      <path d={`${linePath(g)}L${g[g.length - 1][0]},${base}L${g[0][0]},${base}Z`} fill={soft(c.accent, 12)} />
                      <path d={linePath(g)} fill="none" stroke={c.accent} strokeWidth={on ? 2.25 : 1.75} strokeLinejoin="round" strokeLinecap="round" />
                    </g>
                  ))}
                  {segs.filter((g) => g.length === 1).map((g, k) => <circle key={`d${k}`} cx={g[0][0]} cy={g[0][1]} r={3} fill={c.accent} />)}
                  {act && at(p, act.t) != null && (
                    <g>
                      <line x1={x(act.t)} x2={x(act.t)} y1={headH} y2={headH + panelHeight} stroke={c.axis} />
                      <circle cx={x(act.t)} cy={y(at(p, act.t) as number)} r={on ? 4.5 : 3.5} fill={c.accent} stroke={c.surface} strokeWidth={2} />
                    </g>
                  )}
                  {n > 1 && (
                    <g fontSize="12" fill={c.muted}>
                      <text x={0} y={headH + panelHeight + 15}>{labels[0].label}{labels[0].sub ? ` ${labels[0].sub}` : ""}</text>
                      <text x={panelW} y={headH + panelHeight + 15} textAnchor="end">{labels[n - 1].label}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          <LiveRegion text={say} at={act ? `${why ? `${why}. ` : ""}${act.t + 1} of ${n}, chart ${act.p + 1} of ${P}` : ""} />
        </div>
      </div>
      {n === 1 && <SparseNote>One period so far. Lines appear after the next update.</SparseNote>}
    </ChartCard>
  );
}
