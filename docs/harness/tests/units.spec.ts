// Pure helper tests: no browser. Edge cases from the benchmark teardown (sources.md).
import { test, expect } from "@playwright/test";
import { dodge, lttb, niceTicks, pickIndices } from "../src/templates/lib";
import { fmt, fmtCurrency, fmtDelta, fmtMonth, fmtNumber, fmtPercent, fmtWeekday, speak, configureFormat } from "../src/templates/format";
import { toCsv, sortValue, sortRows } from "../src/templates/interaction";

test("lttb keeps the ends and the spikes", () => {
  const ys = Array.from({ length: 1000 }, (_, i) => (i === 500 ? 99 : i === 700 ? -99 : Math.sin(i / 20)));
  const keep = lttb(ys, 50);
  expect(keep.length).toBe(50);
  expect(keep[0]).toBe(0);
  expect(keep.at(-1)).toBe(999);
  expect(keep).toContain(500);
  expect(keep).toContain(700);
  expect(lttb([1, 2], 50)).toEqual([0, 1]);
});

test("dodge spaces labels by the gap and keeps their order", () => {
  const out = dodge([10, 11, 12, 50], 14);
  const sorted = [...out].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(14 - 1e-9);
  expect(out[0]).toBeLessThan(out[1]);
  expect(out[3]).toBeGreaterThanOrEqual(50);
});

test("niceTicks covers the data with round steps, even when flat or empty", () => {
  const t = niceTicks(3, 97, 4);
  expect(t[0]).toBeLessThanOrEqual(3);
  expect(t.at(-1)).toBeGreaterThanOrEqual(97);
  expect(niceTicks(5, 5).length).toBeGreaterThan(1);
  expect(niceTicks(NaN, 1)).toEqual([0, 1]);
  expect(pickIndices(0, 5)).toEqual([]);
  expect(pickIndices(100, 5).length).toBeLessThanOrEqual(5);
});

test("formatting edge cases", () => {
  configureFormat({ locale: "en-US", currency: "USD" });
  expect(fmt(NaN)).toBe("n/a");
  expect(fmt(1234567, "currency")).toMatch(/^\$1\.2M$/);
  expect(fmt(-5, "number")).toMatch(/^\u22125$/); // true minus, not a hyphen
  expect(fmtPercent(0.0004)).toBe("<0.1%");
  expect(fmtPercent(0.9996)).toMatch(/^(99\.9|>99\.9)%$/); // never rounds up to 100%
  expect(fmtDelta(0.142)).toMatch(/^\+14(\.2)?%$/);
});

test("speak turns symbols into words a screen reader says well", () => {
  const s = speak("$1.2M, \u22125%, 3K");
  expect(s).not.toMatch(/\u2212/);
  expect(s).toMatch(/million/);
  expect(s).toMatch(/thousand/);
});

test("toCsv quotes commas, quotes and new lines", () => {
  const csv = toCsv({ caption: "t", columns: ["Name", "Note"], rows: [["Acme, Inc", 'say "hi"'], ["B", "line\nbreak"]] });
  expect(csv).toContain('"Acme, Inc"');
  expect(csv).toContain('"say ""hi"""');
  expect(csv).toContain('"line\nbreak"');
});

test("sortValue reads formatted numbers, units and true minus", () => {
  expect(sortValue("$1.2K")).toBe(1200);
  expect(sortValue("\u221212%")).toBe(-12);
  expect(sortValue("3,400")).toBe(3400);
  expect(sortValue("\u20ac2.5M")).toBe(2.5e6);
  expect(sortValue("+4pts")).toBe(4);
  expect(sortValue("1.1B")).toBe(1.1e9);
  expect(sortValue("Jan")).toBeNull();
  expect(sortValue(NaN)).toBeNull();
});

test("sortRows sorts by number, puts blanks last, and keeps ties in order", () => {
  const rows = [["a", "2"], ["b", "\u2014"], ["c", "10"], ["d", "2"], ["e", "$1K"]];
  const col = (r: string[]) => r[1];
  expect(sortRows(rows, col, 1, "desc").map((r) => r[0])).toEqual(["e", "c", "a", "d", "b"]);
  expect(sortRows(rows, col, 1, "asc").map((r) => r[0])).toEqual(["a", "d", "c", "e", "b"]);
  expect(sortRows(rows, (r) => r[0], 0, "desc").map((r) => r[0])).toEqual(["e", "d", "c", "b", "a"]);
  const text = [["x", "beta"], ["y", "Alpha"], ["z", "item 10"], ["w", "item 9"]];
  expect(sortRows(text, col, 1, "asc").map((r) => r[1])).toEqual(["Alpha", "beta", "item 9", "item 10"]);
});

test("missing values print n/a, never 0", () => {
  for (const bad of [null, undefined, NaN, Infinity]) {
    expect(fmtNumber(bad)).toBe("n/a");
    expect(fmtCurrency(bad)).toBe("n/a");
    expect(fmtPercent(bad)).toBe("n/a");
    expect(fmtDelta(bad)).toBe("n/a");
    expect(fmt(bad, "currency")).toBe("n/a");
  }
  expect(fmt(0)).toBe("0");
});

test("month and weekday labels follow the configured locale", () => {
  try {
    configureFormat({ locale: "de-DE" });
    expect(fmtMonth(new Date(2026, 9, 1))).toMatch(/^Okt/);
    expect(fmtMonth(new Date(2026, 11, 1))).toMatch(/^Dez/);
    expect(fmtWeekday(new Date(2024, 0, 1))).toMatch(/^Mo/);
  } finally {
    configureFormat({ locale: "en-US" });
  }
  expect(fmtMonth(new Date(2026, 9, 1))).toBe("Oct");
  expect(fmtWeekday(new Date(2024, 0, 3))).toBe("Wed");
});

test("sortRows treats n/a and No data as blanks, so a numeric column stays numeric", () => {
  const rows = [["a", "$900"], ["b", "$1,000"], ["c", "n/a"], ["d", "$50"], ["e", "No data"]];
  const col = (r: string[]) => r[1];
  expect(sortRows(rows, col, 1, "asc").map((r) => r[1])).toEqual(["$50", "$900", "$1,000", "n/a", "No data"]);
  expect(sortRows(rows, col, 1, "desc").map((r) => r[1])).toEqual(["$1,000", "$900", "$50", "n/a", "No data"]);
});

test("rate changes in points follow the locale decimal mark", () => {
  try {
    configureFormat({ locale: "de-DE" });
    expect(fmtDelta(2.1, "points")).toBe("+2,1 pts");
  } finally {
    configureFormat({ locale: "en-US" });
  }
  expect(fmtDelta(2.1, "points")).toBe("+2.1 pts");
  expect(fmtDelta(-3, "points")).toBe("\u22123 pts");
});
