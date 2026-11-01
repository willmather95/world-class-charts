"use client";
// world-class-charts: one interaction model for every chart.
// Mouse: hover shows the crosshair and tooltip. Touch and pen: tap or drag to scrub, the page still
// scrolls vertically (touch-action: pan-y). Keyboard: Tab to the plot, Left/Right (or Up/Down) to
// move, PageUp/PageDown to jump a tenth, Home/End to the ends, Escape to clear. H and L jump to the
// highest and lowest value, N and P to the next and previous note. S plays the series as sound where a
// chart offers it. A polite live region reads the active value in spoken form, then "3 of 12".
// Wrap a chart in <ShareState id="..."> to keep its active point and table sort in the page URL.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { speak } from "./format";
import { clamp } from "./lib";
import { playSeries, stopSound } from "./sound";

/* ---------- Shareable state (opt-in) ---------- */
const ShareCtx = createContext<string | null>(null);
/** Opt-in: keeps the wrapped chart's active point and table sort in the URL (?wc.revenue=7,
 *  ?wc.revenue.sort=2d) so a copied link opens on the same view. One chart per id. Writes use
 *  history.replaceState, so the back button is not filled with hover steps. */
export function ShareState({ id, children }: { id: string; children: ReactNode }) {
  return <ShareCtx.Provider value={id}>{children}</ShareCtx.Provider>;
}
export const useShareKey = (suffix = "") => { const id = useContext(ShareCtx); return id ? `wc.${id}${suffix}` : null; };
export function readParam(key: string | null): string | null {
  if (!key || typeof window === "undefined") return null;
  try { return new URLSearchParams(window.location.search).get(key); } catch { return null; }
}
export function writeParam(key: string | null, value: string | null) {
  if (!key || typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (value == null) u.searchParams.delete(key); else u.searchParams.set(key, value);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u);
  } catch { /* sandboxed frames and some file: URLs refuse replaceState; sharing just turns off */ }
}

export interface NavOptions {
  /** One value per item. H and L jump to the highest and lowest. Nulls and gaps are skipped. */
  values?: () => (number | null | undefined)[];
  /** Item indices that carry a note (annotation, event). N and P step through them. */
  marks?: () => number[];
}

