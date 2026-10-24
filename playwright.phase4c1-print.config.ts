import { defineConfig, devices } from '@playwright/test';

const headUrl = 'http://127.0.0.1:43173';
const baselineUrl = 'http://127.0.0.1:43174';
const baselineDirectory = process.env.PHASE4C1_BASELINE_DIR ?? '.phase4c1-print-baseline';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['phase4c1-print-comparison.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: headUrl,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 43173 --strictPort',
      url: headUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 43174 --strictPort',
      cwd: baselineDirectory,
      url: baselineUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
