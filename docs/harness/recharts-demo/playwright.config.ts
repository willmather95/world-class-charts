import { defineConfig, devices } from "@playwright/test";

// Recharts demo tests. Build first (npm run build), then: npx playwright test
// chromium uses the installed Chrome, or CHROME_PATH if set. firefox and webkit use Playwright's own builds.
const use = { viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" as const };
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  webServer: { command: "node serve.mjs 4179", url: "http://localhost:4179/", reuseExistingServer: true },
  use: { baseURL: "http://localhost:4179/" },
  projects: [
    { name: "chromium", use: { ...use, launchOptions: { ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--no-sandbox"] } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], ...use } },
    { name: "webkit", use: { ...devices["Desktop Safari"], ...use } },
  ],
});
