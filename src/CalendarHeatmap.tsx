"use client";
// Calendar heatmap: one cell per day, weeks as columns, Monday on top. Six sequential steps plus a
// distinct zero step, and "no data" drawn as an outlined empty cell so missing never looks like zero.
// Bins come from the max (or pass `thresholds`); integer data gets integer bins. The ramp is built
// so step 1 is >= 1.5:1 on the card and each step is >= 1.3:1 from the next (contrast.mjs checks).
// Color is never the only cue: the key prints each step's value range, the active cell's step is
// ringed in the key, and the tooltip, live region and table carry exact values.
// Narrow cards show the most recent weeks that fit and say so.
// States: loading, error, empty (no days), all zero, sparse (few days).
import { ChartCard, SparseNote, Tip, type StateProps } from "./ChartCard";
import { fmt, fmtDate, fmtMonth, fmtWeekday, type NumKind } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, seq, useWidth } from "./lib";

export type DayValue = { date: Date | string; value: number | null };
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function CalendarHeatmap({
  title, subtitle, data, kind = "number", unit = "", thresholds, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: DayValue[];
  kind?: NumKind;
  /** Word after the number in tooltips: "3 signups". */
  unit?: string;
  /** Six ascending upper bounds for steps 1-6. Default: equal steps of the max. */
  thresholds?: number[];
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(640);
  const byDay = new Map<number, number | null>();
  for (const d of data) byDay.set(startOfDay(d.date instanceof Date ? d.date : new Date(d.date)).getTime(), d.value);
  const keys = [...byDay.keys()].sort((a, b) => a - b);
  const labelW = 30, gap = 3, topH = 18;
  // Monday-first grid from the week of the first day to the last day.
  const first = keys.length ? new Date(keys[0]) : new Date();
  const lastDay = keys.length ? new Date(keys[keys.length - 1]) : new Date();
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getTime() - mondayOffset * DAY);
  const totalWeeks = Math.ceil(((lastDay.getTime() - gridStart.getTime()) / DAY + 1) / 7);
  const cell = Math.max(10, Math.min(24, Math.floor((width - labelW) / Math.max(totalWeeks, 1)) - gap));
  const fitWeeks = Math.max(1, Math.floor((width - labelW) / (cell + gap)));
  const weeks = Math.min(totalWeeks, fitWeeks);
  const skipWeeks = totalWeeks - weeks;
  const start = new Date(gridStart.getTime() + skipWeeks * 7 * DAY);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const vals = days.map((d) => (d > lastDay || d < first ? undefined : byDay.has(d.getTime()) ? byDay.get(d.getTime())! : null));
  const present = data.filter((d) => d.value != null).map((d) => d.value as number);
  const max = Math.max(0, ...present);
  const ints = present.every(Number.isInteger);
  const th = thresholds ?? Array.from({ length: 6 }, (_, i) => (ints ? Math.ceil((max * (i + 1)) / 6) : (max * (i + 1)) / 6));
  const step = (v: number) => { if (v <= 0) return 0; const k = th.findIndex((t) => v <= t); return 1 + (k === -1 ? 5 : k); };
  // Key: the value range of each step that can actually occur.
  const fk = (v: number) => fmt(v, kind, { compact: true });
  const keySteps = th.map((hi, k) => {
    const lo = k === 0 ? (ints ? 1 : 0) : ints ? th[k - 1] + 1 : th[k - 1];
    return { s: k + 1, hi, lo, label: ints ? (lo === hi ? fk(hi) : `${fk(lo)}\u2013${fk(hi)}`) : `${k === 0 ? ">0" : fk(lo)}\u2013${fk(hi)}` };
  }).filter((k) => max > 0 && (!ints || k.lo <= k.hi));
  const nav = usePlotNav(days.length, (x, y) => {
    const col = Math.floor((x - labelW) / (cell + gap)), row = Math.floor((y - topH) / (cell + gap));
    return col < 0 || row < 0 || row > 6 || col >= weeks ? null : col * 7 + row;
  }, 7, undefined, { values: () => vals.map((v) => v ?? null) });
  const h = nav.active;
  const hv = h != null ? vals[h] : undefined;
  const say = (i: number) => `${fmtDate(days[i], "day")}: ${vals[i] == null ? "no data" : `${fmt(vals[i] as number, kind)}${unit ? ` ${unit}` : ""}`}`;
  const plotH = topH + 7 * (cell + gap);
  const total = present.reduce((a, b) => a + b, 0);
  const table = keys.length ? { caption: title, columns: ["Day", unit || "Value"], rows: keys.map((k) => [fmtDate(new Date(k), "day"), byDay.get(k) == null ? "No data" : fmt(byDay.get(k) as number, kind, { compact: false })]) } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={keys.length === 0} skeleton="grid" bodyHeight={plotH + 40} {...state}>
      <div ref={wrap}>
        <div {...nav.bind} role="group" aria-roledescription="calendar heatmap" aria-label={`${title}. ${keys.length} days, total ${fmt(total, kind)}. Arrow keys move by day and week.`} style={{ ...nav.bind.style, height: plotH }}>
          <svg width={labelW + weeks * (cell + gap)} height={plotH} className="block" aria-hidden>
            {[0, 1, 2].map((i) => fmtWeekday(new Date(2024, 0, 1 + i * 2))).map((d, i) => (
              <text key={i} x={0} y={topH + (i * 2) * (cell + gap) + cell - 2} fontSize="12" fill={c.muted}>{d}</text>
            ))}
            {Array.from({ length: weeks }, (_, w) => {
              const d = days[w * 7];
              const prev = w ? days[(w - 1) * 7] : null;
              return (!prev || prev.getMonth() !== d.getMonth()) && w < weeks - 1 ? (
                <text key={w} x={labelW + w * (cell + gap)} y={11} fontSize="12" fill={c.muted}>{fmtMonth(d)}</text>
              ) : null;
            })}
            {days.map((_, i) => {
              const v = vals[i];
              if (v === undefined) return null;
              const x = labelW + Math.floor(i / 7) * (cell + gap), yy = topH + (i % 7) * (cell + gap);
              return v == null ? (
                <rect key={i} x={x + 0.5} y={yy + 0.5} width={cell - 1} height={cell - 1} rx={3} fill="none" stroke={c.axis} strokeOpacity="0.7" strokeDasharray="2 2" />
              ) : (
                <rect key={i} x={x} y={yy} width={cell} height={cell} rx={3} fill={seq(step(v))} stroke={i === h ? c.ink : "none"} strokeWidth={1.5} />
              );
            })}
          </svg>
          {h != null && hv !== undefined && (
            <Tip x={labelW + Math.floor(h / 7) * (cell + gap) + cell} y={topH + (h % 7) * (cell + gap) - 40} bound={labelW + weeks * (cell + gap)}>
              <div className="text-[12px] text-wc-tip-muted">{fmtDate(days[h], "day")}</div>
              <b className="font-medium">{hv == null ? "No data" : `${fmt(hv, kind, { compact: false })}${unit ? ` ${unit}` : ""}`}</b>
            </Tip>
          )}
          <LiveRegion at={nav.pos} text={h != null && hv !== undefined ? say(h) : ""} />
        </div>
      </div>
      <ul aria-label="Color key" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] tabular-nums text-wc-muted">
        {[{ s: 0, label: "0" }, ...keySteps].map((k) => (
          <li key={k.s} className="flex items-center gap-1">
            <span aria-hidden className={`inline-block size-[11px] rounded-[3px] ${hv != null && step(hv) === k.s ? "outline-[1.5px] outline-offset-1 outline-wc-ink [outline-style:solid]" : ""}`} style={{ background: seq(k.s) }} />
            <span><span className="sr-only">{unit || "value"} </span>{k.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-[11px] rounded-[3px] border border-dashed border-wc-axis" />No data</li>
      </ul>
      {skipWeeks > 0 && <SparseNote>Showing the last {weeks} weeks. Open the data table for the full range.</SparseNote>}
      {present.length > 0 && max === 0 && <SparseNote>Every day in this range is zero.</SparseNote>}
      {present.length > 0 && present.length < 7 && <SparseNote>Only {present.length} days of data so far.</SparseNote>}
    </ChartCard>
  );
}
