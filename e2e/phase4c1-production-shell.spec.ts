import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const editorPath = '/';
const widths = [1440, 1280, 1024, 1000, 900, 768, 390, 360, 320];

test('production shell keeps the real resume controller, preview and persistence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editorPath);

  await expect(page.getByRole('heading', { name: '编辑器' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '工作区导航' })).toBeVisible();
  await expect(page.locator('.resume-preview')).toBeVisible();

  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Phase 4C production fixture');
  await expect(page.locator('.resume-preview')).toContainText('Phase 4C production fixture');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出工作区', exact: true }).click(),
  ]);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const workspace = JSON.parse(await readFile(filePath, 'utf8')) as {
    resume: { personal: { fullName: string } };
  };
  expect(workspace.resume.personal.fullName).toBe('Phase 4C production fixture');

  await page.reload();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(
    'Phase 4C production fixture',
  );
  await expect(page.locator('.resume-preview')).toContainText('Phase 4C production fixture');
  await expect(page.getByRole('button', { name: '导出工作区', exact: true })).toBeVisible();
});

test('production panes, navigation and mobile mode agree at every supported width', async ({
  page,
}) => {
  await page.goto(editorPath);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `horizontal overflow at ${width}px`,
    ).toBeLessThanOrEqual(width);

    const desktop = width >= 1024;
    const desktopNavigation = page.getByRole('navigation', { name: '工作区导航' });
    const mobileNavigation = page.getByRole('navigation', { name: '编辑与预览切换' });
    if (desktop) {
      await expect(desktopNavigation).toBeVisible();
      await expect(mobileNavigation).toBeHidden();
    } else {
      await expect(desktopNavigation).toBeHidden();
      await expect(mobileNavigation).toBeVisible();
    }
    await expect(desktopNavigation).toHaveCount(desktop ? 1 : 0);
    await expect(mobileNavigation).toHaveCount(desktop ? 0 : 1);

    const editor = page.locator('.production-editor-pane');
    const preview = page.locator('.production-preview-pane');
    if (desktop) {
      await expect(editor).toBeVisible();
      await expect(preview).toBeVisible();
      await expect(editor).toHaveAttribute('aria-hidden', 'false');
      await expect(preview).toHaveAttribute('aria-hidden', 'false');
    } else {
      await expect(editor).toBeVisible();
      await expect(preview).toBeHidden();
      await expect(editor).toHaveAttribute('aria-hidden', 'false');
      await expect(preview).toHaveAttribute('aria-hidden', 'true');

      const switcher = mobileNavigation.getByRole('button', { name: '实时预览' });
      const bounds = await switcher.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);

      await switcher.click();
      await expect(editor).toBeHidden();
      await expect(editor).toHaveAttribute('aria-hidden', 'true');
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute('aria-hidden', 'false');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `horizontal overflow in preview mode at ${width}px`,
      ).toBeLessThanOrEqual(width);

      await mobileNavigation.getByRole('button', { name: '编辑器' }).click();
      await expect(editor).toBeVisible();
      await expect(preview).toBeHidden();
      await expect(preview).toHaveAttribute('aria-hidden', 'true');
    }

    expect(
      await page
        .locator('[aria-hidden="true"]')
        .evaluateAll((elements) =>
          elements.reduce(
            (visibleCount, element) =>
              visibleCount +
              [
                ...element.querySelectorAll<HTMLElement>(
                  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex="0"]',
                ),
              ].filter((focusable) => focusable.getClientRects().length > 0).length,
            0,
          ),
        ),
      `visible focusable controls beneath aria-hidden content at ${width}px`,
    ).toBe(0);
  }
});

test('mobile action menu keeps every operation and supports keyboard dismissal and export', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(editorPath);

  const trigger = page.getByRole('button', { name: '更多操作' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: '更多操作' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem')).toHaveCount(9);
  for (const name of [
    '载入示例',
    '清空',
    '导入',
    '导出',
    '导出工作区',
    '导出 Markdown',
    'AI 设置',
    '夜间模式',
    'English',
  ]) {
    await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible();
  }

  const menuBounds = await menu.boundingBox();
  const editorBounds = await page.locator('.production-editor-pane').boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(editorBounds).not.toBeNull();
  if (!menuBounds || !editorBounds) throw new Error('The menu and editor must be measurable');
  expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(editorBounds.y);

  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(menu.getByRole('menuitem').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  await expect(
    page
      .getByRole('navigation', { name: '编辑与预览切换' })
      .getByRole('button', { name: '编辑器' }),
  ).toBeFocused();

  await trigger.click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: '导出工作区', exact: true }).click(),
  ]);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const workspace = JSON.parse(await readFile(filePath, 'utf8')) as {
    resume: { personal: { fullName: string } };
  };
  expect(workspace.resume.personal.fullName).toBeTruthy();
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('production keyboard focus and reduced motion preferences stay visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editorPath);

  const brand = page.getByRole('link', { name: 'GitHub 仓库' });
  await page.keyboard.press('Tab');
  await expect(brand).toBeFocused();
  expect(
    await brand.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const navigationButton = page
    .getByRole('navigation', { name: '工作区导航' })
    .getByRole('button', { name: '模块管理' });
  expect(
    await navigationButton.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThan(0.001);

  const previewSurface = page.locator('.production-preview-pane');
  expect(
    await previewSurface.evaluate((element) => getComputedStyle(element).backdropFilter),
  ).not.toBe('none');
  const mediaSession = await page.context().newCDPSession(page);
  try {
    await mediaSession.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
    await expect
      .poll(async () =>
        previewSurface.evaluate((element) => getComputedStyle(element).backdropFilter),
      )
      .toBe('none');
  } finally {
    await mediaSession.detach();
  }
});

test('captures production shell visual review at desktop, tablet, mobile and print sizes', async ({
  page,
}, testInfo) => {
  const capture = async (name: string) => {
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    await testInfo.attach(name, { path, contentType: 'image/png' });
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editorPath);
  await capture('phase4c1-desktop-light');
  await page
    .getByRole('navigation', { name: '工作区导航' })
    .getByRole('button', { name: '模块管理' })
    .click();
  await capture('phase4c1-modules-panel');
  await page
    .getByRole('navigation', { name: '工作区导航' })
    .getByRole('button', { name: '模板选择' })
    .click();
  await expect(
    page.getByRole('group', { name: /选择一个简历模板/u }).getByRole('radio'),
  ).toHaveCount(4);
  await capture('phase4c1-template-panel');
  await page
    .getByRole('navigation', { name: '工作区导航' })
    .getByRole('button', { name: '实时预览' })
    .click();
  await capture('phase4c1-a4-preview');

  await page.getByRole('button', { name: '夜间模式', exact: true }).click();
  await expect(page.locator('.production-studio-root')).toHaveAttribute('data-theme', 'dark');
  await capture('phase4c1-desktop-dark');

  for (const width of [1280, 1024, 1000, 900, 768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await capture(`phase4c1-viewport-${width}`);
  }

  await page.emulateMedia({ media: 'print' });
  await capture('phase4c1-print-output');
  await page.emulateMedia({ media: 'screen' });
});
