import { defineConfig, devices } from "@playwright/test";

// Runs against the built gallery (dist/index.html) over file://.
// chromium uses the installed Chrome, or CHROME_PATH if set. firefox and webkit use Playwright's own builds:
// run `npx playwright install firefox webkit` once. Pick one with --project=firefox.
const viewport = { width: 1440, height: 1000 };
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  projects: [
    { name: "chromium", use: { viewport, launchOptions: { ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--no-sandbox"] } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport } },
  ],
});
