import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { type ActiveSectionKey, createEmptyResume, type ResumeData } from '@entities/resume';
import { type ResumeTemplate, templates } from '@entities/template';
import {
  createDefaultWorkspace,
  migrateWorkspace,
  RESUME_STORE_PERSIST_VERSION,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { expect, test } from '@playwright/test';
import { LOCALE_KEY } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

const pcStudioEnabled = process.env.VITE_ENABLE_PC_STUDIO === 'true';
const screenshotDirectory = path.resolve('artifacts/pc-d4-d1/screenshots');
const d2S1ScreenshotDirectory = path.resolve('artifacts/pc-d4-d2/d2-s1/screenshots');
const d2S1MatrixDirectory = path.resolve('artifacts/pc-d4-d2/d2-s1/visual-matrix');
const customTemplateId = 'pc-d4-d1-fictional-custom-template';
const currentTemplateId = templates[0]?.id ?? 'modern-blue';
const fictionalCustomTemplate: ResumeTemplate = {
  id: customTemplateId,
  name: 'Fictional Product Designer Portfolio',
  description:
    'D1 fictional fixture search phrase. A compact layout for a product designer with a clear visual hierarchy and focused sections.',
  accentColor: '#2563eb',
  previewStyle: 'modern',
  sample: createEmptyResume(),
};

const installFixture = async (
  page: import('@playwright/test').Page,
  options: {
    templateId?: string;
    customTemplates?: ResumeTemplate[];
    resume?: ResumeData;
    activeSections?: ActiveSectionKey[];
    locale?: 'en' | 'zh-CN';
  } = {},
) => {
  const defaults = createDefaultWorkspace();
  const emptyResume = createEmptyResume();
  const normalized = migrateWorkspace({
    ...defaults,
    resume: options.resume ?? emptyResume,
    activeSections: options.activeSections ?? [],
    customTemplates: options.customTemplates ?? [fictionalCustomTemplate],
  });
  if (!normalized.ok) throw new Error(normalized.error.message);

  await page.addInitScript(
    ({ resumeKey, uiKey, localeKey, locale, resumeState, uiState }) => {
      const fixtureSeedKey = '__pcD4FixtureSeeded';
      if (sessionStorage.getItem(fixtureSeedKey) !== 'true') {
        localStorage.setItem(resumeKey, JSON.stringify(resumeState));
        localStorage.setItem(uiKey, JSON.stringify(uiState));
        localStorage.setItem(localeKey, locale);
        sessionStorage.setItem(fixtureSeedKey, 'true');
      }

      const storage = globalThis.localStorage;
      const writes: string[] = [];
      const operations: Array<{ method: 'setItem' | 'removeItem' | 'clear'; key: string | null }> =
        [];
      const originalSetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')
        ?.value as Storage['setItem'] | undefined;
      const originalRemoveItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'removeItem')
        ?.value as Storage['removeItem'] | undefined;
      const originalClear = Object.getOwnPropertyDescriptor(Storage.prototype, 'clear')?.value as
        | Storage['clear']
        | undefined;
      if (!originalSetItem || !originalRemoveItem || !originalClear) {
        throw new Error('Storage write methods are unavailable.');
      }
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (this === storage) {
          writes.push(key);
          operations.push({ method: 'setItem', key });
        }
        originalSetItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function (this: Storage, key: string) {
        if (this === storage) operations.push({ method: 'removeItem', key });
        originalRemoveItem.call(this, key);
      };
      Storage.prototype.clear = function (this: Storage) {
        if (this === storage) operations.push({ method: 'clear', key: null });
        originalClear.call(this);
      };
      Object.defineProperty(globalThis, '__pcD4StorageWrites', {
        configurable: true,
        value: writes,
      });
      Object.defineProperty(globalThis, '__pcD4StorageOperations', {
        configurable: true,
        value: operations,
      });
    },
    {
      resumeKey: RESUME_STORE_PERSIST_KEY,
      uiKey: UI_STORE_PERSIST_KEY,
      localeKey: LOCALE_KEY,
      locale: options.locale ?? 'en',
      resumeState: {
        state: {
          resume: normalized.value.resume,
          activeSections: normalized.value.activeSections,
        },
        version: RESUME_STORE_PERSIST_VERSION,
      },
      uiState: {
        state: {
          theme: 'light',
          templateId: options.templateId ?? currentTemplateId,
          customTemplates: normalized.value.customTemplates,
        },
        version: UI_STORE_PERSIST_VERSION,
      },
    },
  );
};

const readPersistedWorkspace = (page: import('@playwright/test').Page) =>
  page.evaluate(
    ({ resumeKey, uiKey }) => ({
      resume: JSON.parse(localStorage.getItem(resumeKey) ?? 'null') as {
        state: { resume: unknown; activeSections: unknown };
      } | null,
      ui: JSON.parse(localStorage.getItem(uiKey) ?? 'null') as {
        state: { templateId: string; customTemplates: unknown };
      } | null,
    }),
    { resumeKey: RESUME_STORE_PERSIST_KEY, uiKey: UI_STORE_PERSIST_KEY },
  );

const clearStorageWriteLog = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const monitor = globalThis as typeof globalThis & {
      __pcD4StorageWrites?: string[];
      __pcD4StorageOperations?: Array<{
        method: 'setItem' | 'removeItem' | 'clear';
        key: string | null;
      }>;
    };
    if (monitor.__pcD4StorageWrites) monitor.__pcD4StorageWrites.length = 0;
    if (monitor.__pcD4StorageOperations) monitor.__pcD4StorageOperations.length = 0;
  });

const readStorageWriteLog = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __pcD4StorageWrites?: string[] }).__pcD4StorageWrites ??
      [],
  );

const readStorageOperationLog = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __pcD4StorageOperations?: Array<{
            method: 'setItem' | 'removeItem' | 'clear';
            key: string | null;
          }>;
        }
      ).__pcD4StorageOperations ?? [],
  );

const readLocalStorageSnapshot = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );

