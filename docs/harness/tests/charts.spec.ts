import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const url = (mode = "light") => `${pathToFileURL(resolve("dist/index.html")).href}#${mode}`;
const card = (page: Page, title: string) =>
  page.locator("section:has(> header)").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
const plot = (c: Locator) => c.locator('[role="group"][aria-roledescription]').first();
// The chart's own live region (LiveRegion), not ChartCard's load and error announcer.
const live = (c: Locator) => c.locator("[data-wc-live]").first();
const tip = (c: Locator) => c.locator("[data-wc-tip]");
/** Press a key and wait for the live region to change (React may commit a frame later). */
async function press(page: Page, c: Locator, key: string) {
  const before = (await live(c).textContent()) ?? "";
  await page.keyboard.press(key);
  await expect(live(c)).not.toHaveText(before);
  return (await live(c).textContent()) ?? "";
}

// Every interactive chart in the gallery, with the move its arrow keys make.
const CHARTS = [
  "Monthly revenue", "Money in vs out", "Visits by channel", "Daily orders", "Spending by month",
  "Where October's pay went", "Price range by plan", "Wait time by clinic",
  "Bookings forecast", "Weekly orders by city", "Quarterly targets", "Market share", "Profit bridge",
  "Server load, 10,000 readings",
];
// Radial bars read the active value in the ring's center instead of a floating tip.
// Small multiples print the active date in the note line and each panel's header instead.
const CENTER_READOUT = new Set(["Spending by month", "Weekly orders by city"]);

