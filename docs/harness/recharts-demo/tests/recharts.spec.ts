import { expect, test, type Page } from "@playwright/test";

// The Recharts path must meet the same bar as the SVG templates:
// keyboard reaches the data, a live region says it, the tip stays inside the card, nothing throws.
const errors: string[] = [];
async function open(page: Page, hash = "light") {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`/#${hash}`);
  await page.waitForSelector(".recharts-surface");
}
const card = (page: Page, title: string) => page.locator("section.wc-card", { has: page.getByRole("heading", { name: title }) });

test("renders all charts and states with no console errors", async ({ page }) => {
  await open(page);
  await expect(page.locator(".recharts-wrapper")).toHaveCount(3);
  await expect(page.getByText("Couldn't load", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Spending shows up after your first transaction.")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [title, want] of [
  ["Monthly revenue", /^[A-Z][a-z]{2}: this year \$[\d.]+ thousand, last year \$[\d.]+ thousand$/],
  ["Money in vs out", /^[A-Z][a-z]{2}: in \$[\d.,]+( thousand)?, out .*, net /],
  ["Spending by month", /^[A-Z][a-z]{2}: home .*, total \$/],
] as const) {
  test(`keyboard + live region: ${title}`, async ({ page }) => {
    await open(page);
    const k = card(page, title);
    const surface = k.locator(".recharts-surface");
    await surface.focus();
    await page.keyboard.press("ArrowRight");
    const live = k.locator("[data-wc-live]");
    await expect(live).toHaveText(want);
    const first = await live.textContent();
    await page.keyboard.press("ArrowRight");
    await expect(live).not.toHaveText(first ?? "");
    // Visible key hint appears only while the chart has keyboard focus (Chartability: instructions).
    await expect(k.locator(".wc-keyhint")).toBeVisible();
    await page.locator("body").click({ position: { x: 2, y: 2 } });
    await expect(k.locator(".wc-keyhint")).toBeHidden();
  });
}

test("live text is human readable (no K/M shorthand, no unicode minus)", async ({ page }) => {
  await open(page);
  const k = card(page, "Monthly revenue");
  await k.locator(".recharts-surface").focus();
  await page.keyboard.press("ArrowRight");
  const t = (await k.locator("[data-wc-live]").textContent()) ?? "";
  expect(t).not.toMatch(/\d[KMB]\b|\u2212/);
  expect(t).toMatch(/thousand|\d{2},\d{3}/);
});

for (const w of [1280, 390]) {
  test(`tooltip stays inside its card at ${w}px, at both edges`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 1000 });
    await open(page);
    for (const title of ["Monthly revenue", "Money in vs out", "Spending by month"]) {
      const k = card(page, title);
      await k.scrollIntoViewIfNeeded();
      const box = (await k.boundingBox())!;
      const plot = (await k.locator(".recharts-wrapper").boundingBox())!;
      for (const fx of [0.94, 0.24]) { // 0.24 clears the 48px y-axis at 390px
        // Two moves: Recharts reads pointer movement, not a single jump.
        await page.mouse.move(plot.x + plot.width * fx - 6, plot.y + plot.height * 0.5);
        await page.mouse.move(plot.x + plot.width * fx, plot.y + plot.height * 0.5);
        const tip = k.locator(".recharts-tooltip-wrapper .rounded-wc-tip");
        await expect(tip).toBeVisible();
        const tb = (await tip.boundingBox())!;
        expect(tb.x, `${title} left edge`).toBeGreaterThanOrEqual(box.x - 0.5);
        expect(tb.x + tb.width, `${title} right edge`).toBeLessThanOrEqual(box.x + box.width + 0.5);
      }
    }
  });
}

test("dark mode tip and focus ring use tokens", async ({ page }) => {
  await open(page, "dark");
  const surface = page.locator(".recharts-surface").first();
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  const ring = await surface.evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(parseFloat(ring)).toBeGreaterThanOrEqual(2);
});

test("no horizontal scroll at 320px (reflow)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
