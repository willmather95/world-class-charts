"use client";
// Progress to a goal with a pace marker: where you are, where you should be by today, and the
// status in words ("On track", "Behind by 1,240"). Optional milestones as ticks on the track.
// Handles > 100% (the bar caps, the overflow is stated), no pace (no marker), and goal <= 0 (empty).
import { ChartCard, Stat, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind } from "./format";
import { c, clamp, useTween } from "./lib";

export function GoalProgress({
  title, subtitle, value, goal, kind = "number", pace, deadline, milestones = [], source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  value: number;
  goal: number;
  kind?: NumKind;
  /** Share of the period elapsed (0-1). Draws the "expected by today" marker. */
  pace?: number;
  /** Plain words, e.g. "by Dec 31". */
  deadline?: string;
  milestones?: { at: number; label: string }[];
  source?: string;
}) {
  const [v] = useTween([value]);
  const ratio = goal > 0 ? value / goal : 0;
  const shown = clamp((v ?? 0) / (goal || 1), 0, 1);
  const expected = pace != null ? goal * pace : null;
  const gap = expected != null ? value - expected : null;
  // Within 3% of pace counts as on track.
  const status = ratio >= 1 ? "done" : gap == null ? "none" : gap >= -goal * 0.03 ? "on" : "behind";
  const fill = status === "behind" ? c.warning : status === "done" ? c.positive : c.accent;
  const statusText =
    status === "done" ? <span className="text-wc-positive-ink">Goal reached{ratio > 1 ? `, ${fmt(value - goal, kind)} over` : ""}</span>
    : status === "on" ? <span className="text-wc-positive-ink">On track{gap! > 0 ? `, ${fmt(gap!, kind)} ahead` : ""}</span>
    : status === "behind" ? <span className="text-wc-warning-ink">Behind pace by {fmt(-gap!, kind)}</span>
    : <span className="text-wc-muted">{fmt(goal - value, kind)} to go</span>;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} empty={!(goal > 0)} emptyText="Set a goal to track progress." skeleton="progress" bodyHeight={128} {...state}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Stat label={`${fmt(value, kind)} of ${fmt(goal, kind)}${deadline ? ` ${deadline}` : ""}`} value={fmtPercent(ratio)} />
        <p className="flex items-center gap-1.5 pb-0.5 text-[13px] font-medium">
          <StatusIcon status={status} />
          {statusText}
        </p>
      </div>
      <div
        className="relative mt-5"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(value, goal)}
        aria-valuetext={`${fmt(value, kind)} of ${fmt(goal, kind)}, ${fmtPercent(ratio)}${expected != null ? `. Expected by today: ${fmt(expected, kind)}` : ""}`}
      >
        <div className="h-3 overflow-hidden rounded-full bg-wc-track">
          <div className="h-full rounded-full" style={{ width: `${shown * 100}%`, background: fill }} />
        </div>
        {milestones.map((m) => (
          <div key={m.label} aria-hidden className="absolute top-0 h-3 w-[2px] bg-wc-surface" style={{ left: `${clamp(m.at / goal, 0, 1) * 100}%` }} />
        ))}
        {expected != null && ratio < 1 && (
          <div aria-hidden className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${clamp(pace!, 0, 1) * 100}%` }}>
            <div className="h-6 w-[2px] rounded-full bg-wc-ink" />
          </div>
        )}
      </div>
      <div className="relative mt-2 h-4 text-[12px] text-wc-muted" aria-hidden>
        {expected != null && ratio < 1 && (
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${clamp(pace!, 0.12, 0.88) * 100}%` }}>Expected today</span>
        )}
        {!(expected != null && ratio < 1) && milestones.map((m) => (
          <span key={m.label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${clamp(m.at / goal, 0.06, 0.94) * 100}%` }}>{m.label}</span>
        ))}
      </div>
    </ChartCard>
  );
}

function StatusIcon({ status }: { status: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (status === "done" || status === "on") return <svg {...p} className="text-wc-positive-ink"><circle cx="7" cy="7" r="6" /><path d="M4.5 7.2 6.2 8.8 9.5 5.4" /></svg>;
  if (status === "behind") return <svg {...p} className="text-wc-warning-ink"><path d="M7 1.5 13 12H1z" /><path d="M7 5.5v3M7 10.2v.1" /></svg>;
  return <svg {...p} className="text-wc-muted"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 1.5" /></svg>;
}
