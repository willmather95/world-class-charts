"use client";
// world-class-charts: shared hooks, motion, scales and paths. No chart library needed.
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ---------- Color: SVG reads the semantic tokens directly ---------- */
export const c = {
  surface: "var(--wc-surface)",
  surface2: "var(--wc-surface-2)",
  track: "var(--wc-track)",
  grid: "var(--wc-grid)",
  hairline: "var(--wc-hairline)",
  axis: "var(--wc-axis)",
  ink: "var(--wc-ink)",
  ink2: "var(--wc-ink-2)",
  muted: "var(--wc-muted)",
  accent: "var(--wc-accent)",
  accentSoft: "var(--wc-accent-soft)",
  accentInk: "var(--wc-accent-ink)",
  compare: "var(--wc-compare)",
  compareSoft: "var(--wc-compare-soft)",
  positive: "var(--wc-positive)",
  positiveSoft: "var(--wc-positive-soft)",
  positiveInk: "var(--wc-positive-ink)",
  negative: "var(--wc-negative)",
  negativeSoft: "var(--wc-negative-soft)",
  negativeInk: "var(--wc-negative-ink)",
  warning: "var(--wc-warning)",
  warningInk: "var(--wc-warning-ink)",
} as const;

/** Categorical color by index. Use in order. Past 6 series, group the tail into "Other" (cat 8). */
export const cat = (i: number) => `var(--wc-cat-${(i % 8) + 1})`;
/** Pattern slot (1 to 8) that matches cat(i). Put it on a mark as data-wc-pat; prefs.tsx draws it. */
export const catPat = (i: number) => (i % 8) + 1;
/** Sequential step 0..6. 0 means zero, never "no data". */
export const seq = (step: number) => `var(--wc-seq-${clamp(Math.round(step), 0, 6)})`;

/* ---------- Motion: one curve, four durations (mirror of tokens.css) ---------- */
export const DUR = { press: 120, focus: 200, update: 450, entry: 700 } as const;
export const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** The same cubic-bezier(0.16, 1, 0.3, 1) as CSS, solved in JS so JS and CSS motion match. */
export const ease = bezier(0.16, 1, 0.3, 1);
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sy(clamp(t, 0, 1));
  };
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Tween an array of numbers. First run grows from 0 (entry, 700ms). Later runs move from the
 * current values to the new ones (update, 450ms). Reduced motion: jump straight to the target.
 */
export function useTween(target: number[], opts: { from?: "zero" | "target" } = {}) {
  const reduced = useReducedMotion();
  const key = target.join(",");
  const [vals, setVals] = useState<number[]>(() => (opts.from === "target" ? target : target.map(() => 0)));
  const current = useRef(vals);
  const first = useRef(true);
  useEffect(() => {
    if (reduced) {
      current.current = target;
      setVals(target);
      first.current = false;
      return;
    }
    const dur = first.current ? DUR.entry : DUR.update;
    first.current = false;
    const a = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = ease(t);
      const v = target.map((b, i) => (a[i] ?? 0) + (b - (a[i] ?? 0)) * e);
      current.current = v;
      setVals(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);
  return vals;
}

/** 0 -> 1 progress for one-shot entry effects (line draw, ring sweep). */
export function useEntrance(ms: number = DUR.entry) {
  const reduced = useReducedMotion();
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reduced) { setP(1); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setP(ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms, reduced]);
  return p;
}

/* ---------- Layout ---------- */
/** Measure an element's width. Charts draw in real pixels, so text never scales with the SVG. */
/** useLayoutEffect in the browser, useEffect on the server (no SSR warning). */
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  // Measure before the first paint, so no browser ever draws a frame at the fallback width
  // (WebKit runs ResizeObserver a frame late; without this, a 320px phone briefly scrolls sideways).
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const now = Math.round(el.getBoundingClientRect().width);
    if (now > 0) setW(Math.max(120, now));
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Breakpoints used by every template: phone 390, tablet 768, desktop 1440 (container width). */
export const sizeOf = (w: number): "sm" | "md" | "lg" => (w < 480 ? "sm" : w < 720 ? "md" : "lg");

/** About one x label per 72px, never fewer than 2. */
export const maxTicksFor = (plotW: number, px = 72) => Math.max(2, Math.floor(plotW / px));

/** Evenly spaced indices that always include the first and last point. */
export function pickIndices(n: number, max: number): number[] {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / (max - 1));
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += step) out.push(i);
  if (n - 1 - out[out.length - 1] < step / 2) out.pop();
  out.push(n - 1);
  return out;
}

