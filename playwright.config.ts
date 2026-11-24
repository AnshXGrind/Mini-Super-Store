/** @type {import('@playwright/test').testOptions} */
const playwrighConfig = {
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  // Shared test timeout
  timeout: 30_000,

  use: {
    // baseUrl: "http://127.0.0.1:3000",
    headless: process.env.CI === "true",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    trace: "retry-with-page",
  },

  expect: {
    timeout: 5_000,
  },

  // projects: [
  //   { name: "Chromium", use: { ...testOptions.use, browser: "chromium" } },
  //   { name: "Firefox", use: { ...testOptions.use, browser: "firefox" } },
  //   { name: "WebKit", use: { ...testOptions.use, browser: "webkit" } },
  // ],
};

/** @type {import('next').NextConfig} */
export default playwrighConfig;