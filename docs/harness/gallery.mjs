// node gallery.mjs OUTDIR : full-page gallery shots (1440 light/dark/brand at 2x, 768, 390).
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const out = process.argv[2] ?? "shots";
const base = pathToFileURL(resolve("dist/index.html")).href;
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--no-sandbox"] });
const runs = [
  ["world-class-charts-gallery.png", 1440, 2, "light"],
  ["world-class-charts-gallery-dark.png", 1440, 2, "dark"],
  ["world-class-charts-t768.png", 768, 2, "light"],
  ["world-class-charts-m390.png", 390, 3, "light"],
];
for (const [name, w, dpr, mode] of runs) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: dpr, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${base}#${mode}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}`, fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(name, w * dpr, "x", h * dpr);
  await ctx.close();
}
// Brand renders light then dark. Chrome caps one capture near 16,384 device px, so shoot each half.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${base}#brand`);
  await page.waitForTimeout(800);
  const boxes = await page.evaluate(() => [...document.querySelectorAll("section[data-brand]")].map((s) => { const r = s.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; }));
  for (const [i, name] of ["world-class-charts-brand.png", "world-class-charts-brand-dark.png"].entries()) {
    await page.screenshot({ path: `${out}/${name}`, fullPage: true, clip: { x: 0, y: boxes[i].y, width: 1440, height: boxes[i].h } });
    console.log(name, 2880, "x", Math.round(boxes[i].h * 2));
  }
  await ctx.close();
}
await browser.close();