const readRuntimeStoreSnapshot = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const resumeStoreUrl = '/src/entities/resume/model/resume.store.tsx';
    const uiStoreUrl = '/src/entities/ui/model/ui.store.tsx';
    const [{ useResumeStore }, { useUIStore }] = await Promise.all([
      import(resumeStoreUrl),
      import(uiStoreUrl),
    ]);
    const resume = useResumeStore.getState();
    const ui = useUIStore.getState();
    return JSON.parse(
      JSON.stringify({
        resume: {
          resume: resume.resume,
          activeSections: resume.activeSections,
          hasResumeChanges: resume.hasResumeChanges,
          workspaceGeneration: resume.workspaceGeneration,
          workspaceRevision: resume.workspaceRevision,
          personalSummaryRevision: resume.personalSummaryRevision,
        },
        ui: {
          theme: ui.theme,
          templateId: ui.templateId,
          customTemplates: ui.customTemplates,
        },
      }),
    );
  });

const exportCanonicalWorkspace = async (page: import('@playwright/test').Page) => {
  await page.locator('.pc-export-menu summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Export Workspace' }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide a workspace download.');
  const migrated = migrateWorkspace(JSON.parse(await readFile(path, 'utf8')) as unknown);
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

const openStudio = async (page: import('@playwright/test').Page) => {
  await page.goto('/pc-studio');
  await expect(page.getByTestId('pc-studio')).toBeVisible();
  await expect(page.getByTestId('pc-save-status')).toHaveAttribute(
    'data-save-state',
    /^(ready|saved)$/u,
  );
};

const measureHeaderGeometry = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.pc-studio-header');
    if (!header) throw new Error('PC Studio header is missing.');

    const rect = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      };
    };
    const isVisible = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    };
    const describe = (element: HTMLElement) => ({
      label:
        element.getAttribute('aria-label') ||
        element.innerText.trim().replace(/\s+/gu, ' ') ||
        element.tagName.toLowerCase(),
      className: element.className,
      rect: rect(element),
    });

    const selectors = {
      brand: '.pc-brand-lockup',
      context: '.pc-resume-context',
      save: '.pc-save-status',
      actions: '.pc-header-actions',
    } as const;
    const segments = Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => {
        const element = header.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`PC Studio header segment is missing: ${name}`);
        return [name, element];
      }),
    ) as Record<keyof typeof selectors, HTMLElement>;
    const visibleSegments = Object.entries(segments).filter(([, element]) => isVisible(element));
    const controls = [
      ...segments.actions.querySelectorAll<HTMLElement>(
        ':scope > button, :scope > .pc-history-controls > button, :scope > .pc-export-menu > details > summary',
      ),
    ].filter((element) => isVisible(element));
    const overlaps: string[] = [];
    const overlapDetails: Array<{
      pair: string;
      overlapWidth: number;
      overlapHeight: number;
      first: ReturnType<typeof describe>;
      second: ReturnType<typeof describe>;
    }> = [];
    const recordOverlap = (
      firstName: string,
      firstElement: HTMLElement,
      secondName: string,
      secondElement: HTMLElement,
    ) => {
      const first = rect(firstElement);
      const second = rect(secondElement);
      const overlapWidth = Math.min(first.right, second.right) - Math.max(first.left, second.left);
      const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
      if (overlapWidth <= 0.5 || overlapHeight <= 0.5) return;

      const pair = `${firstName}:${secondName}`;
      overlaps.push(pair);
      overlapDetails.push({
        pair,
        overlapWidth: Math.round(overlapWidth * 100) / 100,
        overlapHeight: Math.round(overlapHeight * 100) / 100,
        first: describe(firstElement),
        second: describe(secondElement),
      });
    };

    for (let first = 0; first < visibleSegments.length; first += 1) {
      for (let second = first + 1; second < visibleSegments.length; second += 1) {
        const [firstName, firstElement] = visibleSegments[first]!;
        const [secondName, secondElement] = visibleSegments[second]!;
        recordOverlap(firstName, firstElement, secondName, secondElement);
      }
    }

    const nonActionSegments = visibleSegments.filter(([name]) => name !== 'actions');
    for (const [segmentName, segment] of nonActionSegments) {
      for (const [index, control] of controls.entries()) {
        recordOverlap(segmentName, segment, `control-${index}`, control);
      }
    }
    for (let first = 0; first < controls.length; first += 1) {
      for (let second = first + 1; second < controls.length; second += 1) {
        recordOverlap(`control-${first}`, controls[first]!, `control-${second}`, controls[second]!);
      }
    }

    const headerBounds = rect(header);
    const actionBounds = rect(segments.actions);
    const outsideHeader: number[] = [];
    const outsideActions: number[] = [];
    const unhitTargets: number[] = [];
    const controlDiagnostics: Array<{
      index: number;
      label: string;
      className: string;
      rect: ReturnType<typeof rect>;
      hitTarget: string | null;
    }> = [];
    for (const [index, control] of controls.entries()) {
      const bounds = rect(control);
      if (
        bounds.left < headerBounds.left - 0.5 ||
        bounds.right > headerBounds.right + 0.5 ||
        bounds.top < headerBounds.top - 0.5 ||
        bounds.bottom > headerBounds.bottom + 0.5
      ) {
        outsideHeader.push(index);
      }
      if (bounds.left < actionBounds.left - 0.5 || bounds.right > actionBounds.right + 0.5) {
        outsideActions.push(index);
      }
      const hitTarget = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
      controlDiagnostics.push({
        index,
        ...describe(control),
        hitTarget: hitTarget instanceof HTMLElement ? describe(hitTarget).label : null,
      });
      if (!hitTarget || (hitTarget !== control && !control.contains(hitTarget))) {
        unhitTargets.push(index);
      }
    }

    const saveStatus = segments.save;
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      segmentRects: Object.fromEntries(
        Object.entries(segments).map(([name, element]) => [name, rect(element)]),
      ),
      controlRects: controlDiagnostics,
      overlaps,
      overlapDetails,
      outsideHeader,
      outsideActions,
      unhitTargets,
      saveState: saveStatus.dataset.saveState,
      saveLive: saveStatus.getAttribute('aria-live'),
      saveText: saveStatus.textContent?.trim(),
    };
  });

const captureScreenshot = async (
  page: import('@playwright/test').Page,
  label: string,
  viewport: { width: number; height: number },
) => {
  const dismissFeedback = page.locator(
    'button[aria-label="Dismiss notification"], button[aria-label="关闭提示"]',
  );
  if ((await dismissFeedback.count()) > 0) await dismissFeedback.first().click();
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, `${label}-${viewport.width}x${viewport.height}.png`),
    fullPage: false,
  });
};

