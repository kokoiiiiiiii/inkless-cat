import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';
import { DEFAULT_TEMPLATE_ID } from '@entities/template';
import { RESUME_STORE_PERSIST_VERSION, UI_STORE_PERSIST_VERSION } from '@entities/workspace';
import { expect, type Page, test } from '@playwright/test';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

const activeSections = [
  'socials',
  'experience',
  'projects',
  'education',
  'skills',
  'languages',
  'interests',
  'awards',
] as const;

const emptyResume = createEmptyResume();
const syntheticResume: ResumeData = resumeSchema.parse({
  ...emptyResume,
  personal: {
    ...emptyResume.personal,
    fullName: 'D2 合成候选人',
    title: '产品设计师',
    email: 'd2.candidate@example.test',
    phone: '+86 138 5555 0101',
    location: '上海 · 可远程',
    summary: '专注于清晰的信息结构、易读的内容与实用的产品体验。',
  },
  socials: [{ id: 'd2-social-1', label: '作品集', url: 'https://portfolio.example.test/d2' }],
  experience: [
    {
      id: 'd2-experience-1',
      company: 'Synthetic Studio',
      role: '高级产品设计师',
      location: '上海',
      startDate: '2022-01',
      endDate: '2025-01',
      highlights: ['改善复杂编辑流程中的信息查找与内容维护体验。'],
    },
  ],
  projects: [
    {
      id: 'd2-project-1',
      name: '内容工作台',
      role: '产品设计负责人',
      summary: '一个仅供浏览器回归使用的合成项目。',
      link: 'https://project.example.test/d2',
      highlights: ['让长内容编辑更容易扫描和校对。'],
    },
  ],
  education: [
    {
      id: 'd2-education-1',
      school: 'Synthetic Institute',
      degree: '设计学学士',
      startDate: '2017',
      endDate: '2021',
      details: '合成测试教育经历。',
    },
  ],
  skills: [{ id: 'd2-skill-1', title: '设计与协作', items: ['研究', '原型', '内容设计'] }],
  languages: [{ id: 'd2-language-1', name: '中文', level: '母语' }],
  interests: [{ id: 'd2-interest-1', name: '字体与排版' }],
  awards: [{ id: 'd2-award-1', name: '测试用奖项', issuer: 'Synthetic Group', year: '2024' }],
});

const uiState = {
  theme: 'light',
  templateId: DEFAULT_TEMPLATE_ID,
  customTemplates: [],
};

const fields = {
  fullName: /姓名|Full Name/u,
  title: /头衔|Headline/u,
  email: /邮箱|Email/u,
  phone: /电话|Phone/u,
  location: /所在地|Location/u,
  summary: /个人简介|Summary/u,
} as const;

type FieldKey = keyof typeof fields;

const visualDirectory = path.resolve('D2_REVIEW/visual');
const evidenceDirectory = path.resolve('D2_REVIEW/evidence');

const seedSyntheticPage = async (page: Page) => {
  await page.addInitScript(
    ({ resumeKey, uiKey, resumeVersion, uiVersion, resume, sections, ui }) => {
      const alreadySeeded = sessionStorage.getItem('__d2_m01_visual_seeded') === 'yes';
      if (alreadySeeded) return;

      localStorage.setItem(
        resumeKey,
        JSON.stringify({ state: { resume, activeSections: sections }, version: resumeVersion }),
      );
      localStorage.setItem(uiKey, JSON.stringify({ state: ui, version: uiVersion }));
      sessionStorage.setItem('__d2_m01_visual_seeded', 'yes');
    },
    {
      resumeKey: RESUME_STORE_PERSIST_KEY,
      uiKey: UI_STORE_PERSIST_KEY,
      resumeVersion: RESUME_STORE_PERSIST_VERSION,
      uiVersion: UI_STORE_PERSIST_VERSION,
      resume: syntheticResume,
      sections: activeSections,
      ui: uiState,
    },
  );
};

const field = (page: Page, key: FieldKey) => page.getByRole('textbox', { name: fields[key] });

