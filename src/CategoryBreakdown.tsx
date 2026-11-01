"use client";
// Part of a whole as one strip of thin bars, plus a ranked list. Sorted largest first, capped at
// `maxCategories` with the rest grouped as "Other" (always last, always slate). The list is the
// accessible view: each row is focusable and highlights its part of the strip.
// States: loading, error, empty (total 0), single category (full strip + note).
import { useState } from "react";
import { ChartCard, SparseNote, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind } from "./format";
import { cat, catPat, soft, sum, useEntrance, useWidth } from "./lib";

export type Category = { label: string; value: number };

export function groupOther(data: Category[], max: number): (Category & { color: string; pat: number })[] {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.length > max ? sorted.slice(0, max - 1) : sorted;
  const tail = sorted.slice(head.length);
  const out = head.map((d, i) => ({ ...d, color: cat(i), pat: catPat(i) }));
  if (tail.length) out.push({ label: `Other (${tail.length})`, value: sum(tail.map((t) => t.value)), color: cat(7), pat: 8 });
  return out;
}

export function CategoryBreakdown({
  title, subtitle, data, kind = "currency", maxCategories = 6, bars = 72, height = 112, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: Category[];
  kind?: NumKind;
  /** Atlassian and Carbon both cap distinct colors around 5-6. The rest becomes "Other". */
  maxCategories?: number;
  /** Total thin bars across the strip. */
  bars?: number;
  height?: number;
  source?: string;
}) {
  const p = useEntrance();
  const [wrap, width] = useWidth<HTMLDivElement>(480);
  const [hover, setHover] = useState<number | null>(null);
  const rows = groupOther(data, maxCategories);
  const total = sum(rows.map((r) => r.value));
  const nBars = Math.max(rows.length * 3, Math.min(bars, Math.floor(width / 7)));
  // Largest remainder so the bar counts always add up.
  const raw = rows.map((d) => (d.value / (total || 1)) * nBars);
  const counts = raw.map((r) => Math.max(1, Math.floor(r)));
  let rest = nBars - sum(counts);
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest-- > 0) counts[i]++; });
  const table = rows.length ? { caption: title, columns: ["Category", "Value", "Share"], rows: rows.map((r) => [r.label, fmt(r.value, kind, { compact: false }), fmtPercent(r.value / total, 1)]) } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle ?? (total ? `${fmt(total, kind)} total` : undefined)} source={source} table={table} empty={!total} skeleton="rows" bodyHeight={height + 180} {...state}>
      <div ref={wrap} className="flex gap-[6px]" style={{ height }} aria-hidden onPointerLeave={() => setHover(null)}>
        {rows.map((d, i) => {
          const n = counts[i];
          const segW = (n / nBars) * width;
          const dim = hover != null && hover !== i;
          return (
            <div key={d.label} className="wc-motion relative flex min-w-0 transition-opacity duration-[var(--wc-dur-focus)]" style={{ flex: n, opacity: dim ? 0.3 : 1 }} onPointerEnter={() => setHover(i)}>
              <span className="absolute inset-y-0 left-0 w-[3px] rounded-full" style={{ background: soft(d.color, 45) }} />
              {segW > 70 && (
                <div className="absolute left-3 top-0.5 max-w-[calc(100%-12px)] text-[12px] leading-tight">
                  <div className="truncate text-wc-muted">{d.label}</div>
                  <div className="mt-0.5 text-[13px] font-medium tabular-nums text-wc-ink">{fmtPercent(d.value / total)}</div>
                </div>
              )}
              <div className="flex w-full items-end gap-[3px] pl-[7px]">
                {Array.from({ length: n }, (_, k) => (
                  <span key={k} className="flex-1 rounded-full" style={{ background: k < n / 3 ? soft(d.color, 35) : k < (2 * n) / 3 ? soft(d.color, 65) : d.color, height: `${56 * p}%` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1.5 text-[14px]">
        {rows.map((d, i) => (
          <li key={d.label}>
            <div
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 outline-none ring-1 transition-colors duration-[var(--wc-dur-focus)] focus-visible:ring-2 focus-visible:ring-wc-focus ${hover === i ? "bg-wc-surface-2 ring-wc-hairline" : "ring-transparent"}`}
            >
              <span aria-hidden data-wc-pat={d.pat} className="wc-swatch size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="min-w-0 flex-1 truncate text-wc-ink-2">{d.label}</span>
              <span className="w-12 text-right text-[13px] tabular-nums text-wc-muted">{fmtPercent(d.value / total)}</span>
              <b className="w-20 text-right font-medium tabular-nums">{fmt(d.value, kind)}</b>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 1 && <SparseNote>Only one category so far.</SparseNote>}
    </ChartCard>
  );
}
