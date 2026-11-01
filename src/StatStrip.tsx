"use client";
// Stat strip: 3-5 headline numbers in one row, split by hairlines. Each has a label, the number,
// a change pill that knows which direction is good, and an optional context line.
// 2 columns on phones, all in a row from tablet up. Values never animate past their final width
// (tabular figures), so the row does not jitter.
// States: loading (per-cell skeleton), error, empty (no items), a missing value ("No data").
import { ChartCard, DeltaPill, type StateProps } from "./ChartCard";
import { fmt, type NumKind, type Polarity } from "./format";

export type StatItem = {
  label: string;
  value: number | null;
  kind?: NumKind;
  delta?: number | null;
  polarity?: Polarity;
  /** Context, e.g. "vs last week" or "Goal 4,000". */
  note?: string;
  unit?: string;
};

export function StatStrip({ title, items, source, bare = false, status = "ready", ...state }: StateProps & {
  title: string;
  items: StatItem[];
  source?: string;
  /** No card chrome, for the top of a dashboard. */
  bare?: boolean;
}) {
  const cols = Math.min(5, Math.max(1, items.length));
  const grid = (
    <dl className={`grid grid-cols-2 gap-y-5 @2xl:grid-cols-[repeat(var(--cols),minmax(0,1fr))] @2xl:divide-x @2xl:divide-wc-hairline`} style={{ ["--cols" as string]: cols }}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-4 first:pl-0 [&:nth-child(odd)]:pl-0 @2xl:[&:nth-child(odd)]:pl-4 @2xl:first:!pl-0">
          <dt className="truncate text-[13px] text-wc-muted">{it.label}</dt>
          {status === "loading" ? (
            <dd className="mt-2"><div className="wc-skeleton h-7 w-24 rounded-md" /><div className="wc-skeleton mt-2 h-3 w-16 rounded-md" /></dd>
          ) : (
            <dd className="mt-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={`text-[24px] font-semibold leading-tight tracking-[-0.03em] tabular-nums @md:text-[28px] ${it.value == null ? "text-wc-muted" : "text-wc-ink"}`}>
                  {it.value == null ? "No data" : fmt(it.value, it.kind ?? "number")}
                  {it.value != null && it.unit && <span className="ml-1 text-[14px] font-medium text-wc-muted">{it.unit}</span>}
                </span>
                {it.delta !== undefined && it.value != null && <DeltaPill delta={it.delta} polarity={it.polarity} label={it.note} />}
              </div>
              {it.note && <div className="mt-1 truncate text-[12px] text-wc-muted">{it.note}</div>}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
  if (bare && status !== "error") return <section aria-label={title} aria-busy={status === "loading" || undefined} className="@container font-wc text-wc-ink">{grid}</section>;
  return (
    <ChartCard title={title} source={source} empty={items.length === 0} skeleton="stat" bodyHeight={96} status={status === "loading" ? "ready" : status} {...state}>
      {grid}
    </ChartCard>
  );
}
