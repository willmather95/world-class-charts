# Chartability audit

Audited on Oct 31, 2026 (CT) against the Chartability workbook (50 heuristics):
https://chartability.fizz.studio/ . Scope: the 18 chart templates as shown in the harness
gallery, in light, dark and the brand theme, plus the Recharts demo. Re-audited the same day
after the gap work: position in the live text, jump keys, table sort, shared state, top-item
summaries, the series picker, patterns and more contrast, and Firefox and WebKit runs.

Chartability counts failures. It is not a pass mark. When a test is unclear, the workbook says to
assume a failure. "Not verified" means we had no way to test it here. Most of those need a real
screen reader (NVDA, JAWS, VoiceOver). `voiceover-test-script.md` is the 10-minute test that
would settle them.

## Result

| | Count |
|---|---|
| Pass | 45 |
| Fail | 1 |
| Not verified | 2 |
| Not applicable | 2 |
| **Pass share** | **45 of 48 that apply (94%)**, 45 of 50 overall (90%) |
| Before the gap work | 38 of 48 (79%) |
| Critical fails | 0 of 14. Two critical tests are not verified (11 and 38). |

Evidence key: **C** = `contrast.mjs`, **T** = Playwright test in `docs/harness/tests/`, **G** = gallery
review, **D** = design rule in the templates.

## Perceivable

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 1 | Low contrast (critical) | Pass | C: text 4.5:1, marks and focus ring 3:1, 0 fails in 4 themes. More contrast: text 7:1, dividers 3:1 |
| 2 | Content is only visual (critical) | Pass | T: labeled group, captioned table, live region on every chart |
| 3 | Small text size (critical) | Pass | T: no visible text under 12px |
| 4 | Seizure risk (critical) | Pass | D: no flashing. Shimmer is slow and off under reduced motion |
| 5 | Color alone carries meaning | Pass | D: arrows and signs on pills, stripes when over, dashed forecasts |
| 6 | Elements hard to tell apart | Pass | C and D: 3:1 marks, 2px gaps in stacks, ghost edges |
| 7 | Not CVD-friendly | Pass | C: Machado 2009 simulation. All 28 pairs of the 8 category colors, plus key pairs, at least ΔE 10 in 4 themes (worst 10.5). Patterns add a second cue |
| 8 | Spacing is inappropriate | Pass | T: WCAG 1.4.12 text spacing causes no overflow |

## Operable

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 9 | One input type only (critical) | Pass | T: mouse, touch tap and keyboard |
| 10 | No cues or instructions (critical) | Pass | T: key hint shows on focus. The label says which keys work |
| 11 | Controls override AT controls (critical) | Not verified | Keys only act while the plot has focus. Needs a screen reader in browse mode |
| 12 | Low contrast on interactive states | Pass | C: active and ghost states keep 3:1 edges |
| 13 | Focus indicator missing or weak | Pass | T: ring shows. Forced colors keep a 2px outline. C: 3:1 |
| 14 | Wrong tab stops | Pass | D: one stop per chart, plus its real buttons |
| 15 | Complex actions without options | N/A | No drag, brush or zoom |
| 16 | Targets too small | Pass | T: every button at least 24px (WCAG 2.5.8 AA). The whole plot is the hover target |

## Understandable

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 17 | No purpose or how-to-read (critical) | Pass | D: takeaway subtitle. Bullet has a band key. Sankey and radial labels say how to read them |
| 18 | No title, summary or caption (critical) | Pass | T: title in the label and the table caption |
| 19 | Reading level (critical) | Pass | D: plain words. `speak()` reads "$1.2 million", not "$1.2M" |
| 20 | Interactive context unclear | Pass | D: `aria-roledescription` names the chart type |
| 21 | Too complex | Pass | D: one question per chart. 10,000 points thinned by LTTB |
| 22 | Changes hard to follow | Pass | T: loading is busy, errors are announced, the live region is polite |
| 23 | Metrics undefined | Pass | G: units in subtitles. Depends on the author |
| 24 | Uncertainty not clear | Pass | G: forecast band labeled "80% forecast range". The table has the range column |
| 25 | Axis labels unclear or missing | Pass | G: formatted ticks with units, year once |
| 26 | Wrong controls | Pass | D: native buttons. Sort headers use `aria-sort` |

