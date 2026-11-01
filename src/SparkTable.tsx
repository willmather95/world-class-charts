"use client";
// Table with sparklines: the best way to show many small trends at once (Tufte: word-sized
// graphics inside the table). Real <table> markup, sortable headers with aria-sort, numbers right
// aligned in tabular figures, an optional share bar, and a word-sized sparkline per row.
// Narrow cards drop the share column first, then shrink the sparkline.
// States: loading (row skeleton), error, empty, rows with < 2 points ("New"), previous = 0.
import { useState } from "react";
import { ChartCard, DeltaPill, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, pctChange, type NumKind, type Polarity } from "./format";
import { c, linePath, monotonePath, sum, type Pt } from "./lib";

export type SparkRow = { label: string; value: number; previous?: number; series: number[]; sublabel?: string };
type SortKey = "label" | "value" | "change" | "share";

export function SparkTable({
  title, subtitle, rows, kind = "number", polarity = "up-good", showShare = true, valueLabel = "Value", trendLabel = "Last 12 weeks", source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  rows: SparkRow[];
  kind?: NumKind;
  polarity?: Polarity;
  showShare?: boolean;
  valueLabel?: string;
  trendLabel?: string;
  source?: string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const total = sum(rows.map((r) => r.value));
  const view = rows.map((r) => ({ ...r, change: r.previous != null ? pctChange(r.value, r.previous) : null, share: total ? r.value / total : 0 }));
  view.sort((a, b) => {
    const k = sort.key;
    const av = k === "label" ? a.label : k === "change" ? a.change ?? -Infinity : a[k];
    const bv = k === "label" ? b.label : k === "change" ? b.change ?? -Infinity : b[k];
    return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
  });
  const maxShare = Math.max(0.0001, ...view.map((r) => r.share));
  const head = (key: SortKey, label: string, cls = "") => {
    const on = sort.key === key;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-2 py-1 font-medium first:pl-0 ${cls}`}>
        <button type="button" onClick={() => setSort({ key, dir: on ? (sort.dir === 1 ? -1 : 1) : key === "label" ? 1 : -1 })} className={`inline-flex min-h-6 items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-wc-focus ${on ? "text-wc-ink" : ""}`}>
          {label}
          <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden className={on ? "" : "opacity-30"}><path d={on && sort.dir === 1 ? "M1 6l3-4 3 4" : "M1 4l3 4 3-4"} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </th>
    );
  };

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} empty={rows.length === 0} skeleton="table" bodyHeight={Math.max(180, rows.length * 44 + 40)} {...state}>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full border-collapse text-[13px] tabular-nums">
          <caption className="sr-only">{title}. Sortable by column.</caption>
          <thead className="text-left text-[12px] text-wc-muted">
            <tr className="border-b border-wc-hairline">
              {head("label", "Name")}
              {head("value", valueLabel, "text-right")}
              {head("change", "Change", "text-right")}
              <th scope="col" className="px-2 py-2 text-right font-medium">{trendLabel}</th>
              {showShare && head("share", "Share", "hidden text-right @lg:table-cell")}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.label} className="border-b border-wc-hairline last:border-0 hover:bg-wc-surface-2/60">
                <th scope="row" className="max-w-[180px] py-2.5 pr-2 text-left font-normal">
                  <div className="truncate text-wc-ink">{r.label}</div>
                  {r.sublabel && <div className="truncate text-[12px] text-wc-muted">{r.sublabel}</div>}
                </th>
                <td className="px-2 text-right font-medium text-wc-ink">{fmt(r.value, kind)}</td>
                <td className="px-2 text-right">{r.previous != null ? <DeltaPill delta={r.change} polarity={polarity} /> : <span className="text-wc-muted">n/a</span>}</td>
                <td className="px-2 text-right"><Spark values={r.series} label={`${r.label} trend`} /></td>
                {showShare && (
                  <td className="hidden px-2 @lg:table-cell">
                    <div className="ml-auto flex w-[120px] items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wc-track"><div className="h-full rounded-full bg-wc-accent" style={{ width: `${(r.share / maxShare) * 100}%` }} /></div>
                      <span className="w-9 text-right text-[12px] text-wc-muted">{fmtPercent(r.share)}</span>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** Word-sized sparkline: 72 x 22 px, no axes, end dot. Shape only; exact values live in the cells. */
export function Spark({ values, label, w = 72, h = 22, color = c.accent }: { values: number[]; label: string; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return <span className="text-[12px] text-wc-muted">New</span>;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts: Pt[] = values.map((v, i) => [2 + (i / (values.length - 1)) * (w - 6), h - 3 - ((v - min) / span) * (h - 6)]);
  const end = pts[pts.length - 1];
  const dir = values[values.length - 1] - values[0];
  return (
    <svg width={w} height={h} className="ml-auto inline-block align-middle" role="img" aria-label={`${label}: ${dir > 0 ? "rising" : dir < 0 ? "falling" : "flat"}, from ${fmt(values[0])} to ${fmt(values[values.length - 1])}`}>
      <path d={values.length >= 4 ? monotonePath(pts) : linePath(pts)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end[0]} cy={end[1]} r="2.5" fill={color} />
    </svg>
  );
}