const screenshot = async (page: Page, relativePath: string, fullPage = false) => {
  const absolutePath = path.join(visualDirectory, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const png = await page.screenshot({
    path: absolutePath,
    fullPage,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
  return {
    file: path.relative(process.cwd(), absolutePath),
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bytes: png.length,
    sha256: createHash('sha256').update(png).digest('hex'),
  };
};

const pageMetrics = async (page: Page, state: string) => {
  const browser = page.context().browser();
  const browserName = browser?.browserType().name() ?? 'unknown';
  const browserVersion = browser?.version() ?? 'unknown';
  const pageState = await page.evaluate(async (stateName) => {
    await document.fonts.ready;
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        x: Math.round(bounds.x * 100) / 100,
        y: Math.round(bounds.y * 100) / 100,
        width: Math.round(bounds.width * 100) / 100,
        height: Math.round(bounds.height * 100) / 100,
        top: Math.round(bounds.top * 100) / 100,
        bottom: Math.round(bounds.bottom * 100) / 100,
      };
    };
    const active = document.activeElement as HTMLElement | null;
    const activeBounds = active?.getBoundingClientRect() ?? null;
    const activeIsFormField =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement;
    const fullName = document.querySelector<HTMLInputElement>('input[name="fullName"]');
    const computed = fullName ? getComputedStyle(fullName) : null;
    const dock = document.querySelector<HTMLElement>('.m01-profile-slice__action-dock');
    const dockStyle = dock ? getComputedStyle(dock) : null;
    const dockBounds = dock?.getBoundingClientRect() ?? null;
    const geometricOverlap = Boolean(
      activeIsFormField &&
        activeBounds &&
        dockBounds &&
        activeBounds.left < dockBounds.right &&
        activeBounds.right > dockBounds.left &&
        activeBounds.top < dockBounds.bottom &&
        activeBounds.bottom > dockBounds.top,
    );
    const dockPaintedAndInteractive = Boolean(
      dockStyle &&
        dockStyle.display !== 'none' &&
        dockStyle.visibility !== 'hidden' &&
        Number.parseFloat(dockStyle.opacity) > 0 &&
        dockStyle.pointerEvents !== 'none',
    );
    const visibleFormControlOverlaps =
      dockPaintedAndInteractive && dockBounds
        ? [
            ...document.querySelectorAll<
              HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >(
              '.m01-profile-slice__form-card input:not([type="hidden"]), .m01-profile-slice__form-card textarea, .m01-profile-slice__form-card select',
            ),
          ]
            .filter((control) => {
              const bounds = control.getBoundingClientRect();
              const style = getComputedStyle(control);
              const intersectsViewport = bounds.bottom > 0 && bounds.top < window.innerHeight;
              const visible =
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number.parseFloat(style.opacity) > 0 &&
                !control.matches(':disabled') &&
                control.getClientRects().length > 0;
              const overlapsDock =
                bounds.left < dockBounds.right &&
                bounds.right > dockBounds.left &&
                bounds.top < dockBounds.bottom &&
                bounds.bottom > dockBounds.top;
              return intersectsViewport && visible && overlapsDock;
            })
            .map((control) => {
              const bounds = control.getBoundingClientRect();
              return {
                tagName: control.tagName,
                name: control.getAttribute('name'),
                bounds: {
                  left: Math.round(bounds.left * 100) / 100,
                  right: Math.round(bounds.right * 100) / 100,
                  top: Math.round(bounds.top * 100) / 100,
                  bottom: Math.round(bounds.bottom * 100) / 100,
                },
              };
            })
        : [];

    return {
      state: stateName,
      browserUserAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      theme: document
        .querySelector('[data-testid="m01-profile-slice"]')
        ?.getAttribute('data-theme'),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      documentFonts: {
        status: document.fonts.status,
        faces: [...document.fonts].map((face) => ({
          family: face.family,
          weight: face.weight,
          status: face.status,
        })),
        formFontFamily: computed?.fontFamily ?? null,
      },
      overflow: {
        document: document.documentElement.scrollWidth > window.innerWidth,
        root: document.querySelector<HTMLElement>('.m01-profile-slice')?.scrollWidth ?? null,
        viewportWidth: window.innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
      },
      focus: {
        tagName: active?.tagName ?? null,
        name: active?.getAttribute('name') ?? null,
        focusVisible: active?.matches(':focus-visible') ?? false,
        isFormField: activeIsFormField,
        bounds: activeBounds
          ? {
              top: Math.round(activeBounds.top * 100) / 100,
              bottom: Math.round(activeBounds.bottom * 100) / 100,
            }
          : null,
        fullyInViewport: activeBounds
          ? activeBounds.top >= 0 && activeBounds.bottom <= window.innerHeight
          : null,
      },
      actionDockState: {
        position: dockStyle?.position ?? null,
        opacity: dockStyle?.opacity ?? null,
        pointerEvents: dockStyle?.pointerEvents ?? null,
        transform: dockStyle?.transform ?? null,
        bounds: dockBounds
          ? {
              top: Math.round(dockBounds.top * 100) / 100,
              bottom: Math.round(dockBounds.bottom * 100) / 100,
            }
          : null,
        inViewport: Boolean(
          dockBounds &&
            dockBounds.top >= 0 &&
            dockBounds.bottom <= window.innerHeight &&
            dockStyle?.visibility !== 'hidden' &&
            dockStyle?.display !== 'none' &&
            Number.parseFloat(dockStyle?.opacity ?? '0') > 0,
        ),
        geometricBoundsOverlap: geometricOverlap,
        overlapsFocusedElement: geometricOverlap && dockPaintedAndInteractive,
        visibleFormControlOverlaps,
      },
      motion: {
        rootScrollBehavior: getComputedStyle(
          document.querySelector('.m01-profile-slice') ?? document.documentElement,
        ).scrollBehavior,
        inputTransitionDuration: computed?.transitionDuration ?? null,
        inputAnimationDuration: computed?.animationDuration ?? null,
        actionDockTransitionDuration: dockStyle?.transitionDuration ?? null,
      },
      geometry: {
        root: rect('.m01-profile-slice'),
        header: rect('.m01-profile-slice__brandbar'),
        hero: rect('.m01-profile-slice__hero'),
        profileCard: rect('[data-testid="m01-profile-card"]'),
        formCard: rect('.m01-profile-slice__form-card'),
        nameField: rect('input[name="fullName"]'),
        locationField: rect('input[name="location"]'),
        summaryFieldShell: rect('.studio-field:has(.m01-profile-slice__summary)'),
        summaryFieldLabel: rect(
          '.studio-field:has(.m01-profile-slice__summary) > .studio-field__label',
        ),
        summaryField: rect('textarea[name="summary"]'),
        previewCard: rect('.m01-profile-slice__preview-card'),
        preview: rect('.resume-preview'),
        actionDock: rect('.m01-profile-slice__action-dock'),
      },
      storage: {
        syntheticSeed: sessionStorage.getItem('__d2_m01_visual_seeded') === 'yes',
        keys: Object.keys(localStorage).sort(),
      },
    };
  }, state);

  return { browserName, browserVersion, ...pageState };
};

const saveEvidence = async (fileName: string, value: unknown) => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory, fileName), `${JSON.stringify(value, null, 2)}\n`);
};

