"use client";
// Two series side by side per period (in vs out, plan vs actual, new vs churned).
// The focused period is solid with value labels on the bars; the rest are ghost bars (soft fill
// plus a 1px edge in the full color), so each series keeps its identity and every bar still
// meets 3:1 against the card. Bars always start at zero: negative values grow downward from the
// zero line (the axis gains negative ticks). A missing value (null) draws no bar and reads "n/a".
import { ChartCard, DeltaPill, LegendKey, SparseNote, Tip, TipRow, type StateProps } from "./ChartCard";
import { axisFormatter, fmt, type NumKind, type Polarity } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { barPath, c, cat, isNum, niceTicks, pickIndices, maxTicksFor, scaleLinear, sizeOf, ghost, useTween, useWidth } from "./lib";

export type PairedPoint = { label: string; a: number | null; b: number | null };

export function PairedBars({
  title, subtitle, data, aLabel = "In", bLabel = "Out", kind = "number", netPolarity = "up-good",
  activeIndex, height = 240, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: PairedPoint[];
  aLabel?: string;
  bLabel?: string;
  kind?: NumKind;
  /** Is a - b going up good? Shown in the tooltip as "Net". */
  netPolarity?: Polarity;
  /** Period highlighted when nothing is focused. Defaults to the last. */
  activeIndex?: number;
  height?: number;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const n = data.length;
  const vals = useTween(data.flatMap((d) => [isNum(d.a) ? d.a : 0, isNum(d.b) ? d.b : 0]));
  const nums = data.flatMap((d) => [d.a, d.b]).filter(isNum);
  const net = (p: PairedPoint) => (isNum(p.a) && isNum(p.b) ? p.a - p.b : null);
  const axisW = size === "sm" ? 40 : 48, padT = 22, padB = 26 + (nums.some((v) => v < 0) ? 14 : 0); // room under the lowest tick for a negative label
  const plotW = Math.max(40, width - axisW);
  const plotH = height - padT - padB;
  const ticks = niceTicks(Math.min(0, ...nums), Math.max(1, ...nums), plotH < 170 ? 3 : 4);
  const fmtAxis = axisFormatter(ticks, kind);
  const y = scaleLinear(ticks[0], ticks[ticks.length - 1], padT + plotH, padT);
  const slot = plotW / Math.max(n, 1);
  const barW = Math.max(3, Math.min(28, slot * 0.32));
  const gap = Math.max(2, Math.min(6, slot * 0.06));
  const nav = usePlotNav(n, (px) => Math.floor(px / slot), 1, undefined, { values: () => data.map((d) => d.a) });
  const active = nav.active ?? activeIndex ?? n - 1;
  const colA = cat(0), colB = cat(2);
  const xLabels = new Set(pickIndices(n, maxTicksFor(plotW, size === "sm" ? 44 : 56)));
  const d = data[active];
  const groupX = slot * active + slot / 2;
  const table = n ? { caption: title, columns: ["Period", aLabel, bLabel, "Net"], rows: data.map((r) => [r.label, fmt(r.a, kind, { compact: false }), fmt(r.b, kind, { compact: false }), fmt(net(r), kind, { compact: false })]) } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0} skeleton="bars" bodyHeight={height + 28} {...state}>
      <div className="mb-3"><LegendKey items={[{ label: aLabel, color: colA, pat: 1 }, { label: bLabel, color: colB, pat: 3 }]} /></div>
      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="chart" aria-label={`${title}. ${n} periods. Arrow keys move between periods.`} style={{ ...nav.bind.style, height }}>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? c.axis : c.grid} />
              <text x={plotW + 8} y={y(t) + 4} fontSize="12" fill={c.muted} className="tabular-nums">{fmtAxis(t)}</text>
            </g>
          ))}
          {data.map((r, i) => {
            const on = i === active;
            const x0 = slot * i + slot / 2 - barW - gap / 2;
            const va = vals[i * 2] ?? 0, vb = vals[i * 2 + 1] ?? 0;
            return (
              <g key={r.label}>
                {on && <rect x={slot * i + 2} y={padT - 18} width={slot - 4} height={plotH + 18} rx={10} fill={c.surface2} />}
                {([[x0, va, colA], [x0 + barW + gap, vb, colB]] as const).map(([bx, v, col], k) => {
                  const bh = y(0) - y(v), r = Math.min(6, barW / 2), sg = bh < 0 ? -1 : 1;
                  const has = isNum(k ? data[i].b : data[i].a);
                  return !has ? null : on
                    ? <path key={k} d={barPath(bx, y(0), barW, bh, r)} fill={col} data-wc-pat={k ? 3 : 1} className="wc-motion transition-[fill] duration-[var(--wc-dur-focus)]" />
                    : <path key={k} d={barPath(bx + 0.5, y(0) - 0.5 * sg, barW - 1, bh - 0.5 * sg, r)} {...ghost(col)} data-wc-pat={k ? 3 : 1} data-wc-ghost="" className="wc-motion transition-[fill] duration-[var(--wc-dur-focus)]" />;
                })}
                {on && size !== "sm" && (
                  <g fontSize="12" fontWeight={600} textAnchor="middle" className="tabular-nums">
                    <text x={x0 + barW / 2} y={va < 0 ? y(va) + 14 : y(va) - 5} fill={c.ink}>{fmt(r.a, kind, { compact: true })}</text>
                    <text x={x0 + barW * 1.5 + gap} y={vb < 0 ? y(vb) + 14 : y(vb) - 5} fill={c.ink}>{fmt(r.b, kind, { compact: true })}</text>
                  </g>
                )}
                {(xLabels.has(i) || on) && (
                  <text x={slot * i + slot / 2} y={height - 6} fontSize="12" textAnchor="middle" fill={on ? c.ink : c.muted} fontWeight={on ? 600 : 400}>{r.label}</text>
                )}
              </g>
            );
          })}
        </svg>
        {nav.active != null && d && (
          <Tip x={groupX + barW + gap} y={y(Math.max(0, ...[d.a, d.b].filter(isNum))) - 30} bound={plotW}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{d.label}</div>
            <TipRow pat={1} color={colA} label={aLabel} value={fmt(d.a, kind, { compact: false })} />
            <TipRow pat={3} color={colB} label={bLabel} value={fmt(d.b, kind, { compact: false })} />
            <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-white/10 pt-1.5 text-[12px]">
              <span className="text-wc-tip-muted">Net</span>
              <b className="font-medium">{fmt(net(d), kind, { compact: false })}</b>
            </div>
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={nav.active != null && d ? `${d.label}: ${aLabel} ${fmt(d.a, kind)}, ${bLabel} ${fmt(d.b, kind)}` : ""} />
      </div>
      {n === 1 && <SparseNote>One period so far. Comparisons start next period.</SparseNote>}
      {n > 1 && d && size === "sm" && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-wc-muted">{d.label}: net {fmt(net(d), kind)} {net(d) != null && <DeltaPill delta={net(d)} kind={kind} polarity={netPolarity} text={(net(d) as number) >= 0 ? "surplus" : "deficit"} />}</p>
      )}
    </ChartCard>
  );
}
