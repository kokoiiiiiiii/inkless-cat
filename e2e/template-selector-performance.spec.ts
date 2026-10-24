import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createEmptyResume } from '@entities/resume';
import type { WorkspaceData } from '@entities/workspace';
import {
  type Browser,
  type BrowserContextOptions,
  expect,
  type Page,
  test,
  type TestInfo,
} from '@playwright/test';

import { clickSecondaryTopbarAction } from './topbar-actions';
import { exportWorkspaceFromUI, uploadJsonThroughUI } from './workspace';

const EVIDENCE_DIR = process.env.TEMPLATE_SELECTOR_EVIDENCE_DIR;
const contextOptionKeys: (keyof BrowserContextOptions)[] = [
  'acceptDownloads',
  'baseURL',
  'bypassCSP',
  'clientCertificates',
  'colorScheme',
  'contrast',
  'deviceScaleFactor',
  'extraHTTPHeaders',
  'forcedColors',
  'geolocation',
  'hasTouch',
  'httpCredentials',
  'ignoreHTTPSErrors',
  'isMobile',
  'javaScriptEnabled',
  'locale',
  'offline',
  'permissions',
  'proxy',
  'reducedMotion',
  'screen',
  'serviceWorkers',
  'storageState',
  'timezoneId',
  'userAgent',
  'viewport',
];
const palette = [
  '#e0f2fe',
  '#fef3c7',
  '#fce7f3',
  '#dcfce7',
  '#ede9fe',
  '#ffedd5',
  '#cffafe',
  '#f1f5f9',
];

type PerformanceRun = {
  viewport: { width: number; height: number };
  panelOpenMs: number;
  panelOpenStages?: {
    clickMs: number;
    visiblePanelMs: number;
    thumbnailDomMs: number;
    paintFramesMs: number;
  };
  resumeUpdateMs?: number;
  themeUpdateMs?: number;
  selectionMs?: number;
  thumbnailCount: number;
  resumePreviewCount: number;
  thumbnailImageCount: number;
  documentWidth: number;
  viewportWidth: number;
  externalRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
};

const twoFrames = async (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

const openPanel = async (page: Page) => {
  const start = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: /^(展开模板|Expand Templates)$/u }).click();
  const clickDone = await page.evaluate(() => performance.now());
  await expect(
    page.getByRole('group', { name: /选择一个简历模板|Choose one resume template/u }),
  ).toBeVisible();
  const panelVisible = await page.evaluate(() => performance.now());
  await expect(page.locator('[data-testid="template-thumbnail"]')).toHaveCount(24);
  const thumbnailsRendered = await page.evaluate(() => performance.now());
  await twoFrames(page);
  const paintComplete = await page.evaluate(() => performance.now());
  return {
    totalMs: paintComplete - start,
    stages: {
      clickMs: clickDone - start,
      visiblePanelMs: panelVisible - clickDone,
      thumbnailDomMs: thumbnailsRendered - panelVisible,
      paintFramesMs: paintComplete - thumbnailsRendered,
    },
  };
};

const syntheticWorkspace = (workspace: WorkspaceData): WorkspaceData => {
  const resume = createEmptyResume();
  resume.personal = {
    ...resume.personal,
    fullName: 'Fictional Alex Morgan',
    title: 'Product Designer',
    email: 'alex.morgan@example.test',
    phone: '555-0100',
    location: 'Seattle, WA',
    summary: 'A fictional candidate used only for isolated template testing.',
  };
  resume.experience = [
    {
      id: 'performance-experience',
      company: 'Northstar Studio',
      role: 'Product Designer',
      location: 'Seattle, WA',
      startDate: '2022',
      endDate: 'Now',
      highlights: ['Built useful, consistent products.'],
    },
  ];
  resume.education = [
    {
      id: 'performance-education',
      school: 'City University',
      degree: 'Design',
      startDate: '2018',
      endDate: '2022',
      details: '',
    },
  ];
  resume.skills = [
    {
      id: 'performance-skills',
      title: 'Skills',
      items: ['Research', 'Systems', 'Prototyping'],
    },
  ];
  resume.settings = {
    ...resume.settings,
    personal: { showPhoto: false, photoSize: 120, photoPosition: 'right' },
  };

  const customTemplates = Array.from({ length: 20 }, (_, index) => {
    const accent = ['#2563eb', '#7c3aed', '#db2777', '#15803d'][index % 4]!;
    const background = palette[index % palette.length]!;
    return {
      id: `performance-template-${String(index + 1).padStart(2, '0')}`,
      name: `Synthetic Layout ${String(index + 1).padStart(2, '0')}`,
      description: 'Fixed synthetic template fixture for performance measurement.',
      accentColor: accent,
      previewStyle: 'custom',
      theme: {
        accent,
        background,
        heading: '#1e293b',
        subheading: '#334155',
        text: '#334155',
        muted: '#64748b',
        cardBackground: '#ffffff',
        cardBorder: '#cbd5e1',
        divider: '#e2e8f0',
      },
      sample: resume,
    };
  });

  return {
    ...workspace,
    resume,
    customTemplates,
    templateId: 'modern-blue',
  };
};