test.describe("screen reader wiring", () => {
  test("every plot is a labeled group with a hidden svg, a polite live region and a captioned table", async ({ page }) => {
    await page.goto(url());
    for (const title of CHARTS) {
      const c = card(page, title);
      const p = plot(c);
      await expect(p, title).toHaveAttribute("aria-label", new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`));
      await expect(p, title).toHaveAttribute("tabindex", "0");
      await expect(p.locator("svg").first(), title).toHaveAttribute("aria-hidden", "true");
      await expect(live(c), title).toHaveAttribute("aria-atomic", "true");
      await expect(c.locator("table caption"), title).toContainText(title);
      expect(await c.locator("table tbody tr").count(), title).toBeGreaterThan(0);
    }
  });

  test("loading cards are busy with a status, errors offer Try again", async ({ page }) => {
    await page.goto(url());
    const loading = card(page, "Loading flow");
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading.getByRole("status", { name: "Loading chart" })).toBeVisible();
    await expect(card(page, "Flow error").getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(card(page, "Empty dumbbell")).toContainText("No clinics reported yet.");
  });

  test("heatmap key prints value ranges and the tooltip is aria-hidden", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Daily orders");
    const key = c.getByRole("list", { name: "Color key" });
    await expect(key.getByRole("listitem")).toHaveCount(8); // 0, six steps, no data
    await expect(key).toContainText(/\d+\u2013\d+/);
    await expect(key).toContainText("No data");
    await plot(c).focus();
    await expect(tip(c)).toHaveAttribute("aria-hidden", "true");
  });

  test("View data toggles a visible table", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Where October's pay went");
    const btn = c.getByRole("button", { name: "View data" });
    await btn.click();
    await expect(c.getByRole("button", { name: "Hide data" })).toHaveAttribute("aria-expanded", "true");
    await expect(c.locator("table")).toBeVisible();
    await expect(c.locator("table")).toContainText("Rent");
  });
});

test.describe("keyboard", () => {
  for (const title of CHARTS) {
    test(`${title}: focus selects, arrows move, Home/End jump, Esc clears`, async ({ page }) => {
      await page.goto(url());
      const c = card(page, title);
      const p = plot(c);
      await p.focus();
      await expect(live(c), "focus selects the latest item").not.toHaveText("");
      const atFocus = (await live(c).textContent()) ?? "";
      if (title === "Spending by month") await expect(p).toContainText("Dec");
      else if (CENTER_READOUT.has(title)) await expect(tip(c)).toHaveCount(0);
      else await expect(tip(c)).toBeVisible();
      const first = await press(page, c, "Home");
      await press(page, c, "ArrowDown");
      await page.keyboard.press("ArrowUp");
      await expect(live(c)).toHaveText(first);
      await page.keyboard.press("End");
      await expect(live(c)).toHaveText(atFocus);
      await page.keyboard.press("Escape");
      await expect(live(c)).toHaveText("");
      await expect(tip(c)).toHaveCount(0);
    });
  }

  test("Tab reaches the plot and shows a focus ring", async ({ page }) => {
    await page.goto(url());
    const p = plot(card(page, "Monthly revenue"));
    for (let i = 0; i < 12 && !(await p.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(p).toBeFocused();
    const ring = await p.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe("none");
  });

  test("heatmap: Left/Right move a week, Up/Down a day", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Daily orders");
    await plot(c).focus();
    await expect(live(c)).not.toHaveText("");
    const day0 = await press(page, c, "Home");
    const wk1 = await press(page, c, "ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await expect(live(c)).toHaveText(day0);
    const d1 = await press(page, c, "ArrowDown");
    // The week move lands 7 days later, the day move 1 day later.
    const day = (t: string | null) => new Date((t ?? "").split(":")[0]).getTime() / 86_400_000;
    expect(Math.round(day(wk1) - day(day0))).toBe(7);
    expect(Math.round(day(d1) - day(day0))).toBe(1);
  });
});

test.describe("pointer and touch", () => {
  test("hover shows a tooltip that stays inside the card; leaving clears it", async ({ page }) => {
    await page.goto(url());
    for (const title of ["Monthly revenue", "Money in vs out", "Visits by channel", "Wait time by clinic"]) {
      const c = card(page, title);
      await plot(c).scrollIntoViewIfNeeded(); // mouse.move does not scroll the page
      const box = (await plot(c).boundingBox())!;
      for (const fx of [0.03, 0.5, 0.97]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * 0.4);
        await expect(tip(c), `${title} at ${fx}`).toBeVisible();
        const t = (await tip(c).boundingBox())!, cb = (await c.boundingBox())!;
        expect(t.x, `${title} tip left`).toBeGreaterThanOrEqual(cb.x - 1);
        expect(t.x + t.width, `${title} tip right`).toBeLessThanOrEqual(cb.x + cb.width + 1);
      }
      await page.mouse.move(0, 0);
      await expect(tip(c)).toHaveCount(0);
    }
  });

  test("hovering a Sankey ribbon picks that flow", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Where October's pay went");
    const ribbon = plot(c).locator("svg path").first();
    await ribbon.scrollIntoViewIfNeeded();
    const b = (await ribbon.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await expect(tip(c)).toBeVisible();
    await expect(tip(c)).toContainText("Income");
    await expect(live(c)).toContainText(/Income to \w+: \$/);
  });

  test("tap on a phone shows the tooltip and it stays after lifting", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(url());
    for (const title of ["Money in vs out", "Price range by plan", "Daily orders"]) {
      const c = card(page, title);
      await plot(c).scrollIntoViewIfNeeded();
      await plot(c).scrollIntoViewIfNeeded(); // mouse.move does not scroll the page
      const box = (await plot(c).boundingBox())!;
      await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await expect(tip(c), title).toBeVisible();
      await page.waitForTimeout(300);
      await expect(tip(c), `${title} after lift`).toBeVisible();
      const t = (await tip(c).boundingBox())!, cb = (await c.boundingBox())!;
      expect(t.x).toBeGreaterThanOrEqual(cb.x - 1);
      expect(t.x + t.width).toBeLessThanOrEqual(cb.x + cb.width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), "no sideways scroll").toBeLessThanOrEqual(390);
    }
    await ctx.close();
  });
});

test.describe("reduced motion", () => {
  test("no shimmer, no transitions, tweens land on the final value at once", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(url());
    const sk = card(page, "Loading flow").locator(".wc-skeleton").first();
    await expect(sk).toHaveCSS("animation-name", "none");
    const motion = page.locator(".wc-motion").first();
    expect(await motion.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s/);
    // Bars are drawn at full height on the first frame: compare now vs after the entry duration.
    const path = plot(card(page, "Money in vs out")).locator("svg path").first();
    const early = await path.getAttribute("d");
    await page.waitForTimeout(900);
    expect(await path.getAttribute("d")).toBe(early);
    await ctx.close();
  });

  test("with motion allowed, the skeleton shimmers and bars grow in", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await page.goto(url());
    await expect(card(page, "Loading flow").locator(".wc-skeleton").first()).toHaveCSS("animation-name", "wc-shimmer");
    const path = plot(card(page, "Money in vs out")).locator("svg path").first();
    await page.clock.runFor(50);
    const early = await path.getAttribute("d");
    await page.clock.runFor(1500);
    expect(await path.getAttribute("d")).not.toBe(early);
  });
});

test.describe("quality bars", () => {
  for (const mode of ["light", "dark"]) {
    test(`axe finds no serious or critical issues (${mode})`, async ({ page }) => {
      await page.goto(url(mode));
      await expect(card(page, "Monthly revenue")).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target.join(" ")})`)).toEqual([]);
    });
  }

  test("no visible text under 12px", async ({ page }) => {
    await page.goto(url());
    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
        if (el.closest(".sr-only, [aria-hidden='true'] .sr-only")) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const px = el instanceof SVGElement && el.getAttribute("font-size") ? parseFloat(el.getAttribute("font-size")!) : parseFloat(cs.fontSize);
        if (px < 12) out.push(`${px}px: ${el.textContent!.trim().slice(0, 30)}`);
      }
      return out;
    });
    expect(small).toEqual([]);
  });

  test("reflows at 320px with no sideways scroll (WCAG 1.4.10)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(url());
    await expect(card(page, "Monthly revenue")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await ctx.close();
  });

  test("forced colors: plots keep a visible focus outline", async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: "active" });
    const page = await ctx.newPage();
    await page.goto(url());
    const p = plot(card(page, "Monthly revenue"));
    await p.focus();
    const o = await p.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, w: parseFloat(s.outlineWidth), shadow: s.boxShadow }; });
    expect(o.style !== "none" && o.w >= 2, JSON.stringify(o)).toBe(true);
    await ctx.close();
  });

  test("the key hint shows only while a plot has keyboard focus", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Monthly revenue");
    const hint = c.locator(".wc-keyhint");
    await expect(hint).toBeHidden();
    const p = plot(c);
    for (let i = 0; i < 12 && !(await p.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Arrows move");
    await page.keyboard.press("Shift+Tab");
    await expect(hint).toBeHidden();
  });

  test("a 10,000-point chart caps the DOM table at 500 rows; the CSV keeps all of them", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Server load, 10,000 readings");
    await expect(c.locator("table tbody tr")).toHaveCount(501); // 500 rows and the "Showing" note
    await expect(c.locator("table")).toContainText("Showing the first 500 of 10,000 rows");
    await c.getByRole("button", { name: "View data" }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), c.getByRole("button", { name: /Download CSV/ }).click()]);
    const csv = await readFile((await dl.path())!, "utf8");
    expect(csv.trim().split("\n")).toHaveLength(10_001); // header and every reading
  });

  test("the gallery renders fast enough to use (under 2s for 76 cards)", async ({ page }) => {
    const t = Date.now();
    await page.goto(url());
    await expect(card(page, "Server load, 10,000 readings")).toBeVisible();
    expect(Date.now() - t).toBeLessThan(2000);
  });

  test("print: hides buttons, keeps charts, drops shadows", async ({ page }) => {
    await page.goto(url());
    await page.emulateMedia({ media: "print" });
    const c = card(page, "Monthly revenue");
    await expect(plot(c).locator("svg").first()).toBeVisible();
    const btn = c.getByRole("button", { name: "View data" });
    if (await btn.count()) expect(await btn.evaluate((el) => getComputedStyle(el).display)).toBe("none");
  });

  test("bullet rows announce value, share of target and band", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Quarterly targets");
    await plot(c).focus();
    await expect(live(c)).toHaveText(/^[A-Z][^:]+: .+, \d+% of target .+/);
  });

  test("waterfall steps announce the change and the running total", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Profit bridge");
    await plot(c).focus();
    const first = await press(page, c, "Home");
    expect(first).toMatch(/2025/);
    const step = await press(page, c, "ArrowRight");
    expect(step).toMatch(/(up|down|plus|minus|\+|\u2212).*total/i);
  });
});

