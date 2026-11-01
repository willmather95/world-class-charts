# Theming: the semantic token layer

Templates never use raw colors. They use roles. A brand changes the values, not the templates.

## Layers

1. **Brand palette**: the raw brand colors (for example violet `#5C5EF5`, navy `#0B2742`).
2. **Semantic tokens** (`--wc-*` in `src/tokens.css`): what a color is for.
3. **Tailwind utilities**: `@theme inline` maps tokens to classes like `bg-wc-surface`, `text-wc-muted`.
4. **SVG**: reads the same tokens through `c` in `lib.ts` (`c.accent` is `"var(--wc-accent)"`).

Because every layer reads the same variable, dark mode and brands switch with no re-render.

## The roles

| Group | Tokens | Rule |
|---|---|---|
| Surfaces | `page`, `surface`, `surface-2`, `track`, `grid`, `hairline` | Neutral. Tint toward the brand by a few percent at most. |
| Text | `ink`, `ink-2`, `muted` | 4.5:1 on `surface` and `surface-2`. |
| Axis | `axis` | 3:1 on `surface` (it is a graphic object). |
| Accent | `accent`, `accent-soft`, `accent-ink` | The main series and focus. `accent-ink` is the text version (4.5:1). |
| Compare | `compare`, `compare-soft` | Gray. Last period, benchmark, "other". |
| Status | `positive`, `negative`, `warning` (+ `-soft`, `-ink`) | Meaning only. Never use for decoration or brand. |
| Categorical | `cat-1` to `cat-8` | Distinct hues. `cat-1` is the brand. `cat-8` is gray for "Other". |
| Sequential | `seq-0` to `seq-6` | One hue, light to dark (dark to light in dark mode). For heatmaps. |
| Tooltip | `tip-bg`, `tip-ink`, `tip-muted` | High contrast, inverse of the card. |
| More contrast | same names, under `[data-wc-contrast="more"]` and `prefers-contrast: more` | Text 7:1, `hairline` 3:1. Keep the two blocks in step: `contrast.mjs` fails if they differ. |
| Shape and motion | `radius-card`, `radius-tip`, `ease`, `dur-*` | Shared feel across every chart. |

## Worked example: mapping a brand

See `src/themes/brand-example.css`. Inputs: violet `#5C5EF5`, navy `#0B2742`.

1. **Pick the job for each brand color.** Violet is the action color, so it becomes `accent`,
   `focus` and `cat-1`. Navy is the text color, so it becomes `ink`.
2. **Derive the text version of the accent.** `#5C5EF5` on white is fine for marks (3:1) but
   too light for small text in some spots, so `accent-ink` is a darker `#4A3FE0`.
3. **Tint the neutrals slightly.** Page `#F6F9FC`, muted `#5B6A80`. Cool grays match navy.
4. **Build the categorical set around the brand.** Keep hues far apart: violet, orange, green,
   plum, sky blue, indigo, olive, gray. Run `node contrast.mjs` on the theme file: all 28 pairs
   must pass the CVD check, not just neighbors. When one fails, move the newer color, not cat-1.
5. **Build a sequential ramp from the brand hue.** 7 steps, `seq-0` near the surface.
6. **Keep status colors standard.** Green good, red bad, amber caution, even if the brand is red.
   If the brand is red, do not use it for `accent` on charts that show losses.
7. **Write a separate dark set.** Lighter, slightly less saturated accent (`#8B85FF`), lighter
   categorical colors, and a sequential ramp where more is lighter.
8. **Check contrast.** Run the harness check from `docs/harness` and fix every FAIL:

```bash
node contrast.mjs ../../src/tokens.css ../../src/themes/brand-example.css
```

Apply with `data-brand="example"` on any wrapper, or on `<html>`.

## Adapting to Recharts or shadcn charts

Keep the tokens. Pass `stroke="var(--wc-accent)"` and `fill="var(--wc-accent)"` to Recharts
series, set `CartesianGrid` to `stroke="var(--wc-grid)" vertical={false}`, and render the
tooltip with our `Tip` markup through Recharts' `content` prop. Keep the states from
`ChartCard` around the chart.

The full prop map, the ghost rule on Recharts and a working demo app are in `recharts.md`
(`docs/harness/recharts-demo/`).

## Why the default palette looks like this

The default categories are blue, orange, teal green and plum, then violet, deep teal, umber
and warm gray. All 28 pairs stay apart under all three kinds of color blindness (ΔE 10 or more,
see `accessibility.md`). Colors 5 to 8 came from a search that kept 1 to 4 fixed, held 3:1 on
the card, and stayed as close to the old hues as it could. Blue and orange lead because that pair holds up best
for most readers, as Datawrapper and Carbon both note. Status green and red are only for
meaning, never for categories. They are about 12 apart for deutan readers, so pills also use
arrows and signs. If you change the palette, run `contrast.mjs` and keep 0 fails.
