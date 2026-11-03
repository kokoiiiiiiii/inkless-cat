import { defineConfig, devices } from '@playwright/test';

const port = 5176;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/m01-visual-regression.spec.ts',
  outputDir: 'D2_REVIEW/evidence/chromium/playwright-output-final',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'D2_REVIEW/evidence/chromium/m01-visual-playwright-results.json' }],
  ],
  use: {
    ...devices['Pixel 7'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    baseURL,
    colorScheme: 'light',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { VITE_ENABLE_M01_PROFILE_SLICE: 'true' },
  },
});
