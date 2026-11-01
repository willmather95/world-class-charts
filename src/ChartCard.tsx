"use client";
// world-class-charts: card chrome, states, and small shared pieces.
// Every template renders through ChartCard so loading, error, empty, the data-table fallback and
// the source line behave the same everywhere.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DataTable, downloadCsv, type DataTableSpec } from "./interaction";
import { fmtDelta, tone as toneOf, type NumKind, type Polarity } from "./format";

export type Status = "ready" | "loading" | "error";

/** Every template accepts these. */
export interface StateProps {
  status?: Status;
  errorText?: string;
  onRetry?: () => void;
  emptyText?: string;
}

export type SkeletonKind = "line" | "bars" | "rows" | "ring" | "grid" | "stat" | "table" | "progress" | "flow";

export function ChartCard({
  title, crumb, subtitle, icon, action, source, table, children,
  status = "ready", errorText, onRetry, empty = false, emptyText, skeleton = "line", bodyHeight = 240,
  className = "", padded = true, keys, keyHint = "Arrows move. Home, End jump. H, L: high, low. Esc clears.",
}: StateProps & {
  title: string;
  /** Gray crumb before the title: "Team / Weekly signups". */
  crumb?: string;
  /** One line under the title. Best used for the takeaway, not a restated title. */
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Right side of the header. Defaults to the "..." button. Pass null to hide. */
  action?: ReactNode | null;
  /** Footer note: source and freshness, e.g. "Source: Billing. Updated 9:00 AM CT". */
  source?: ReactNode;
  /** Table fallback. Screen readers always get it; a "View data" toggle shows it to everyone. */
  table?: DataTableSpec;
  empty?: boolean;
  skeleton?: SkeletonKind;
  /** Height of the body in px. States render at this height so nothing jumps when data lands. */
  bodyHeight?: number;
  children?: ReactNode;
  className?: string;
  padded?: boolean;
  /** Extra key help shown while the plot has keyboard focus, e.g. "S plays sound." */
  keys?: string;
  /** Replaces the default key hint, for charts whose keys differ (Recharts: left and right only). */
  keyHint?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const ready = status === "ready" && !empty;
  // Announce when data lands after a load, so screen reader users know the chart changed.
  const [said, setSaid] = useState("");
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === "loading" && status === "ready") setSaid(`${title} loaded.`);
    prev.current = status;
  }, [status, title]);
  return (
    <section
      aria-busy={status === "loading" || undefined}
      className={`wc-card relative @container h-fit min-w-0 rounded-wc-card bg-wc-surface font-wc text-wc-ink shadow-[var(--wc-shadow-card)] ring-1 ring-wc-hairline ${padded ? "p-5 @md:p-6" : ""} ${className}`}
    >
      <header className={`mb-4 flex items-start justify-between gap-4 ${padded ? "" : "px-5 pt-5 @md:px-6 @md:pt-6"}`}>
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-2 text-[16px] font-medium tracking-[-0.01em] @md:text-[17px]">
            {icon}
            {crumb && (<><span className="shrink-0 text-wc-muted">{crumb}</span><span aria-hidden className="text-wc-hairline">/</span></>)}
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && <p className="mt-1 text-[13px] leading-snug text-wc-muted">{subtitle}</p>}
        </div>
        {action === undefined ? <MoreButton /> : action}
      </header>

      {status === "loading" ? (
        <Skeleton kind={skeleton} height={bodyHeight} />
      ) : status === "error" ? (
        <ErrorState height={bodyHeight} text={errorText} onRetry={onRetry} />
      ) : empty ? (
        <EmptyState height={bodyHeight} text={emptyText} />
      ) : (
        children
      )}

      {ready && (source || table) && (
        <footer className={`mt-4 flex items-center justify-between gap-3 text-[12px] text-wc-muted ${padded ? "" : "px-5 pb-5 @md:px-6"}`}>
          <span className="min-w-0">{source}</span>
          {table && showTable && (
            <button
              type="button"
              onClick={() => downloadCsv(table)}
              className="wc-noprint ml-auto shrink-0 rounded-full px-2.5 py-1 font-medium text-wc-ink-2 ring-1 ring-wc-hairline transition-colors duration-[var(--wc-dur-press)] hover:bg-wc-surface-2 focus-visible:outline-2 focus-visible:outline-wc-focus"
            >
              Download CSV
            </button>
          )}
          {table && (
            <button
              type="button"
              aria-expanded={showTable}
              onClick={() => setShowTable((s) => !s)}
              className="wc-noprint shrink-0 rounded-full px-2.5 py-1 font-medium text-wc-ink-2 ring-1 ring-wc-hairline transition-colors duration-[var(--wc-dur-press)] hover:bg-wc-surface-2 focus-visible:outline-2 focus-visible:outline-wc-focus"
            >
              {showTable ? "Hide data" : "View data"}
            </button>
          )}
        </footer>
      )}
      {ready && table && <div className={padded ? "" : "px-5 pb-5 @md:px-6"}><DataTable spec={table} visible={showTable} /></div>}
      {/* Visible key help (Chartability: interaction cues). Shown only while a plot has keyboard
          focus, in the card's bottom padding, so nothing shifts. */}
      {ready && <p aria-hidden className="wc-keyhint pointer-events-none absolute inset-x-5 bottom-1 truncate text-[12px] text-wc-muted @md:inset-x-6">{keyHint}{keys ? ` ${keys}` : ""}</p>}
      <div aria-live="polite" className="sr-only">{said}</div>
    </section>
  );
}

