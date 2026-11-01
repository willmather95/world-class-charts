# Labels, annotations and reference lines

The annotation layer is what the reader remembers. Amanda Cox (NYT graphics) called it the
most important part of the job. Label the data, not a legend box.

## Direct labels over legends

- **Lines:** put the series name at the right end of each line, in the line's color
  (`TrendAreaChart` does this and nudges labels apart when they collide).
- **Stacked columns:** name each segment beside the last column (`StackedBars`).
- **Bars:** put the value at the end of the bar, or on the active bar only.
- **Use a key only when** labels cannot fit (phones, more than 6 series). Put it above the plot,
  in the same order as the marks, as short colored bars or dots with gray text (`LegendKey`).
- Repeat the series colors in the tooltip and table so the reader never has to look back.

## Annotations

- One or two per chart. Each is a few words at the point it explains ("Price change").
- Put text above the mark, with a short leader line if needed. Never cover data.
- Explain the "why", not the value. The value is already on the axis and in the tooltip.
- Use the subtitle for the main takeaway. Use annotations for events.

## Reference lines and targets

- A goal, budget or benchmark is a thin dashed line in `ink-2` or `muted`, labeled at its left end
  with the word and the value ("Goal $9,000").
- Draw it under the data, so the data stays on top.
- Shade a range (forecast, weekend, outage) in `surface-2`, and label the range once.
- Forecasts are dashed lines inside a shaded range. Never let a forecast look like an actual.
- Show "Expected today" on progress bars so on pace vs behind is visible (`GoalProgress`).

## Highlight one thing

- Full color on the one mark that matters (latest period, the selected bar, the max wedge).
- Everything else is a soft tint or gray. NN/g calls this contrast for focus: start gray, then
  color only what you want seen.
- Value labels go on the highlighted mark only. Labeling every bar is noise.

## Text rules

- Sentence case everywhere. No ALL CAPS except tiny section eyebrows.
- 12px minimum for axis and labels, 13px for body copy in cards.
- Never rotate text. Shorten it ("Sep", not "September") or show fewer ticks.
- Truncate long category names with an ellipsis and show the full name in the tooltip and table.
