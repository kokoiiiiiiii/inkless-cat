import { mkdir, writeFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { measureM0Page } from './helpers/mobile-compact-geometry';

const artifactRoot = 'test-results/mobile-compact-studio-m0';

const capture = async (page: Page, name: string) => {
  // Keep the review screenshots focused on the layout instead of the transient
  // demo toast produced by the interaction immediately before a capture.
  await expect(page.locator('.m0-toast')).toBeHidden();
  await page.screenshot({
    path: `${artifactRoot}/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
};

const measurePerformance = (page: Page) =>
  page.evaluate(async () => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const firstContentfulPaint = performance
      .getEntriesByType('paint')
      .find((entry) => entry.name === 'first-contentful-paint');
    const setSelectValue = (select: HTMLSelectElement, value: string) => {
      Reflect.set(HTMLSelectElement.prototype, 'value', value, select);
    };
    const dockButtons = document.querySelectorAll<HTMLButtonElement>('.m0-dock button');
    const transitionFramesMs: number[] = [];

    for (const index of [1, 0, 1, 0]) {
      const start = performance.now();
      dockButtons[index]?.click();
      await frame();
      await frame();
      transitionFramesMs.push(round(performance.now() - start));
    }

    document.querySelector<HTMLButtonElement>('.m0-dock button:nth-child(2)')?.click();
    await frame();
    const modeSelect = document.querySelector<HTMLSelectElement>('.m0-preview-select select');
    const previewModes: Array<{ mode: string; responseMs: number; horizontalOverflow: number }> =
      [];
    if (modeSelect) {
      for (const mode of ['responsive', 'fixed', 'reader']) {
        const start = performance.now();
        setSelectValue(modeSelect, mode);
        modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await frame();
        await frame();
        const viewport = document.querySelector<HTMLElement>('.m0-paper-viewport');
        previewModes.push({
          mode,
          responseMs: round(performance.now() - start),
          horizontalOverflow: viewport ? viewport.scrollWidth - viewport.clientWidth : 0,
        });
      }

      const longResume = [
        ...document.querySelectorAll<HTMLButtonElement>('.m0-length-toggle button'),
      ].find(
        (button) => button.textContent?.includes('三页') || button.textContent?.includes('3-page'),
      );
      longResume?.click();
      await frame();
      await frame();
    }

    const previewViewport = document.querySelector<HTMLElement>('.m0-paper-viewport');
    const scrollFrameGapsMs: number[] = [];
    if (previewViewport && previewViewport.scrollHeight > previewViewport.clientHeight) {
      const maxScroll = previewViewport.scrollHeight - previewViewport.clientHeight;
      let previousFrame = performance.now();
      for (let index = 1; index <= 20; index += 1) {
        previewViewport.scrollTop = (maxScroll * index) / 20;
        await frame();
        const currentFrame = performance.now();
        scrollFrameGapsMs.push(round(currentFrame - previousFrame));
        previousFrame = currentFrame;
      }
    }

    if (modeSelect) {
      setSelectValue(modeSelect, 'responsive');
      modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector<HTMLButtonElement>('.m0-length-toggle button')?.click();
      await frame();
      await frame();
    }
    document.querySelector<HTMLButtonElement>('.m0-dock button:nth-child(1)')?.click();
    await frame();
    const sortedGaps = [...scrollFrameGapsMs].sort((a, b) => a - b);
    return {
      environment: 'Chromium E2E; Vite dev server; CSS viewport 390×844',
      navigation: navigation
        ? {
            responseStartMs: round(navigation.responseStart),
            domContentLoadedMs: round(navigation.domContentLoadedEventEnd),
            loadEventMs: round(navigation.loadEventEnd),
          }
        : null,
      firstContentfulPaintMs: firstContentfulPaint ? round(firstContentfulPaint.startTime) : null,
      editorPreviewPaintResponseMs: transitionFramesMs,
      previewModePaintResponse: previewModes,
      longPreviewScrollFrameGapsMs: scrollFrameGapsMs,
      longPreviewScrollFrameGapP95Ms:
        sortedGaps.length > 0 ? sortedGaps[Math.ceil(sortedGaps.length * 0.95) - 1] : null,
      resourceTiming: (() => {
        const total = { count: 0, transferSizeBytes: 0, encodedBodyBytes: 0 };
        for (const entry of performance.getEntriesByType('resource')) {
          if (!/\.(?:js|css)(?:\?|$)/.test(entry.name)) continue;
          const resource = entry as PerformanceResourceTiming;
          total.count += 1;
          total.transferSizeBytes += resource.transferSize;
          total.encodedBodyBytes += resource.encodedBodySize;
        }
        return total;
      })(),
    };
  });

const geometryViewports: Array<[number, number]> = [
  [320, 568],
  [320, 844],
  [360, 800],
  [390, 844],
  [393, 852],
  [430, 932],
  [768, 1024],
  [844, 390],
];
const geometryBaselines: Record<
  string,
  { completeVisibleFieldCount: number; partialVisibleFieldCount: number }
> = {
  '320x568': { completeVisibleFieldCount: 1, partialVisibleFieldCount: 1 },
  '320x844': { completeVisibleFieldCount: 4, partialVisibleFieldCount: 1 },
  '360x800': { completeVisibleFieldCount: 4, partialVisibleFieldCount: 1 },
  '390x844': { completeVisibleFieldCount: 4, partialVisibleFieldCount: 1 },
  '393x852': { completeVisibleFieldCount: 4, partialVisibleFieldCount: 1 },
  '430x932': { completeVisibleFieldCount: 5, partialVisibleFieldCount: 0 },
  '768x1024': { completeVisibleFieldCount: 6, partialVisibleFieldCount: 0 },
  '844x390': { completeVisibleFieldCount: 2, partialVisibleFieldCount: 0 },
};
const fontLabCases: Array<[number, number, number]> = [
  [390, 844, 1],
  [390, 844, 1.5],
  [390, 844, 2],
  [320, 568, 1],
  [320, 568, 1.5],
  [320, 568, 2],
  [320, 844, 2],
  [430, 932, 2],
  [844, 390, 1],
  [844, 390, 1.5],
];

test('M0 first-screen fields and Lab geometry use complete visibility measurements', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await mkdir(artifactRoot, { recursive: true });
  const evidence = {
    sourceHead: process.env.M0_GEOMETRY_HEAD ?? 'local-unrecorded',
    editorFirstScreen: [] as Awaited<ReturnType<typeof measureM0Page>>[],
    fontLabMatrix: [] as Array<{
      viewport: { width: number; height: number };
      fontScale: number;
      labOnEntry: Awaited<ReturnType<typeof measureM0Page>>;
      labAfterScroll: Awaited<ReturnType<typeof measureM0Page>> | null;
      labAfterKeyboard: Awaited<ReturnType<typeof measureM0Page>>;
      labOpen: Awaited<ReturnType<typeof measureM0Page>>;
      editorAfterLab: Awaited<ReturnType<typeof measureM0Page>>;
    }>,
  };

  for (const [width, height] of geometryViewports) {
    await page.setViewportSize({ width, height });
    await page.goto('/design/mobile-compact');
    const firstNameField = page.getByLabel(/姓名|Name/);
    await expect(firstNameField).toBeVisible();
    await expect(firstNameField).toBeEnabled();
    await expect(firstNameField).toBeEditable();
    await expect(firstNameField).toBeInViewport();
    await firstNameField.click();
    await expect(firstNameField).toBeFocused();
    expect(await page.locator('.m0-lab-trigger').count()).toBe(0);
    const measurement = await measureM0Page(page, width + 'x' + height + '-editor-100%');
    const baseline = geometryBaselines[`${width}x${height}`];
    expect(baseline, `Missing geometry baseline for ${width}x${height}`).toBeDefined();
    expect(measurement.completeVisibleFieldCount).toBeGreaterThanOrEqual(
      baseline!.completeVisibleFieldCount,
    );
    expect(measurement.partialVisibleFieldCount).toBe(baseline!.partialVisibleFieldCount);
    expect(measurement.obscuredFieldCount).toBe(0);
    expect(measurement.document.horizontalOverflow).toBe(0);
    expect(measurement.firstEditableField).not.toBeNull();
    expect(measurement.firstEditableField?.complete).toBe(true);
    expect(measurement.firstEditableField?.relativeToHeaderPx).toBeGreaterThanOrEqual(0);
    expect(measurement.firstEditableField?.visibleAreaRatio).toBeGreaterThanOrEqual(0.99);
    expect(measurement.firstEditableField?.hitTesting.passed).toBe(true);
    evidence.editorFirstScreen.push(measurement);
    if (width === 320 && height === 568) {
      await page.screenshot({
        path: artifactRoot + '/geometry-editor-320x568-100.png',
        fullPage: false,
        animations: 'disabled',
      });
    }
    if (width === 390 && height === 844) {
      await page.screenshot({
        path: artifactRoot + '/geometry-editor-390x844-100.png',
        fullPage: false,
        animations: 'disabled',
      });
    }
  }

  for (const [width, height, fontScale] of fontLabCases) {
    await page.setViewportSize({ width, height });
    await page.goto('/design/mobile-compact?lab=1&font=' + fontScale);
    await expect(page.getByLabel(/姓名|Name/)).toBeVisible();
    const shouldCapture =
      fontScale === 2 && ((width === 390 && height === 844) || (width === 320 && height === 568));
    const shouldExerciseScroll = width === 320 && height === 568 && fontScale === 2;
    let labAfterScroll: Awaited<ReturnType<typeof measureM0Page>> | null = null;

    await expect(page.locator('.m0-lab')).toHaveCount(0);
    await page.locator('.m0-lab-trigger').click();
    await expect(page.locator('.m0-lab-screen')).toBeVisible();
    const labOnEntry = await measureM0Page(
      page,
      width + 'x' + height + '-font-' + fontScale + '-lab-on-entry',
    );
    await expect(page.locator('#m0-lab-title')).toBeFocused();
    expect(labOnEntry.lab.controlRects).toHaveLength(4);
    const initiallyVisibleControls = labOnEntry.lab.controlRects.filter(
      (control) => control.centerWithinVisibleRegion,
    );
    if (shouldExerciseScroll) {
      expect(labOnEntry.main?.scrollTop).toBe(0);
      expect(labOnEntry.main?.scrollHeight).toBeGreaterThan(labOnEntry.main?.clientHeight ?? 0);
      expect(initiallyVisibleControls).toHaveLength(0);
      expect(labOnEntry.lab.controlRects.every((control) => !control.hitTesting.passed)).toBe(true);
    } else {
      expect(initiallyVisibleControls.length).toBeGreaterThan(0);
      expect(initiallyVisibleControls.every((control) => control.hitTesting.passed)).toBe(true);
    }
    if (shouldCapture) {
      await page.screenshot({
        path: artifactRoot + '/geometry-lab-' + width + 'x' + height + '-font-200-initial.png',
        fullPage: false,
        animations: 'disabled',
      });
    }

    const fontScaleControl = page.getByLabel(/字体缩放|Text scaling/);
    const languageControl = page.getByLabel(/界面语言|Interface language/);
    if (shouldExerciseScroll) {
      await page.locator('.m0-main').evaluate((main) => {
        main.scrollTo({ top: main.scrollHeight, behavior: 'instant' });
      });
      await expect
        .poll(() => page.locator('.m0-main').evaluate((main) => main.scrollTop))
        .toBeGreaterThan(0);
      labAfterScroll = await measureM0Page(
        page,
        width + 'x' + height + '-font-' + fontScale + '-lab-after-scroll',
      );
      await expect(languageControl).toBeVisible();
      await expect(languageControl).toBeInViewport();
      expect(labAfterScroll.main?.scrollTop).toBeGreaterThan(0);
      const languageControlMeasurement = labAfterScroll.lab.controlRects.find((control) =>
        control.label.includes('界面语言'),
      );
      expect(languageControlMeasurement?.centerWithinVisibleRegion).toBe(true);
      expect(languageControlMeasurement?.hitTesting.passed).toBe(true);
      expect(labAfterScroll.document.horizontalOverflow).toBe(0);
    }

    if (
      (fontScale === 2 &&
        ((width === 390 && height === 844) || (width === 320 && height === 568))) ||
      (width === 844 && height === 390 && fontScale === 1.5)
    ) {
      await page.locator('#m0-lab-title').focus();
      await expect(page.locator('#m0-lab-title')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(fontScaleControl).toBeFocused();
      await expect(fontScaleControl).toBeInViewport();
      await page.keyboard.press('Tab');
      const keyboardControl = page.getByLabel(/软键盘占用模拟|Software keyboard preview/);
      await expect(keyboardControl).toBeFocused();
      await expect(keyboardControl).toBeInViewport();
      await page.keyboard.press('Tab');
      const themeControl = page.getByLabel(/深色|Dark/);
      await expect(themeControl).toBeFocused();
      await expect(themeControl).toBeInViewport();
      await page.keyboard.press('Tab');
      await expect(languageControl).toBeFocused();
      await expect(languageControl).toBeInViewport();
      await page.keyboard.press('Tab');
      const closeLabButton = page.locator('.m0-lab-close');
      await expect(closeLabButton).toBeFocused();
      await expect(closeLabButton).toBeInViewport();
      await page.keyboard.press('Shift+Tab');
      await expect(languageControl).toBeFocused();
      await expect(languageControl).toBeInViewport();
      await page.keyboard.press('Tab');
      await expect(closeLabButton).toBeFocused();
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => Boolean(document.activeElement?.closest('.m0-lab-screen'))),
      ).toBe(false);
    }
    const labAfterKeyboard = await measureM0Page(
      page,
      width + 'x' + height + '-font-' + fontScale + '-lab-after-keyboard',
    );
    if (shouldCapture) {
      await page.screenshot({
        path: artifactRoot + '/geometry-lab-' + width + 'x' + height + '-font-200-keyboard.png',
        fullPage: false,
        animations: 'disabled',
      });
    }

    await fontScaleControl.selectOption(String(fontScale));
    const labOpen = await measureM0Page(
      page,
      width + 'x' + height + '-font-' + fontScale + '-lab-screen',
    );
    expect(labOpen.document.horizontalOverflow).toBe(0);
    await expect(page.locator('.m0-dock')).toBeHidden();
    expect(labOpen.fields).toHaveLength(0);
    const visibleLabControls = labOpen.lab.controlRects.filter(
      (control) => control.centerWithinVisibleRegion,
    );
    expect(visibleLabControls.length).toBeGreaterThan(0);
    expect(visibleLabControls.every((control) => control.hitTesting.passed)).toBe(true);
    if (shouldCapture) {
      await page.screenshot({
        path: artifactRoot + '/geometry-lab-' + width + 'x' + height + '-font-200-final.png',
        fullPage: false,
        animations: 'disabled',
      });
    }
    await page.locator('.m0-lab-close').click();
    await expect(page.getByLabel(/姓名|Name/)).toBeVisible();
    const editorAfterLab = await measureM0Page(
      page,
      width + 'x' + height + '-font-' + fontScale + '-editor-after-lab',
    );

    expect(editorAfterLab.document.horizontalOverflow).toBe(0);
    expect(editorAfterLab.main?.scrollTop).toBe(0);
    evidence.fontLabMatrix.push({
      viewport: { width, height },
      fontScale,
      labOnEntry,
      labAfterScroll,
      labAfterKeyboard,
      labOpen,
      editorAfterLab,
    });
  }

  const label = process.env.M0_GEOMETRY_LABEL ?? 'current';
  await writeFile(artifactRoot + '/geometry-' + label + '.json', JSON.stringify(evidence, null, 2));
});

test('M0 preserves edited content across preview fixtures, modes, and locale changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const protectedKeys = ['inkless-cat/resume-store', 'inkless-cat/ui-store'];
    for (const key of protectedKeys) localStorage.setItem(key, `m0-sentinel:${key}`);
    const state = globalThis as typeof globalThis & { __m0StoreWrites?: string[] };
    state.__m0StoreWrites = [];
    const originalSetItem = Storage.prototype.setItem.bind(localStorage);
    Storage.prototype.setItem = function (key: string, value: string) {
      if (protectedKeys.includes(key)) state.__m0StoreWrites?.push(key);
      return originalSetItem(key, value);
    };
  });
  await page.goto('/design/mobile-compact?lab=1');

  const edited = {
    name: 'Round Two Name',
    title: 'Principal Product Designer',
    email: 'round-two@example.test',
  };
  await page.getByLabel('姓名').fill(edited.name);
  await page.getByLabel('头衔').fill(edited.title);
  await page.getByLabel('邮箱').fill(edited.email);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText(edited.name);
  await expect(page.locator('.m0-preview-content')).toContainText(edited.email);

  await page.getByRole('button', { name: '约三页内容' }).click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText('林岚');
  await expect
    .poll(() =>
      page.locator('[data-m0-section="experience"]:not([data-m0-item="__section__"])').count(),
    )
    .toBe(6);
  const previewMode = page.getByLabel('预览实验方案');
  for (const mode of ['responsive', 'fixed', 'reader'] as const) {
    await previewMode.selectOption(mode);
    await expect(page.locator('.m0-paper-viewport')).toHaveAttribute('data-preview-mode', mode);
  }

  await page.locator('.m0-lab-trigger').click();
  await expect(page.locator('.m0-lab-screen')).toBeVisible();
  await page.getByLabel('界面语言').selectOption('en');
  await page.locator('.m0-lab-close').click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText('Morgan Lee');
  await page.getByRole('button', { name: 'One page' }).click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText(edited.name);

  await page.locator('.m0-lab-trigger').click();
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.locator('.m0-lab-close').click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText(edited.name);
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(page.getByLabel('姓名')).toHaveValue(edited.name);
  await expect(page.getByLabel('头衔')).toHaveValue(edited.title);
  await expect(page.getByLabel('邮箱')).toHaveValue(edited.email);

  expect(
    await page.evaluate(
      () => (globalThis as typeof globalThis & { __m0StoreWrites?: string[] }).__m0StoreWrites,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() => ({
      resume: localStorage.getItem('inkless-cat/resume-store'),
      ui: localStorage.getItem('inkless-cat/ui-store'),
    })),
  ).toEqual({
    resume: 'm0-sentinel:inkless-cat/resume-store',
    ui: 'm0-sentinel:inkless-cat/ui-store',
  });
});

test('M0 selected custom template updates the real preview and deletion falls back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/design/mobile-compact');
  await page.locator('.m0-entry-card').first().click();

  const creationForm = page.locator('.m0-management-screen form');
  await creationForm.locator('input[type="text"]').first().fill('M0 Round 2 template');
  await creationForm.locator('select').selectOption('custom');
  const creationColors = creationForm.locator('input[type="color"]');
  await creationColors.nth(0).fill('#445566');
  await creationColors.nth(1).fill('#fefaf0');
  await creationColors.nth(2).fill('#331122');
  await creationForm.getByRole('button', { name: '保存当前简历为模板' }).click();

  const activeTemplate = page
    .locator('[data-template-id]')
    .filter({ hasText: 'M0 Round 2 template' });
  await expect(activeTemplate.getByRole('radio')).toBeChecked();
  const activeTemplateId = await activeTemplate.getAttribute('data-template-id');
  expect(activeTemplateId).toBeTruthy();
  const activeTemplateCard = page.locator(`[data-template-id="${activeTemplateId}"]`);
  await activeTemplateCard.locator('input[type="color"]').nth(0).fill('#123456');
  await activeTemplateCard.locator('input[type="color"]').nth(1).fill('#fff0e0');
  await activeTemplateCard.locator('input[type="color"]').nth(2).fill('#112233');
  const activeTemplateName = activeTemplateCard.locator('input[type="text"]').first();
  await activeTemplateName.fill('M0 Round 2 selected');
  await activeTemplateName.press('Tab');
  await activeTemplateCard.locator('select').selectOption('creative');
  await expect(activeTemplateCard).toContainText('M0 Round 2 selected');
  await expect(page.locator('.m0-current-template strong')).toHaveText('M0 Round 2 selected');

  await page.getByRole('button', { name: /返回编辑/ }).click();
  await page.getByRole('button', { name: '预览', exact: true }).click();
  const renderer = page.locator('.m0-preview-content .resume-preview');
  await expect(renderer).toHaveClass(/from-rose-50/);
  await expect(renderer.locator('h1')).toHaveCSS('color', 'rgb(17, 34, 51)');
  await expect(renderer).toHaveCSS('background-color', 'rgb(255, 240, 224)');
  await expect(renderer.locator('section > div > span').first()).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
  await capture(page, '390-template-modified-preview');

  const selectedPreview = await renderer.evaluate((article) => ({
    className: article.className,
    backgroundColor: getComputedStyle(article).backgroundColor,
    headingColor: getComputedStyle(article.querySelector('h1')!).color,
    accentColor: getComputedStyle(article.querySelector('section > div > span')!).backgroundColor,
  }));
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.locator('.m0-entry-card').first().click();
  const unselectedTemplate = page.locator('[data-template-id="m0-custom"]');
  await expect(unselectedTemplate.getByRole('radio')).not.toBeChecked();
  await unselectedTemplate.locator('input[type="color"]').first().fill('#00aa88');
  await page.getByRole('button', { name: /返回编辑/ }).click();
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect
    .poll(() =>
      renderer.evaluate((article) => ({
        className: article.className,
        backgroundColor: getComputedStyle(article).backgroundColor,
        headingColor: getComputedStyle(article.querySelector('h1')!).color,
        accentColor: getComputedStyle(article.querySelector('section > div > span')!)
          .backgroundColor,
      })),
    )
    .toEqual(selectedPreview);

  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.locator('.m0-entry-card').first().click();
  await activeTemplateCard.getByRole('button', { name: '删除', exact: true }).click();
  const deleteDialog = page.getByRole('alertdialog', { name: '删除这个演示模板？' });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: '删除模板', exact: true }).click();
  await expect(activeTemplateCard).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '现代蓝' })).toBeChecked();
  await page.getByRole('button', { name: /返回编辑/ }).click();
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.m0-preview-content .resume-preview')).toHaveClass(/bg-white\/90/);
});

test('Mobile Compact Studio M0 interaction, viewport and A4 experiment evidence', async ({
  page,
}) => {
  await mkdir(artifactRoot, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const productionAppRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/src/App.tsx')) productionAppRequests.push(request.url());
  });
  await page.addInitScript(() => {
    localStorage.setItem('inkless-cat/resume-store', 'm0-resume-sentinel');
    localStorage.setItem('inkless-cat/ui-store', 'm0-ui-sentinel');
    localStorage.setItem('inkless-cat-locale', 'en');
    const state = globalThis as typeof globalThis & { __m0StoreReads?: string[] };
    state.__m0StoreReads = [];
    const originalGetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')
      ?.value as (this: Storage, key: string) => string | null;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'inkless-cat/resume-store' || key === 'inkless-cat/ui-store') {
        state.__m0StoreReads?.push(key);
      }
      return Reflect.apply(originalGetItem, this, [key]);
    };
  });
  await page.goto('/design/mobile-compact?lab=1');
  expect(productionAppRequests).toEqual([]);
  expect(
    await page.evaluate(
      () => (globalThis as typeof globalThis & { __m0StoreReads?: string[] }).__m0StoreReads ?? [],
    ),
  ).toEqual([]);
  await expect(page.getByText('合成数据 · 不连接 AI')).toBeVisible();
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');
  expect(
    await page.evaluate(() => ({
      resume: localStorage.getItem('inkless-cat/resume-store'),
      ui: localStorage.getItem('inkless-cat/ui-store'),
      locale: localStorage.getItem('inkless-cat-locale'),
    })),
  ).toEqual({
    resume: 'm0-resume-sentinel',
    ui: 'm0-ui-sentinel',
    locale: 'en',
  });
  const performanceEvidence = await measurePerformance(page);
  await capture(page, '390-editor-first-screen');
  await page.locator('.m0-avatar-row input[type=file]').setInputFiles({
    name: 'synthetic-avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/+XcAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.m0-avatar-upload img')).toBeVisible();
  await expect(page.locator('.m0-avatar-upload img')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  await page.getByRole('button', { name: '移除照片' }).click();
  await expect(page.locator('.m0-avatar-upload img')).toHaveCount(0);

  const geometry: Awaited<ReturnType<typeof measureM0Page>>[] = [];
  geometry.push(await measureM0Page(page, '390x844-editor-first-screen'));
  await page
    .locator('.m0-main')
    .evaluate((node) => node.scrollTo({ top: 560, behavior: 'instant' }));
  await capture(page, '390-editor-scrolled');
  geometry.push(await measureM0Page(page, '390x844-editor-scrolled'));
  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.getByText(/A4 风格边界/)).toBeVisible();
  await capture(page, '390-preview-responsive');
  geometry.push(await measureM0Page(page, '390x844-preview-responsive'));

  const modeSelect = page.getByLabel('预览实验方案');
  await modeSelect.selectOption('fixed');
  await expect(page.locator('.m0-paper-scale')).toHaveCSS('width', '794px');
  await capture(page, '390-preview-fixed-a4-scale');
  geometry.push(await measureM0Page(page, '390x844-preview-fixed-a4-scale'));
  await modeSelect.selectOption('reader');
  await page.getByRole('button', { name: '放大阅读' }).click();
  await capture(page, '390-preview-reader-zoom');
  geometry.push(await measureM0Page(page, '390x844-preview-reader-zoom'));
  await page.getByRole('button', { name: '单页' }).click();
  await page.getByRole('button', { name: '约三页内容' }).click();
  await capture(page, '390-preview-approx-three-page-resume');
  geometry.push(await measureM0Page(page, '390x844-preview-long-resume'));

  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const moreTriggerForSheet = page.getByRole('button', { name: '更多操作' });
  await moreTriggerForSheet.click();
  const sheet = page.getByRole('dialog', { name: '更多操作' });
  const sheetScroll = sheet.locator('.m0-sheet-scroll');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: '更多操作' })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: '文件' })).toBeVisible();
  await expect(page.locator('[data-action-first]')).toBeFocused();
  await expect(page.locator('[data-action-first]')).toBeInViewport();
  expect(await sheetScroll.evaluate((node) => node.scrollTop)).toBe(0);
  await capture(page, '390-action-sheet-first-open');
  geometry.push(await measureM0Page(page, '390x844-action-sheet-first-open'));

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '导出 JSON' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-action-first]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(sheet.getByRole('button', { name: '关闭' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(sheet.getByRole('link', { name: 'GitHub 项目' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: '关闭' })).toBeFocused();
  await expect(sheet.locator(':focus')).toBeInViewport();
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(
    true,
  );
  await capture(page, '390-action-sheet-after-keyboard');
  geometry.push(await measureM0Page(page, '390x844-action-sheet-after-keyboard'));

  await sheetScroll.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect.poll(() => sheetScroll.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(sheet.getByRole('link', { name: 'GitHub 项目' })).toBeInViewport();
  await capture(page, '390-action-sheet-bottom');
  geometry.push(await measureM0Page(page, '390x844-action-sheet-bottom'));

  await sheet.getByRole('button', { name: '关闭' }).click();
  await expect(sheet).toBeHidden();
  await expect(moreTriggerForSheet).toBeFocused();
  await moreTriggerForSheet.click();
  await expect(sheet).toBeVisible();
  await expect.poll(() => sheetScroll.evaluate((node) => node.scrollTop)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(moreTriggerForSheet).toBeFocused();
  await moreTriggerForSheet.click();
  await expect(sheet).toBeVisible();
  await expect.poll(() => sheetScroll.evaluate((node) => node.scrollTop)).toBe(0);
  await page.mouse.click(8, 80);
  await expect(sheet).toBeHidden();
  await expect(moreTriggerForSheet).toBeFocused();

  let downloadCount = 0;
  page.on('download', () => {
    downloadCount += 1;
  });
  for (const label of ['导出 JSON', '导出 Workspace JSON', '导出 Markdown', '打印 / PDF']) {
    await page.getByRole('button', { name: '更多操作' }).click();
    await expect(sheet).toBeVisible();
    await page.getByRole('button', { name: label }).click();
    await expect(sheet).toBeHidden();
  }
  expect(downloadCount).toBe(0);

  const aiShortcut = page.locator('.m0-ai');
  await aiShortcut.click();
  const aiAction = page.locator('[data-action-ai]');
  await expect(sheet).toBeVisible();
  await expect(aiAction).toBeFocused();
  await expect(aiAction).toBeInViewport();
  await capture(page, '390-ai-shortcut-action-sheet');
  await aiAction.click();
  await expect(sheet).toBeHidden();
  await expect(aiShortcut).toBeFocused();
  await expect(page.getByRole('status')).toContainText('不调用 AI');

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();

  const moreTrigger = page.getByRole('button', { name: '更多操作' });
  const moreTriggerBounds = await moreTrigger.boundingBox();
  if (!moreTriggerBounds) {
    throw new Error('More trigger must be visible before opening the action sheet');
  }
  await moreTrigger.click();
  // A native modal blocks pointer events on the underlying button. Tapping the
  // same screen position reaches the dialog backdrop, which dismisses the sheet.
  await page.mouse.click(
    moreTriggerBounds.x + moreTriggerBounds.width / 2,
    moreTriggerBounds.y + moreTriggerBounds.height / 2,
  );
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('button', { name: 'AI Provider 设置' }).click();
  const providerDialog = page.getByRole('dialog', { name: 'AI Provider 设置（演示）' });
  await expect(sheet).toBeHidden();
  await expect(providerDialog).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await expect(page.getByLabel('API Key')).toBeDisabled();
  await expect(page.getByRole('button', { name: '关闭设置' })).toBeFocused();
  await capture(page, '390-ai-provider-dialog-demo');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '返回编辑原型' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '关闭设置' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(providerDialog).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();

  await page.getByRole('button', { name: '更多操作' }).click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '导入' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'synthetic-resume.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('status')).toContainText('文件选择器已返回');
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('button', { name: '重置演示内容' }).click();
  const resetDialog = page.getByRole('alertdialog', { name: '重置演示内容？' });
  await expect(resetDialog).toBeVisible();
  await expect(resetDialog.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(resetDialog.getByRole('button', { name: '重置演示内容' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(resetDialog.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(resetDialog).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');

  await page.getByLabel('姓名').fill('待重置的演示姓名');
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('button', { name: '重置演示内容' }).click();
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByRole('button', { name: '重置演示内容' }).click();
  await expect(resetDialog).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');
  await expect(page.getByRole('status')).toContainText('演示内容已重置');

  await page.getByLabel('姓名').fill('载入示例前的编辑内容');
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('button', { name: '载入示例' }).click();
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');
  await expect(page.getByRole('status')).toContainText('本地合成示例已载入');
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();

  await page.locator('.m0-entry-card').first().click();
  await expect(page.getByRole('heading', { name: '模板与样式' })).toBeVisible();
  await capture(page, '390-template-management');
  geometry.push(await measureM0Page(page, '390x844-template-management'));
  await page.getByPlaceholder('例如：深色商务模板').fill('M0 试验模板');
  await page.getByRole('button', { name: '保存当前简历为模板' }).click();
  const demoTemplate = page.locator('[data-template-id]').filter({ hasText: 'M0 试验模板' });
  await expect(demoTemplate.getByRole('radio')).toBeChecked();
  await demoTemplate.getByRole('button', { name: '删除', exact: true }).click();
  const templateDeleteDialog = page.getByRole('alertdialog', { name: '删除这个演示模板？' });
  await expect(templateDeleteDialog).toBeVisible();
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '删除模板', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(templateDeleteDialog).toBeHidden();
  await expect(demoTemplate.getByRole('button', { name: '删除', exact: true })).toBeFocused();
  await demoTemplate.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '删除模板', exact: true }).click();
  await expect(demoTemplate).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '现代蓝' })).toBeFocused();
  await page.getByRole('radio', { name: /暗黑质感/ }).check();
  await page.getByRole('button', { name: /返回编辑/ }).click();
  await expect(page.getByText(/暗黑质感/)).toBeVisible();
  await expect(page.locator('[data-m0-entry="templates"]')).toBeFocused();
  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.locator('.m0-paper')).toBeVisible();
  await capture(page, '390-preview-classic-template');
  geometry.push(await measureM0Page(page, '390x844-preview-classic-template'));
  await page.getByRole('button', { name: '编辑', exact: true }).click();

  await page.locator('.m0-entry-card').nth(1).click();
  await expect(page.getByRole('heading', { name: '模块管理', level: 2 })).toBeVisible();
  await capture(page, '390-module-management');
  geometry.push(await measureM0Page(page, '390x844-module-management'));
  await page.getByRole('button', { name: '收起模块管理' }).click();
  await expect(page.getByTestId('section-sort-list')).toBeHidden();
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect(page.getByTestId('section-sort-list')).toBeVisible();
  const orderRows = page.locator('[data-testid="section-sort-list"] > li');
  const beforeOrder = await orderRows.evaluateAll((rows) =>
    rows.map((row) => (row as HTMLElement).dataset.sectionKey),
  );
  await page.locator('[data-section-key="experience"] [data-move-direction="down"]').click();
  const movedOrder = await orderRows.evaluateAll((rows) =>
    rows.map((row) => (row as HTMLElement).dataset.sectionKey),
  );
  expect(movedOrder).not.toEqual(beforeOrder);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect
    .poll(() =>
      orderRows.evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.sectionKey)),
    )
    .toEqual(beforeOrder);
  const experienceToggle = page
    .locator('.m0-management-screen label')
    .filter({ hasText: '工作经历' })
    .getByRole('button');
  await experienceToggle.click();
  await expect(experienceToggle).toHaveAttribute('aria-pressed', 'false');
  await experienceToggle.click();
  await expect(experienceToggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '新增模块', exact: true }).click();
  await expect(page.getByTestId('section-sort-list').getByText('新的演示模块')).toBeVisible();
  await page.getByRole('button', { name: '跳转到工作经历' }).click();
  await expect(page.getByLabel('姓名')).toBeVisible();
  await expect(page.getByLabel('公司')).toBeFocused();

  const nameBeforeLab = await page.getByLabel('姓名').inputValue();
  const templateBeforeLab =
    (await page.locator('.m0-entry-card').first().locator('small').textContent()) ?? '';
  const moduleCountBeforeLab =
    (await page.locator('.m0-entry-card').nth(1).locator('small').textContent()) ?? '';
  await page.locator('.m0-lab-trigger').click();
  await expect(page.locator('.m0-lab-screen')).toBeVisible();
  await page.getByLabel('界面语言').selectOption('en');
  await page.locator('.m0-lab-close').click();
  await expect(page.getByLabel('Name')).toHaveValue(nameBeforeLab);
  const templateAfterLab =
    (await page.locator('.m0-entry-card').first().locator('small').textContent()) ?? '';
  const moduleCountAfterLab =
    (await page.locator('.m0-entry-card').nth(1).locator('small').textContent()) ?? '';
  expect(templateAfterLab.split(' · ')[0]).toBe(templateBeforeLab.split(' · ')[0]);
  expect(moduleCountAfterLab.match(/\d+/)?.[0]).toBe(moduleCountBeforeLab.match(/\d+/)?.[0]);
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: '~3-page content' }).click();
  await capture(page, '390-preview-english-three-page-content');
  geometry.push(await measureM0Page(page, '390x844-preview-english-long'));
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const englishNameBeforeSwitch = await page.getByLabel('Name').inputValue();
  await page.locator('.m0-lab-trigger').click();
  await expect(page.getByLabel('Interface language')).toBeVisible();
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.getByLabel('字体缩放').selectOption('1.5');
  await expect(page.locator('.m0-app')).toHaveAttribute('data-font-scale', '1.5');
  await page.locator('.m0-lab-close').click();
  await expect(page.getByLabel('姓名')).toHaveValue(englishNameBeforeSwitch);
  await expect(page.locator('.m0-brand-copy strong')).toHaveCSS('white-space', 'normal');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth),
  ).toBe(true);
  await capture(page, '390-font-scale-150');
  await page.locator('.m0-lab-trigger').click();
  await page.getByLabel('字体缩放').selectOption('2');
  await expect(page.locator('.m0-app')).toHaveAttribute('data-font-scale', '2');
  await page.locator('.m0-lab-close').click();
  expect(
    await page.locator('.m0-header').evaluate((header) => header.getBoundingClientRect().height),
  ).toBeGreaterThan(60);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth),
  ).toBe(true);
  expect(
    await page.locator('.m0-dock button').evaluateAll((buttons) =>
      buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    ),
  ).toBe(true);
  await capture(page, '390-font-scale-200');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth),
  ).toBe(true);
  await capture(page, '320-font-scale-200');
  geometry.push(await measureM0Page(page, '320x844-editor-font-200'));
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth),
  ).toBe(true);
  expect(
    await page.locator('.m0-dock button').evaluateAll((buttons) =>
      buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    ),
  ).toBe(true);
  await capture(page, '320-font-scale-200-568');
  geometry.push(await measureM0Page(page, '320x568-editor-font-200'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.m0-lab-trigger').click();
  await page.getByLabel('字体缩放').selectOption('1');
  await page.getByLabel('深色').check();
  await page.locator('.m0-lab-close').click();
  await capture(page, '390-dark-theme');
  await page.locator('.m0-lab-trigger').click();
  await page.getByLabel('深色').uncheck();
  await page.getByLabel('软键盘占用模拟（非 iPhone）').check();
  await page.locator('.m0-lab-close').click();
  await expect(page.locator('.m0-keyboard-sim')).toBeVisible();
  await expect(page.locator('.m0-dock')).toBeHidden();
  await capture(page, '390-keyboard-occupancy-simulation');
  await page.locator('.m0-lab-trigger').click();
  await page.getByLabel('软键盘占用模拟（非 iPhone）').uncheck();
  await page.locator('.m0-lab-close').click();
  await expect(page.locator('.m0-keyboard-sim')).toBeHidden();
  await expect(page.locator('.m0-dock')).toBeVisible();
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  expect(
    await page.locator('.m0-summary-card').evaluate((card) => {
      const border = getComputedStyle(card).borderTopWidth;
      return Number.parseFloat(border);
    }),
  ).toBeGreaterThanOrEqual(1);
  expect(
    await page.locator('.m0-app').evaluate((app) => {
      const duration = getComputedStyle(app.querySelector('button')!).transitionDuration;
      return Number.parseFloat(duration);
    }),
  ).toBeLessThanOrEqual(0.001);
  await capture(page, '390-forced-colors-reduced-motion');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });

  const editorViewports: Array<[number, number]> = [
    [320, 568],
    [320, 844],
    [360, 800],
    [375, 812],
    [390, 844],
    [393, 852],
    [430, 932],
    [768, 1024],
    [844, 390],
    [1024, 768],
    [1440, 900],
  ];
  for (const [width, height] of editorViewports) {
    await page.setViewportSize({ width, height });
    await page.locator('.m0-dock button').first().click();
    if (width === 320 && height === 568) await capture(page, '320-editor-320x568');
    if (width === 320 && height === 844) await capture(page, '320-editor-320x844');
    if (width === 844 && height === 390) {
      await capture(page, '844-landscape-editor');
      const landscapeGeometry = await measureM0Page(page, '844x390-landscape-editor');
      expect(landscapeGeometry.completeVisibleFieldCount).toBeGreaterThan(0);
      expect(
        await page
          .locator('.m0-field input')
          .first()
          .evaluate((input) => {
            const field = input.getBoundingClientRect();
            const main = document.querySelector('.m0-main')!.getBoundingClientRect();
            return field.top >= main.top && field.bottom <= main.bottom;
          }),
      ).toBe(true);
    }
    if (width === 1024) await capture(page, '1024-desktop-editor');
    if (width === 1440) await capture(page, '1440-desktop-editor');
    geometry.push(await measureM0Page(page, `${width}x${height}-editor`));
  }

  const previewViewports: Array<[number, number]> = [
    [320, 568],
    [390, 844],
    [768, 1024],
  ];
  for (const [width, height] of previewViewports) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: '预览' }).click();
    const modeSelect = page.getByLabel('预览实验方案');
    const experienceSection = page
      .locator('[data-m0-section="experience"][data-m0-item="__section__"]')
      .first();
    await page.getByRole('button', { name: '单页' }).click();
    const experienceItems = page.locator(
      '[data-m0-section="experience"]:not([data-m0-item="__section__"])',
    );
    await expect.poll(() => experienceItems.count()).toBe(1);

    for (const mode of ['responsive', 'fixed', 'reader'] as const) {
      await modeSelect.selectOption(mode);
      await expect
        .poll(() =>
          page.locator('.m0-paper-viewport').evaluate((viewport) => {
            const node = viewport as HTMLElement;
            return node.scrollWidth <= node.clientWidth;
          }),
        )
        .toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (mode === 'fixed') {
        await expect(page.locator('.m0-paper-scale')).toHaveCSS('width', '794px');
      }
      if (width === 320 && mode === 'responsive') await capture(page, '320-preview');
      if (width === 390) await capture(page, `390-preview-${mode}`);
      geometry.push(await measureM0Page(page, `${width}x${height}-preview-${mode}-single`));

      await experienceSection.evaluate((element) =>
        element.scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
      geometry.push(await measureM0Page(page, `${width}x${height}-preview-${mode}-section-jump`));

      await page.getByRole('button', { name: '约三页内容' }).click();
      await expect.poll(() => experienceItems.count()).toBe(6);
      await expect
        .poll(() =>
          page.locator('.m0-paper-viewport').evaluate((viewport) => {
            const node = viewport as HTMLElement;
            return node.scrollWidth <= node.clientWidth;
          }),
        )
        .toBe(true);
      if (width === 390) await capture(page, `390-preview-${mode}-three-page-content`);
      geometry.push(
        await measureM0Page(page, `${width}x${height}-preview-${mode}-three-page-content`),
      );
      await page.getByRole('button', { name: '单页' }).click();

      if (mode === 'reader' && width === 390) {
        await page.getByRole('button', { name: '放大阅读' }).click();
        await expect
          .poll(() =>
            page.locator('.m0-paper-viewport').evaluate((viewport) => {
              const node = viewport as HTMLElement;
              return node.scrollWidth <= node.clientWidth;
            }),
          )
          .toBe(true);
        await capture(page, '390-preview-reader-zoom');
        geometry.push(await measureM0Page(page, '390x844-preview-reader-zoom'));
        await page.getByRole('button', { name: '恢复适宽' }).click();
      }
    }
    await page.getByRole('button', { name: '编辑', exact: true }).click();
  }
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('dialog', { name: '更多操作' })).toBeVisible();
  await capture(page, '320-action-sheet-320x568');
  geometry.push(await measureM0Page(page, '320x568-action-sheet'));
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: '更多操作' }).click();
  const landscapeSheet = page.getByRole('dialog', { name: '更多操作' });
  await expect(landscapeSheet).toBeVisible();
  expect(
    await landscapeSheet.evaluate((dialog) => dialog.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(390);
  await capture(page, '844-landscape-action-sheet');
  geometry.push(await measureM0Page(page, '844x390-action-sheet'));
  await page.keyboard.press('Escape');

  await writeFile(`${artifactRoot}/geometry.json`, JSON.stringify(geometry, null, 2));
  await writeFile(`${artifactRoot}/performance.json`, JSON.stringify(performanceEvidence, null, 2));
  await expect(page).toHaveURL(/\/design\/mobile-compact\?lab=1$/);
});
