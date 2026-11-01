# Responsive rules

Design and check at three widths: **390** (phone), **768** (tablet), **1440** (desktop).
Charts respond to their **card** width, not the window. Cards are `@container`, and SVG
templates measure themselves with `useWidth` and pick a size with `sizeOf`:
`sm` under 480px, `md` under 720px, `lg` above.

## By width

| | 390 phone | 768 tablet | 1440 desktop |
|---|---|---|---|
| Grid | 1 column | 2 columns | 3 columns (Stripe: up to 3 per row; 2/3 + 1/3 for a hero) |
| Card padding | 20px | 24px | 24px |
| Hero number | 28px | 34px | 34px |
| Chart height | 180-220px | 220-240px | 240-320px (Stripe: 180 overview, 320 featured) |
| X ticks | about 1 per 64px, always first and last | 1 per 76px | 1 per 76px |
| Y gridlines | 3 | 4 | 4-5 |
| Direct labels | Key above the plot when they do not fit | Direct | Direct |
| Stat strip | 2 columns | Single row | Single row |
| Tables | Drop the share column, keep the sparkline | All columns | All columns |
| Heatmap | Latest weeks that fit, with a note | Most of the range | Full range |
| Range / dumbbell | Label above the bar, values on the label line | Label, plot, value columns | Same |
| Sankey | 78px label gutters, labels trimmed (table has full names) | 112px gutters | Same |
| Card height | Content sets it | Content sets it | Content sets it |
| Tooltip | Stays in the plot, stays after tap | Hover | Hover |

## Rules

- Cards take their content's height. A card in a grid row does not stretch to match its
  tallest neighbor: `ChartCard` has `h-fit`, and grids should use `items-start`. Stretched cards
  leave dead white space under short charts and make them look broken.
- Never shrink text to fit. Remove ticks, shorten labels, or move the key instead.
- Never rotate axis labels.
- Keep the plot at least 160px tall on phones. Shorter charts lose their shape.
- Touch targets at least 24px on every button (WCAG 2.5.8). A test checks this. The compact card
  buttons sit between 24px and 37px. They do not reach 44px, so leave space around them. The plot
  itself is the main touch target.
- Reflow at 320px with no sideways page scroll (WCAG 1.4.10).
- Do not hide data on phones. If a column or range goes, the table still has it.
- Test in a real narrow frame. Headless Chrome clamps windows under about 500px, so the
  harness renders the page inside an iframe of the exact width (`shot.sh`).
