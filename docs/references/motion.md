# Motion

Motion explains change. It should never decorate or delay.

## One curve

`cubic-bezier(0.16, 1, 0.3, 1)` (an "expo out"): fast start, soft landing. It is `--wc-ease` in
CSS and `ease()` in `lib.ts`. Use it for everything. No bounces, no springs that overshoot data.

## Duration scale

| Token | ms | Use |
|---|---|---|
| `--wc-dur-press` | 120 | Buttons, pills, hover color |
| `--wc-dur-focus` | 200 | Tooltip move, focus, dimming other marks |
| `--wc-dur-update` | 450 | Data changes (filter, new range) |
| `--wc-dur-entry` | 700 | First draw |

## Entry

- Lines and areas grow from the baseline; bars grow up from zero; rings sweep once.
- Numbers count up only on first load and only for hero numbers (`useTween`).
- Stagger at most 30ms per item and 300ms in total. Long staggers feel slow.
- Only animate on first view. Never replay on scroll back.

## Update

- Tween from the old values to the new values (`useTween` keeps the last value as `from`).
  Do not redraw from zero; the reader loses the comparison.
- Axes update with the data, using the same duration.
- If the shape of the data changes (new series, new categories), cross-fade in 200ms instead.

## Reduced motion

- Under `prefers-reduced-motion: reduce`, values jump to their end state, the skeleton
  shimmer stops, and CSS transitions are off (`.wc-motion`).
- Screenshots and tests run with `--force-prefers-reduced-motion` so they are stable.

## Apple's lesson

Apple Stocks and Health move the crosshair and the header number together, instantly, while
the finger moves. Interaction feedback must feel instant (under 100ms). Save the slow curves
for data changes.
