"use client";
// world-class-charts: reader display choices, set once per page.
// Patterns: each categorical slot gets its own texture, so parts stay apart without color.
// More contrast: labels reach 7:1, dividers 3:1. The OS setting (prefers-contrast: more) turns
// it on by itself; this toggle is for readers who want it on one page only.
// Choices persist in localStorage and land as attributes on <html>, so every chart follows.
import { useEffect, useState, type ReactNode } from "react";

export type DisplayPrefs = { patterns: boolean; contrast: boolean };
const KEY = "wc.prefs";
const OFF: DisplayPrefs = { patterns: false, contrast: false };

export function loadPrefs(): DisplayPrefs {
  try { return { ...OFF, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return OFF; }
}

export function applyPrefs(p: DisplayPrefs, root: HTMLElement = document.documentElement) {
  root.toggleAttribute("data-wc-patterns", p.patterns);
  if (p.contrast) root.setAttribute("data-wc-contrast", "more"); else root.removeAttribute("data-wc-contrast");
}

/** Two toggle buttons. Put one near the top of a dashboard, not one per card. */
export function ChartPrefs({ className = "" }: { className?: string }) {
  const [p, setP] = useState<DisplayPrefs>(OFF);
  useEffect(() => { const v = loadPrefs(); setP(v); applyPrefs(v); }, []);
  const flip = (k: keyof DisplayPrefs) => {
    const next = { ...p, [k]: !p[k] };
    setP(next);
    applyPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: still applies */ }
  };
  const btn = "min-h-6 rounded-full px-3 py-1 text-[12px] font-medium ring-1 ring-wc-hairline transition-colors aria-pressed:bg-wc-ink aria-pressed:text-wc-surface aria-pressed:ring-wc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wc-focus";
  return (
    <div role="group" aria-label="Chart display" className={`flex flex-wrap items-center gap-2 text-wc-muted ${className}`}>
      <button type="button" className={btn} aria-pressed={p.patterns} onClick={() => flip("patterns")}>Patterns</button>
      <button type="button" className={btn} aria-pressed={p.contrast} onClick={() => flip("contrast")}>More contrast</button>
      <PatternDefs />
    </div>
  );
}

/** The SVG patterns that data-wc-pat="1".."8" point at. ChartPrefs renders it; render it
 *  yourself once per page if you set data-wc-patterns some other way. */
export function PatternDefs() {
  const ink = { stroke: "var(--wc-surface)", strokeOpacity: 0.85 } as const;
  const shapes: Record<number, ReactNode> = {
    1: null,
    2: <path d="M-1 1l2-2M0 6l6-6M5 7l2-2" strokeWidth={1.5} {...ink} />,
    3: <circle cx={3} cy={3} r={1} fill="var(--wc-surface)" fillOpacity={0.85} />,
    4: <path d="M0 3h6" strokeWidth={1.5} {...ink} />,
    5: <path d="M0 0l6 6M6 0l-6 6" strokeWidth={1} {...ink} />,
    6: <path d="M3 0v6" strokeWidth={1.5} {...ink} />,
    7: <path d="M-1 5l2 2M0 0l6 6M5-1l2 2" strokeWidth={1.5} {...ink} />,
    8: <path d="M0 0h3v3H0zM3 3h3v3H3z" fill="var(--wc-surface)" fillOpacity={0.6} />,
  };
  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {Object.entries(shapes).map(([k, shape]) => (
          <pattern key={k} id={`wc-pat-${k}`} width={6} height={6} patternUnits="userSpaceOnUse">
            <rect width={6} height={6} style={{ fill: `var(--wc-cat-${k})` }} />
            {shape}
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