export function usePlotNav(
  count: number,
  indexFromX: (x: number, y: number) => number | null,
  /** Grids: Left/Right move by this many items (7 for a week column), Up/Down by 1. */
  hStep = 1,
  /** Optional sonification: pressing S plays these values as rising and falling pitch. */
  sound?: () => number[],
  opts: NavOptions = {},
) {
  const [active, setActiveRaw] = useState<number | null>(null);
  // Why the last key landed where it did ("Highest", "Note 2 of 3"), read after the value.
  const [why, setWhy] = useState("");
  const setActive: typeof setActiveRaw = useCallback((v) => { setWhy(""); setActiveRaw(v); }, []);
  const share = useShareKey();
  useEffect(() => {
    const v = readParam(share); const i = v == null ? NaN : Number(v);
    if (Number.isInteger(i) && i >= 0 && i < count) setActiveRaw(i);
    // Read once on mount; later count changes must not re-pin the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share]);
  // Debounced: Safari throws after about 100 replaceState calls in 10 seconds, and hover moves fast.
  useEffect(() => {
    if (active == null || !share) return;
    const t = setTimeout(() => writeParam(share, String(active)), 250);
    return () => clearTimeout(t);
  }, [active, share]);
  const pick = useCallback(
    (e: PointerEvent<HTMLElement | SVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const i = indexFromX(e.clientX - r.left, e.clientY - r.top);
      setActive(i == null ? null : clamp(i, 0, count - 1));
    },
    [count, indexFromX],
  );
  const onKeyDown = (e: KeyboardEvent) => {
    if (!count) return;
    const cur = active ?? -1;
    let next: number | null = cur;
    switch (e.key) {
      case "ArrowRight": next = cur < 0 ? 0 : Math.min(count - 1, cur + hStep); break;
      case "ArrowLeft": next = cur < 0 ? count - 1 : Math.max(0, cur - hStep); break;
      case "ArrowDown": next = cur < 0 ? 0 : Math.min(count - 1, cur + 1); break;
      case "ArrowUp": next = cur < 0 ? count - 1 : Math.max(0, cur - 1); break;
      case "PageDown": next = Math.min(count - 1, Math.max(0, cur) + Math.max(1, Math.round(count / 10))); break;
      case "PageUp": next = Math.max(0, (cur < 0 ? count - 1 : cur) - Math.max(1, Math.round(count / 10))); break;
      case "Home": next = 0; break;
      case "End": next = count - 1; break;
      case "Escape": next = null; stopSound(); writeParam(share, null); break;
      case "s": case "S":
        if (!sound || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault(); playSeries(sound()); return;
      case "h": case "H": case "l": case "L": {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const vals = (opts.values ?? sound)?.();
        if (!vals) return;
        const hi = e.key.toLowerCase() === "h";
        let best = -1;
        vals.forEach((v, i) => { if (v == null || !Number.isFinite(v) || i >= count) return; if (best < 0 || (hi ? v > (vals[best] as number) : v < (vals[best] as number))) best = i; });
        if (best < 0) return;
        e.preventDefault(); setActiveRaw(best); setWhy(hi ? "Highest" : "Lowest"); return;
      }
      case "n": case "N": case "p": case "P": {
        if (e.metaKey || e.ctrlKey || e.altKey || !opts.marks) return;
        const m = [...new Set(opts.marks())].filter((i) => i >= 0 && i < count).sort((a, b) => a - b);
        if (!m.length) return;
        const fwd = e.key.toLowerCase() === "n";
        let k = fwd ? m.findIndex((i) => i > cur) : m.length - 1 - [...m].reverse().findIndex((i) => i < (cur < 0 ? count : cur));
        if (fwd && k < 0) k = 0; // wrap
        if (!fwd && k > m.length - 1) k = m.length - 1;
        e.preventDefault(); setActiveRaw(m[k]); setWhy(`Note ${k + 1} of ${m.length}`); return;
      }
      default: return;
    }
    e.preventDefault();
    setActive(next);
  };
  const pos = active == null || count < 2 ? "" : `${why ? `${why}. ` : ""}${active + 1} of ${count}`;
  return {
    active,
    setActive,
    /** "Highest. 3 of 12": pass to LiveRegion as `at` so position is read after the value. */
    pos,
    bind: {
      tabIndex: 0,
      onPointerMove: pick,
      onPointerDown: pick,
      onPointerLeave: (e: PointerEvent) => { if (e.pointerType === "mouse") setActive(null); },
      onKeyDown,
      onFocus: () => setActive((a) => a ?? count - 1),
      onBlur: () => { setActive(null); stopSound(); },
      "data-wc-plot": "",
      style: { touchAction: "pan-y" as const },
      className: "relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-wc-focus focus-visible:ring-offset-4 focus-visible:ring-offset-wc-surface",
    },
  };
}

/** Index of the nearest of n evenly spaced points across width w. */
export const nearestIndex = (x: number, w: number, n: number) => (n <= 1 ? 0 : Math.round((x / w) * (n - 1)));

export function LiveRegion({ text, at = "" }: { text: string; at?: string }) {
  const said = speak(text);
  const full = said && at ? `${said.replace(/[.\s]+$/, "")}. ${at}.` : said;
  return <div data-wc-live="" aria-live="polite" aria-atomic="true" className="sr-only">{full}</div>;
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export interface DataTableSpec {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

/** "Get the data" (Datawrapper, Highcharts export-data): the table as a CSV file, exact values. */
export function toCsv(spec: DataTableSpec): string {
  const cell = (v: string | number) => { const t = String(v).replace(/\u2212/g, "-"); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return [spec.columns, ...spec.rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
export function downloadCsv(spec: DataTableSpec) {
  const url = URL.createObjectURL(new Blob([toCsv(spec)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${spec.caption.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart-data"}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The chart's data as a real table. Always in the DOM (sr-only) unless the user opens it. */
/** Rows drawn in the DOM. Past this, a screen reader table gets slow and nobody reads it all;
 *  the CSV download still carries every row. */
export const TABLE_ROW_CAP = 500;

/** Sort key for a cell: numbers from formatted text ("$1.2K", "\u221212%", "3,400") or null. */
export function sortValue(v: string | number): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = v.replace(/\u2212/g, "-").replace(/[,$\u20ac\u00a3%\s]/g, "");
  const m = t.match(/^([+-]?\d*\.?\d+)([kmbt])?(?:pts?|pp)?$/i);
  if (!m) return null;
  const mult: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  return parseFloat(m[1]) * (m[2] ? mult[m[2].toLowerCase()] : 1);
}

type Sort = { col: number; dir: "asc" | "desc" } | null;
const encSort = (s: Sort) => (s ? `${s.col}${s.dir === "asc" ? "a" : "d"}` : null);
const decSort = (v: string | null): Sort => { const m = v?.match(/^(\d+)([ad])$/); return m ? { col: +m[1], dir: m[2] === "a" ? "asc" : "desc" } : null; };

/** Sorts rows by one column. Column 0 (the label) flips the original order; value columns sort by
 *  number when every cell parses, else by text. Exported for tests and for SparkTable. */
export function sortRows<T>(rows: T[], cell: (r: T) => string | number, col: number, dir: "asc" | "desc"): T[] {
  if (col === 0) return dir === "desc" ? [...rows].reverse() : rows;
  const keyed = rows.map((r, i) => ({ r, i, v: cell(r), n: sortValue(cell(r)) }));
  const numeric = keyed.every((k) => k.n != null || k.v === "" || k.v === "\u2014");
  const sign = dir === "asc" ? 1 : -1;
  keyed.sort((a, b) => {
    if (numeric) {
      if (a.n == null || b.n == null) return a.n == null ? (b.n == null ? a.i - b.i : 1) : -1; // blanks last
      return (a.n - b.n) * sign || a.i - b.i;
    }
    return String(a.v).localeCompare(String(b.v), undefined, { numeric: true }) * sign || a.i - b.i;
  });
  return keyed.map((k) => k.r);
}

/** The chart's data as a real table. Always in the DOM (sr-only) unless the user opens it. When open,
 *  each header is a sort button with aria-sort. Value columns sort high to low first, then low to
 *  high, then back to the original order. The label column flips the original order. */
export function DataTable({ spec, visible }: { spec: DataTableSpec; visible: boolean }) {
  const share = useShareKey(".sort");
  const [sort, setSortRaw] = useState<Sort>(null);
  const [said, setSaid] = useState("");
  useEffect(() => { setSortRaw(decSort(readParam(share))); }, [share]);
  const setSort = (s: Sort) => {
    setSortRaw(s); writeParam(share, encSort(s));
    setSaid(s ? `Sorted by ${spec.columns[s.col]}, ${s.col === 0 ? (s.dir === "desc" ? "reversed" : "original order") : s.dir === "desc" ? "high to low" : "low to high"}.` : "Original order.");
  };
  const click = (col: number) => {
    if (col === 0) return setSort(sort?.col === 0 ? null : { col: 0, dir: "desc" });
    if (sort?.col !== col) return setSort({ col, dir: "desc" });
    setSort(sort.dir === "desc" ? { col, dir: "asc" } : null);
  };
  const sorted = useMemo(
    () => (sort && sort.col < spec.columns.length ? sortRows(spec.rows, (r) => r[sort.col] ?? "", sort.col, sort.dir) : spec.rows),
    [spec.rows, spec.columns.length, sort],
  );
  const rows = sorted.length > TABLE_ROW_CAP ? sorted.slice(0, TABLE_ROW_CAP) : sorted;
  const cut = spec.rows.length - rows.length;
  const ariaSort = (i: number) => (sort?.col !== i ? undefined : i === 0 ? "other" : sort.dir === "asc" ? "ascending" : "descending");
  return (
    <div className={visible ? "mt-4 max-h-64 overflow-auto rounded-xl ring-1 ring-wc-hairline" : "sr-only"}>
      <table className="w-full text-left text-[13px] tabular-nums">
        <caption className="sr-only">{spec.caption}</caption>
        <thead className="sticky top-0 bg-wc-surface-2 text-wc-muted">
          <tr>{spec.columns.map((c, i) => (
            <th key={c} scope="col" aria-sort={visible ? ariaSort(i) : undefined} className={`px-3 py-2 font-medium ${i ? "text-right" : ""}`}>
              {visible ? (
                <button type="button" onClick={() => click(i)} className={`wc-noprint -mx-1 inline-flex min-h-6 items-center gap-1 rounded px-1 hover:text-wc-ink focus-visible:outline-2 focus-visible:outline-wc-focus ${sort?.col === i ? "text-wc-ink" : ""}`}>
                  {c}
                  <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden className={sort?.col === i ? "" : "opacity-40"} fill="currentColor">
                    {sort?.col !== i ? <path d="M4 0 7 4H1zM4 10 1 6h6z" /> : (i === 0 ? sort.dir === "desc" : sort.dir === "asc") ? <path d="M4 0 7 4H1z" /> : <path d="M4 10 1 6h6z" />}
                  </svg>
                </button>
              ) : c}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-wc-hairline">
              {r.map((v, i) => i === 0
                ? <th key={i} scope="row" className="px-3 py-1.5 font-normal text-wc-ink-2">{v}</th>
                : <td key={i} className="px-3 py-1.5 text-right text-wc-ink">{v}</td>)}
            </tr>
          ))}
          {cut > 0 && (
            <tr className="border-t border-wc-hairline">
              <td colSpan={spec.columns.length} className="px-3 py-2 text-wc-muted">
                Showing the first {TABLE_ROW_CAP.toLocaleString()} of {spec.rows.length.toLocaleString()} rows. Download the CSV for all of them.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {visible && <div aria-live="polite" className="sr-only">{said}</div>}
    </div>
  );
}