/* ---------- Scales ---------- */
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Nice tick values from lo to hi (1, 2, 2.5, 5 x 10^n steps). Bars must pass lo = 0. */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) { hi = lo === 0 ? 1 : lo + Math.abs(lo) * 0.5; if (lo > 0) lo = 0; }
  const raw = (hi - lo) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const out: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) out.push(Math.round(v / step) * step);
  return out;
}

export const scaleLinear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/* ---------- Paths ---------- */
export type Pt = [number, number];
export const linePath = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");

/**
 * Monotone cubic (Fritsch-Carlson). Smooth like the reference look, but never overshoots, so a
 * smoothed line cannot invent a peak or dip that is not in the data. Use linePath for <4 points.
 */
export function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n < 3) return linePath(pts);
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + h * t[i]).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - h * t[i + 1]).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Rounded-top bar (flat base on the baseline). Negative heights round the bottom instead. */
export function barPath(x: number, y0: number, w: number, h: number, r = 4): string {
  if (Math.abs(h) < 0.5) return "";
  const up = h > 0;
  const rr = Math.min(r, w / 2, Math.abs(h));
  const top = up ? y0 - h : y0 - h; // y of the far end
  if (up) return `M${x},${y0}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${y0}Z`;
  return `M${x},${y0}V${top - rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top - rr}V${y0}Z`;
}

export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1},${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

/** Tint a token toward the surface: soft(c.accent, 25) -> 25% color. Works in every theme. */
export const soft = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, var(--wc-surface))`;

/**
 * Inactive ("ghost") mark: a soft fill plus a 1px edge in the full color. The edge carries the
 * 3:1 non-text contrast (WCAG 1.4.11), so every inactive bar, wedge or ribbon keeps a readable
 * shape and height while the active one stands out. Use this, never opacity, to quiet a mark.
 * Draw ghost shapes 0.5px inside their box so the edge does not spill past the baseline.
 */
export const ghost = (color: string, pct = 22) => ({ fill: soft(color, pct), stroke: color, strokeWidth: 1 });

/** Label collision: push sorted positions apart so neighbors sit at least `gap` px apart, then
 *  shift the whole run back inside [lo, hi]. Returns positions in the input order. Used for
 *  direct labels (slope ends, Sankey gutters, line end labels). */
export function dodge(ys: number[], gap: number, lo = -Infinity, hi = Infinity): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(ys.length);
  let prev = -Infinity;
  const placed = order.map(([y]) => { const v = Math.max(y, prev + gap, lo); prev = v; return v; });
  const over = (placed.at(-1) ?? 0) - hi;
  if (over > 0) {
    // Pull back from the bottom, keeping the gaps, but never past lo.
    for (let k = placed.length - 1, cap = hi; k >= 0; k--, cap -= gap) placed[k] = Math.max(lo, Math.min(placed[k], cap));
  }
  order.forEach(([, i], k) => { out[i] = placed[k]; });
  return out;
}

/** Largest-Triangle-Three-Buckets downsampling (Steinarsson 2013). Keeps the visual shape of a
 *  long series (peaks and dips survive) while drawing about `threshold` points. Returns the kept
 *  indices, so callers can map back to their own data. The table still shows every row. */
export function lttb(ys: number[], threshold: number): number[] {
  const n = ys.length;
  if (threshold >= n || threshold < 3) return ys.map((_, i) => i);
  const keep = [0];
  const every = (n - 2) / (threshold - 2);
  let a = 0;
  for (let b = 0; b < threshold - 2; b++) {
    const s0 = Math.floor((b + 1) * every) + 1, s1 = Math.min(n, Math.floor((b + 2) * every) + 1);
    let ax = 0, ay = 0;
    for (let j = s0; j < s1; j++) { ax += j; ay += ys[j]; }
    const len = Math.max(1, s1 - s0); ax /= len; ay /= len;
    const r0 = Math.floor(b * every) + 1, r1 = Math.floor((b + 1) * every) + 1;
    let best = r0, area = -1;
    for (let j = r0; j < r1; j++) {
      const t = Math.abs((a - ax) * (ys[j] - ys[a]) - (a - j) * (ay - ys[a]));
      if (t > area) { area = t; best = j; }
    }
    keep.push(best); a = best;
  }
  keep.push(n - 1);
  return keep;
}
