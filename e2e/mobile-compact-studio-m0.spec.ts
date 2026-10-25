import { mkdir, writeFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

const artifactRoot = 'test-results/mobile-compact-studio-m0';

const capture = async (page: Page, name: string) => {
  await page.screenshot({
    path: `${artifactRoot}/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
};

const measure = async (page: Page, label: string) => {
  return page.evaluate((scenario) => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
    };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const header = box('.m0-header');
    const dock = box('.m0-dock');
    const mainRect = document.querySelector<HTMLElement>('.m0-main')?.getBoundingClientRect();
    const visibleFields = [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        '.m0-field input, .m0-field textarea',
      ),
    ].filter((field) => {
      const rect = field.getBoundingClientRect();
      return (
        rect.height > 0 &&
        rect.top < Math.min(viewport.height, mainRect?.bottom ?? viewport.height) &&
        rect.bottom > Math.max(0, mainRect?.top ?? 0)
      );
    }).length;
    return {
      scenario,
      viewport,
      visualViewport: window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            scale: window.visualViewport.scale,
            offsetTop: window.visualViewport.offsetTop,
          }
        : null,
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      header,
      dock,
      visibleFields,
      editor: box('.m0-summary-card'),
      paperViewport: box('.m0-paper-viewport'),
      paperCanvas: box('.m0-paper-measure'),
      paperLayout: box('.m0-paper-scale'),
      paper: box('.m0-paper'),
      previewContentHeight:
        document.querySelector<HTMLElement>('.m0-preview-content')?.scrollHeight ?? null,
      sectionExperience: box('[data-m0-section="experience"]'),
      selectedMode:
        document.querySelector<HTMLElement>('[data-preview-mode]')?.dataset.previewMode ?? null,
      paperScroll: document.querySelector<HTMLElement>('.m0-paper-viewport')
        ? {
            top: document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollTop,
            scrollWidth: document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollWidth,
            scrollHeight: document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollHeight,
            clientWidth: document.querySelector<HTMLElement>('.m0-paper-viewport')?.clientWidth,
            clientHeight: document.querySelector<HTMLElement>('.m0-paper-viewport')?.clientHeight,
          }
        : null,
      experienceLayout: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
        ? {
            offsetTop: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
              ?.offsetTop,
            offsetHeight: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
              ?.offsetHeight,
          }
        : null,
      theme: document.querySelector('.m0-app')?.className ?? null,
      activeElement: document.activeElement?.tagName ?? null,
    };
  }, label);
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
  });
  await page.goto('/design/mobile-compact');
  expect(productionAppRequests).toEqual([]);
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
  await expect(page.locator('.m0-avatar img')).toBeVisible();
  await page.getByRole('button', { name: '移除' }).click();
  await expect(page.locator('.m0-avatar img')).toHaveCount(0);

  const geometry: Awaited<ReturnType<typeof measure>>[] = [];
  geometry.push(await measure(page, '390x844-editor-first-screen'));
  await page
    .locator('.m0-main')
    .evaluate((node) => node.scrollTo({ top: 560, behavior: 'instant' }));
  await capture(page, '390-editor-scrolled');
  geometry.push(await measure(page, '390x844-editor-scrolled'));
  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.getByText(/A4 风格边界/)).toBeVisible();
  await capture(page, '390-preview-responsive');
  geometry.push(await measure(page, '390x844-preview-responsive'));

  const modeSelect = page.getByLabel('预览实验方案');
  await modeSelect.selectOption('fixed');
  await expect(page.locator('.m0-paper-scale')).toHaveCSS('width', '794px');
  await capture(page, '390-preview-fixed-a4-scale');
  geometry.push(await measure(page, '390x844-preview-fixed-a4-scale'));
  await modeSelect.selectOption('reader');
  await page.getByRole('button', { name: '放大阅读' }).click();
  await capture(page, '390-preview-reader-zoom');
  geometry.push(await measure(page, '390x844-preview-reader-zoom'));
  await page.getByRole('button', { name: '单页' }).click();
  await page.getByRole('button', { name: '约三页内容' }).click();
  await capture(page, '390-preview-approx-three-page-resume');
  geometry.push(await measure(page, '390x844-preview-long-resume'));

  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('button', { name: '更多操作' }).click();
  const sheet = page.getByRole('dialog', { name: '更多操作' });
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('button', { name: '导出 JSON' })).toBeAttached();
  await expect(page.locator('[data-action-first]')).toBeFocused();
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
  await capture(page, '390-action-sheet-top');
  geometry.push(await measure(page, '390x844-action-sheet'));
  await page.mouse.click(8, 80);
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();

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
  await page.getByRole('button', { name: '清空简历' }).click();
  const clearDialog = page.getByRole('alertdialog', { name: '清空演示简历？' });
  await expect(clearDialog).toBeVisible();
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '清空演示内容' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(clearDialog).toBeHidden();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeFocused();
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');

  await page.locator('.m0-entry-card').first().click();
  await expect(page.getByRole('heading', { name: '模板与样式' })).toBeVisible();
  await capture(page, '390-template-management');
  geometry.push(await measure(page, '390x844-template-management'));
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
  await page.getByRole('radio', { name: /深海经典/ }).check();
  await page.getByRole('button', { name: /返回编辑/ }).click();
  await expect(page.getByText(/深海经典/)).toBeVisible();
  await expect(page.locator('[data-m0-entry="templates"]')).toBeFocused();
  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.locator('.m0-paper')).toBeVisible();
  await capture(page, '390-preview-classic-template');
  geometry.push(await measure(page, '390x844-preview-classic-template'));
  await page.getByRole('button', { name: '编辑', exact: true }).click();

  await page.locator('.m0-entry-card').nth(1).click();
  await expect(page.getByRole('heading', { name: '模块管理', level: 2 })).toBeVisible();
  await capture(page, '390-module-management');
  geometry.push(await measure(page, '390x844-module-management'));
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

  await page.locator('summary').filter({ hasText: '原型实验控制' }).click();
  await page.getByLabel('界面语言').selectOption('en');
  await expect(page.getByLabel('Name')).toHaveValue('Morgan Lee');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: '~3-page content' }).click();
  await capture(page, '390-preview-english-three-page-content');
  geometry.push(await measure(page, '390x844-preview-english-long'));
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await expect(page.getByLabel('姓名')).toHaveValue('林岚');
  await page.getByLabel('字体缩放').selectOption('1.5');
  await expect(page.locator('.m0-app')).toHaveAttribute('data-font-scale', '1.5');
  await expect(page.locator('.m0-brand-copy strong')).toHaveCSS('white-space', 'normal');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth),
  ).toBe(true);
  await capture(page, '390-font-scale-150');
  await page.getByLabel('字体缩放').selectOption('2');
  await expect(page.locator('.m0-app')).toHaveAttribute('data-font-scale', '2');
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
  geometry.push(await measure(page, '320x844-editor-font-200'));
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
  geometry.push(await measure(page, '320x568-editor-font-200'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('字体缩放').selectOption('1');
  await page.getByLabel('外观主题').check();
  await capture(page, '390-dark-theme');
  await page.getByLabel('外观主题').uncheck();
  await page.getByLabel('软键盘占用模拟（非 iPhone）').check();
  await expect(page.locator('.m0-keyboard-sim')).toBeVisible();
  await expect(page.locator('.m0-dock')).toBeHidden();
  await capture(page, '390-keyboard-occupancy-simulation');
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
    await page.getByLabel('软键盘占用模拟（非 iPhone）').uncheck();
    await page.locator('.m0-dock button').first().click();
    if (width === 320 && height === 568) await capture(page, '320-editor-320x568');
    if (width === 320 && height === 844) await capture(page, '320-editor-320x844');
    if (width === 844 && height === 390) {
      await capture(page, '844-landscape-editor');
      const landscapeGeometry = await measure(page, '844x390-landscape-editor');
      expect(landscapeGeometry.visibleFields).toBeGreaterThan(0);
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
    geometry.push(await measure(page, `${width}x${height}-editor`));
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
      geometry.push(await measure(page, `${width}x${height}-preview-${mode}-single`));

      await experienceSection.evaluate((element) =>
        element.scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
      geometry.push(await measure(page, `${width}x${height}-preview-${mode}-section-jump`));

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
      geometry.push(await measure(page, `${width}x${height}-preview-${mode}-three-page-content`));
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
        geometry.push(await measure(page, '390x844-preview-reader-zoom'));
        await page.getByRole('button', { name: '恢复适宽' }).click();
      }
    }
    await page.getByRole('button', { name: '编辑', exact: true }).click();
  }
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('dialog', { name: '更多操作' })).toBeVisible();
  await capture(page, '320-action-sheet-320x568');
  geometry.push(await measure(page, '320x568-action-sheet'));
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: '更多操作' }).click();
  const landscapeSheet = page.getByRole('dialog', { name: '更多操作' });
  await expect(landscapeSheet).toBeVisible();
  expect(
    await landscapeSheet.evaluate((dialog) => dialog.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(390);
  await capture(page, '844-landscape-action-sheet');
  geometry.push(await measure(page, '844x390-action-sheet'));
  await page.keyboard.press('Escape');

  await writeFile(`${artifactRoot}/geometry.json`, JSON.stringify(geometry, null, 2));
  await writeFile(`${artifactRoot}/performance.json`, JSON.stringify(performanceEvidence, null, 2));
  await expect(page).toHaveURL(/\/design\/mobile-compact$/);
});
