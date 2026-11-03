import { defineConfig, devices } from '@playwright/test';

const port = 5175;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/m01-profile-slice.optin.ts',
  outputDir: 'test-results/d1-browser/playwright',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/d1-browser/opt-in-playwright-results.json' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { VITE_ENABLE_M01_PROFILE_SLICE: 'true' },
  },
});