## Robust

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 27 | Not standards-based | Pass | T: axe, WCAG 2.0 to 2.2 A and AA, no serious or critical issues |
| 28 | Semantically invalid | Pass | T: axe. Real tables with `th scope` |
| 29 | Fragile support | Pass | T: every test passes 3 times in a row in Chrome, Firefox and WebKit (Playwright's Safari engine). Real iOS Safari not run |

## Compromising

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 30 | No table (critical) | Pass | T: View data on every chart, plus CSV |
| 31 | Only one way in | Pass | Visual, table, live text, CSV and sound (S key) |
| 32 | Location and history unclear | Pass | T: live text ends "3 of 12", after the value. Small multiples add "chart 2 of 8" |
| 33 | Interactions not forgiving | Pass | Esc clears. Nothing is destructive |
| 34 | No navigation by structure | Pass | T: H and L jump to the high and low, N and P step through notes and wrap. PageUp, PageDown, Home and End as before |
| 35 | Table is static | Pass | T: View data headers sort, with `aria-sort` and a spoken "Sorted by" line. No filter. CSV for more |
| 36 | State is hard to share | Pass | T: wrap a chart in `ShareState` and its point and sort land in the URL and come back on reload. Opt-in |

## Assistive

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 37 | Data density (critical) | Pass | T: 10,000 points render. The DOM table caps at 500 rows. CSV has all |
| 38 | Tedious navigation (critical) | Not verified | Keys jump a tenth or to the ends. Screen reader effort not measured |
| 39 | Visible features not described | Pass | T: Sankey names its largest flow, slope its biggest rise and fall, stacks their largest part and peak. Trend gives the range, low, high and direction |
| 40 | Data text not human-readable | Pass | T: `speak()` unit tests |
| 41 | Extremes not handled | Pass | T: flat, empty, one point, zero, 10,000 points |
| 42 | No "build your own" default | **Fail** | Partial. `StackedBars picker` lets readers hide parts. Other charts have no picker and none can switch chart type. CSV for the rest |

## Flexible

| # | Heuristic | Result | Evidence |
|---|---|---|---|
| 43 | User style ignored (critical) | Pass | T: forced colors, reduced motion. D: dark mode tokens |
| 44 | Long animations | Pass | D: transitions use the short focus and press tokens. The loading shimmer stops under reduced motion. Sound is about 2s and Esc stops it |
| 45 | Scrolling can't be changed | N/A | No scroll-driven story |
| 46 | No zoom or reflow | Pass | T: 320px reflow, no sideways scroll |
| 47 | Text changes ignored | Pass | T: text spacing test |
| 48 | Not consistent | Pass | D: one key and pointer model in every chart |
| 49 | Contrast and textures fixed | Pass | T: `ChartPrefs` toggles Patterns and More contrast, kept across visits. The OS high-contrast setting turns More contrast on by itself |
| 50 | Hard chart, no alternative | Pass | Sankey, radial and heatmap all have a table and CSV |

## What is still short

| # | Gap | Fix | Size |
|---|---|---|---|
| 42 | Picker on stacks only. No chart type switch | Add `picker` to PairedBars and SmallMultiples. A "Show as table or bars" switch | Medium, 1 to 2 days |
| 11, 38 | No real screen reader run | Run `voiceover-test-script.md` on a Mac, and the same steps in NVDA on Windows | 10 minutes each, needs the machines |
| 29 | WebKit is not iOS Safari | One pass on an iPhone with VoiceOver | 10 minutes, needs a phone |

Known limit: patterns take their colors from where `PatternDefs` sits (inside `ChartPrefs`). On a
page that mixes a brand theme with the root theme, the brand charts get textures in the root
colors. One theme per page has no issue.
