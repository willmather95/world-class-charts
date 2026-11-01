// world-class-charts: number and date formatting. One place, so every chart says numbers the same way.
// Rules (see references/formatting.md):
// - Compact past 10,000 in charts (12.4K, 1.3M). Exact in tooltips and tables.
// - Signed deltas use a true minus (U+2212) and an explicit plus. Zero shows as "0%", no sign.
// - Units ride with the number once per label ("12 min", "$1.2K"), never only in a far-off axis title.
// - Same decimals across one axis.

const MINUS = "\u2212";
/** Missing values (null, undefined, NaN, Infinity) print "n/a", never "0". */
type Num = number | null | undefined;
let locale = "en-US";

// Building an Intl formatter is slow (tens of microseconds). A 10,000-point chart formats every
// row, so formatters are cached by locale and options. The cache stays small: few option sets exist.
const numCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();
function nf(o: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = locale + JSON.stringify(o);
  let f = numCache.get(k);
  if (!f) numCache.set(k, (f = new Intl.NumberFormat(locale, o)));
  return f;
}
let defaultCurrency = "USD";

/** Set the locale and currency once at app start: configureFormat({ locale: "de-DE", currency: "EUR" }).
 *  Every number, date and axis label then follows it; interface words (View data, Forecast, Net) stay
 *  English. Charts keep a left-to-right plot in RTL pages. */
export function configureFormat(o: { locale?: string; currency?: string }) {
  if (o.locale) locale = o.locale;
  if (o.currency) defaultCurrency = o.currency;
}
export const getLocale = () => locale;

export type NumKind = "number" | "currency" | "percent";

export interface FmtOpts {
  /** Force compact (K/M/B) or exact. Default: compact when |n| >= 10,000. */
  compact?: boolean;
  /** Max fraction digits. Default 0 for >= 100, 1 below. */
  decimals?: number;
  currency?: string;
}

function defaultDecimals(n: number) {
  const a = Math.abs(n);
  return a === 0 || a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : 2;
}

/** Sign for a value shown at d decimals: no minus when it rounds to zero, so -0.004 reads "0". */
const sign = (n: number, d: number) => (n < 0 && Number(Math.abs(n).toFixed(Math.max(0, d))) !== 0 ? MINUS : "");

export function fmtNumber(n: Num, o: FmtOpts = {}): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const compact = o.compact ?? Math.abs(n) >= 10_000;
  const d = o.decimals ?? (compact ? 1 : defaultDecimals(n));
  const s = nf({
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: d,
  }).format(Math.abs(n));
  return (compact ? (n < 0 ? MINUS : "") : sign(n, d)) + s;
}

export function fmtCurrency(n: Num, o: FmtOpts = {}): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const compact = o.compact ?? Math.abs(n) >= 10_000;
  const d = o.decimals ?? (compact ? 1 : Math.abs(n) >= 100 || Number.isInteger(n) ? 0 : 2);
  const s = nf({
    style: "currency",
    currency: o.currency ?? defaultCurrency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  }).format(Math.abs(n));
  return (compact ? (n < 0 ? MINUS : "") : sign(n, d)) + s;
}

/** ratio 0.142 -> "14.2%". Honest at the edges (Datawrapper rule): a value that is not zero never
 *  prints "0%" (shows "<0.1%"), and a share under 100% never prints "100%" (shows "99.9%"). */
export function fmtPercent(ratio: Num, decimals?: number): string {
  if (ratio == null || !Number.isFinite(ratio)) return "n/a";
  const p = ratio * 100, a = Math.abs(p);
  const d = decimals ?? (a >= 10 || Number.isInteger(p) ? 0 : 1);
  const step = 10 ** -Math.max(d, 1);
  const num = (v: number, k: number) => nf({ maximumFractionDigits: k, minimumFractionDigits: 0 }).format(v);
  if (a > 0 && Number(a.toFixed(d)) === 0) return `${p < 0 ? ">" + MINUS : "<"}${num(step, Math.max(d, 1))}%`;
  if (a < 100 && Number(a.toFixed(d)) === 100) {
    const k = Math.max(d, 1), floor = Math.floor(a * 10 ** k) / 10 ** k;
    return (p < 0 ? MINUS : "") + (floor < 100 ? num(floor, k) : `>${num(100 - step, k)}`) + "%";
  }
  return sign(p, d) + num(a, d) + "%";
}

export function fmt(n: Num, kind: NumKind = "number", o: FmtOpts = {}): string {
  return kind === "currency" ? fmtCurrency(n, o) : kind === "percent" ? fmtPercent(n, o.decimals) : fmtNumber(n, o);
}

/** Signed delta. kind "percent" takes a ratio (0.12 -> "+12%"). "points" for rate changes (+2.1 pts). */
export function fmtDelta(n: Num, kind: NumKind | "points" = "percent", o: FmtOpts = {}): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const body =
    kind === "points" ? `${nf({ maximumFractionDigits: o.decimals ?? 1, minimumFractionDigits: 0 }).format(Math.abs(n))} pts` : fmt(Math.abs(n), kind, o);
  if (body.replace(/[^1-9]/g, "") === "") return body; // rounds to zero: no sign
  return (n > 0 ? "+" : MINUS) + body;
}

/** Percent change from previous to current. Returns null when previous is 0 (undefined change). */
export const pctChange = (current: number, previous: number): number | null =>
  previous === 0 ? null : (current - previous) / Math.abs(previous);

