# Number and date formatting

All helpers are in `src/format.ts`. Use them everywhere so the same number reads the
same way in the hero, the axis, the tooltip and the table.

## Numbers

| Rule | Example | Helper |
|---|---|---|
| Group thousands | 12,840 | `fmtNumber` |
| Go compact at 10,000 and up | 48.2K, 1.3M | `fmtNumber`, `fmtCurrency` |
| Exact values in tooltips and tables | $48,210 | `fmt(v, kind, { compact: false })` |
| Money under $100 keeps cents only if not whole | $4.50, $12 | `fmtCurrency` |
| Percent takes a ratio | 0.142 to 14.2% | `fmtPercent` |
| Real minus sign, not a hyphen | −18% | `fmtDelta` (U+2212) |
| Plus sign on rises | +12% | `fmtDelta` |
| A change that rounds to zero gets no sign | 0% | `fmtDelta` |
| Rate changes are points, not percent | +0.4 pts | `fmtDelta(v, "points")` |
| Change from zero is "New", not infinity | New | `pctChange` returns `null` |
| Missing is "No data", not 0 | No data | templates |
| Tabular figures on every number | `tabular-nums` | CSS |

## Axes

- One decimal count per axis. `axisFormatter(ticks, kind)` picks the fewest decimals that show
  every tick step exactly, so 2,500 steps read $2.5K, $5K, $7.5K and never round to "$3K".
- Zero is "0", never "$0K".
- Use nice ticks (1, 2, 2.5, 5 times a power of ten) from `niceTicks`.
- 3 to 5 gridlines. Fewer on short charts.
- Put the unit in the tick ("$10K", "40%") or in the subtitle, not on a rotated axis title.

## Dates

| Grain | Axis | Tooltip and table |
|---|---|---|
| hour | 9 AM | Oct 31, 9 AM |
| day | Oct 31 | Sat, Oct 31, 2026 |
| week | Oct 26 | Week of Oct 26, 2026 |
| month | Jan, Feb (year on first tick and at each new year) | January 2026 |
| quarter | Q1 | Q1 2026 |
| year | 2026 | 2026 |

- `timeTicks` follows the FT style: a second line with the year under the first tick and
  wherever the year changes. Never repeat the year on every tick.
- Ranges use an en dash with no spaces in code output: `fmtRange` gives "Oct 1–31, 2026".
- Say the time zone in the source line when it matters ("Times in CT").
- Never use 10/11/12 numeric dates in UI. They read differently around the world.

## Words

- Units in words for small counts: "3 orders", not "3".
- Sentences, not labels, for status: "Over the limit by $600."
- Plain English, short. No jargon like "MoM" in the UI; write "vs last month".

## Speed

Building an `Intl` formatter takes tens of microseconds. `format.ts` caches one per locale and
option set, so a 10,000-row table formats quickly. Do not call `new Intl.NumberFormat` inside a
render loop. Use `fmt` and `speak`.
