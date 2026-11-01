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
| Monthly bars, one lit | Columns | `StackedBars` with one series, hover or focus lights one | |
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
| Many small trends, same scale | Grid of mini lines, synced crosshair | `SmallMultiples` | Replaces a 5+ line chart |
| Value vs target per item | Thin bar over gray bands, target tick | `BulletChart` | Replaces gauges; each row has its own scale |
| Bridge from start to end | Floating steps on a running total | `Waterfall` | Gains and losses by polarity |
| Rank change between two points | Two columns joined by slope lines | `SlopeChart` | Name 1-3 items with `highlight` |
| Unit split (hex or dot grid) | Grid of units in 2-3 colors | Adapt `BudgetCard` dots | Pair with numbers |
