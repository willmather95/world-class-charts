"use client";
// Used vs limit as a unit grid. "dots" = two rows of rounded squares, "strip" = one row of tall
// bars. Fill color changes at 80% (warning) and over 100% (negative), and the sentence under the
// grid always says the same thing in words, so color is never the only signal.
// States: loading, error, empty (limit <= 0), over limit (extra units in the negative color).
import type { ReactNode } from "react";
import { ChartCard, DeltaPill, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind } from "./format";
import { c, clamp, useTween } from "./lib";

export function BudgetCard({
  title, used, limit, kind = "currency", variant = "dots", units = 40, warnAt = 0.8,
  delta, deltaLabel = "vs last period", summary, cta, footer, source, ...state
}: StateProps & {
  title: string;
  used: number;
  limit: number;
  kind?: NumKind;
  variant?: "dots" | "strip";
  /** Total cells. Dots split into two rows. */
  units?: number;
  /** Share of the limit where the fill turns to the warning color. */
  warnAt?: number;
  /** Change vs last period as a ratio, shown in "strip". */
  delta?: number;
  deltaLabel?: string;
  /** One plain sentence under the grid. Defaults to an auto "left to spend" line. */
  summary?: ReactNode;
  cta?: { label: string; onClick?: () => void };
  footer?: { label: string; value: ReactNode; color?: string }[];
  source?: string;
}) {
  const [u] = useTween([used]);
  const ratio = limit > 0 ? used / limit : 0;
  const over = ratio > 1;
  const color = over ? c.negative : ratio >= warnAt ? c.warning : c.accent;
  const lit = Math.round(units * clamp((u ?? 0) / (limit || 1), 0, 1));
  const overUnits = over ? Math.min(units, Math.round(units * (ratio - 1))) : 0;
  const rows = variant === "dots" ? 2 : 1;
  const perRow = Math.ceil(units / rows);
  const left = limit - used;
  const auto = over
    ? <>Over the limit by <b className="font-semibold text-wc-negative-ink">{fmt(-left, kind)}</b>.</>
    : ratio >= warnAt
      ? <>Close to the limit. <b className="font-semibold text-wc-warning-ink">{fmt(left, kind)}</b> left.</>
      : <>Well within the limit. <b className="font-semibold text-wc-ink">{fmt(left, kind)}</b> left.</>;

  return (
    <ChartCard title={title} source={source} empty={!(limit > 0)} emptyText="Set a limit to start tracking." skeleton="grid" bodyHeight={variant === "dots" ? 150 : 190} {...state}>
      {variant === "strip" ? (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[36px] font-semibold leading-none tracking-[-0.03em] tabular-nums @md:text-[44px]">{fmtPercent(ratio)}</span>
            {delta != null && <DeltaPill delta={delta} label={deltaLabel} />}
            {delta != null && <span className="text-[13px] text-wc-muted">{deltaLabel}</span>}
          </div>
          <div className="mt-2 text-[13px] text-wc-muted">of {fmt(limit, kind)}</div>
        </div>
      ) : (
        <div className="mb-3 flex justify-between text-[14px] tabular-nums">
          <span><span className="text-wc-muted">Used </span><b className="font-medium">{fmt(used, kind, { compact: false })}</b></span>
          <span><span className="text-wc-muted">Limit </span><b className="font-medium">{fmt(limit, kind, { compact: false })}</b></span>
        </div>
      )}

      <div
        className="grid gap-[4px] @md:gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={`${fmt(used, kind)} of ${fmt(limit, kind)}, ${fmtPercent(ratio)}${over ? ", over limit" : ""}`}
        aria-label={title}
      >
        {Array.from({ length: units }, (_, i) => {
          const col = i % perRow;
          const on = variant === "dots" ? col < Math.ceil(lit / rows) : i < lit;
          // Over limit: the last units turn negative and get a stripe, so it reads without color too.
          const isOver = over && (variant === "dots" ? col >= perRow - Math.ceil(overUnits / rows) : i >= units - overUnits);
          return (
            <span
              key={i}
              className={`${variant === "dots" ? "aspect-square rounded-[4px]" : "h-[56px] rounded-[3px] @md:h-[72px]"} wc-motion transition-colors duration-[var(--wc-dur-focus)]`}
              style={{
                background: isOver ? `repeating-linear-gradient(135deg, ${c.negative} 0 3px, ${c.negativeSoft} 3px 5px)` : on ? color : c.track,
              }}
            />
          );
        })}
      </div>

      {footer && (
        <div className="mt-5 grid divide-x divide-wc-hairline" style={{ gridTemplateColumns: `repeat(${footer.length}, minmax(0,1fr))` }}>
          {footer.map((f, i) => (
            <div key={f.label} className={i === 0 ? "pr-3" : "px-3"}>
              <div className="flex items-center gap-2 text-[13px] text-wc-muted"><span aria-hidden className="h-1.5 w-3 rounded-full" style={{ background: f.color ?? c.track }} />{f.label}</div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em] tabular-nums @md:text-[20px]">{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {(summary !== null || cta) && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-[14px] leading-snug text-wc-ink-2">{summary ?? auto}</p>
          {cta && (
            <button type="button" onClick={cta.onClick} className="rounded-full bg-wc-ink px-4 py-2 text-[14px] font-medium text-wc-surface transition-transform duration-[var(--wc-dur-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wc-focus active:scale-[0.97]">
              {cta.label}
            </button>
          )}
        </div>
      )}
    </ChartCard>
  );
}
