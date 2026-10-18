import { defineConfig, devices } from "@playwright/test";

// Runs against the production build: `npm run build` first.
export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  // Pyodide can take over 7 s to start on CI, and some tests start it three times
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
