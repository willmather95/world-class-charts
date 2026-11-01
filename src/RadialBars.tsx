"use client";
// Radial bars: one wedge per period on a pale track, total in the center. Good for a cyclical
// glance (12 months, 24 hours, 7 days) when the shape matters more than exact values. When exact
// comparison matters, use PairedBars or DeltaBars instead (see references/chart-choice.md).
// States: loading, error, empty, single item. Keyboard: arrows walk the wedges clockwise.
import { ChartCard, SparseNote, Stat, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, ghost, sum, useTween, useWidth } from "./lib";

export type RadialItem = { label: string; value: number };

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const pt = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((v) => v.toFixed(2)).join(",");
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(r0, a0)}L${pt(r1, a0)}A${r1},${r1} 0 ${large} 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0},${r0} 0 ${large} 0 ${pt(r0, a0)}Z`;
}

export function RadialBars({
  title, subtitle, data, kind = "currency", centerLabel = "Total", highlight = "max", stats, maxSize = 300, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: RadialItem[];
  kind?: NumKind;
  centerLabel?: string;
  /** Which wedge gets full color at rest. Others are a tint of the same hue. */
  highlight?: "max" | "latest" | "none";
  stats?: { label: string; value: string }[];
  maxSize?: number;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(maxSize);
  const size = Math.min(maxSize, width);
  const vals = useTween(data.map((d) => d.value));
  const n = data.length;
  const cx = size / 2, cy = size / 2;
  const rIn = size * 0.27, rOut = size * 0.48;
  const step = (Math.PI * 2) / Math.max(n, 1), gap = n > 1 ? step * 0.2 : 0;
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = sum(data.map((d) => d.value));
  const nav = usePlotNav(n, (x, y) => {
    const a = Math.atan2(x - cx, cy - y);
    const r = Math.hypot(x - cx, y - cy);
    if (r < rIn * 0.8 || r > rOut + 8) return null;
    return Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / step);
  }, 1, undefined, { values: () => data.map((d) => d.value) });
  const hi = highlight === "max" ? data.findIndex((d) => d.value === max) : highlight === "latest" ? n - 1 : -1;
  const shown = nav.active != null ? data[nav.active] : null;
  const table = n ? { caption: title, columns: ["Period", "Value", "Share"], rows: data.map((d) => [d.label, fmt(d.value, kind, { compact: false }), fmtPercent(d.value / (total || 1), 1)]) } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0 || total === 0} skeleton="ring" bodyHeight={maxSize + (stats ? 64 : 0)} {...state}>
      {stats && <div className="mb-4 grid grid-cols-2 gap-4">{stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} size="md" />)}</div>}
      <div ref={wrap} className="w-full">
        <div {...nav.bind} role="group" aria-roledescription="chart" aria-label={`${title}. ${n} wedges. Total ${fmt(total, kind)}. Each wedge's length from the center shows its amount. Arrow keys move between wedges.`} className={`${nav.bind.className} mx-auto rounded-full`} style={{ ...nav.bind.style, width: size, height: size }}>
          <svg width={size} height={size} aria-hidden className="block">
            {data.map((d, i) => {
              const a0 = i * step + gap / 2, a1 = (i + 1) * step - gap / 2 - (n === 1 ? 0.0001 : 0);
              const r1 = rIn + 4 + ((vals[i] ?? 0) / max) * (rOut - rIn - 4);
              const on = nav.active != null ? nav.active === i : hi === i || highlight === "none";
              return (
                <g key={d.label}>
                  <path d={sector(cx, cy, rIn, rOut, a0, a1)} fill={c.track} fillOpacity="0.6" />
                  <path d={sector(cx, cy, rIn, Math.max(rIn + 1, r1), a0, a1)} {...(on ? { fill: c.accent, stroke: c.accent, strokeWidth: 1 } : ghost(c.accent, 28))} className="wc-motion transition-[fill] duration-[var(--wc-dur-focus)]" />
                </g>
              );
            })}
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fill={c.muted}>{shown ? shown.label : centerLabel}</text>
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize={size < 240 ? 17 : 20} fontWeight="600" fill={c.ink} className="tabular-nums">{fmt(shown ? shown.value : total, kind)}</text>
            {shown && <text x={cx} y={cy + 36} textAnchor="middle" fontSize="12" fill={c.muted}>{fmtPercent(shown.value / (total || 1))} of total</text>}
          </svg>
          <LiveRegion at={nav.pos} text={shown ? `${shown.label}: ${fmt(shown.value, kind)}, ${fmtPercent(shown.value / (total || 1))} of total` : ""} />
        </div>
      </div>
      {hi >= 0 && nav.active == null && n > 1 && (
        <p className="mt-3 text-center text-[13px] text-wc-ink-2">{highlight === "max" ? "Highest" : "Latest"}: <b className="font-medium">{data[hi].label}</b>, {fmt(data[hi].value, kind)}</p>
      )}
      {n === 1 && <SparseNote>One period so far. The ring fills in as periods are added.</SparseNote>}
    </ChartCard>
  );
}
