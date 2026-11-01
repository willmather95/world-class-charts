"use client";
// One hero number, a change pill that knows which direction is good, a context line, and a small
// sparkline (Tufte: word-sized, no axes, end dot plus min/max marks on request).
// States: loading, error, empty (no value), single point (no line, note instead), sparse (markers).
import { useId } from "react";
import { ChartCard, DeltaPill, type StateProps } from "./ChartCard";
import { fmt, type NumKind, type Polarity } from "./format";
import { c, isNum, linePath, monotonePath, useTween, useWidth, type Pt } from "./lib";

export function KpiSparkCard({
  title, value, kind = "number", delta, polarity = "up-good", note = "vs last period", series: seriesIn = [], color = c.accent,
  showMinMax = false, source, ...state
}: StateProps & {
  title: string;
  value: number | null;
  kind?: NumKind;
  /** Change as a ratio (0.12 = +12%). null when the previous value was 0. */
  delta?: number | null;
  polarity?: Polarity;
  note?: string;
  /** Readings, oldest first. Missing ones (null) are skipped and the line joins across them. */
  series?: (number | null)[];
  color?: string;
  /** Mark the low and high points (Tufte's sparkline convention). */
  showMinMax?: boolean;
  source?: string;
}) {
  const series = seriesIn.filter(isNum);
  const gid = useId().replace(/:/g, "");
  const [wrap, w] = useWidth<HTMLDivElement>(260);
  const s = useTween(series);
  const h = 56;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts: Pt[] = s.map((v, i) => [series.length === 1 ? w / 2 : (i / (series.length - 1)) * (w - 10) + 5, h - 6 - ((v - min) / span) * (h - 14)]);
  const d = series.length >= 4 ? monotonePath(pts) : linePath(pts);
  const end = pts[pts.length - 1];
  const iMin = series.indexOf(min), iMax = series.indexOf(max);

  return (
    <ChartCard title={title} source={source} empty={value == null} skeleton="stat" bodyHeight={128} {...state}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums @md:text-[34px]">{value != null ? fmt(value, kind) : ""}</span>
        {delta !== undefined && <DeltaPill delta={delta} polarity={polarity} label={note} />}
      </div>
      <div className="mt-2 text-[13px] text-wc-muted">{delta === null ? "No earlier period to compare" : note}</div>
      <div ref={wrap} className="mt-3" aria-hidden>
        {series.length >= 2 ? (
          <svg width={w} height={h} className="block overflow-visible">
            <defs>
              <linearGradient id={`spark-${gid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.2" /><stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${d}L${end[0]},${h}L${pts[0][0]},${h}Z`} fill={`url(#spark-${gid})`} />
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {series.length < 4 && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />)}
            {showMinMax && series.length >= 4 && (
              <>
                <circle cx={pts[iMin][0]} cy={pts[iMin][1]} r="2.5" fill={c.surface} stroke={c.muted} strokeWidth="1.5" />
                <circle cx={pts[iMax][0]} cy={pts[iMax][1]} r="2.5" fill={c.surface} stroke={c.muted} strokeWidth="1.5" />
              </>
            )}
            <circle cx={end[0]} cy={end[1]} r="7" fill={color} fillOpacity="0.18" />
            <circle cx={end[0]} cy={end[1]} r="3.5" fill={color} stroke={c.surface} strokeWidth="1.5" />
          </svg>
        ) : (
          <div className="flex h-[56px] items-center text-[12px] text-wc-muted">Trend shows after two readings.</div>
        )}
      </div>
    </ChartCard>
  );
}
