# States

Every template handles every state through `ChartCard`. The plot area keeps the same height in each
state (`bodyHeight`), so nothing jumps when data arrives. The card itself takes its content's
height (`h-fit`) and never stretches to match a neighbor.

| State | When | What to show | How |
|---|---|---|---|
| Loading | Fetch in flight | A skeleton shaped like the chart (line, bars, rows, ring, grid, stat, table, progress, flow). Shimmer off under reduced motion. | `status="loading"` |
| Error | Fetch failed | Plain words, "Your data is safe" reassurance, a "Try again" button. Never a stack trace. | `status="error"`, `onRetry`, `errorText` |
| Empty | Loaded, no rows | An icon, "No data yet", one line about why or what to do. Keep the frame. | `empty`, `emptyText` |
| Single point | One reading | The number, no line. "Trend shows after two readings." | automatic |
| Sparse | 2-3 points | Straight segments with markers on each point and a note. No smoothing. | automatic |
| Missing values | Gaps in a series | A gap or an outlined cell, never a zero. "No data" in the tooltip. | `null` values |
| Zero | Real zero | Draw the zero. In heatmaps, `seq-0` is zero and is different from no data. | automatic |
| New item | Previous value is 0 | "New" instead of a percent change. | `pctChange` returns `null` |
| Over limit | used > limit | Negative color plus stripes plus words ("Over the limit by $600"). | `BudgetCard` |
| Goal reached | value >= goal | Positive color, check icon and words. | `GoalProgress` |
| Too many categories | More than 5-6 | Group the tail as "Other (n)". | `groupOther` |
| Too wide for the card | Many weeks on a phone | Show the latest range that fits and say so. | `CalendarHeatmap` |

## Per template

| Template | Loading | Error | Empty | Single | Sparse | Special |
|---|---|---|---|---|---|---|
| TrendAreaChart | line | yes | yes | yes | markers | forecast, target, annotations |
| PairedBars | bars | yes | yes | yes | yes | active period |
| StackedBars | bars | yes | yes | yes | yes | zero-total column |
| DeltaBars | rows | yes | yes | yes | n/a | previous 0 = "New" |
| GoalProgress | progress | yes | goal <= 0 | n/a | n/a | done, on pace, behind |
| BudgetCard | grid | yes | limit <= 0 | n/a | n/a | warn, over limit |
| CategoryBreakdown | rows | yes | yes | one category | n/a | Other (n) |
| RadialBars | ring | yes | yes | yes | n/a | highlight max or latest |
| CalendarHeatmap | grid | yes | yes | n/a | under 7 days | all zero, clipped range |
| SparkTable | table | yes | yes | "New" spark | n/a | sorting |
| KpiSparkCard | stat | yes | value null | yes | markers | min and max |
| StatStrip | per cell | yes | yes | n/a | n/a | value null = "No data" |
| RangeBars | rows | yes | yes | one row + note | n/a | missing end = "No data", marker |
| SankeyFlow | flow | yes | no flows or total 0 | one flow + note | n/a | cycles dropped, labels trimmed on phones |

## Copy for states

- Loading: no text. The skeleton is enough.
- Empty: "No data yet" plus why. "No visits in this range yet." "Connect an account to see spending."
- Error: "Couldn't load this chart. The data source didn't answer. Your data is safe." + "Try again".
- Stale: add "Updated 3 hours ago" to the source line.
