# Pattern catalog

Common dashboard card patterns and the template to start from. Use this when someone points at
a screenshot and says "make one like that".

| Pattern | Looks like | Start from | Notes |
|---|---|---|---|
| Total value over time | Big number, change pill, area line | `TrendAreaChart` | Add `compare` for last period |
| Balance with goal | Area line with a dashed goal | `TrendAreaChart` `target` | |
| Forecast | Line that turns dashed in a shaded range | `TrendAreaChart` `forecastFrom` | |
| Cash flow / in vs out | Paired columns, one period lit | `PairedBars` | Net in tooltip |
| Low-to-high range per item | Floating bars, optional marker tick | `RangeBars` | Axis need not start at 0 |
| Before vs after per item (dumbbell) | Hollow dot, line, solid dot | `RangeBars variant="dumbbell"` | Set `polarity` |
| Monthly bars, one lit | Columns, latest full color | `PairedBars` with one series, or `StackedBars` with one series | |
| Stacked mix over time | Stacked or 100% columns | `StackedBars` | 5 parts at most |
| This vs last per item | Bars with a previous tick | `DeltaBars` | |
| Change per item | Diverging bars around zero | `DeltaBars mode="change"` | Set `polarity` |
| Budget used | Dot grid or thin-bar strip | `BudgetCard` | Warn at 80% |
| Savings or sales goal | Progress bar with "expected today" | `GoalProgress` | |
| Category split | One strip of thin bars plus a list | `CategoryBreakdown` | "Other (n)" |
| Breakdown by month or place, hero visual | Radial wedges | `RadialBars` | Pair with numbers |
| Activity by day | Calendar heatmap | `CalendarHeatmap` | No data is not zero |
| Top items with trends | Table with sparklines | `SparkTable` | |
| Headline KPIs | Row of stats split by hairlines | `StatStrip` | |
| Single KPI | Number, pill, sparkline | `KpiSparkCard` | |
| Flow between groups (sankey) | Ribbons from sources to uses | `SankeyFlow` (own layout, no library) | 2-3 columns, about 12 nodes |
| Unit split (hex or dot grid) | Grid of units in 2-3 colors | Adapt `BudgetCard` dots | Pair with numbers |
