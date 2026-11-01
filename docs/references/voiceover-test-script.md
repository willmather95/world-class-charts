# VoiceOver test script (10 minutes)

This test settles the two Chartability items we could not check on the box: 11 (our keys fight
the screen reader) and 38 (moving through the data takes too long). Run it on a Mac in Safari.
Write down what VoiceOver says, not what you expect.

## Before you start (1 minute)

1. Build the gallery: `./build.sh` in `docs/harness`. Open `dist/index.html#light` in Safari.
2. Turn on VoiceOver: Command + F5. VO below means Control + Option.
3. Set the verbosity to medium: VO + V, then pick Medium.
4. Have this page open on a phone or a second screen to record results.

## Steps

| # | Do this | You should hear | Time |
|---|---|---|---|
| 1 | Press Tab until you reach "Monthly revenue" | "Monthly revenue. 12 months..." then "chart, group" | 1 min |
| 2 | Press VO + Shift + Down to interact, then Right Arrow | A date and value, then "12 of 12" or "1 of 12" | 30 s |
| 3 | Press Right Arrow 3 times | Each press reads one month, then its position | 30 s |
| 4 | Press H, then L | The top month, then "Highest" and its place. Then the bottom month and "Lowest" | 30 s |
| 5 | Press N | "... Note 1 of 1. 6 of 12" | 15 s |
| 6 | Press Esc, then VO + Shift + Up to stop interacting | Nothing read for Esc. Focus leaves the plot | 15 s |
| 7 | With VO + Right Arrow, read past the chart in browse mode | The arrows move VoiceOver, not the chart. The chart text does not change | 1 min |
| 8 | Find "View data" and press VO + Space | "Hide data, expanded" then the table | 30 s |
| 9 | Press VO + Space on the second header | "Sorted by 2026, high to low" and the header says "sorted descending" | 30 s |
| 10 | Move into the table with VO + Command + T | It reads as a table, with row and column headers | 1 min |
| 11 | Tab to "Visits by channel", interact, press Home | "Apr... 1 of 7". The URL now has `wc.visits=0` | 30 s |
| 12 | Reload with Command + R and Tab back to the chart | The same April point is read | 30 s |
| 13 | Find "Show parts" and turn off "Search" | "Search, toggle button, not pressed". The chart label says "showing 3 of 4 parts" | 30 s |
| 14 | At the top, press "Patterns" | "Patterns, toggle button, pressed" | 15 s |
| 15 | Tab to "Server load, 10,000 readings", interact, press Page Down 3 times | Each press jumps a tenth of the chart and reads at once | 30 s |
| 16 | Press S | A rising and falling tone plays for about 2 seconds | 15 s |

## Record

| Item | Pass when | Result |
|---|---|---|
| 11, keys and AT | Step 7 moves VoiceOver only. Steps 2 to 5 move the chart only while interacting | |
| 38, tedious moves | Steps 4, 5 and 15 each reach their point in one key press, and nothing is read twice | |
| Live text | Every move in steps 2 to 5 is read once, value first, position last | |
| Table | Steps 8 to 10 read headers, the sort state and the "Sorted by" line | |
| State | Step 12 reads the shared point | |

Also note anything read twice, read late (over 1 second), or not read at all.

## NVDA on Windows

Use Firefox or Chrome. NVDA + Space toggles browse and focus mode. In step 2 press Enter or
NVDA + Space to enter focus mode. In step 7 make sure browse mode is on, then use Down Arrow.
Use T to jump to the table in step 10. Everything else is the same.

## After the test

Mark items 11 and 38 in `chartability-audit.md` as Pass or Fail, with the date, the macOS and
VoiceOver version, and one line of evidence.