const prepareTwentyTemplates = async (page: Page) => {
  await page.goto('/');
  const workspace = await exportWorkspaceFromUI(page);
  const seeded = syntheticWorkspace(workspace);
  await uploadJsonThroughUI(
    page,
    'synthetic-template-performance.workspace.json',
    JSON.stringify(seeded),
  );
  await expect(page.getByRole('textbox', { name: /姓名|Full Name/u })).toHaveValue(
    'Fictional Alex Morgan',
  );
  const dismissButton = page.getByRole('button', { name: /关闭提示|Dismiss notification/u });
  while (await dismissButton.count()) await dismissButton.first().click();
};

const attachDiagnostics = (page: Page, run: PerformanceRun, baseOrigin: string) => {
  page.on('pageerror', (error) => run.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') run.consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== baseOrigin) run.externalRequests.push(request.url());
  });
};

const measureViewport = async (
  browser: Browser,
  projectUse: TestInfo['project']['use'],
  viewport: { width: number; height: number },
  screenshotName?: string,
  includeInteractions = false,
): Promise<PerformanceRun> => {
  const configuredUse = projectUse as Partial<BrowserContextOptions>;
  const contextOptions = Object.fromEntries(
    contextOptionKeys.flatMap((key) =>
      configuredUse[key] === undefined ? [] : [[key, configuredUse[key]]],
    ),
  ) as BrowserContextOptions;
  const baseURL = contextOptions.baseURL;
  if (!baseURL) throw new Error('Playwright project configuration must provide a baseURL.');
  const baseOrigin = new URL(baseURL).origin;
  const context = await browser.newContext({ ...contextOptions, baseURL, viewport });
  const page = await context.newPage();
  const run: PerformanceRun = {
    viewport,
    panelOpenMs: 0,
    thumbnailCount: 0,
    resumePreviewCount: 0,
    thumbnailImageCount: 0,
    documentWidth: 0,
    viewportWidth: viewport.width,
    externalRequests: [],
    consoleErrors: [],
    pageErrors: [],
  };
  attachDiagnostics(page, run, baseOrigin);

  try {
    await prepareTwentyTemplates(page);
    expect(new URL(page.url()).origin).toBe(baseOrigin);
    const opening = await openPanel(page);
    run.panelOpenMs = opening.totalMs;
    run.panelOpenStages = opening.stages;
    const counts = await page.evaluate(() => ({
      thumbnailCount: document.querySelectorAll('[data-testid="template-thumbnail"]').length,
      resumePreviewCount: document.querySelectorAll(
        '[data-testid="template-thumbnail"] .resume-preview',
      ).length,
      thumbnailImageCount: document.querySelectorAll('[data-testid="template-thumbnail"] img')
        .length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    Object.assign(run, counts);

    if (includeInteractions) {
      if (screenshotName && EVIDENCE_DIR) {
        await page.screenshot({ path: path.join(EVIDENCE_DIR, screenshotName) });
      }
      const resumeUpdateStart = await page.evaluate(() => performance.now());
      const nameField = page.getByRole('textbox', { name: '姓名' });
      await nameField.fill('Fictional Alex Morgan Updated');
      await expect(page.locator('.production-preview-pane .resume-preview')).toContainText(
        'Fictional Alex Morgan Updated',
      );
      await twoFrames(page);
      run.resumeUpdateMs = await page.evaluate(
        (start) => performance.now() - start,
        resumeUpdateStart,
      );

      const targetCard = page.locator('article[data-template-id="performance-template-01"]');
      const themeUpdateStart = await page.evaluate(() => performance.now());
      await targetCard.getByLabel('背景', { exact: true }).fill('#fae8ff');
      await expect(targetCard.getByLabel('背景', { exact: true })).toHaveValue('#fae8ff');
      await twoFrames(page);
      run.themeUpdateMs = await page.evaluate(
        (start) => performance.now() - start,
        themeUpdateStart,
      );

      const selectionStart = await page.evaluate(() => performance.now());
      const selected = page.getByRole('radio', { name: 'Synthetic Layout 20' });
      await selected.click();
      await expect(selected).toBeChecked();
      await twoFrames(page);
      run.selectionMs = await page.evaluate((start) => performance.now() - start, selectionStart);
      if (screenshotName && EVIDENCE_DIR) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, screenshotName.replace('.png', '-custom.png')),
        });
      }

      await clickSecondaryTopbarAction(page, '夜间模式');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reducedMotionTransition = await selected.evaluate(
        (radio) => getComputedStyle(radio.closest('article')!).transitionProperty,
      );
      expect(reducedMotionTransition).toBe('none');
      if (screenshotName && EVIDENCE_DIR) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, 'desktop-dark-reduced-motion.png'),
        });
      }
    } else if (screenshotName && EVIDENCE_DIR) {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, screenshotName) });
      await page
        .locator('article[data-template-id="performance-template-01"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, screenshotName.replace('.png', '-custom.png')),
      });
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await twoFrames(page);
    run.documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(run.documentWidth).toBeLessThanOrEqual(run.viewportWidth);
    expect(run.thumbnailCount).toBe(24);
    expect(run.resumePreviewCount).toBe(24);
    expect(run.thumbnailImageCount).toBe(0);
    expect(run.externalRequests).toEqual([]);
    expect(run.consoleErrors).toEqual([]);
    expect(run.pageErrors).toEqual([]);
    return run;
  } finally {
    await context.close();
  }
};