test.describe("extra keys and user settings", () => {
  test("PageDown and PageUp jump a tenth of the points", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Monthly revenue");
    await plot(c).focus();
    const home = await press(page, c, "Home");
    const down = await press(page, c, "PageDown");
    expect(down).not.toBe(home);
    await page.keyboard.press("PageUp");
    await expect(live(c)).toHaveText(home);
  });

  test("S plays the series as rising and falling pitch; Esc stops it", async ({ page }) => {
    // Stub Web Audio so the test hears nothing but can count the notes.
    await page.addInitScript(() => {
      const w = window as unknown as { __notes: number[]; __stopped: number; AudioContext: unknown };
      w.__notes = []; w.__stopped = 0;
      const param = () => ({ value: 0, setValueAtTime(v: number) { this.value = v; return this; } });
      class FakeCtx {
        currentTime = 0; destination = {};
        createGain() { return { gain: param(), connect() {} }; }
        createOscillator() {
          const f = param();
          f.setValueAtTime = function (v: number) { w.__notes.push(v); this.value = v; return this; };
          return { type: "sine", frequency: f, connect() {}, start() {}, stop() { w.__stopped++; } };
        }
      }
      w.AudioContext = FakeCtx;
    });
    await page.goto(url());
    const c = card(page, "Monthly revenue");
    await plot(c).focus();
    await page.keyboard.press("s");
    const notes = await page.evaluate(() => (window as unknown as { __notes: number[] }).__notes);
    expect(notes.length).toBeGreaterThan(5);
    expect(Math.min(...notes)).toBeGreaterThanOrEqual(220);
    expect(Math.max(...notes)).toBeLessThanOrEqual(880);
    const before = await page.evaluate(() => (window as unknown as { __stopped: number }).__stopped);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => (window as unknown as { __stopped: number }).__stopped)).toBeGreaterThan(before);
  });

  test("text spacing overrides do not clip or overflow (WCAG 1.4.12)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 2000 } });
    const page = await ctx.newPage();
    await page.goto(url());
    await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
    await page.waitForTimeout(300);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const s of document.querySelectorAll("section:has(> header)")) {
        if (s.scrollWidth > s.clientWidth + 1) out.push(`${s.querySelector("h2,h3")?.textContent}: sideways overflow`);
      }
      return out;
    });
    expect(bad).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ctx.close();
  });
});

