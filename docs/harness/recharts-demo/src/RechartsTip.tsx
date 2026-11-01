// The world-class-charts tooltip, rendered through Recharts' `content` prop.
// Recharts owns the position, so this is the Tip box without its absolute placement.
import { useEffect } from "react";
import { useActiveTooltipDataPoints } from "recharts";
import { TipRow } from "./templates/ChartCard";
import { fmt, type NumKind } from "./templates/format";

type Item = { name?: string | number; value?: number | string | (number | string)[]; color?: string; dataKey?: unknown; payload?: { dashed?: string[] } };

export function RechartsTip({ active, payload, label, kind = "number", dashed = [], total = false }: {
  active?: boolean;
  payload?: readonly Item[];
  label?: string | number;
  kind?: NumKind;
  /** Series keys drawn dashed (compare or projection), so the swatch matches the mark. */
  dashed?: string[];
  /** Add a Total row for stacked bars. */
  total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const nums = payload.map((p) => Number(p.value ?? 0));
  return (
    <div className="min-w-[160px] rounded-wc-tip bg-wc-tip-bg px-3 py-2.5 font-wc text-[13px] text-wc-tip-ink tabular-nums shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]">
      <div className="mb-1 text-[12px] text-wc-tip-muted">{label}</div>
      {payload.map((p, i) => (
        <TipRow key={String(p.dataKey)} color={p.color ?? "var(--wc-ink)"} label={p.name} value={fmt(nums[i], kind, { compact: false })} dashed={dashed.includes(String(p.dataKey))} />
      ))}
      {total && <div className="mt-1 flex border-t border-wc-tip-muted/30 pt-1"><span className="text-wc-tip-muted">Total</span><b className="ml-auto font-medium">{fmt(nums.reduce((a, b) => a + b, 0), kind, { compact: false })}</b></div>}
    </div>
  );
}

/** Live region bridge. Recharts' accessibilityLayer moves the active point with the arrow keys,
 *  but says nothing. Render this inside the chart: it reads the active row from Recharts' own
 *  tooltip state and hands a plain sentence up to the card's <LiveRegion>. Renders nothing. */
export function ActiveAnnouncer<T>({ say, onChange }: { say: (row: T) => string; onChange: (text: string) => void }) {
  const rows = useActiveTooltipDataPoints<T>();
  const row = rows?.[0];
  const text = row ? say(row) : "";
  useEffect(() => { onChange(text); }, [text, onChange]);
  return null;
}