test.beforeAll(async () => {
  await Promise.all([
    mkdir(path.join(visualDirectory, 'final'), { recursive: true }),
    mkdir(path.join(visualDirectory, 'responsive'), { recursive: true }),
    mkdir(path.join(evidenceDirectory, 'chromium'), { recursive: true }),
  ]);
});

test('M01 visual candidate keeps the mobile layout usable at the requested widths', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await seedSyntheticPage(page);

  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];
  const measurements: Array<Record<string, unknown>> = [];
  const screenshots: Array<Record<string, unknown>> = [];
  const visibleDockOverlapMeasurements: Array<{ viewport: string; controls: unknown }> = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('m01-profile-slice')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /个人信息|Personal Information/u }),
    ).toBeVisible();

    const metrics = await pageMetrics(page, 'candidate baseline');
    measurements.push(metrics);
    visibleDockOverlapMeasurements.push({
      viewport: `${viewport.width}×${viewport.height}`,
      controls: metrics.actionDockState.visibleFormControlOverlaps,
    });
    expect(metrics.browserName).toBe('chromium');
    expect(
      metrics.overflow.document,
      `horizontal overflow at ${viewport.width}×${viewport.height}`,
    ).toBe(false);
    expect(metrics.theme).toBe('light');
    expect(metrics.actionDockState.position).toBe('fixed');
    expect(
      metrics.actionDockState.inViewport,
      `action dock must be visible in the initial ${viewport.width}×${viewport.height} viewport`,
    ).toBe(true);
    const inputHeight = await field(page, 'fullName').evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(inputHeight, `name input touch height at ${viewport.width}px`).toBeGreaterThanOrEqual(
      44,
    );

    const fileName = 'm01-final-' + viewport.width + 'x' + viewport.height + '-viewport.png';
    screenshots.push({ viewport, ...(await screenshot(page, 'responsive/' + fileName)) });
    if (viewport.width === 390) {
      screenshots.push({
        viewport,
        fullPage: true,
        ...(await screenshot(page, 'final/m01-final-390x844-full-page.png', true)),
      });
    }

    const summary = page.getByTestId('m01-summary-field');
    await summary.evaluate((element) =>
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }),
    );
    await summary.focus();
    const dock = page.locator('.m01-profile-slice__action-dock');
    await expect(dock).toHaveCSS('pointer-events', 'none');
    await expect(dock).toHaveCSS('opacity', '0');
    const focusedMetrics = await pageMetrics(
      page,
      'focused summary, mobile keyboard not simulated',
    );
    measurements.push(focusedMetrics);
    expect(
      focusedMetrics.focus.fullyInViewport,
      `focused summary must fit inside ${viewport.width}×${viewport.height}; bounds=${JSON.stringify(focusedMetrics.focus.bounds)}`,
    ).toBe(true);
    expect(focusedMetrics.actionDockState.overlapsFocusedElement).toBe(false);
    expect(focusedMetrics.actionDockState.inViewport).toBe(false);
    const actionDockTransitionIsReduced = await dock.evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .every((duration) => {
          const trimmed = duration.trim();
          const value = Number.parseFloat(trimmed);
          const milliseconds = trimmed.endsWith('ms') ? value : value * 1000;
          return milliseconds <= 0.01;
        }),
    );
    expect(actionDockTransitionIsReduced).toBe(true);
    await summary.evaluate((element) => element.blur());
  }

  await saveEvidence('chromium/m01-visual-responsive-metrics.json', {
    fixture: 'D2 synthetic schema-v1 profile; isolated Playwright browser context',
    storage: 'Local storage seeded with canonical resume and UI store envelopes; no real user data',
    browser: 'Playwright-managed Chromium; see browserVersion and browserUserAgent in each record',
    screenshotScale: 'CSS pixels',
    animationState: 'Playwright animations disabled during capture; prefers-reduced-motion enabled',
    keyboardSimulation:
      'Chromium device emulation does not display the iOS soft keyboard; focused-field visibility and dock overlap are DOM geometry checks only',
    screenshots,
    measurements,
  });
  expect(
    visibleDockOverlapMeasurements.filter((item) => (item.controls as unknown[]).length > 0),
    'visible action dock must not cover interactive form controls at any requested viewport',
  ).toEqual([]);
});

