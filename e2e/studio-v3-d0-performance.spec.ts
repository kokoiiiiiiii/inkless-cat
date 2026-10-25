import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const evidenceDirectory = path.resolve('docs/design/v3-d0/evidence');
mkdirSync(evidenceDirectory, { recursive: true });

test('records representative view-switch and animation performance', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'The repeatable performance probe targets Chromium on the local review host.',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design/v3-d0?direction=a');
  await expect(page.locator('[data-studio-v3]')).toBeVisible();

  await page.evaluate(() => {
    const studioWindow = globalThis as unknown as Window;
    studioWindow.__studioV3LongTasks = [];
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      studioWindow.__studioV3LongTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          studioWindow.__studioV3LongTasks?.push({
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      // The route has already loaded. Do not include buffered navigation or hydration tasks in
      // the view-switch window; those happened before this interaction measurement begins.
      studioWindow.__studioV3LongTaskObserver.observe({ type: 'longtask' });
    }
  });

  const labels = ['模块', '模板', '写作', '预览'];
  const samples: Array<{ label: string; firstFrameMs: number; frameDeltasMs: number[] }> = [];
  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (const label of labels) {
      const sample = await page.evaluate((nextLabel) => {
        const navigation = document.querySelector('[class*="modeNavigation"]');
        const target = [...(navigation?.querySelectorAll('button') ?? [])].find(
          (button) => button.textContent?.trim() === nextLabel,
        );
        if (!(target instanceof HTMLButtonElement))
          throw new Error(`Missing view button: ${nextLabel}`);

        const startedAt = performance.now();
        const frameDeltasMs: number[] = [];
        let previousFrame = startedAt;
        let firstFrameMs = 0;
        let isFirstFrame = true;
        target.click();
        return new Promise<{ firstFrameMs: number; frameDeltasMs: number[] }>((resolve) => {
          const captureFrame = (timestamp: number) => {
            if (isFirstFrame) {
              firstFrameMs = Math.max(0, performance.now() - startedAt);
              isFirstFrame = false;
            }
            frameDeltasMs.push(timestamp - previousFrame);
            previousFrame = timestamp;
            if (timestamp - startedAt >= 220) {
              resolve({ firstFrameMs, frameDeltasMs });
            } else {
              requestAnimationFrame(captureFrame);
            }
          };
          requestAnimationFrame(captureFrame);
        });
      }, label);
      samples.push({ label, ...sample });
      await page.waitForTimeout(40);
    }
  }

  const longTasks = await page.evaluate(() => {
    const studioWindow = globalThis as unknown as Window;
    studioWindow.__studioV3LongTaskObserver?.disconnect();
    return studioWindow.__studioV3LongTasks ?? [];
  });
  const transitionFrames = samples.flatMap((sample) => sample.frameDeltasMs.slice(1));
  const sortedFrameDeltas = [...transitionFrames].sort((left, right) => left - right);
  const firstFrameLatencies = samples
    .map((sample) => sample.firstFrameMs)
    .sort((left, right) => left - right);
  const percentile = (sorted: number[], value: number) =>
    sorted[Math.ceil(sorted.length * value) - 1] ?? 0;
  const metrics = {
    browser: 'Playwright Chromium',
    browserVersion: await page.evaluate(() => navigator.userAgent),
    viewport: { width: 1440, height: 900 },
    measurement:
      'DOM click to next animation-frame; 220ms frame window per mode change; synthetic click, local fixture only',
    viewSwitchSamples: samples.length,
    firstFrameMs: {
      median: percentile(firstFrameLatencies, 0.5),
      p95: percentile(firstFrameLatencies, 0.95),
    },
    animationFrameDeltasMs: {
      frames: transitionFrames.length,
      median: percentile(sortedFrameDeltas, 0.5),
      p95: percentile(sortedFrameDeltas, 0.95),
      max: sortedFrameDeltas.at(-1) ?? 0,
      over50ms: transitionFrames.filter((delta) => delta > 50).length,
    },
    longTasksOver50ms: longTasks.filter((task) => task.duration >= 50),
  };

  writeFileSync(
    path.join(evidenceDirectory, 'performance.json'),
    `${JSON.stringify(metrics, null, 2)}\n`,
  );
  expect(metrics.firstFrameMs.median).toBeLessThan(250);
  expect(metrics.firstFrameMs.p95).toBeLessThan(400);
  expect(metrics.longTasksOver50ms).toEqual([]);
});

declare global {
  interface Window {
    __studioV3LongTaskObserver?: PerformanceObserver;
    __studioV3LongTasks?: Array<{ duration: number; startTime: number }>;
  }
}