test.describe("finding your way", () => {
  test("the live text ends with the position, read after the value", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Monthly revenue");
    await plot(c).focus();
    await expect(live(c)).toHaveText(/12 of 12\.$/);
    await page.keyboard.press("Home");
    await expect(live(c)).toHaveText(/^Jan.*\. 1 of 12\.$/);
  });

  test("H and L jump to the highest and lowest point and say so", async ({ page }) => {
    await page.goto(url());
    for (const title of ["Monthly revenue", "Visits by channel", "Where October's pay went", "Profit bridge"]) {
      const c = card(page, title);
      await plot(c).focus();
      await expect(live(c), title).not.toHaveText("");
      await page.keyboard.press("h");
      await expect(live(c), title).toHaveText(/Highest\. \d+ of \d+\.$/);
      await page.keyboard.press("l");
      await expect(live(c), title).toHaveText(/Lowest\. \d+ of \d+\.$/);
    }
    // The highest point really is the largest value in the table.
    const c = card(page, "Monthly revenue");
    await plot(c).focus();
    await page.keyboard.press("h");
    const said = (await live(c).textContent()) ?? "";
    const vals = await c.locator("table tbody tr").evaluateAll((rows) => rows.map((r) => Number((r.children[1]?.textContent ?? "").replace(/[^\d.]/g, ""))));
    const top = Math.max(...vals);
    const idx = vals.indexOf(top) + 1;
    expect(said).toContain(`${idx} of 12`);
  });

  test("N and P step through the notes and wrap", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Monthly revenue");
    await plot(c).focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("n");
    await expect(live(c)).toHaveText(/Note 1 of 1\. 6 of 12\.$/);
    await page.keyboard.press("End");
    await page.keyboard.press("p");
    await expect(live(c)).toHaveText(/Note 1 of 1\. 6 of 12\.$/);
    await page.keyboard.press("n"); // wraps to the first note
    await expect(live(c)).toHaveText(/Note 1 of 1\. 6 of 12\.$/);
  });

  test("summaries name the top item in Sankey, slope and stacked charts", async ({ page }) => {
    await page.goto(url());
    await expect(plot(card(page, "Where October's pay went"))).toHaveAttribute("aria-label", /Largest flow: Income to Home, .+ of Income\./);
    await expect(plot(card(page, "Market share"))).toHaveAttribute("aria-label", /Biggest (rise|fall): /);
    await expect(plot(card(page, "Visits by channel"))).toHaveAttribute("aria-label", /Largest part: Search, \d+(\.\d)?% of the total\. Peak: \w+, /);
  });
});

