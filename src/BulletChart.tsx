"use client";
// Bullet graph (Stephen Few): a measure against a target, on gray bands for poor / fair / good.
// Replaces gauges and dials in a fraction of the space. Bands are neutral grays (darker = worse),
// so color stays free for the measure. Gaps of 1px keep bands apart. The value, its share of the
// target and the band name print on every row, so nothing rides on shade alone.
// Each row has its own scale, so mixed units share a chart. One tab stop; Up/Down or Left/Right move between rows. States: loading, error, empty, missing value.
import { ChartCard, Tip, TipRow, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind, type Polarity } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, niceTicks, scaleLinear, sizeOf, soft, useTween, useWidth } from "./lib";

export type BulletRow = {
  label: string;
  sublabel?: string;
  value: number | null;
  target?: number | null;
  /** Upper edges of the bands, low to high: [poorTo, fairTo, max]. */
  bands?: number[];
};

export function BulletChart({
  title, subtitle, data, kind = "number", polarity = "up-good", bandNames = ["Poor", "Fair", "Good"],
  targetLabel = "Target", source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: BulletRow[];
  kind?: NumKind;
  /** "down-good" flips the band order (costs, wait times): the low band is good. */
  polarity?: Polarity;
  bandNames?: string[];
  targetLabel?: string;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const stacked = size === "sm";
  const n = data.length;
  const vals = useTween(data.map((d) => d.value ?? 0));
 // Each row gets its own scale (Few's spec): revenue in $K and a 1-5 score can share a chart.
  const rowMax = (r: BulletRow) => { const t = niceTicks(0, Math.max(1e-9, r.value ?? 0, r.target ?? 0, ...(r.bands ?? [])), 3); return t[t.length - 1]; };
  const labelW = stacked ? 0 : Math.min(150, Math.round(width * 0.24));
  const valueW = stacked ? 0 : 118;
  const x0 = stacked ? 0 : labelW + 12, x1 = width - (valueW ? valueW + 12 : 10);
  const xs = data.map((r) => scaleLinear(0, rowMax(r), x0, x1));
  const rowH = stacked ? 62 : 48, bandH = 18, axisH = 0;
  const height = n * rowH + axisH;
  const nav = usePlotNav(n, (_px, py) => (py > n * rowH ? null : Math.floor(py / rowH)), 1, undefined, { values: () => data.map((d) => d.value) });
  const h = nav.active;
  const shades = [26, 15, 7]; // darker = worse
  const bandOf = (r: BulletRow) => {
    if (r.value == null || !r.bands?.length) return null;
    const k = r.bands.findIndex((b) => (r.value as number) <= b);
    const idx = k === -1 ? r.bands.length - 1 : k;
    return bandNames[polarity === "down-good" ? r.bands.length - 1 - idx : idx] ?? null;
  };
  const ofTarget = (r: BulletRow) => (r.value != null && r.target ? r.value / r.target : null);
  const say = (r: BulletRow) => r.value == null ? `${r.label}: no data` :
    `${r.label}: ${fmt(r.value, kind)}${r.target ? `, ${fmtPercent(ofTarget(r) as number)} of ${targetLabel.toLowerCase()} ${fmt(r.target, kind)}` : ""}${bandOf(r) ? `, ${bandOf(r)!.toLowerCase()} range` : ""}`;
  const table = n ? {
    caption: title,
    columns: ["Item", "Value", targetLabel, `Share of ${targetLabel.toLowerCase()}`, "Range"],
    rows: data.map((r) => [r.label, r.value == null ? "No data" : fmt(r.value, kind, { compact: false }), r.target == null ? "" : fmt(r.target, kind, { compact: false }), ofTarget(r) == null ? "" : fmtPercent(ofTarget(r) as number), bandOf(r) ?? ""]),
  } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={n === 0} skeleton="rows" bodyHeight={Math.max(160, height + 24)} {...state}>
      <ul aria-label="Key" className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-wc-muted">
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-1.5 w-4 rounded-full bg-wc-accent" />Actual</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3.5 w-0.5 bg-wc-ink" />{targetLabel}</li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-flex gap-px">{(polarity === "down-good" ? [...shades].reverse() : shades).map((s, i) => <span key={i} className="inline-block h-3 w-3" style={{ background: soft(c.ink, s) }} />)}</span>
          {bandNames.join(", ")}
        </li>
        <li>Each row has its own scale.</li>
      </ul>
      <div ref={wrap} {...nav.bind} role="group" aria-roledescription="bullet chart" aria-label={`${title}. ${n} rows, each a value against a ${targetLabel.toLowerCase()}. Arrow keys move between rows.`} style={{ ...nav.bind.style, height }}>
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {data.map((r, i) => {
            const top = i * rowH + (stacked ? 24 : (rowH - bandH) / 2);
            const on = i === h;
            const x = xs[i];
            const edges = [0, ...(r.bands ?? [rowMax(r)])];
            const share = ofTarget(r);
            return (
              <g key={r.label}>
                {on && <rect x={-6} y={i * rowH + 2} width={width + 12} height={rowH - 4} rx={10} fill={c.surface2} />}
                {stacked
                  ? <text x={0} y={i * rowH + 16} fontSize="13" fill={c.ink2} fontWeight={on ? 600 : 500}>{r.label}<tspan fill={c.ink} fontWeight={600} dx={8} className="tabular-nums">{r.value == null ? "No data" : fmt(r.value, kind)}</tspan>{share != null && <tspan fill={c.muted} fontWeight={400} dx={6}>{fmtPercent(share)} of {targetLabel.toLowerCase()}</tspan>}</text>
                  : (<>
                    <text x={0} y={top + (r.sublabel ? 7 : 13)} fontSize="13" fill={c.ink2} fontWeight={on ? 600 : 500}>{r.label}</text>
                    {r.sublabel && <text x={0} y={top + 22} fontSize="12" fill={c.muted}>{r.sublabel}</text>}
                  </>)}
                {edges.slice(1).map((e, k) => {
                  const shade = polarity === "down-good" ? shades[edges.length - 2 - k] : shades[k];
                  const a = x(edges[k]), b = x(e);
                  return <rect key={k} x={a + (k ? 1 : 0)} y={top} width={Math.max(0, b - a - (k ? 1 : 0))} height={bandH} fill={soft(c.ink, shade ?? 6)} />;
                })}
                {r.value != null && <rect x={x(0)} y={top + bandH / 2 - 3.5} width={Math.max(0, x(vals[i]) - x(0))} height={7} rx={1.5} fill={c.accent} />}
                {r.target != null && <rect x={x(Math.max(0, r.target)) - 1} y={top - 4} width={2.5} height={bandH + 8} rx={1} fill={c.ink} />}
                {!stacked && (
                  <g fontSize="13" textAnchor="end" className="tabular-nums">
                    <text x={width} y={top + 7} fill={c.ink} fontWeight={600}>{r.value == null ? "No data" : fmt(r.value, kind)}</text>
                    <text x={width} y={top + 22} fontSize="12" fill={c.muted}>{share != null ? `${fmtPercent(share)} of ${targetLabel.toLowerCase()}` : bandOf(r) ?? ""}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        {h != null && data[h] && (
          <Tip x={xs[h](Math.max(0, data[h].value ?? 0))} y={h * rowH + rowH - 4} bound={width}>
            <div className="mb-1 text-[12px] text-wc-tip-muted">{data[h].label}</div>
            <TipRow color={c.accent} label="Actual" value={data[h].value == null ? "No data" : fmt(data[h].value as number, kind, { compact: false })} />
            {data[h].target != null && <TipRow color={c.ink} label={targetLabel} value={fmt(data[h].target as number, kind, { compact: false })} />}
            {bandOf(data[h]) && <div className="mt-1 text-[12px] text-wc-tip-muted">In the {bandOf(data[h])!.toLowerCase()} range</div>}
          </Tip>
        )}
        <LiveRegion at={nav.pos} text={h != null && data[h] ? say(data[h]) : ""} />
      </div>
    </ChartCard>
  );
}