export function MoreButton({ label = "More options" }: { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="wc-noprint grid size-9 shrink-0 place-items-center rounded-full text-wc-muted ring-1 ring-wc-hairline transition-[transform,background-color] duration-[var(--wc-dur-press)] hover:bg-wc-surface-2 focus-visible:outline-2 focus-visible:outline-wc-focus active:scale-95"
    >
      <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor" aria-hidden><circle cx="2" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12" cy="2" r="1.5" /></svg>
    </button>
  );
}

/* ---------- States ---------- */
export function Skeleton({ kind, height }: { kind: SkeletonKind; height: number }) {
  const block = "wc-skeleton rounded-md";
  return (
    <div role="status" aria-label="Loading chart" className="flex flex-col gap-3" style={{ height }}>
      {kind !== "table" && kind !== "rows" && <div className="flex gap-6"><div className={`${block} h-3 w-20`} /><div className={`${block} h-3 w-14`} /></div>}
      {kind !== "table" && kind !== "rows" && <div className={`${block} h-8 w-36`} />}
      <div className="relative min-h-0 flex-1">
        {kind === "line" && (
          <svg className="size-full" preserveAspectRatio="none" viewBox="0 0 100 40" aria-hidden>
            <path d="M0,30 C15,28 20,18 35,20 S60,10 75,14 S92,6 100,8" fill="none" stroke="var(--wc-track)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {kind === "bars" && (
          <div className="flex size-full items-end gap-2">
            {[45, 70, 55, 85, 60, 75, 50, 90].map((h, i) => <div key={i} className={`${block} flex-1`} style={{ height: `${h}%` }} />)}
          </div>
        )}
        {(kind === "rows" || kind === "table") && (
          <div className="flex flex-col gap-3">{[90, 70, 80, 55, 65].map((w, i) => <div key={i} className={`${block} h-4`} style={{ width: `${w}%` }} />)}</div>
        )}
        {kind === "ring" && <div className="mx-auto aspect-square h-full rounded-full border-[18px] border-wc-track" />}
        {kind === "grid" && (
          <div className="grid size-full grid-cols-[repeat(20,1fr)] gap-1">{Array.from({ length: 100 }, (_, i) => <div key={i} className="rounded-[3px] bg-wc-track" />)}</div>
        )}
        {kind === "flow" && (
          <svg className="size-full" preserveAspectRatio="none" viewBox="0 0 100 60" aria-hidden>
            <path d="M6,6 C40,6 40,4 94,4 L94,22 C40,22 40,30 6,30 Z M6,32 C40,32 40,26 94,26 L94,56 C40,56 40,56 6,56 Z" fill="var(--wc-track)" opacity="0.6" />
            <rect x="2" y="6" width="4" height="50" rx="1" fill="var(--wc-track)" />
            <rect x="94" y="4" width="4" height="18" rx="1" fill="var(--wc-track)" /><rect x="94" y="26" width="4" height="30" rx="1" fill="var(--wc-track)" />
          </svg>
        )}
        {kind === "progress" && <div className={`${block} mt-6 h-3 w-full rounded-full`} />}
      </div>
    </div>
  );
}

export function EmptyState({ height, text }: { height: number; text?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-wc-hairline text-center" style={{ height }}>
      <div className="max-w-[260px] px-4">
        <svg width="28" height="28" viewBox="0 0 24 24" className="mx-auto text-wc-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M4 19h16M7 15v-3M12 15V8M17 15v-5" strokeLinecap="round" /></svg>
        <p className="mt-2 text-[14px] font-medium text-wc-ink">No data yet</p>
        <p className="mt-1 text-[13px] text-wc-muted">{text ?? "Data shows up here after the first event comes in."}</p>
      </div>
    </div>
  );
}

