"use client";
// Comparison across categories, labeled directly so no tooltip or legend is needed.
// mode "compare": a bar for now and a dark tick for the previous period (bullet-style), value and
// change on the right. mode "change": diverging bars around zero, colored by polarity, with the
// sign and arrow in the label so color is never the only cue.
// Horizontal bars because category names stay readable on a phone (Datawrapper).
// States: loading, error, empty, single row, previous = 0 ("New").
import { ChartCard, DeltaPill, LegendKey, SparseNote, type StateProps } from "./ChartCard";
import { fmt, fmtDelta, pctChange, tone, type NumKind, type Polarity } from "./format";
import { c, niceTicks, useTween } from "./lib";

export type DeltaRow = { label: string; current: number; previous: number };

export function DeltaBars({
  title, subtitle, data, mode = "compare", kind = "number", polarity = "up-good", sort = true,
  currentLabel = "This period", previousLabel = "Last period", source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  data: DeltaRow[];
  mode?: "compare" | "change";
  kind?: NumKind;
  polarity?: Polarity;
  /** Sort by size (compare) or by change (change). Turn off when order has meaning (age bands). */
  sort?: boolean;
  currentLabel?: string;
  previousLabel?: string;
  source?: string;
}) {
  const rows = data.map((d) => ({ ...d, change: pctChange(d.current, d.previous) }));
  if (sort) rows.sort((a, b) => (mode === "change" ? (b.change ?? Infinity) - (a.change ?? Infinity) : b.current - a.current));
  const anim = useTween(rows.flatMap((r) => [r.current, r.previous, r.change ?? 0]));
  const max = niceTicks(0, Math.max(1, ...rows.flatMap((r) => [r.current, r.previous])), 4).at(-1) ?? 1;
  const maxAbs = Math.max(0.01, ...rows.map((r) => Math.abs(r.change ?? 0)));
  const table = rows.length ? { caption: title, columns: ["Category", currentLabel, previousLabel, "Change"], rows: rows.map((r) => [r.label, fmt(r.current, kind, { compact: false }), fmt(r.previous, kind, { compact: false }), r.change == null ? "New" : fmtDelta(r.change)]) } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={rows.length === 0} skeleton="rows" bodyHeight={Math.max(160, rows.length * 44 + 30)} {...state}>
      {mode === "compare" && (
        <div className="mb-3"><LegendKey items={[{ label: currentLabel, color: c.accent }, { label: previousLabel, color: c.ink }]} /></div>
      )}
      <ul className="space-y-2.5">
        {rows.map((r, i) => {
          const cur = anim[i * 3] ?? 0, prev = anim[i * 3 + 1] ?? 0, ch = anim[i * 3 + 2] ?? 0;
          const t = r.change == null ? "neutral" : tone(r.change, polarity);
          const fill = t === "positive" ? c.positive : t === "negative" ? c.negative : c.compare;
          const say = `${r.label}: ${fmt(r.current, kind)}, ${previousLabel.toLowerCase()} ${fmt(r.previous, kind)}, ${r.change == null ? "new" : fmtDelta(r.change)}`;
          return (
            <li key={r.label} aria-label={say} className="grid grid-cols-1 items-center gap-x-3 gap-y-1 @md:grid-cols-[minmax(80px,28%)_1fr_auto]">
              <span className="truncate text-[13px] text-wc-ink-2" aria-hidden>{r.label}</span>
              {mode === "compare" ? (
                <div className="relative h-5" aria-hidden>
                  <div className="absolute inset-y-[3px] left-0 right-0 rounded-[4px] bg-wc-track/60" />
                  <div className="absolute inset-y-[3px] left-0 rounded-[4px] bg-wc-accent" style={{ width: `${(cur / max) * 100}%` }} />
                  <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full bg-wc-ink ring-2 ring-wc-surface" style={{ left: `${(prev / max) * 100}%` }} />
                </div>
              ) : (
                <div className="relative h-5" aria-hidden>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-wc-axis" />
                  <div
                    className="absolute inset-y-[3px] rounded-[4px]"
                    style={{ background: fill, left: ch >= 0 ? "50%" : `${50 - (Math.abs(ch) / maxAbs) * 50}%`, width: `${(Math.abs(ch) / maxAbs) * 50}%` }}
                  />
                </div>
              )}
              <span className="flex items-center justify-end gap-2 text-[13px] tabular-nums" aria-hidden>
                {mode === "compare" && <b className="font-medium text-wc-ink">{fmt(r.current, kind)}</b>}
                <DeltaPill delta={r.change} polarity={polarity} />
              </span>
            </li>
          );
        })}
      </ul>
      {mode === "change" && (
        <div className="mt-2 flex justify-between text-[12px] text-wc-muted @md:ml-[calc(28%+12px)] @md:mr-[92px]" aria-hidden>
          <span>{fmtDelta(-maxAbs)}</span><span>0</span><span>{fmtDelta(maxAbs)}</span>
        </div>
      )}
      {rows.length === 1 && <SparseNote>One category so far. Add more to compare.</SparseNote>}
    </ChartCard>
  );
}