const captureD2S1Screenshot = async (options: {
  page: import('@playwright/test').Page;
  browser: import('@playwright/test').Browser;
  label: string;
  viewport: { width: number; height: number };
  fixture: string;
  locale: 'en' | 'zh-CN';
  scrollContainer: string;
}) => {
  const { page, browser, label, viewport, fixture, locale, scrollContainer } = options;
  await mkdir(d2S1ScreenshotDirectory, { recursive: true });
  const screenshotPath = path.join(
    d2S1ScreenshotDirectory,
    `${label}-${viewport.width}x${viewport.height}.png`,
  );
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
  });
  const screenshot = await readFile(screenshotPath);
  const [viewportMetrics, scrollMetrics] = await Promise.all([
    page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    })),
    page.locator(scrollContainer).evaluate((element) => ({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    })),
  ]);
  const metadata = {
    testedGitSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    testedTreeSha: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
    dirtyStatus: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
    nodeVersion: process.version,
    browserName: browser.browserType().name(),
    browserVersion: browser.version(),
    viewport: viewportMetrics,
    fixture,
    locale,
    scrollContainer,
    scrollPosition: { top: scrollMetrics.scrollTop, left: scrollMetrics.scrollLeft },
    scrollMetrics,
    screenshotPath: path.relative(process.cwd(), screenshotPath),
    screenshotSha256: createHash('sha256').update(screenshot).digest('hex'),
  };
  await writeFile(
    path.join(d2S1ScreenshotDirectory, `${label}-${viewport.width}x${viewport.height}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
};

const createD2S1MatrixResume = (fixture: 'standard' | 'long'): ResumeData => {
  const isLong = fixture === 'long';
  const resume = createEmptyResume();
  resume.personal.fullName =
    fixture === 'standard' ? 'D2 Standard Synthetic Candidate' : 'D2 Long Synthetic Candidate';
  resume.personal.title = 'Product Designer / 产品设计师';
  resume.personal.email = 'd2-synthetic@example.invalid';
  resume.personal.phone = '+1 555 0100';
  resume.personal.location = 'Shanghai / 上海';
  resume.personal.summary = isLong
    ? 'Fictional long-form profile with bilingual content. Led accessible design systems, cross-platform product research, and measurable workflow improvements across distributed teams. This paragraph intentionally includes mixed English and 中文内容 to exercise line wrapping, punctuation, and text boundaries in the live resume preview. '.repeat(
        2,
      )
    : 'Fictional product designer focused on accessible systems, practical research, and bilingual experiences. 中英文混排内容用于验证文本换行与预览边界。';
  resume.experience = Array.from({ length: isLong ? 10 : 4 }, (_, index) => ({
    id: `${fixture}-experience-${index + 1}`,
    company: `Synthetic Studio ${index + 1}`,
    role: index % 2 === 0 ? 'Senior Product Designer' : 'Product Design Lead',
    location: index % 2 === 0 ? 'Shanghai / 上海' : 'Remote · North America',
    startDate: `${2015 + index}-01`,
    endDate: index === 0 ? 'Present' : `${2018 + index}-12`,
    highlights: Array.from(
      { length: isLong ? 4 : 3 },
      (_, highlightIndex) =>
        `Fictional achievement ${index + 1}.${highlightIndex + 1}: improved a measurable product workflow, documented accessibility decisions, and shipped localized interface patterns for multiple teams. 包含中英文混排。`,
    ),
  }));
  resume.education = Array.from({ length: isLong ? 4 : 2 }, (_, index) => ({
    id: `${fixture}-education-${index + 1}`,
    school: `Synthetic University ${index + 1}`,
    degree: index % 2 === 0 ? 'M.Des. Interaction Design' : 'B.A. Visual Communication',
    startDate: `${2008 + index}-09`,
    endDate: `${2012 + index}-06`,
    details:
      'Fictional coursework in research, typography, inclusive systems, and prototyping. 课程项目均为虚构。',
  }));
  resume.projects = Array.from({ length: isLong ? 5 : 2 }, (_, index) => ({
    id: `${fixture}-project-${index + 1}`,
    name: `Synthetic Project ${index + 1}`,
    role: 'Design systems and research',
    summary:
      'Fictional project summary with enough text to exercise line wrapping in a real resume preview. 项目说明使用虚构数据。',
    link: `https://example.invalid/project-${index + 1}`,
    highlights: [
      'Mapped user needs to accessible interaction patterns and verified the handoff with fictional teams.',
      'Recorded bilingual decisions and implementation notes for the synthetic case study.',
    ],
  }));
  resume.skills = Array.from({ length: isLong ? 6 : 3 }, (_, index) => ({
    id: `${fixture}-skill-${index + 1}`,
    title: `Practice ${index + 1}`,
    items: ['Research synthesis', 'Accessible UI systems', '中文内容设计', 'Prototyping'],
  }));
  resume.languages = [
    { id: `${fixture}-language-en`, name: 'English', level: 'Fluent' },
    { id: `${fixture}-language-zh`, name: '中文', level: 'Native' },
  ];
  resume.awards = Array.from({ length: isLong ? 3 : 1 }, (_, index) => ({
    id: `${fixture}-award-${index + 1}`,
    name: `Synthetic Design Award ${index + 1}`,
    issuer: 'Fictional Design Association',
    year: `${2020 + index}`,
  }));
  return resume;
};