export function ErrorState({ height, text, onRetry }: { height: number; text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid place-items-center rounded-2xl bg-wc-surface-2 text-center" style={{ height }}>
      <div className="max-w-[280px] px-4">
        <svg width="28" height="28" viewBox="0 0 24 24" className="mx-auto text-wc-negative" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.2v.3" strokeLinecap="round" /></svg>
        <p className="mt-2 text-[14px] font-medium text-wc-ink">Couldn&apos;t load this chart</p>
        <p className="mt-1 text-[13px] text-wc-muted">{text ?? "The data source didn't answer. Your data is safe."}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 rounded-full bg-wc-ink px-3.5 py-1.5 text-[13px] font-medium text-wc-surface transition-transform duration-[var(--wc-dur-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wc-focus active:scale-95">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** Inline note for sparse data: "One data point so far". */
export function SparseNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[12px] text-wc-muted">{children}</p>;
}

/* ---------- Small pieces ---------- */
/**
 * Change pill. Color follows polarity (a cost going down is good), and an arrow plus sign carry the
 * direction so color is never the only cue.
 */
export function DeltaPill({ delta, kind = "percent", polarity = "up-good", text, label }: {
  delta: number | null; kind?: NumKind | "points"; polarity?: Polarity; text?: string; label?: string;
}) {
  if (delta == null) return <span className="text-[12px] text-wc-muted">New</span>;
  const t = toneOf(delta, polarity);
  const cls = t === "positive" ? "bg-wc-positive-soft text-wc-positive-ink" : t === "negative" ? "bg-wc-negative-soft text-wc-negative-ink" : "bg-wc-surface-2 text-wc-muted";
  const shown = text ?? fmtDelta(delta, kind);
  const word = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums ${cls}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {delta > 0 ? <path d="M5 8.5V1.8M2 4.6 5 1.6l3 3" /> : delta < 0 ? <path d="M5 1.5v6.7M2 5.4l3 3 3-3" /> : <path d="M1.5 5h7" />}
      </svg>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{`${word} ${shown.replace(/^[+\u2212]/, "")}${label ? ` ${label}` : ""}`}</span>
    </span>
  );
}

/** Label above a hero number. */
export function Stat({ label, value, tone = "ink", size = "lg", extra, center = false }: {
  label: ReactNode; value: ReactNode; tone?: "ink" | "positive" | "negative"; size?: "sm" | "md" | "lg"; extra?: ReactNode; center?: boolean;
}) {
  const color = tone === "positive" ? "text-wc-positive-ink" : tone === "negative" ? "text-wc-negative-ink" : "text-wc-ink";
  const sz = size === "lg" ? "text-[28px] @md:text-[34px]" : size === "md" ? "text-[22px] @md:text-[26px]" : "text-[18px]";
  return (
    <div className="min-w-0">
      <div className={`text-[13px] text-wc-muted ${center ? "text-center" : ""}`}>{label}</div>
      <div className={`mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${center ? "justify-center" : ""}`}>
        <span className={`${sz} font-semibold leading-none tracking-[-0.03em] tabular-nums ${color}`}>{value}</span>
        {extra}
      </div>
    </div>
  );
}

/** Tooltip. Measures itself and stays inside the plot: flips left near the right edge, never covers the axis. */
export function Tip({ x, y, bound, children }: { x: number; y: number; bound: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(180);
  useLayoutEffect(() => { if (ref.current) setW(ref.current.offsetWidth); });
  let left = x + 14;
  if (left + w > bound) left = x - 14 - w;
  left = Math.max(0, Math.min(left, bound - w));
  return (
    <div
      ref={ref}
      role="presentation"
      aria-hidden
      data-wc-tip=""
      className="wc-motion pointer-events-none absolute z-10 min-w-[160px] rounded-wc-tip bg-wc-tip-bg px-3 py-2.5 text-[13px] text-wc-tip-ink tabular-nums shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] transition-[left,top] duration-[var(--wc-dur-focus)] ease-wc"
      style={{ left, top: Math.max(0, y) }}
    >
      {children}
    </div>
  );
}

export const TipRow = ({ color, label, value, dashed, pat }: { color: string; label: ReactNode; value: ReactNode; dashed?: boolean; pat?: number }) => (
  <div className="flex items-center gap-2 py-0.5">
    <Swatch color={color} dashed={dashed} pat={pat} />
    <span className="text-wc-tip-muted">{label}</span>
    <b className="ml-auto pl-3 font-medium">{value}</b>
  </div>
);

/** Small color key. Solid for actual, dashed outline for comparison or projection. `pat` matches
 *  the mark's data-wc-pat, so the key shows the same texture when patterns are on. */
export const Swatch = ({ color, dashed = false, pat }: { color: string; dashed?: boolean; pat?: number }) => (
  <span
    aria-hidden
    data-wc-pat={pat}
    className="wc-swatch inline-block h-3 w-1.5 shrink-0 rounded-full"
    style={dashed ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { backgroundColor: color }}
  />
);

/** Only when direct labels will not fit. Keep it above the plot, in data order. */
export function LegendKey({ items }: { items: { label: string; color: string; dashed?: boolean; pat?: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-wc-muted">
      {items.map((it) => <li key={it.label} className="flex items-center gap-1.5"><Swatch color={it.color} dashed={it.dashed} pat={it.pat} />{it.label}</li>)}
    </ul>
  );
}
