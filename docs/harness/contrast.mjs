// Checks WCAG contrast for every token pair the templates rely on, in light and dark.
// Usage: node contrast.mjs [path/to/tokens.css] [extra-theme.css]
import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
const tokPath = files[0] ?? new URL("../../src/tokens.css", import.meta.url).pathname;
const css = readFileSync(tokPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
function block(sel) {
  const i = css.indexOf(sel); if (i < 0) return {};
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  return Object.fromEntries([...body.matchAll(/--(wc-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}
const lum = (hex) => {
  const v = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const text = ["wc-ink", "wc-ink-2", "wc-muted", "wc-accent-ink", "wc-positive-ink", "wc-negative-ink", "wc-warning-ink"];
// Marks: every bar, line, dot, node and the edge of every ghost (inactive) bar uses one of these.
const marks = ["wc-accent", "wc-compare", "wc-axis", "wc-positive", "wc-negative", "wc-warning", "wc-focus", ...Array.from({ length: 8 }, (_, i) => `wc-cat-${i + 1}`), "wc-seq-3", "wc-seq-4", "wc-seq-5", "wc-seq-6"];
// Color vision deficiency check. Simulates protan, deutan and tritan vision (Machado, Oliveira and
// Fernandes 2009, severity 1.0, applied in linear RGB) and measures CIEDE2000 between key pairs.
// About 1 in 12 men has a red-green deficiency, so pairs that carry meaning must stay apart.
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const lin = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const sim = (rgb, m) => m ? m.map((r) => Math.min(1, Math.max(0, r[0] * rgb[0] + r[1] * rgb[1] + r[2] * rgb[2]))) : rgb;
function lab([r, g, b]) {
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function de2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7))), A1 = a1 * (1 + G), A2 = a2 * (1 + G);
  const c1 = Math.hypot(A1, b1), c2 = Math.hypot(A2, b2);
  const h = (b, a) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1 = h(b1, A1), h2 = h(b2, A2), dL = L2 - L1, dC = c2 - c1;
  let dh = c1 * c2 === 0 ? 0 : h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh / 2) * rad), Lb = (L1 + L2) / 2, cb = (c1 + c2) / 2;
  let hb = h1 + h2; if (c1 * c2 !== 0) hb = Math.abs(h1 - h2) > 180 ? (hb < 360 ? (hb + 360) / 2 : (hb - 360) / 2) : hb / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * cb, SH = 1 + 0.015 * cb * T;
  const RT = -2 * Math.sqrt(cb ** 7 / (cb ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
const cvd = (a, b, m) => de2000(lab(sim(lin(a), m)), lab(sim(lin(b), m)));
// Pairs that carry meaning by color. Floor: CIEDE2000 >= 10 under every vision type.
// Positive and negative also carry a sign and an arrow, so color is never the only cue (WCAG 1.4.1);
// they still must stay apart. The first four categories cover most legends.
const CVD_PAIRS = [["wc-accent", "wc-compare"], ["wc-positive", "wc-negative"],
  // Every categorical pair, 1 to 8: any two series can sit side by side in a legend or a stack.
  ...Array.from({ length: 8 }, (_, i) => Array.from({ length: 7 - i }, (_, k) => [`wc-cat-${i + 1}`, `wc-cat-${i + k + 2}`])).flat()];
const CVD_FLOOR = 10;

let fails = 0;
function run(name, t) {
  const rows = [];
  for (const k of text) for (const bg of ["wc-surface", "wc-surface-2"]) {
    const r = ratio(t[k], t[bg]); const ok = r >= 4.5; fails += ok ? 0 : 1; rows.push([`${k} on ${bg}`, r.toFixed(2), ok ? "pass 4.5" : "FAIL 4.5"]);
  }
  for (const [k, bg] of [["wc-positive-ink", "wc-positive-soft"], ["wc-negative-ink", "wc-negative-soft"], ["wc-warning-ink", "wc-warning-soft"], ["wc-accent-ink", "wc-accent-soft"], ["wc-tip-ink", "wc-tip-bg"], ["wc-tip-muted", "wc-tip-bg"]]) {
    const r = ratio(t[k], t[bg]); const ok = r >= 4.5; fails += ok ? 0 : 1; rows.push([`${k} on ${bg}`, r.toFixed(2), ok ? "pass 4.5" : "FAIL 4.5"]);
  }
  for (const k of marks) { const r = ratio(t[k], t["wc-surface"]); const ok = r >= 3; fails += ok ? 0 : 1; rows.push([`${k} mark on surface`, r.toFixed(2), ok ? "pass 3" : "FAIL 3"]); }
  // Sequential ramp (heatmaps). Cells carry value by lightness, so every step must be visible and
  // distinct: step 1 >= 1.5:1 on the card, each neighbor >= 1.3:1 apart, zero distinct from step 1.
  { const r = ratio(t["wc-seq-1"], t["wc-surface"]); const ok = r >= 1.5; fails += ok ? 0 : 1; rows.push(["wc-seq-1 on surface", r.toFixed(2), ok ? "pass 1.5" : "FAIL 1.5"]); }
  { const r = ratio(t["wc-seq-0"], t["wc-seq-1"]); const ok = r >= 1.2; fails += ok ? 0 : 1; rows.push(["wc-seq-0 vs seq-1 (zero vs low)", r.toFixed(2), ok ? "pass 1.2" : "FAIL 1.2"]); }
  for (let i = 1; i < 6; i++) { const r = ratio(t[`wc-seq-${i}`], t[`wc-seq-${i + 1}`]); const ok = r >= 1.3; fails += ok ? 0 : 1; rows.push([`wc-seq-${i} vs seq-${i + 1}`, r.toFixed(2), ok ? "pass 1.3" : "FAIL 1.3"]); }
  // Focus ring: 3:1 against both card surfaces (WCAG 2.4.11 and 2.4.13 ask 3:1 for the focus change).
  for (const bg of ["wc-surface-2"]) { const r = ratio(t["wc-focus"], t[bg]); const ok = r >= 3; fails += ok ? 0 : 1; rows.push([`wc-focus ring on ${bg}`, r.toFixed(2), ok ? "pass 3" : "FAIL 3"]); }
  for (const [a, b] of CVD_PAIRS) {
    const worst = Math.min(...[null, ...Object.values(MACHADO)].map((m) => cvd(t[a], t[b], m)));
    const which = ["normal", ...Object.keys(MACHADO)][[null, ...Object.values(MACHADO)].map((m) => cvd(t[a], t[b], m)).indexOf(worst)];
    const ok = worst >= CVD_FLOOR; fails += ok ? 0 : 1;
    rows.push([`${a} vs ${b}, CVD worst (${which})`, `dE ${worst.toFixed(1)}`, ok ? `pass ${CVD_FLOOR}` : `FAIL ${CVD_FLOOR}`]);
  }
  // Neighbor categorical pairs: report only (separated by gaps, so 3:1 between them is not required).
  for (let i = 1; i < 8; i++) rows.push([`cat-${i} vs cat-${i + 1}`, ratio(t[`wc-cat-${i}`], t[`wc-cat-${i + 1}`]).toFixed(2), "info"]);
  console.log(`\n## ${name}`); for (const r of rows) console.log(r.join(" | "));
}
const light = block(":root"); const dark = { ...light, ...block(".dark, [data-theme=\"dark\"]") };
run("light", light); run("dark", dark);
// More contrast (prefers-contrast: more, or data-wc-contrast="more"): AAA text, 3:1 dividers.
// The OS block and the toggle block must hold the same values, so check both and compare.
function runMore(name, t) {
  const rows = [];
  const need = (label, r, min) => { const ok = r >= min; fails += ok ? 0 : 1; rows.push([label, r.toFixed(2), ok ? `pass ${min}` : `FAIL ${min}`]); };
  for (const k of ["wc-ink", "wc-ink-2", "wc-muted"]) for (const bg of ["wc-surface", "wc-surface-2"]) need(`${k} on ${bg}`, ratio(t[k], t[bg]), 7);
  need("wc-tip-muted on wc-tip-bg", ratio(t["wc-tip-muted"], t["wc-tip-bg"]), 7);
  for (const k of ["wc-hairline", "wc-axis", "wc-compare"]) for (const bg of ["wc-surface", "wc-surface-2"]) need(`${k} on ${bg}`, ratio(t[k], t[bg]), 3);
  console.log(`\n## ${name}`); for (const r of rows) console.log(r.join(" | "));
}
const css2 = css;
const moreL = block('[data-wc-contrast="more"] {'), moreD = block('[data-wc-contrast="more"] .dark');
const osL = (() => { const i = css2.indexOf("prefers-contrast: more"); return i < 0 ? {} : block(css2.slice(i, i + 40)); })();
if (Object.keys(moreL).length) {
  runMore("more contrast, light", { ...light, ...moreL }); runMore("more contrast, dark", { ...dark, ...moreD });
  const drift = Object.keys(moreL).filter((k) => osL[k] !== moreL[k]);
  if (drift.length) { fails += drift.length; console.log(`FAIL: prefers-contrast block differs from the toggle block: ${drift.join(", ")}`); }
}
for (const extra of files.slice(1)) {
  const ecss = readFileSync(extra, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const grab = (sel) => { const i = ecss.indexOf(sel); if (i < 0) return {}; const body = ecss.slice(ecss.indexOf("{", i) + 1, ecss.indexOf("}", i)); return Object.fromEntries([...body.matchAll(/--(wc-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])); };
  const bl = { ...light, ...grab("[data-brand") }; run(`${extra} light`, bl);
  const bd = { ...dark, ...grab(".dark [data-brand") }; run(`${extra} dark`, bd);
}
console.log(`\nFAILS: ${fails}`); process.exitCode = fails ? 1 : 0;