const captureD2S1MatrixState = async (options: {
  page: import('@playwright/test').Page;
  browser: import('@playwright/test').Browser;
  fixture: 'standard' | 'long';
  viewportName: 'desktop' | 'mobile';
  viewport: { width: number; height: number };
  scrollStage: 'top' | 'middle' | 'bottom';
}) => {
  const { page, browser, fixture, viewportName, viewport, scrollStage } = options;
  const center = page.locator('.pc-template-center');
  const initialMetrics = await center.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  const maxScroll = initialMetrics.scrollHeight - initialMetrics.clientHeight;
  expect(
    maxScroll,
    `${fixture}/${viewportName} must have a real internal scroll range for top/middle/bottom evidence`,
  ).toBeGreaterThan(200);
  const targetScrollTop =
    scrollStage === 'top' ? 0 : scrollStage === 'middle' ? Math.round(maxScroll / 2) : maxScroll;
  await center.evaluate((element, scrollTop) => {
    element.scrollTop = scrollTop;
  }, targetScrollTop);
  await expect.poll(() => center.evaluate((element) => element.scrollTop)).toBe(targetScrollTop);
  const scrollMetrics = await center.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
  }));
  const actualMaxScroll = scrollMetrics.scrollHeight - scrollMetrics.clientHeight;
  expect(scrollMetrics.scrollWidth - scrollMetrics.clientWidth).toBeLessThanOrEqual(0);
  expect(scrollMetrics.documentScrollWidth - scrollMetrics.documentClientWidth).toBeLessThanOrEqual(
    0,
  );
  if (scrollStage === 'middle') {
    expect(scrollMetrics.scrollTop).toBeGreaterThan(0);
    expect(scrollMetrics.scrollTop).toBeLessThan(actualMaxScroll);
  } else if (scrollStage === 'bottom') {
    expect(scrollMetrics.scrollTop).toBeGreaterThanOrEqual(actualMaxScroll - 1);
  } else {
    expect(scrollMetrics.scrollTop).toBe(0);
  }

  await mkdir(d2S1MatrixDirectory, { recursive: true });
  const fileBase = `${fixture}-${viewportName}-${scrollStage}-${viewport.width}x${viewport.height}`;
  const screenshotPath = path.join(d2S1MatrixDirectory, `${fileBase}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const screenshot = await readFile(screenshotPath);
  const viewportMetrics = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }));
  const metadata = {
    testedGitSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    testedTreeSha: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
    dirtyStatus: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
    nodeVersion: process.version,
    browserName: browser.browserType().name(),
    browserVersion: browser.version(),
    viewport: viewportMetrics,
    fixture,
    locale: 'en',
    scrollContainer: '.pc-template-center',
    scrollStage,
    scrollMetrics,
    screenshotPath: path.relative(process.cwd(), screenshotPath),
    screenshotSha256: createHash('sha256').update(screenshot).digest('hex'),
  };
  await writeFile(
    path.join(d2S1MatrixDirectory, `${fileBase}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
};

