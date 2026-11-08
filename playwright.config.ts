import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3001/auth/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BASE_API_URL: "http://127.0.0.1:4010",
      COLLECTIONS_API_URL: "http://127.0.0.1:4011",
      NEXTAUTH_SECRET: "e2e-only-secret",
      NEXTAUTH_URL: "http://127.0.0.1:3001",
    },
  },
});
