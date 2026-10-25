import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

const evidenceDirectory = path.resolve('docs/design/v3-d0/evidence');
mkdirSync(evidenceDirectory, { recursive: true });

async function saveScreenshot(page: Page, name: string) {
  await page.waitForTimeout(220);
  await page.screenshot({
    animations: 'disabled',
    fullPage: false,
    path: path.join(evidenceDirectory, name),
  });
}

async function enterStudio(page: Page, direction: 'a' | 'b' = 'a') {
  await page.goto(`/design/v3-d0?direction=${direction}`);
  await expect(page.locator('[data-studio-v3]')).toBeVisible();
  await expect(page.getByRole('banner').getByText('INKLESS CAT', { exact: true })).toBeVisible();
}

async function expectReadableCanvasHeader(page: Page) {
  const width = await page
    .locator('[data-testid="resume-paper"] [class*="resumeHeaderMain"]')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(width, 'the mobile resume title must retain a readable line width').toBeGreaterThan(180);
}

test.describe('Inkless-Cat V3 D0 prototype', () => {
  test('keeps the V3 stylesheet and page code off the production route entry', async ({ page }) => {
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));
    await page.goto('/');
    await expect(page.locator('[data-studio-v3]')).toHaveCount(0);
    const initialResources = await page.evaluate(() => ({
      stylesheets: [...document.styleSheets].map((sheet) => sheet.href ?? ''),
      resources: performance.getEntriesByType('resource').map((entry) => entry.name),
    }));
    expect(initialResources.stylesheets.some((url) => url.includes('studio-v3-d0'))).toBe(false);
    expect(initialResources.resources.some((url) => url.includes('studio-v3-d0'))).toBe(false);
    expect(requestedUrls.some((url) => url.includes('studio-v3-d0'))).toBe(false);
  });

  test('renders comparable PC and Mobile evidence for both directions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterStudio(page, 'a');
    await expect(page.getByRole('heading', { name: '个人信息' })).toBeVisible();
    await saveScreenshot(page, 'direction-a-desktop.png');
    await page.getByText('模块', { exact: true }).click();
    await saveScreenshot(page, 'direction-a-desktop-modules.png');
    await page.getByText('模板', { exact: true }).click();
    await saveScreenshot(page, 'direction-a-desktop-templates.png');
    await page.getByText('写作', { exact: true }).click();

    await page.getByText('B · 页面画布', { exact: true }).click();
    await expect(page.locator('[data-studio-v3]')).toHaveAttribute('data-direction', 'pageboard');
    await expect(page.getByTestId('resume-paper')).toBeVisible();
    await saveScreenshot(page, 'direction-b-desktop.png');
    await page.getByText('结构', { exact: true }).click();
    await saveScreenshot(page, 'direction-b-desktop-modules.png');
    await page.getByText('版式', { exact: true }).click();
    await saveScreenshot(page, 'direction-b-desktop-templates.png');
    await page.getByText('画布', { exact: true }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('A · 写作桌', { exact: true }).click();
    await expect(page.locator('summary').nth(1)).toBeVisible();
    await saveScreenshot(page, 'direction-a-mobile.png');
    await page.getByText('模块', { exact: true }).click();
    await saveScreenshot(page, 'direction-a-mobile-modules.png');
    await page.getByText('模板', { exact: true }).click();
    await saveScreenshot(page, 'direction-a-mobile-templates.png');
    await page.getByText('写作', { exact: true }).click();

    await page.setViewportSize({ width: 320, height: 568 });
    await saveScreenshot(page, 'direction-a-mobile-320.png');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('B · 页面画布', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toBeVisible();
    await expectReadableCanvasHeader(page);
    await saveScreenshot(page, 'direction-b-mobile.png');
    await page.setViewportSize({ width: 320, height: 568 });
    await expectReadableCanvasHeader(page);
    await saveScreenshot(page, 'direction-b-mobile-320.png');
    await page.setViewportSize({ width: 844, height: 390 });
    await saveScreenshot(page, 'direction-b-landscape.png');
    await page.setViewportSize({ width: 390, height: 844 });

    await page.getByText('结构', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '组织简历章节' })).toBeVisible();
    await saveScreenshot(page, 'direction-b-mobile-modules.png');
    await page.getByText('版式', { exact: true }).click();
    await saveScreenshot(page, 'direction-b-mobile-templates.png');
    await page.getByText('画布', { exact: true }).click();

    await page.setViewportSize({ width: 1440, height: 900 });
    await saveScreenshot(page, 'direction-b-desktop-canvas.png');

    await page.getByText('A · 写作桌', { exact: true }).click();
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toBeVisible();
    await saveScreenshot(page, 'direction-a-desktop-preview.png');
  });

  test('supports the Draftbook editing, template, module, preview, AI, and export journey', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterStudio(page, 'a');

    const localStorageBefore = await page.evaluate(() => localStorage.length);
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:5173/')) externalRequests.push(request.url());
    });

    await page.getByLabel(/姓名/).fill('Studio Demo Name');
    await page.getByLabel(/个人简介/).fill('A short synthetic profile for the D0 review.');
    await page.getByText('工作经历', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: '工作经历' })).toBeVisible();
    await page.getByLabel('公司').fill('Edited Demo Company');
    await page.locator('[class*="editorScroll"]').evaluate((element) => {
      element.scrollTop = 240;
    });
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toContainText('Studio Demo Name');
    await expect(page.getByTestId('resume-paper')).toContainText('Edited Demo Company');
    await page.getByText('返回上次编辑位置', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '工作经历' })).toBeVisible();
    await expect(page.getByLabel('公司')).toHaveValue('Edited Demo Company');

    await page.getByText('模板', { exact: true }).click();
    await page.getByText('清晰分栏', { exact: true }).click();
    await expect(page.locator('[class*="templateCard"][data-selected="true"]')).toContainText(
      '清晰分栏',
    );
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toHaveAttribute('data-template', 'columns');

    await page.getByText('返回上次编辑位置', { exact: true }).click();
    await page.getByText('模块', { exact: true }).click();
    const experienceVisibility = page.getByRole('button', { name: '显示: 工作经历' });
    await experienceVisibility.click();
    await expect(page.getByRole('button', { name: '隐藏: 工作经历' })).toBeVisible();
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '工作经历', exact: true })).toHaveCount(0);

    await page.getByText('返回上次编辑位置', { exact: true }).click();
    await page.getByRole('button', { name: /快速跳转/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '关闭' }).click();
    await page
      .getByRole('button', { name: /AI 辅助写作/ })
      .last()
      .click();
    await expect(page.getByRole('dialog')).toContainText('不会调用模型');
    await page.getByText('查看失败状态样例', { exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('演示错误状态');
    await page.getByText('重试样例', { exact: true }).click();
    await expect(page.getByText('采纳到此字段', { exact: true })).toBeVisible();
    await page.getByText('重试样例', { exact: true }).click();
    await page.getByText('生成样例建议', { exact: true }).click();
    await expect(page.getByText('正在准备本地样例…')).toBeVisible();
    await expect(page.getByText('采纳到此字段', { exact: true })).toBeVisible();
    await page.getByText('采纳到此字段', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('样例已写入当前演示字段');

    await page.getByText('关闭', { exact: true }).click();
    await page.locator('summary').first().click();
    await page.getByText('导入简历 · 演示', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不会打开文件选择器');
    await page.getByText('关闭', { exact: true }).click();

    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByText('写作', { exact: true }).first().click();
    await page.getByText('工作经历', { exact: true }).first().click();
    const companyField = page.getByLabel('公司');
    const companyValue = await companyField.inputValue();
    await companyField.focus();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(companyField).toHaveValue(companyValue);

    await page.locator('summary').first().click();
    await page.getByText('载入短版简历演示', { exact: true }).click();
    await expect(page.locator('[class*="noticeVisible"]')).toContainText('演示内容已更新');
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).not.toContainText('Morrow Commerce');
    await page.getByText('返回上次编辑位置', { exact: true }).click();
    await page.locator('summary').first().click();
    await page.getByText('载入长版简历演示', { exact: true }).click();
    await expect(page.locator('[class*="noticeVisible"]')).toContainText('演示内容已更新');
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toContainText('Morrow Commerce');
    await page.getByText('返回上次编辑位置', { exact: true }).click();

    await page.getByText('预览', { exact: true }).click();
    await page.getByText('导出 PDF', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不会生成或下载 PDF');
    await page.getByText('关闭', { exact: true }).click();

    await expect(page.locator('[data-studio-v3]')).toHaveAttribute('data-theme', 'light');
    await page.locator('summary').first().click();
    await page.getByRole('button', { name: '深色', exact: true }).click();
    await expect(page.locator('[data-studio-v3]')).toHaveAttribute('data-theme', 'dark');
    await page.locator('summary').first().click();
    await page.getByText('Switch language to English', { exact: true }).click();
    await expect(page.getByText('Résumé preview', { exact: true })).toBeVisible();
    await expect(page.locator('[data-studio-v3]')).toHaveAttribute('data-theme', 'dark');

    expect(externalRequests).toEqual([]);
    expect(await page.evaluate(() => localStorage.length)).toBe(localStorageBefore);
  });

  test('creates demo templates and custom modules without persisting them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterStudio(page, 'a');
    const localStorageBefore = await page.evaluate(() => localStorage.length);

    await page.getByText('模板', { exact: true }).click();
    await page.getByRole('button', { name: '新增演示模板' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('模板名称').fill('D0 review layout');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.locator('[class*="noticeVisible"]')).toContainText('本地演示模板已添加');
    await expect(page.locator('[class*="templateCard"][data-selected="true"]')).toContainText(
      'D0 review layout',
    );

    await page.getByText('模块', { exact: true }).click();
    await page.getByRole('button', { name: '新增自定义模块' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('模块名称').fill('Review notes');
    await page.getByRole('button', { name: '添加', exact: true }).click();
    await expect(page.locator('[class*="noticeVisible"]')).toContainText(
      '自定义模块已添加到本页演示',
    );
    await expect(page.getByRole('heading', { name: 'Review notes' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(localStorageBefore);
  });

  test('supports Pageboard contextual editing and restores focus after Escape', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterStudio(page, 'b');
    const profileEdit = page.getByRole('button', { name: '编辑此章节: 个人信息' });
    await expect(profileEdit).toBeVisible();
    await profileEdit.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await page.getByLabel(/姓名/).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: '关闭' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    const focusBoundary = await dialog.evaluate((element) => ({
      withinDialog: element.contains(document.activeElement),
      onBaseUIFocusGuard: document.activeElement?.hasAttribute('data-base-ui-focus-guard') ?? false,
    }));
    expect(focusBoundary.withinDialog || focusBoundary.onBaseUIFocusGuard).toBe(true);
    await page.keyboard.press('Tab');
    const forwardFocusBoundary = await dialog.evaluate((element) => ({
      withinDialog: element.contains(document.activeElement),
      onBaseUIFocusGuard: document.activeElement?.hasAttribute('data-base-ui-focus-guard') ?? false,
    }));
    expect(forwardFocusBoundary.withinDialog || forwardFocusBoundary.onBaseUIFocusGuard).toBe(true);
    await page.getByLabel(/姓名/).fill('Pageboard Demo Name');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(profileEdit).toBeFocused();
    await expect(page.getByTestId('resume-paper')).toContainText('Pageboard Demo Name');

    await page.getByRole('button', { name: '编辑此章节: 工作经历' }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByText('版式', { exact: true }).click();
    await page.getByText('重点标记', { exact: true }).click();
    await page.getByText('画布', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toHaveAttribute('data-template', 'signal');

    await page.getByText('导出 PDF', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不会生成或下载 PDF');
  });

  test('completes Pageboard mobile editing, structure, layout, AI, preview, and return path', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterStudio(page, 'b');

    const profileEdit = page.getByRole('button', { name: '编辑此章节: 个人信息' });
    await profileEdit.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/姓名/).fill('Pageboard Mobile Demo');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('resume-paper')).toContainText('Pageboard Mobile Demo');
    await expect(profileEdit).toBeFocused();

    const sectionNavigation = page.getByRole('navigation', { name: '简历章节' });
    await sectionNavigation.getByRole('button', { name: /工作经历/ }).click();
    await page.waitForTimeout(180);
    const canvasScroll = page.locator('[class*="canvasScroll"]');
    const savedCanvasPosition = await canvasScroll.evaluate((element) => element.scrollTop);
    const workEdit = page.getByRole('button', { name: '编辑此章节: 工作经历' });
    await workEdit.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('公司').fill('Pageboard Mobile Labs');
    await saveScreenshot(page, 'direction-b-mobile-work-edit.png');
    await page
      .getByRole('button', { name: /AI 辅助写作/ })
      .last()
      .click();
    await expect(page.getByRole('dialog')).toContainText('不会调用模型');
    await page.getByText('生成样例建议', { exact: true }).click();
    await page.getByText('采纳到此字段', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('样例已写入当前演示字段');
    await page.getByText('关闭', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toContainText('Pageboard Mobile Labs');

    await page.getByText('结构', { exact: true }).click();
    await page.getByRole('button', { name: '下移: 工作经历' }).click();
    await expect(page.locator('[class*="noticeVisible"]')).toContainText('章节顺序已更新');
    await page.getByRole('button', { name: '显示: 工作经历' }).click();
    await expect(page.getByRole('button', { name: '隐藏: 工作经历' })).toBeVisible();
    await page.getByText('版式', { exact: true }).click();
    await page.getByText('清晰分栏', { exact: true }).click();
    await page.getByText('画布', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toHaveAttribute('data-template', 'columns');
    const restoredCanvasPosition = await canvasScroll.evaluate((element) => element.scrollTop);
    expect(Math.abs(restoredCanvasPosition - savedCanvasPosition)).toBeLessThan(3);

    await page.getByText('结构', { exact: true }).click();
    await page.getByRole('button', { name: '隐藏: 工作经历' }).click();
    await page.getByText('画布', { exact: true }).click();
    await page.getByText('导出 PDF', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不会生成或下载 PDF');
    await page.getByText('关闭', { exact: true }).click();
    await sectionNavigation.getByRole('button', { name: /工作经历/ }).click();
    await expect(page.getByRole('button', { name: '编辑此章节: 工作经历' })).toBeVisible();
    await page.getByRole('button', { name: '编辑此章节: 工作经历' }).click();
    await expect(page.getByLabel('公司')).toHaveValue('Pageboard Mobile Labs');
  });

  test('completes the focused Mobile editing journey and returns to the same entry', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterStudio(page, 'a');
    await page.locator('summary').nth(1).click();
    await page.getByText('工作经历', { exact: true }).last().click();
    await expect(page.getByRole('heading', { name: '工作经历' })).toBeVisible();
    await page.getByRole('button', { name: /经历 2/ }).click();
    await page.getByLabel('公司').fill('Mobile Demo Company');
    await saveScreenshot(page, 'mobile-work-edit.png');

    await page.getByText('模块', { exact: true }).click();
    await page.getByRole('button', { name: '下移: 工作经历' }).click();
    await expect(page.getByText('章节顺序已更新。').first()).toBeVisible();
    await page.getByRole('button', { name: '显示: 工作经历' }).click();
    await page.getByText('模板', { exact: true }).click();
    await page.getByText('清晰分栏', { exact: true }).click();
    await page.getByText('预览', { exact: true }).click();
    await expect(page.getByTestId('resume-paper')).toHaveAttribute('data-template', 'columns');
    await page.getByText('导出 PDF', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不会生成或下载 PDF');
    await page.getByText('关闭', { exact: true }).click();
    await page.getByText('返回上次编辑位置', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '工作经历' })).toBeVisible();
    await expect(page.getByLabel('公司')).toHaveValue('Mobile Demo Company');

    await page
      .getByRole('button', { name: /AI 辅助写作/ })
      .last()
      .click();
    await page.getByText('生成样例建议', { exact: true }).click();
    await page.getByText('采纳到此字段', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('样例已写入当前演示字段');
  });

  test('remains within the viewport matrix and honors reduced motion and text enlargement', async ({
    page,
  }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ];

    await enterStudio(page, 'a');
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      if (viewport.width <= 700) {
        const chapterPicker = page.locator('details[class*="mobileChapterPicker"]');
        await expect(chapterPicker.locator('nav')).toBeHidden();
      }
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        studioWidth: document.querySelector('[data-studio-v3]')?.getBoundingClientRect().width ?? 0,
        offenders: [
          ...(document.querySelector('[data-studio-v3]')?.querySelectorAll<HTMLElement>('*') ?? []),
        ]
          .filter((element) => !element.closest('[class*="canvasIndex"]'))
          // The closed native details picker is intentionally not rendered in the mobile view.
          .filter((element) => !element.closest('details:not([open])'))
          .filter((element) => {
            const rectangle = element.getBoundingClientRect();
            return rectangle.left < -1 || rectangle.right > innerWidth + 1;
          })
          .slice(0, 5)
          .map((element) => ({
            tag: element.tagName,
            className: String(element.className),
            right: element.getBoundingClientRect().right,
          })),
      }));
      expect(
        metrics.scrollWidth,
        `document overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.studioWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(
        metrics.offenders,
        `offscreen content at ${viewport.width}x${viewport.height}`,
      ).toEqual([]);
    }

    await enterStudio(page, 'b');
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        studioWidth: document.querySelector('[data-studio-v3]')?.getBoundingClientRect().width ?? 0,
        offenders: [
          ...(document.querySelector('[data-studio-v3]')?.querySelectorAll<HTMLElement>('*') ?? []),
        ]
          .filter((element) => !element.closest('[class*="canvasIndex"]'))
          .filter((element) => {
            const rectangle = element.getBoundingClientRect();
            return rectangle.left < -1 || rectangle.right > innerWidth + 1;
          })
          .slice(0, 5)
          .map((element) => ({
            tag: element.tagName,
            className: String(element.className),
            right: element.getBoundingClientRect().right,
          })),
      }));
      expect(
        metrics.scrollWidth,
        `Pageboard document overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.studioWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(
        metrics.offenders,
        `Pageboard offscreen content at ${viewport.width}x${viewport.height}`,
      ).toEqual([]);
    }

    await enterStudio(page, 'a');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('summary').nth(1)).toBeVisible();
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );
    await page
      .getByRole('button', { name: /AI 辅助写作/ })
      .last()
      .click();
    await page.getByText('生成样例建议', { exact: true }).click();
    const loadingMark = page.locator('[class*="loadingMark"]');
    await expect(loadingMark).toBeVisible();
    const loadingDuration = await loadingMark.evaluate(
      (element) => getComputedStyle(element).animationDuration,
    );
    expect(['0.00001s', '1e-05s', '0s']).toContain(loadingDuration);

    for (const direction of ['a', 'b'] as const) {
      await enterStudio(page, direction);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        const studio = page.locator('[data-studio-v3]');
        await studio.evaluate((element) => {
          (element as HTMLElement).style.removeProperty('font-size');
        });
        const originalFontSize = await studio.evaluate(
          (element) => getComputedStyle(element).fontSize,
        );
        await studio.evaluate((element) => {
          (element as HTMLElement).style.fontSize = '200%';
        });
        const enlargedFontSize = await studio.evaluate(
          (element) => getComputedStyle(element).fontSize,
        );
        expect(Number.parseFloat(enlargedFontSize)).toBeGreaterThan(
          Number.parseFloat(originalFontSize),
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `${direction.toUpperCase()} overflows at ${width}px with 200% app text`,
        ).toBeLessThanOrEqual(width);
      }
    }
    // This is a separate app-text-enlargement check; browser page zoom is tracked as a distinct pending check.
  });
});
