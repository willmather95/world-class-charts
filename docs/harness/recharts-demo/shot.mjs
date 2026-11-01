// node shot.mjs OUT.png [width] : serves dist/ over http, hovers each chart, screenshots light|dark side by side.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const srv = createServer(async (req, res) => {
  const p = join("dist", (req.url ?? "/").split("?")[0].replace(/\/$/, "/index.html"));
  try { const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = srv.address().port, w = Number(process.argv[3] ?? 1440);
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/#${w < 900 ? "light" : "side"}`);
await page.waitForSelector(".recharts-surface");
// Hover the second bar group of the paired chart in the light set, so the shot shows the ghost rule and the tip.
const bars = page.locator(".recharts-wrapper").nth(1);
const b = await bars.boundingBox();
await page.mouse.move(b.x + b.width * 0.42, b.y + b.height * 0.5);
await page.waitForTimeout(300);
await page.screenshot({ path: process.argv[2], fullPage: true });
console.log(JSON.stringify({ errors, tips: await page.locator(".recharts-tooltip-wrapper div.rounded-wc-tip").count() }));
await browser.close(); srv.close();