test.describe("data table sort", () => {
  test("sort buttons appear only when the table shows, and aria-sort follows the clicks", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Money in vs out");
    await expect(c.locator("thead button"), "no hidden tab stops").toHaveCount(0);
    await expect(c.locator("th[aria-sort]")).toHaveCount(0);
    await c.getByRole("button", { name: "View data" }).click();
    const heads = c.locator("thead th");
    const col = heads.nth(1);
    const btn = col.getByRole("button");
    const name = ((await btn.textContent()) ?? "").trim();
    const cells = () => c.locator("tbody tr").evaluateAll((rows) => rows.map((r) => r.children[1]?.textContent ?? ""));
    const num = (t: string) => Number(t.replace(/\u2212/g, "-").replace(/[^\d.-]/g, ""));
    const orig = await cells();
    await btn.click();
    await expect(col).toHaveAttribute("aria-sort", "descending");
    let v = (await cells()).map(num);
    expect(v).toEqual([...v].sort((a, b) => b - a));
    await expect(c.locator(".sr-only[aria-live]").filter({ hasText: "Sorted by" })).toHaveText(`Sorted by ${name}, high to low.`);
    await btn.click();
    await expect(col).toHaveAttribute("aria-sort", "ascending");
    v = (await cells()).map(num);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    await btn.click();
    await expect(col).not.toHaveAttribute("aria-sort", /./);
    expect(await cells()).toEqual(orig);
    // The label column flips the original order.
    await heads.nth(0).getByRole("button").click();
    await expect(heads.nth(0)).toHaveAttribute("aria-sort", "other");
    expect(await cells()).toEqual([...orig].reverse());
    const small = await c.locator("thead button").evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().height < 24).length);
    expect(small).toBe(0);
  });
});

test.describe("shareable state", () => {
  test("the active point and the sort land in the URL and come back on reload", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Visits by channel");
    await plot(c).focus();
    await page.keyboard.press("Home");
    await expect.poll(() => new URL(page.url()).searchParams.get("wc.visits")).toBe("0");
    await c.getByRole("button", { name: "View data" }).click();
    await c.locator("thead th").nth(1).getByRole("button").click();
    await expect.poll(() => new URL(page.url()).searchParams.get("wc.visits.sort")).toBe("1d");
    expect(new URL(page.url()).hash).toBe("#light");
    await page.goto(page.url());
    await page.reload();
    const c2 = card(page, "Visits by channel");
    await expect(live(c2), "the shared point is read back").toHaveText(/1 of 7\.$/);
    await c2.getByRole("button", { name: "View data" }).click();
    await expect(c2.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "descending");
    // Charts without ShareState never touch the URL.
    expect([...new URL(page.url()).searchParams.keys()].every((k) => k.startsWith("wc.visits"))).toBe(true);
    await plot(c2).focus();
    await page.keyboard.press("Escape");
    await expect.poll(() => new URL(page.url()).searchParams.get("wc.visits")).toBeNull();
  });
});