/** "Good" depends on the metric. Costs, errors, churn: down is good. */
export type Polarity = "up-good" | "down-good" | "neutral";
export function tone(delta: number, polarity: Polarity = "up-good"): "positive" | "negative" | "neutral" {
  if (polarity === "neutral" || delta === 0 || !isFinite(delta)) return "neutral";
  return (delta > 0) === (polarity === "up-good") ? "positive" : "negative";
}

export function fmtUnit(n: number, unit: string, o: FmtOpts = {}): string {
  return `${fmtNumber(n, o)}\u00a0${unit}`;
}

/** Seconds -> "45s", "12m", "1h 12m", "3d 4h". */
export function fmtDuration(sec: number): string {
  const s = Math.round(Math.abs(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

/** Axis formatter: picks one decimal count for the whole axis so labels line up. */
/** Fewest decimals (0-2) that show a tick step exactly, so 2.5K never rounds to "3K". */
const decimalsFor = (step: number) => (Number.isInteger(+step.toFixed(6)) ? 0 : Number.isInteger(+(step * 10).toFixed(6)) ? 1 : 2);

export function axisFormatter(ticks: number[], kind: NumKind = "number", o: FmtOpts = {}) {
  const max = Math.max(...ticks.map(Math.abs), 0);
  const compact = o.compact ?? max >= 10_000;
  const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : max;
  let decimals = 0;
  if (kind === "percent") decimals = step * 100 < 1 ? 1 : 0;
  else if (compact) {
    const unit = max >= 1e12 ? 1e12 : max >= 1e9 ? 1e9 : max >= 1e6 ? 1e6 : 1e3;
    decimals = decimalsFor(step / unit);
  } else decimals = decimalsFor(step);
  return (v: number) => (v === 0 && kind !== "percent" ? "0" : fmt(v, kind, { ...o, compact, decimals }));
}

/**
 * Screen-reader wording (Chartability: "data in text is human-readable"). Visual labels say "$48.2K";
 * a screen reader should hear "$48.2 thousand" and "minus 4%", not "K" or a silent U+2212.
 * English only: other locales keep their own compact words from Intl, so they pass through.
 */
export function speak(text: string): string {
  if (!locale.startsWith("en")) return text.replace(/\u2212/g, "-");
  const words: Record<string, string> = { K: "thousand", M: "million", B: "billion", T: "trillion" };
  return text
    .replace(/(\d)([KMBT])(?![A-Za-z])/g, (_, d: string, u: string) => `${d} ${words[u]}`)
    .replace(/<(?=[\d\u2212])/g, "less than ")
    .replace(/>(?=[\d\u2212])/g, "more than ")
    .replace(/\u2212/g, "minus ");
}

/* ---------- Dates ---------- */
export type Grain = "hour" | "day" | "week" | "month" | "quarter" | "year";
const df = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const k = locale + JSON.stringify(o);
  let f = dateCache.get(k);
  if (!f) dateCache.set(k, (f = new Intl.DateTimeFormat(locale, o)));
  return f;
};

/** Short month name ("Oct", "Okt"): axis and heatmap labels. */
export const fmtMonth = (d: Date): string => df({ month: "short" }).format(d);
/** Short weekday name ("Mon", "Mo."). */
export const fmtWeekday = (d: Date): string => df({ weekday: "short" }).format(d);

/** Tooltip and table date: full context. */
export function fmtDate(d: Date, grain: Grain = "day"): string {
  switch (grain) {
    case "hour": return df({ month: "short", day: "numeric", hour: "numeric" }).format(d);
    case "day": return df({ weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
    case "week": return `Week of ${df({ month: "short", day: "numeric", year: "numeric" }).format(d)}`;
    case "month": return df({ month: "long", year: "numeric" }).format(d);
    case "quarter": return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    case "year": return String(d.getFullYear());
  }
}

/** "Oct 1 to 30, 2026" style range with an en dash. */
export function fmtRange(a: Date, b: Date): string {
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  const left = df({ month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(a);
  const right = sameMonth ? String(b.getDate()) : df({ month: "short", day: "numeric", year: "numeric" }).format(b);
  return `${left}\u2013${right}${sameMonth ? `, ${b.getFullYear()}` : ""}`;
}

/**
 * Time axis labels, FT style: short label on every tick, a second line with the larger unit only on
 * the first tick and when it changes. Months: "Jan" / "2026". Days: "Oct 1" then "8", "15".
 */
export function timeTicks(dates: Date[], grain: Grain): { label: string; sub?: string }[] {
  return dates.map((d, i) => {
    const prev = dates[i - 1];
    if (grain === "month" || grain === "quarter") {
      const label = grain === "month" ? fmtMonth(d) : `Q${Math.floor(d.getMonth() / 3) + 1}`;
      return { label, sub: !prev || prev.getFullYear() !== d.getFullYear() ? String(d.getFullYear()) : undefined };
    }
    if (grain === "year") return { label: String(d.getFullYear()) };
    if (grain === "hour") {
      const label = df({ hour: "numeric" }).format(d);
      return { label, sub: !prev || prev.getDate() !== d.getDate() ? df({ month: "short", day: "numeric" }).format(d) : undefined };
    }
    const newMonth = !prev || prev.getMonth() !== d.getMonth();
    return { label: newMonth ? df({ month: "short", day: "numeric" }).format(d) : String(d.getDate()) };
  });
}
