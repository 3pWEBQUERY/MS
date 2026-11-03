import { defineConfig, devices } from "@playwright/test";

/**
 * Ende-zu-Ende-, Barrierefreiheits- und Abnahmetests (PRD 16: F01–F07, AT10, QA09) gegen einen
 * Produktions-Build auf Port 3200 mit eigener, frisch migrierter und geseedeter Datenbank «ms_e2e».
 *   npm run test:e2e
 * Der Server wird über e2e/support/server.ts gestartet (DB vorbereiten → next build → next start).
 * Lokal wird ein bereits laufender Server auf Port 3200 wiederverwendet.
 */
const PORT = 3200;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "de-CH",
    timezoneId: "Europe/Zurich",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx tsx e2e/support/server.ts",
    url: `http://localhost:${PORT}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 15 * 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