test('measures twenty custom thumbnails in isolated desktop, tablet, and mobile contexts', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  if (EVIDENCE_DIR) await mkdir(EVIDENCE_DIR, { recursive: true });
  const desktopRuns: PerformanceRun[] = [];
  const tabletRuns: PerformanceRun[] = [];
  const mobileRuns: PerformanceRun[] = [];
  for (let index = 0; index < 3; index += 1) {
    desktopRuns.push(
      await measureViewport(
        browser,
        testInfo.project.use,
        { width: 1440, height: 900 },
        index === 0 ? 'desktop-20-templates.png' : undefined,
        index === 0,
      ),
    );
    tabletRuns.push(
      await measureViewport(
        browser,
        testInfo.project.use,
        { width: 768, height: 1024 },
        index === 0 ? 'tablet-20-templates.png' : undefined,
      ),
    );
    mobileRuns.push(
      await measureViewport(
        browser,
        testInfo.project.use,
        { width: 390, height: 844 },
        index === 0 ? 'mobile-20-templates.png' : undefined,
      ),
    );
  }
  const openTimes = desktopRuns.map((run) => run.panelOpenMs).sort((a, b) => a - b);
  const tabletOpenTimes = tabletRuns.map((run) => run.panelOpenMs).sort((a, b) => a - b);
  const mobileOpenTimes = mobileRuns.map((run) => run.panelOpenMs).sort((a, b) => a - b);
  const report = {
    environment: {
      platform: process.platform,
      node: process.version,
      browser: browser.version(),
      baseURL: testInfo.project.use.baseURL,
      measurement:
        'Panel-open time is measured from click until visible panel plus two animation frames.',
      data: '4 built-in templates, 20 custom templates, and a fixed synthetic resume in isolated contexts.',
    },
    desktopPanelOpenMs: desktopRuns.map((run) => run.panelOpenMs),
    desktopPanelOpenRangeMs: [openTimes[0], openTimes.at(-1)],
    desktopMedianPanelOpenMs: openTimes[1],
    tabletPanelOpenMs: tabletRuns.map((run) => run.panelOpenMs),
    tabletPanelOpenRangeMs: [tabletOpenTimes[0], tabletOpenTimes.at(-1)],
    mobilePanelOpenMs: mobileRuns.map((run) => run.panelOpenMs),
    mobilePanelOpenRangeMs: [mobileOpenTimes[0], mobileOpenTimes.at(-1)],
    panelOpenStages: {
      desktop: desktopRuns.map((run) => run.panelOpenStages),
      tablet: tabletRuns.map((run) => run.panelOpenStages),
      mobile: mobileRuns.map((run) => run.panelOpenStages),
    },
    interactionMs: {
      resumeUpdate: desktopRuns[0]?.resumeUpdateMs,
      templateColorUpdate: desktopRuns[0]?.themeUpdateMs,
      templateSelection: desktopRuns[0]?.selectionMs,
    },
    counts: {
      thumbnails: desktopRuns[0]?.thumbnailCount,
      resumePreviews: desktopRuns[0]?.resumePreviewCount,
      thumbnailImages: desktopRuns[0]?.thumbnailImageCount,
    },
    viewportWidth: {
      desktop: desktopRuns[0]?.documentWidth,
      tablet: tabletRuns[0]?.documentWidth,
      mobile: mobileRuns[0]?.documentWidth,
    },
    runs: [...desktopRuns, ...tabletRuns, ...mobileRuns],
  };
  console.log(`TEMPLATE_SELECTOR_PERFORMANCE ${JSON.stringify(report)}`);

  if (EVIDENCE_DIR) {
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await writeFile(
      path.join(EVIDENCE_DIR, 'performance-results.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }
});
