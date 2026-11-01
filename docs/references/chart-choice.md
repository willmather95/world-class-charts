# Chart choice

Start from the question the reader asks, not from the data shape. Write the question as one
sentence. Then pick the chart. If two charts fit, pick the one with fewer marks.

## Question, best chart, what to avoid

| The reader asks | Best chart (template) | Fine too | Avoid |
|---|---|---|---|
| What is the number right now? | Stat with a change pill (`StatStrip`, `KpiSparkCard`) | Big number + sentence | A chart with one bar |
| How did one measure move over time? | Line or area (`TrendAreaChart`) | Columns for under 12 discrete periods | Pie, radial, 3D |
| Is it better or worse than last period? | Line with a gray compare line (`TrendAreaChart` `compare`) | `DeltaBars` compare mode | Two separate charts side by side |
| Two flows per period (in vs out, new vs lost)? | Paired columns (`PairedBars`) | Diverging columns | Stacked bars (hides the gap) |
| Which items are biggest? | Sorted horizontal bars (`DeltaBars`, `CategoryBreakdown` list) | Table | Pie with more than 3 slices |
| How did each item change? | Diverging bars around zero (`DeltaBars mode="change"`) | Table with delta pills | Two bars per item when only the change matters |
| How far to the goal, and are we on pace? | Progress bar with a pace marker (`GoalProgress`) | Bullet bar | Gauge or speedometer |
| How much of the budget is used? | Unit grid or strip (`BudgetCard`) | `GoalProgress` | Donut with no number |
| What is the mix, and how does it change? | 100% stacked columns (`StackedBars mode="percent"`) | Small multiples | Stacked area with more than 4 layers |
| What is the total, and what is it made of? | Stacked columns (`StackedBars`) | Columns + table | Stacked bars with more than 5 parts |
| What share does each part take, once? | Single strip or list (`CategoryBreakdown`) | Donut with 2-3 parts and a center number | Pie with 6+ slices |
| When are we busy? (day by day patterns) | Calendar heatmap (`CalendarHeatmap`) | Columns by weekday | Line over 365 points |
| Many items, each with a trend | Table with sparklines (`SparkTable`) | Small multiples | One line chart with 10 lines |
| A cyclical pattern by month or hour | `RadialBars` only as a hero visual, with a list | Columns | Radial for exact comparisons |
| Where did the total come from, and where did it go? | Flow ribbons (`SankeyFlow`) | `StackedBars`, table | Sankey past 3 columns or about 12 nodes |
| What moved the total from start to end? | Bridge of signed steps (`Waterfall`) | `DeltaBars mode="change"` | Stacked bars across two periods |
| Who rose and who fell between two points in time? | Slope lines (`SlopeChart`) | `RangeBars variant="dumbbell"` | A line chart with 8+ lines |
| Is each measure on target? | Bullet bars with bands (`BulletChart`) | `GoalProgress` for one measure | Gauges and dials |
| Where does each item sit between a low and a high? | Floating bars (`RangeBars`) | Table with min and max | Bars from zero when only the spread matters |
| How do many series trend, side by side? | Small multiples on one scale (`SmallMultiples`) | `SparkTable` | One line chart with 5+ lines |

## Rules of thumb

- **Bars start at zero.** Lines may zoom, but say so when the axis does not start at zero.
- **Time runs left to right.** Never sort time by value.
- **Sort categories by value** unless the order means something (age bands, funnel steps, weekdays).
- **Five colors at most.** Group the rest as "Other (n)" in gray (`groupOther`).
- **More than 4 lines?** Highlight one and gray the rest, or use small multiples (Datawrapper).
- **Part of a whole?** Only use a donut or pie with 2-3 parts and a clear winner. Otherwise use a strip or bars.
- **One number?** Do not chart it. Use a stat with context (vs last period, vs goal).
- **Two charts tell one story?** Combine them, or put them in one card with one title.
- **Radial and unit-grid charts are for mood, not precision.** Always pair them with exact numbers.

## The title is the takeaway

The card title names the measure ("Monthly revenue"). The subtitle states what the reader
should see ("Up 31% on last year, and on track for the goal"). This is the NYT and FT rule:
tell the reader what to look at.

## Density by audience (Linear)

- A screen people check daily: few metrics, glanceable, no annotations needed.
- A screen people check monthly: more context, annotations, compare lines, a written takeaway.
