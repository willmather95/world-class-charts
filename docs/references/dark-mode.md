# Dark mode

Dark mode is a second palette, not an inverted one. Values are in the `.dark,
[data-theme="dark"]` block of `tokens.css`. Brands add a `.dark [data-brand="..."], [data-theme="dark"] [data-brand="..."]` block.

## Rules

- **Surfaces step up in lightness for depth.** Page darkest, card lighter, raised items lighter
  still. No pure black (#000) cards; it smears on OLED and kills depth.
- **Lift and soften the colors.** Accents and categorical colors are lighter and a little less
  saturated than in light mode so they pass 3:1 on dark cards without glowing.
- **Sequential ramps flip.** In dark, more is lighter (`seq-6` is the lightest). Dark cells
  should read as "little", the way pale cells do in light mode.
- **Soft tints get darker, not lighter.** `positive-soft` is a dark green wash with light green
  text.
- **Gridlines get quieter.** A grid that is fine in light mode looks loud in dark.
- **Shadows mostly disappear.** Use a 1px hairline ring for card edges instead.
- **Tooltips stay high contrast.** In our default the tooltip stays dark but sits a step lighter than the card; a light
  tooltip on a dark page is also fine if it passes 4.5:1.
- **Check every pair again.** `node contrast.mjs` checks light and dark in one run.

## How to switch

- Add the `dark` class (or `data-theme="dark"`) on `<html>` or any wrapper. Tokens cascade.
- For system preference, set the class from `matchMedia("(prefers-color-scheme: dark)")`.
- In Tailwind v4, add `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` utilities
  follow the same class.

## Dark palette

Dark mode is its own set, not an inverted one. Each category is lighter and a bit brighter
(for example blue `#0a72e8` becomes `#3d95ff`) so marks keep 3:1 on the dark card. The CVD check
runs on the dark set too, on all 28 category pairs. The worst pair across all four themes is
ΔE 10.5, above the floor of 10. Colors 5 to 8 were moved on Oct 31, 2026 to pass: dark 1 to 5
had sat at ΔE 1.7 for some readers.
