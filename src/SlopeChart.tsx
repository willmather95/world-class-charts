"use client";
// Slope chart: each item's change between two points in time (before vs after, 2025 vs 2026).
// Reads faster than a paired bar when the story is "who rose, who fell". Every line is labeled
// directly at both ends (labels pushed apart by dodge(), so they never overlap). Rising and falling
// lines differ by color AND by the signed change printed on the right, so color is never alone.
// highlight: name 1-3 items to keep in color; the rest go gray (FT and NYT "focus" style).
// One tab stop; Up/Down move between items. States: loading, error, empty, missing end (row skipped, noted).
import { ChartCard, DeltaPill, SparseNote, Tip, TipRow, type StateProps } from "./ChartCard";
import { fmt, fmtDelta, pctChange, tone, type NumKind, type Polarity } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, dodge, scaleLinear, sizeOf, useTween, useWidth } from "./lib";

export type SlopeRow = { label: string; from: number | null; to: number | null };

export function SlopeChart({
  title, subtitle, data, fromLabel, toLabel, kind = "number", polarity = "up-good", highlight, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: SlopeRow[];
  fromLabel: string;
  toLabel: string;
  kind?: NumKind;
  polarity?: Polarity;
  highlight?: string[];
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(480);
  const size = sizeOf(width);
  const rows = data.filter((r) => r.from != null && r.to != null) as { label: string; from: number; to: number }[];
  const skipped = data.length - rows.length;
  const n = rows.length;
  const anim = useTween(rows.flatMap((r) => [r.from, r.to]), { from: "target" });
  const lo = Math.min(...rows.flatMap((r) => [r.from, r.to])), hi = Math.max(...rows.flatMap((r) => [r.from, r.to]));
  const gap = 18, padT = 30, padB = 10;
  const height = Math.max(200, padT + padB + n * gap * 1.4);
  const y = scaleLinear(lo, hi === lo ? lo + 1 : hi, height - padB, padT);
  const leftW = size === "sm" ? 56 : 132, rightW = size === "sm" ? 128 : 172;
  const xa = leftW + 10, xb = width - rightW - 10;
  const ly = dodge(rows.map((_, i) => y(anim[2 * i])), gap, padT, height - padB);
  const ry = dodge(rows.map((_, i) => y(anim[2 * i + 1])), gap, padT, height - padB);
  const nav = usePlotNav(n, (_px, py) => {
    let best = -1, d = Infinity;
    rows.forEach((_, i) => { const m = Math.min(Math.abs(py - ly[i]), Math.abs(py - ry[i])); if (m < d) { d = m; best = i; } });
    return best < 0 || d > 24 ? null : best;
  }, 1, undefined, { values: () => rows.map((r) => r.to - r.from) });
  const h = nav.active;
  const chg = (r: { from: number; to: number }) => pctChange(r.to, r.from);
  const colorOf = (r: { label: string; from: number; to: number }, i: number) => {
    if (highlight && !highlight.includes(r.label) && i !== h) return c.compare;
    const t = tone(r.to - r.from, polarity);
    return t === "positive" ? c.positive : t === "negative" ? c.negative : c.compare;
  };
  // Summary facts: the biggest rise and the biggest fall, by raw change.
  const byMove = [...rows].sort((p, q) => (q.to - q.from) - (p.to - p.from));
  const up = byMove[0], dn = byMove[byMove.length - 1];
  const moveText = (r: { from: number; to: number }) => `${r.to >= r.from ? "up" : "down"} ${fmt(Math.abs(r.to - r.from), kind)}${chg(r) != null ? ` (${fmtDelta(chg(r) as number).replace(/^[+\u2212]/, "")})` : ""}`;
  const moves = n > 1 && up && dn ? `${up.to > up.from ? ` Biggest rise: ${up.label}, ${moveText(up)}.` : ""}${dn.to < dn.from ? ` Biggest fall: ${dn.label}, ${moveText(dn)}.` : ""}` : "";
  const say = (r: { label: string; from: number; to: number }) => `${r.label}: ${fromLabel} ${fmt(r.from, kind)}, ${toLabel} ${fmt(r.to, kind)}, ${chg(r) == null ? "new" : fmtDelta(chg(r) as number)}`;
  const table = data.length ? {
    caption: `${title}, ${fromLabel} vs ${toLabel}`,
    columns: ["Item", fromLabel, toLabel, "Change"],
    rows: data.map((r) => [r.label, r.from == null ? "No data" : fmt(r.from, kind, { compact: false }), r.to == null ? "No data" : fmt(r.to, kind, { compact: false }), r.from != null && r.to != null && chg(r as { from: number; to: number }) != null ? fmtDelta(chg(r as { from: number; to: number }) as number) : ""]),
  } : undefined;
  const ch = Math.max(5, Math.floor((size === "sm" ? rightW - 52 : rightW - 64) / 6.8));

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0} skeleton="rows" bodyHeight={height} {...state}>
      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="slope chart" aria-label={`${title}. ${n} items from ${fromLabel} to ${toLabel}.${moves} Arrow keys move between items. H and L jump to the biggest rise and fall.`} style={{ ...nav.bind.style, height }}>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <text x={xa} y={14} fontSize="12" fontWeight={600} fill={c.ink2} textAnchor="middle">{fromLabel}</text>
          <text x={xb} y={14} fontSize="12" fontWeight={600} fill={c.ink2} textAnchor="middle">{toLabel}</text>
          <line x1={xa} x2={xa} y1={padT - 8} y2={height - padB + 4} stroke={c.grid} />
          <line x1={xb} x2={xb} y1={padT - 8} y2={height - padB + 4} stroke={c.grid} />
          {rows.map((r, i) => ({ r, i })).sort((a, b) => (a.i === h ? 1 : b.i === h ? -1 : (colorOf(a.r, a.i) === c.compare ? -1 : 1))).map(({ r, i }) => {
            const col = colorOf(r, i), on = i === h, dim = h != null && !on;
            const y0 = y(anim[2 * i]), y1 = y(anim[2 * i + 1]);
            const d = chg(r);
            return (
              <g key={r.label}>
                <line x1={xa} x2={xb} y1={y0} y2={y1} stroke={dim ? c.compare : col} strokeWidth={on ? 3 : 2} strokeLinecap="round" />
                <circle cx={xa} cy={y0} r={on ? 4.5 : 3.5} fill={dim ? c.compare : col} stroke={c.surface} strokeWidth={1.5} />
                <circle cx={xb} cy={y1} r={on ? 4.5 : 3.5} fill={dim ? c.compare : col} stroke={c.surface} strokeWidth={1.5} />
                <text x={xa - 10} y={ly[i] + 4} textAnchor="end" fontSize="12" fill={on ? c.ink : c.ink2} fontWeight={on ? 600 : 400} className="tabular-nums">
                  {size === "sm" ? fmt(r.from, kind) : <>{trimTo(r.label, 10)} <tspan fill={c.ink} fontWeight={600}>{fmt(r.from, kind)}</tspan></>}
                </text>
                <text x={xb + 10} y={ry[i] + 4} fontSize="12" fill={on ? c.ink : c.ink2} fontWeight={on ? 600 : 400} className="tabular-nums">
                  <tspan fill={c.ink} fontWeight={600}>{fmt(r.to, kind)}</tspan> {trimTo(r.label, ch)}
                  {d != null && size !== "sm" && <tspan dx={4} fill={tone(d, polarity) === "positive" ? c.positiveInk : tone(d, polarity) === "negative" ? c.negativeInk : c.muted}>{fmtDelta(d)}</tspan>}
                </text>
              </g>
            );
          })}
        </svg>
        {h != null && rows[h] && (
          <Tip x={(xa + xb) / 2} y={Math.min(ly[h], ry[h]) - 72} bound={width}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{rows[h].label}</div>
            <TipRow color={c.compare} label={fromLabel} value={fmt(rows[h].from, kind, { compact: false })} />
            <TipRow color={colorOf(rows[h], h)} label={toLabel} value={fmt(rows[h].to, kind, { compact: false })} />
            <div className="mt-1.5 border-t border-white/10 pt-1.5 text-[12px]"><DeltaPill delta={chg(rows[h])} polarity={polarity} label={`vs ${fromLabel}`} /></div>
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={h != null && rows[h] ? say(rows[h]) : ""} />
      </div>
      {skipped > 0 && <SparseNote>{skipped} item{skipped > 1 ? "s" : ""} left out: missing a {fromLabel} or {toLabel} value. See the table.</SparseNote>}
    </ChartCard>
  );
}
const trimTo = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}\u2026` : s);