if (pcStudioEnabled) {
  test('desktop header geometry stays disjoint and controls remain reachable in both locales', async ({
    page,
  }) => {
    const viewports = [
      { width: 1024, height: 768 },
      { width: 1199, height: 800 },
      { width: 1200, height: 800 },
      { width: 1280, height: 800 },
      { width: 1366, height: 768 },
      { width: 1399, height: 800 },
      { width: 1400, height: 800 },
      { width: 1401, height: 800 },
      { width: 1440, height: 900 },
      { width: 1479, height: 900 },
      { width: 1480, height: 900 },
      { width: 1920, height: 1080 },
    ];

    for (const locale of ['en', 'zh-CN'] as const) {
      const localePage = await page.context().newPage();
      try {
        await installFixture(localePage, { locale });
        await localePage.setViewportSize(viewports[0]!);
        await openStudio(localePage);

        for (const viewport of viewports) {
          await localePage.setViewportSize(viewport);
          const geometry = await measureHeaderGeometry(localePage);
          const label = `${locale} at ${viewport.width}x${viewport.height}`;

          expect(geometry.viewport, `${label} viewport`).toMatchObject(viewport);
          expect(geometry.viewport.devicePixelRatio, `${label} device pixel ratio`).toBeGreaterThan(
            0,
          );
          expect(geometry.documentOverflow, `${label} document overflow`).toBeLessThanOrEqual(0);
          expect(
            geometry.overlaps,
            `${label} overlapping header targets; geometry=${JSON.stringify({
              segmentRects: geometry.segmentRects,
              controlRects: geometry.controlRects,
              overlapDetails: geometry.overlapDetails,
            })}`,
          ).toEqual([]);
          expect(geometry.outsideHeader, `${label} controls outside the header`).toEqual([]);
          expect(geometry.outsideActions, `${label} controls outside the action region`).toEqual(
            [],
          );
          expect(geometry.unhitTargets, `${label} controls with covered hit targets`).toEqual([]);
          expect(geometry.saveState, `${label} save state`).toBe('saved');
          expect(geometry.saveLive, `${label} save announcement`).toBe('polite');
          expect(geometry.saveText, `${label} save status text`).toBe(
            locale === 'en' ? 'Saved on this device' : '已保存到此设备',
          );
        }

        const actionNames =
          locale === 'en'
            ? ['Template Center', 'AI Assistant', 'Preview', 'Back to editor']
            : ['模板中心', 'AI 助手', '预览', '返回编辑器'];
        for (const name of actionNames) {
          await expect(localePage.getByRole('button', { name, exact: true })).toBeVisible();
        }

        const templateButton = localePage.getByRole('button', {
          name: actionNames[0]!,
          exact: true,
        });
        const aiButton = localePage.getByRole('button', { name: actionNames[1]!, exact: true });
        const previewButton = localePage.getByRole('button', {
          name: actionNames[2]!,
          exact: true,
        });
        const exportButton = localePage.locator('.pc-export-menu summary');
        const themeButton = localePage.locator('.pc-theme-toggle');
        const exitButton = localePage.getByRole('button', { name: actionNames[3]!, exact: true });
        const keyboardOrder = [
          templateButton,
          aiButton,
          previewButton,
          exportButton,
          themeButton,
          exitButton,
        ];

        await templateButton.focus();
        for (const [index, control] of keyboardOrder.entries()) {
          if (index > 0) await localePage.keyboard.press('Tab');
          await expect(control, `${locale} header Tab order item ${index + 1}`).toBeFocused();
        }
      } finally {
        await localePage.close();
      }
    }
  });

  test('mobile header, Export, and return path remain reachable in both locales @d2-s1', async ({
    page,
    browser,
  }) => {
    for (const locale of ['en', 'zh-CN'] as const) {
      const mobilePage = await page.context().newPage();
      try {
        await installFixture(mobilePage, { locale });
        await mobilePage.setViewportSize({ width: 390, height: 844 });
        await openStudio(mobilePage);
        await captureD2S1Screenshot({
          page: mobilePage,
          browser,
          label: `mobile-header-${locale}`,
          viewport: { width: 390, height: 844 },
          fixture: 'fictional-header',
          locale,
          scrollContainer: '.pc-header-actions',
        });

        const headerMetrics = await mobilePage.evaluate(() => {
          const header = document.querySelector<HTMLElement>('.pc-studio-header');
          const actions = document.querySelector<HTMLElement>('.pc-header-actions');
          if (!header || !actions) throw new Error('PC Studio mobile header is missing.');
          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
            actionsOverflow: getComputedStyle(actions).overflowX,
            actionsScrollWidth: actions.scrollWidth,
            actionsClientWidth: actions.clientWidth,
            headerBounds: header.getBoundingClientRect().toJSON(),
          };
        });
        expect(headerMetrics.viewport).toEqual({ width: 390, height: 844 });
        expect(headerMetrics.documentOverflow).toBeLessThanOrEqual(0);
        expect(headerMetrics.actionsOverflow).toMatch(/^(auto|scroll)$/u);

        const exportSummary = mobilePage.locator('.pc-export-menu summary');
        await exportSummary.scrollIntoViewIfNeeded();
        const exportBounds = await exportSummary.boundingBox();
        const actionsBounds = await mobilePage.locator('.pc-header-actions').boundingBox();
        expect(exportBounds).not.toBeNull();
        expect(actionsBounds).not.toBeNull();
        expect(exportBounds!.x).toBeGreaterThanOrEqual(actionsBounds!.x - 1);
        expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(
          actionsBounds!.x + actionsBounds!.width + 1,
        );
        expect(exportBounds!.x).toBeGreaterThanOrEqual(0);
        expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(390);
        await exportSummary.focus();
        await expect(exportSummary).toBeFocused();
        await mobilePage.keyboard.press('Enter');
        const exportOptions = mobilePage.locator('.pc-export-options');
        await expect(exportOptions).toBeVisible();
        await expect(exportOptions.getByRole('menuitem')).toHaveCount(3);
        await mobilePage.keyboard.press('Escape');
        if (await exportOptions.isVisible()) await exportSummary.click();

        const templateCenterName = locale === 'en' ? 'Template Center' : '模板中心';
        await mobilePage.getByRole('button', { name: templateCenterName, exact: true }).click();
        const backName = locale === 'en' ? 'Back to Workspace' : '返回工作区';
        const backButton = mobilePage.getByRole('button', { name: backName, exact: true });
        await expect(backButton).toBeVisible();
        const backBounds = await backButton.boundingBox();
        expect(backBounds).not.toBeNull();
        expect(backBounds!.x).toBeGreaterThanOrEqual(0);
        expect(backBounds!.x + backBounds!.width).toBeLessThanOrEqual(390);
        await backButton.click();
        await expect(mobilePage.getByTestId('pc-studio')).toBeVisible();
      } finally {
        await mobilePage.close();
      }
    }
  });

  test('Gallery browsing preserves persisted resume, sections, templateId and custom templates', async ({
    page,
  }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page);

    const before = await readPersistedWorkspace(page);
    const canonicalBefore = await exportCanonicalWorkspace(page);
    const fixtureDirectory = path.resolve('artifacts/pc-d4-d1/fixtures');
    await mkdir(fixtureDirectory, { recursive: true });
    await writeFile(
      path.join(fixtureDirectory, 'fictional-review-workspace.json'),
      `${JSON.stringify(canonicalBefore, null, 2)}\n`,
    );

    const monitorProbeKey = '__pcD4StorageMonitorProbe';
    await page.evaluate((key) => localStorage.setItem(key, 'monitor-probe'), monitorProbeKey);
    expect(await readStorageWriteLog(page)).toContain(monitorProbeKey);
    await page.evaluate((key) => localStorage.removeItem(key), monitorProbeKey);
    await clearStorageWriteLog(page);
    expect(await readStorageWriteLog(page)).toEqual([]);

    const headerTemplateButton = page.getByRole('button', { name: 'Template Center' });
    await headerTemplateButton.focus();
    await page.keyboard.press('Enter');
    const center = page.getByTestId('pc-template-center');
    await expect(center).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeFocused();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toContainText(
      'Current',
    );
    await expect(center.locator(`[data-template-id="${customTemplateId}"]`)).toBeVisible();

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(center).toBeVisible();
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth - window.innerWidth,
        studio:
          (document.querySelector('.pc-studio') as HTMLElement).scrollWidth -
          (document.querySelector('.pc-studio') as HTMLElement).clientWidth,
        gallery:
          (document.querySelector('[data-testid="pc-template-center"]') as HTMLElement)
            .scrollWidth -
          (document.querySelector('[data-testid="pc-template-center"]') as HTMLElement).clientWidth,
      }));
      expect(
        overflow.document,
        `document overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      expect(
        overflow.studio,
        `Studio overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      expect(
        overflow.gallery,
        `Gallery overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      await captureScreenshot(page, 'gallery', viewport);
    }

    const search = page.getByTestId('pc-template-search');
    await search.fill('D1 fictional fixture search phrase');
    await expect(center.locator(`[data-template-id="${customTemplateId}"]`)).toBeVisible();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toHaveCount(0);
    await search.fill('no-matching-template-result');
    await expect(center.getByRole('status')).toContainText(/no templates|no results/i);
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(search).toHaveValue('');

    await page.getByRole('button', { name: /^Custom$/i }).click();
    const customCard = center.locator(`[data-template-id="${customTemplateId}"]`);
    await customCard.getByRole('button', { name: /view details/i }).click();
    await expect(center.getByRole('heading', { name: fictionalCustomTemplate.name })).toBeVisible();
    await expect(center).toContainText('D1 fictional fixture search phrase');
    await expect(center).toContainText(/illustrative thumbnail/i);
    const detailThumbnailViewport = center.locator('.pc-template-detail__thumbnail');
    const detailThumbnailLabel = center.locator('[data-testid="template-thumbnail"] > span').last();
    const [thumbnailViewportBox, thumbnailLabelBox] = await Promise.all([
      detailThumbnailViewport.boundingBox(),
      detailThumbnailLabel.boundingBox(),
    ]);
    expect(thumbnailViewportBox).not.toBeNull();
    expect(thumbnailLabelBox).not.toBeNull();
    expect(thumbnailLabelBox!.y + thumbnailLabelBox!.height).toBeLessThanOrEqual(
      thumbnailViewportBox!.y + thumbnailViewportBox!.height + 1,
    );
    await captureScreenshot(page, 'details', { width: 1024, height: 768 });
    await center.getByRole('button', { name: /back to gallery/i }).click();
    await expect(customCard.getByRole('button', { name: /view details/i })).toBeFocused();

    await page.getByRole('button', { name: /^Built-in$/i }).click();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toBeVisible();
    await center.getByRole('button', { name: /back to workspace/i }).click();
    await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
    await expect(headerTemplateButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(center).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /manage templates/i })).toBeFocused();

    const keyboardDetailButton = center.getByRole('button', { name: /view details/i }).first();
    await keyboardDetailButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Template Details' })).toBeFocused();
    const keyboardBackToGallery = center.getByRole('button', { name: /back to gallery/i });
    await keyboardBackToGallery.focus();
    await page.keyboard.press('Space');
    await expect(keyboardDetailButton).toBeFocused();

    await page.getByRole('button', { name: /back to workspace/i }).focus();
    await page.keyboard.press('Enter');
    await expect(headerTemplateButton).toBeFocused();

    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(before.ui?.state.templateId);
    expect(after.ui?.state.customTemplates).toEqual(before.ui?.state.customTemplates);
    const writes = await readStorageWriteLog(page);
    expect(writes).not.toContain(RESUME_STORE_PERSIST_KEY);
    expect(writes).not.toContain(UI_STORE_PERSIST_KEY);

    const canonicalAfter = await exportCanonicalWorkspace(page);
    expect(canonicalAfter.resume).toEqual(canonicalBefore.resume);
    expect(canonicalAfter.activeSections).toEqual(canonicalBefore.activeSections);
    expect(canonicalAfter.templateId).toBe(canonicalBefore.templateId);
    expect(canonicalAfter.customTemplates).toEqual(canonicalBefore.customTemplates);
  });

  test('read-only live preview uses canonical resume data and preserves stores and persistence @d2-s1', async ({
    page,
    browser,
  }) => {
    const canonicalResume = createEmptyResume();
    canonicalResume.personal.fullName = 'D2-S1 Live Candidate';
    canonicalResume.personal.summary = 'Canonical resume summary for a real live preview.';
    canonicalResume.experience = [
      {
        id: 'd2-s1-canonical-role',
        company: 'Canonical Resume Labs',
        role: 'Product Engineer',
        startDate: '2022',
        endDate: 'Present',
        highlights: ['This experience belongs to the current resume.'],
      },
    ];

    const sample = createEmptyResume();
    sample.personal.fullName = 'Template Sample Must Not Appear';
    sample.personal.summary = 'This sample snapshot must never be used in preview.';
    const customDuplicate = {
      ...fictionalCustomTemplate,
      id: currentTemplateId,
      name: 'Custom Duplicate Candidate',
      description: 'A custom fixture sharing the built-in template ID.',
      previewStyle: 'creative',
      sample,
    } satisfies ResumeTemplate;
    const alternateCustom = {
      ...fictionalCustomTemplate,
      id: 'pc-d4-d2-s1-alternate-custom',
      name: 'Alternate Custom Candidate',
      description: 'A second custom candidate for switching checks.',
      previewStyle: 'classic',
      sample,
    } satisfies ResumeTemplate;

    await installFixture(page, {
      templateId: currentTemplateId,
      customTemplates: [customDuplicate, alternateCustom],
      resume: canonicalResume,
      activeSections: ['experience'],
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudio(page);

    const monitorProbeKey = '__pcD4D2S1StorageMonitorProbe';
    await page.evaluate((key) => localStorage.setItem(key, 'monitor-probe'), monitorProbeKey);
    expect(await readStorageWriteLog(page)).toContain(monitorProbeKey);
    await page.evaluate((key) => localStorage.removeItem(key), monitorProbeKey);
    await clearStorageWriteLog(page);
    expect(await readStorageWriteLog(page)).toEqual([]);

    const mobileBefore = await readPersistedWorkspace(page);
    const mobileRuntimeBefore = await readRuntimeStoreSnapshot(page);
    const mobileStorageBefore = await readLocalStorageSnapshot(page);
    await page.getByRole('button', { name: 'Template Center' }).click();
    const mobileCenter = page.getByTestId('pc-template-center');
    await expect(mobileCenter).toBeVisible();
    await mobileCenter.getByRole('button', { name: 'Custom', exact: true }).click();
    const mobileDuplicateCard = mobileCenter.locator(
      `[data-template-source="custom"][data-template-id="${currentTemplateId}"]`,
    );
    await mobileDuplicateCard.getByRole('button', { name: 'View Details' }).click();
    await mobileCenter.getByRole('button', { name: 'Live Preview' }).click();
    const mobileLivePreview = page.getByTestId('pc-template-live-preview');
    await expect(mobileLivePreview).toBeVisible();
    await expect(mobileLivePreview).toContainText('D2-S1 Live Candidate');
    await expect(mobileLivePreview).not.toContainText('Template Sample Must Not Appear');
    const previewOverflow = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('.pc-template-live-preview__paper');
      if (!paper) throw new Error('The live preview paper is missing.');
      return {
        document: document.documentElement.scrollWidth - window.innerWidth,
        paper: paper.scrollWidth - paper.clientWidth,
        paperWidth: paper.getBoundingClientRect().width,
      };
    });
    expect(previewOverflow.document).toBeLessThanOrEqual(0);
    expect(previewOverflow.paper).toBeLessThanOrEqual(0);
    expect(previewOverflow.paperWidth).toBeLessThanOrEqual(390);
    await captureD2S1Screenshot({
      page,
      browser,
      label: 'custom-live-preview-mobile',
      viewport: { width: 390, height: 844 },
      fixture: 'canonical-d2-s1',
      locale: 'en',
      scrollContainer: '.pc-template-center',
    });
    await page.getByRole('button', { name: 'Back to Workspace' }).click();
    await expect(page.getByTestId('pc-template-center')).toHaveCount(0);
    const mobileAfter = await readPersistedWorkspace(page);
    expect(mobileAfter).toEqual(mobileBefore);
    expect(await readRuntimeStoreSnapshot(page)).toEqual(mobileRuntimeBefore);
    expect(await readLocalStorageSnapshot(page)).toEqual(mobileStorageBefore);
    const mobileStorageWrites = await readStorageWriteLog(page);
    expect(
      mobileStorageWrites.filter((key) =>
        [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(key),
      ),
    ).toEqual([]);
    const mobileStorageOperations = await readStorageOperationLog(page);
    expect(mobileStorageOperations).not.toContainEqual({ method: 'clear', key: null });
    expect(
      mobileStorageOperations.filter((operation) =>
        [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(operation.key ?? ''),
      ),
    ).toEqual([]);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId('pc-studio')).toBeVisible();
    await expect(page.getByTestId('pc-save-status')).toHaveAttribute(
      'data-save-state',
      /^(ready|saved)$/u,
    );
    await expect.poll(async () => readStorageWriteLog(page)).toContain(UI_STORE_PERSIST_KEY);
    const breakpointOperations = await readStorageOperationLog(page);
    const breakpointStoreOperations = breakpointOperations.filter((operation) =>
      [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(operation.key ?? ''),
    );
    expect(breakpointStoreOperations).toContainEqual({
      method: 'setItem',
      key: UI_STORE_PERSIST_KEY,
    });
    expect(
      breakpointStoreOperations.filter((operation) => operation.key === RESUME_STORE_PERSIST_KEY),
    ).toEqual([]);
    expect(
      breakpointStoreOperations
        .filter((operation) => operation.key === UI_STORE_PERSIST_KEY)
        .every((operation) => operation.method === 'setItem'),
    ).toBe(true);
    expect(await readRuntimeStoreSnapshot(page)).toEqual(mobileRuntimeBefore);
    expect(await readLocalStorageSnapshot(page)).toEqual(mobileStorageBefore);
    await clearStorageWriteLog(page);
    expect(await readStorageWriteLog(page)).toEqual([]);
    const before = await readPersistedWorkspace(page);
    expect(before).toEqual(mobileBefore);
    const runtimeBefore = await readRuntimeStoreSnapshot(page);
    const storageSnapshotBefore = await readLocalStorageSnapshot(page);

    const templateCenterTrigger = page.getByRole('button', { name: 'Template Center' });
    await templateCenterTrigger.focus();
    await page.keyboard.press('Enter');
    const center = page.getByTestId('pc-template-center');
    await expect(center).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeFocused();
    await center.getByRole('button', { name: 'Custom', exact: true }).click();

    const customDuplicateCard = center.locator(
      `[data-template-source="custom"][data-template-id="${currentTemplateId}"]`,
    );
    await expect(customDuplicateCard).toHaveCount(1);
    const duplicateDetailsButton = customDuplicateCard.getByRole('button', {
      name: 'View Details',
    });
    await duplicateDetailsButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Template Details' })).toBeFocused();
    await expect(center.getByRole('heading', { name: 'Custom Duplicate Candidate' })).toBeVisible();
    await center.getByRole('button', { name: 'Live Preview' }).focus();
    await page.keyboard.press('Enter');

    const livePreview = page.getByTestId('pc-template-live-preview');
    await expect(livePreview).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live Resume Preview' })).toBeFocused();
    await expect(livePreview).toHaveAttribute('data-template-id', currentTemplateId);
    await expect(livePreview).toHaveAttribute('data-template-source', 'custom');
    await expect(livePreview).toHaveAttribute('data-preview-style', 'creative');
    await expect(livePreview).toContainText('D2-S1 Live Candidate');
    await expect(livePreview).toContainText('Canonical resume summary for a real live preview.');
    await expect(livePreview).toContainText('This experience belongs to the current resume.');
    await expect(livePreview).not.toContainText('Template Sample Must Not Appear');
    await expect(livePreview).not.toContainText(
      'This sample snapshot must never be used in preview.',
    );
    await expect(center.getByRole('status')).toContainText('Preview only');
    await expect(center.getByRole('button', { name: /Apply/i })).toHaveCount(0);
    await expect(center.getByRole('button', { name: /Load Sample/i })).toHaveCount(0);
    await captureD2S1Screenshot({
      page,
      browser,
      label: 'custom-live-preview',
      viewport: { width: 1440, height: 900 },
      fixture: 'canonical-d2-s1',
      locale: 'en',
      scrollContainer: '.pc-template-center',
    });

    await page.getByRole('button', { name: 'Back to Gallery' }).click();
    await expect(livePreview).toHaveCount(0);
    await expect(duplicateDetailsButton).toBeFocused();

    await center.getByRole('button', { name: 'All templates' }).click();
    const appliedBuiltInCard = center.locator(
      `[data-template-source="built-in"][data-template-id="${currentTemplateId}"]`,
    );
    await appliedBuiltInCard.getByRole('button', { name: 'View Details' }).click();
    await expect(center.getByText('Currently applied')).toBeVisible();
    await center.getByRole('button', { name: 'Live Preview' }).click();
    await expect(page.getByTestId('pc-template-live-preview')).toHaveAttribute(
      'data-template-source',
      'built-in',
    );
    await expect(page.getByTestId('pc-template-live-preview')).toHaveAttribute(
      'data-preview-style',
      'modern',
    );
    await page.getByRole('button', { name: 'Back to Gallery' }).click();

    await center.getByRole('button', { name: 'Custom', exact: true }).click();
    const alternateCard = center.locator(
      '[data-template-source="custom"][data-template-id="pc-d4-d2-s1-alternate-custom"]',
    );
    await alternateCard.getByRole('button', { name: 'View Details' }).click();
    await center.getByRole('button', { name: 'Live Preview' }).click();
    await expect(page.getByTestId('pc-template-live-preview')).toHaveAttribute(
      'data-template-id',
      'pc-d4-d2-s1-alternate-custom',
    );
    await expect(page.getByTestId('pc-template-live-preview')).toHaveAttribute(
      'data-preview-style',
      'classic',
    );
    await page.getByRole('button', { name: 'Back to Workspace' }).click();
    await expect(page.getByTestId('pc-template-center')).toHaveCount(0);
    await expect(page.getByTestId('pc-editor-stage')).toBeVisible();

    const after = await readPersistedWorkspace(page);
    expect(after).toEqual(before);
    expect(await readRuntimeStoreSnapshot(page)).toEqual(runtimeBefore);
    expect(await readLocalStorageSnapshot(page)).toEqual(storageSnapshotBefore);
    const storageWriteLog = await readStorageWriteLog(page);
    const storeWrites = storageWriteLog.filter((key) =>
      [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(key),
    );
    expect(storeWrites).toEqual([]);
    const storageOperations = await readStorageOperationLog(page);
    expect(storageOperations).not.toContainEqual({ method: 'clear', key: null });
    expect(
      storageOperations.filter((operation) =>
        [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(operation.key ?? ''),
      ),
    ).toEqual([]);

    await page.getByRole('button', { name: 'Template Center' }).click();
    await expect(center).toBeVisible();
    await expect(page.getByTestId('pc-template-live-preview')).toHaveCount(0);
    await center.getByRole('button', { name: 'Custom', exact: true }).click();
    await center
      .locator('[data-template-source="custom"][data-template-id="pc-d4-d2-s1-alternate-custom"]')
      .getByRole('button', { name: 'View Details' })
      .click();
    await center.getByRole('button', { name: 'Live Preview' }).click();
    await expect(page.getByTestId('pc-template-live-preview')).toBeVisible();
    await page.reload();
    await openStudio(page);
    await expect(page.getByTestId('pc-template-center')).toHaveCount(0);
    await page.getByRole('button', { name: 'Template Center' }).click();
    await expect(page.getByTestId('pc-template-center')).toBeVisible();
    await expect(page.getByTestId('pc-template-live-preview')).toHaveCount(0);
    const persistedAfterReload = await readPersistedWorkspace(page);
    expect(persistedAfterReload).toEqual(before);
    expect(await readRuntimeStoreSnapshot(page)).toEqual(runtimeBefore);
    expect(await readLocalStorageSnapshot(page)).toEqual(storageSnapshotBefore);
    const reloadOperations = await readStorageOperationLog(page);
    expect(reloadOperations).not.toContainEqual({ method: 'clear', key: null });
    expect(
      reloadOperations.filter((operation) =>
        [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY].includes(operation.key ?? ''),
      ),
    ).toEqual([]);
  });

  test('a missing persisted template is never relabeled as Current or silently repaired', async ({
    page,
  }) => {
    const missingTemplateId = 'pc-d4-d1-missing-template-fixture';
    await installFixture(page, { templateId: missingTemplateId, customTemplates: [] });
    await page.setViewportSize({ width: 1280, height: 800 });
    await openStudio(page);
    const before = await readPersistedWorkspace(page);
    await clearStorageWriteLog(page);

    await page.getByRole('button', { name: 'Template Center' }).click();
    const center = page.getByTestId('pc-template-center');
    await expect(center.getByText(/Missing Template/i)).toBeVisible();
    await expect(center).toContainText(missingTemplateId);
    const cardText = await center.locator('[data-template-id]').allTextContents();
    expect(cardText.every((text) => !text.includes('Current'))).toBe(true);
    await expect(center).toContainText(/fallback/i);

    const beforeClose = await readPersistedWorkspace(page);
    expect(beforeClose.ui?.state.templateId).toBe(missingTemplateId);
    await page.getByRole('button', { name: /back to workspace/i }).click();
    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(missingTemplateId);
    expect(await readStorageWriteLog(page)).not.toContain(RESUME_STORE_PERSIST_KEY);
    expect(await readStorageWriteLog(page)).not.toContain(UI_STORE_PERSIST_KEY);
  });

  test('legacy template management remains an explicit separate flow with sample confirmation', async ({
    page,
  }) => {
    await installFixture(page);
    await openStudio(page);
    const before = await readPersistedWorkspace(page);

    await page.getByRole('button', { name: 'Template Center' }).click();
    const center = page.getByTestId('pc-template-center');
    await expect(center.getByRole('button', { name: /load sample/i })).toHaveCount(0);
    await expect(center.getByRole('button', { name: /apply/i })).toHaveCount(0);
    await page.getByRole('button', { name: /manage templates/i }).click();

    const manager = page.getByRole('dialog', { name: 'Choose a resume template' });
    await expect(manager).toBeVisible();
    await expect(manager.getByRole('button', { name: /load sample/i }).first()).toBeVisible();

    let confirmation = '';
    page.once('dialog', async (dialog) => {
      confirmation = dialog.message();
      await dialog.dismiss();
    });
    await manager
      .getByRole('button', { name: /load sample/i })
      .first()
      .click();
    expect(confirmation).toMatch(/replace your current resume/i);

    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(before.ui?.state.templateId);
  });

  const matrixViewports = [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
  ] as const;
  const matrixScrollStages = ['top', 'middle', 'bottom'] as const;
  const matrixActiveSections: ActiveSectionKey[] = [
    'experience',
    'education',
    'projects',
    'skills',
    'languages',
    'awards',
  ];

  for (const fixture of ['standard', 'long'] as const) {
    for (const viewportCase of matrixViewports) {
      for (const scrollStage of matrixScrollStages) {
        test(`D2-S1 visual matrix ${fixture}/${viewportCase.name}/${scrollStage} @d2-s1`, async ({
          page,
          browser,
        }) => {
          const resume = createD2S1MatrixResume(fixture);
          await installFixture(page, { resume, activeSections: matrixActiveSections });
          await page.setViewportSize(viewportCase.viewport);
          await openStudio(page);
          await page.getByRole('button', { name: 'Template Center', exact: true }).click();

          const center = page.getByTestId('pc-template-center');
          await expect(center).toBeVisible();
          const builtInCard = center.locator(
            `[data-template-source="built-in"][data-template-id="${currentTemplateId}"]`,
          );
          await builtInCard.getByRole('button', { name: 'View Details' }).click();
          await center.getByRole('button', { name: 'Live Preview' }).click();
          const livePreview = page.getByTestId('pc-template-live-preview');
          await expect(livePreview).toBeVisible();
          await expect(livePreview).toContainText(resume.personal.fullName ?? '');
          await captureD2S1MatrixState({
            page,
            browser,
            fixture,
            viewportName: viewportCase.name,
            viewport: viewportCase.viewport,
            scrollStage,
          });
        });
      }
    }
  }
} else {
  test('PC Studio remains unavailable while the feature gate is off', async ({ page }) => {
    await page.goto('/pc-studio');
    await expect(page.getByTestId('pc-studio')).toHaveCount(0);
    await expect(page.getByTestId('pc-template-center')).toHaveCount(0);
  });
}