test('M01 edit, preview, long-text, and rejected-input states remain connected to the real editor', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSyntheticPage(page);
  await page.goto('/');
  await expect(page.getByTestId('m01-profile-slice')).toBeVisible();

  const states: Array<Record<string, unknown>> = [];
  const screenshots: Array<Record<string, unknown>> = [];
  const profileCard = page.getByTestId('m01-profile-card');
  const previewCard = page.locator('.m01-profile-slice__preview-card');
  const preview = page.locator('.resume-preview');

  await page.getByTestId('m01-edit-action').click();
  await expect(profileCard).toBeInViewport();
  const initialName = field(page, 'fullName');
  await initialName.fill('D2 已更新的合成候选人');
  await expect(initialName).toHaveValue('D2 已更新的合成候选人');
  await expect(preview.locator('h1')).toHaveText('D2 已更新的合成候选人');
  await page.keyboard.press('Tab');
  await expect(field(page, 'title')).toBeFocused();
  expect(await field(page, 'title').evaluate((element) => element.matches(':focus-visible'))).toBe(
    true,
  );
  states.push(await pageMetrics(page, 'edit and keyboard focus'));
  screenshots.push({
    state: 'edit and keyboard focus',
    ...(await screenshot(page, 'final/m01-edit-state-390x844.png')),
  });

  const longSummary =
    'D2 长文本视觉回归段落：产品信息需要在真实输入后保持易读、可编辑并同步到预览。'.repeat(22);
  const summary = page.getByTestId('m01-summary-field');
  await summary.fill(longSummary);
  await expect(summary).toHaveValue(longSummary);
  await expect(preview).toContainText('D2 长文本视觉回归段落');
  const longTextMetrics = await pageMetrics(page, 'long summary edit');
  states.push(longTextMetrics);
  expect(longTextMetrics.focus.fullyInViewport).toBe(true);
  expect(longTextMetrics.actionDockState.overlapsFocusedElement).toBe(false);
  screenshots.push(
    {
      state: 'long summary edit',
      ...(await screenshot(page, 'final/m01-long-text-edit-390x844.png')),
    },
    {
      state: 'long summary full page',
      fullPage: true,
      ...(await screenshot(page, 'final/m01-long-text-full-page-390x844.png', true)),
    },
  );

  await summary.evaluate((element) => element.blur());
  await page.getByTestId('m01-preview-action').click();
  await expect(previewCard).toBeInViewport();
  await expect(preview.locator('h1')).toHaveText('D2 已更新的合成候选人');
  await expect(preview).toContainText('D2 长文本视觉回归段落');
  states.push(await pageMetrics(page, 'preview updated'));
  screenshots.push({
    state: 'preview updated',
    ...(await screenshot(page, 'final/m01-preview-updated-390x844.png')),
  });

  const updatedName = field(page, 'fullName');
  await updatedName.fill('x'.repeat(30_001));
  await expect(updatedName).toHaveValue('D2 已更新的合成候选人');
  await expect(page.getByRole('alert')).toBeVisible();
  states.push(await pageMetrics(page, 'rejected oversized input with error feedback'));
  screenshots.push({
    state: 'rejected oversized input with error feedback',
    ...(await screenshot(page, 'final/m01-error-feedback-390x844.png')),
  });

  await saveEvidence('chromium/m01-visual-interaction-metrics.json', {
    browserName: page.context().browser()?.browserType().name() ?? 'unknown',
    fixture: 'D2 synthetic schema-v1 profile; isolated Playwright browser context',
    browserVersion: page.context().browser()?.version() ?? 'unknown',
    browserEngineAssertion: 'chromium',
    browserUserAgent: await page.evaluate(() => navigator.userAgent),
    viewport: { width: 390, height: 844 },
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    keyboardSimulation:
      'Chromium device emulation does not display the iOS soft keyboard; focused-field visibility and dock overlap are DOM geometry checks only',
    storage: 'Canonical resume/UI persist keys seeded only with synthetic fixture data',
    states,
    screenshots,
    checks: [
      'M01 edit action brings the profile card into view',
      'keyboard Tab moves focus to the next field with a visible focus indicator',
      'personal name edit updates the canonical preview heading',
      'long summary remains editable and appears in the preview',
      'preview action brings the updated resume preview into view',
      'oversized input is rejected and the existing alert is shown',
    ],
  });
});