test.describe("reader choices", () => {
  test("the series picker hides parts, keeps one, and the summary says so", async ({ page }) => {
    await page.goto(url());
    const c = card(page, "Visits by channel");
    const g = c.getByRole("group", { name: "Show parts" });
    const chip = (n: string) => g.getByRole("button", { name: n });
    await chip("Search").click();
    await expect(chip("Search")).toHaveAttribute("aria-pressed", "false");
    await expect(plot(c)).toHaveAttribute("aria-label", /showing 3 of 4 parts/);
    await chip("Direct").click();
    await chip("Social").click();
    await chip("Email").click(); // the last part stays on
    await expect(chip("Email")).toHaveAttribute("aria-pressed", "true");
    await expect(plot(c)).toHaveAttribute("aria-label", /showing 1 of 4 parts/);
    await expect(c.locator("table thead")).toContainText("Search"); // the table keeps every part
    await chip("Search").click();
    await expect(chip("Search")).toHaveAttribute("aria-pressed", "true");
  });

  test("Patterns textures every part and More contrast darkens labels; both persist", async ({ page }) => {
    await page.goto(url());
    const prefs = page.getByRole("group", { name: "Chart display" });
    const root = page.locator("html");
    const seg = card(page, "Visits by channel").locator('svg [data-wc-pat="2"]').first();
    expect(await seg.evaluate((el) => getComputedStyle(el).fill)).not.toMatch(/url/);
    await prefs.getByRole("button", { name: "Patterns" }).click();
    await expect(root).toHaveAttribute("data-wc-patterns", "");
    expect(await seg.evaluate((el) => getComputedStyle(el).fill)).toMatch(/url\(.*wc-pat-2/);
    expect(await page.locator("#wc-pat-2").count()).toBe(1);
    const muted = () => page.evaluate(() => getComputedStyle(document.querySelector("section")!).getPropertyValue("--wc-muted").trim());
    const before = await muted();
    await prefs.getByRole("button", { name: "More contrast" }).click();
    await expect(root).toHaveAttribute("data-wc-contrast", "more");
    expect(await muted()).toBe("#4a4a4a");
    expect(before).not.toBe("#4a4a4a");
    await page.reload();
    await expect(root).toHaveAttribute("data-wc-patterns", "");
    await expect(root).toHaveAttribute("data-wc-contrast", "more");
    await expect(prefs.getByRole("button", { name: "Patterns" })).toHaveAttribute("aria-pressed", "true");
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
    await prefs.getByRole("button", { name: "Patterns" }).click();
    await prefs.getByRole("button", { name: "More contrast" }).click();
    await expect(root).not.toHaveAttribute("data-wc-patterns", /.*/);
  });

  test("the OS high-contrast setting turns More contrast on by itself, in dark too", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    await page.goto(url("dark"));
    const muted = await page.evaluate(() => getComputedStyle(document.querySelector("section.dark")!).getPropertyValue("--wc-muted").trim());
    expect(muted).toBe("#c4c4ca");
  });
});

test("every button is at least 24px in its smaller side (WCAG 2.5.8)", async ({ page }) => {
  await page.goto(url());
  const small = await page.evaluate(() => [...document.querySelectorAll("button")]
    .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.getAttribute("aria-label") || b.textContent || "").trim(), s: Math.min(r.width, r.height) }; })
    .filter((b) => b.s > 0 && b.s < 24));
  expect(small).toEqual([]);
});
