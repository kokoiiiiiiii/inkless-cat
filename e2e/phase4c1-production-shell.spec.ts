import { readFile, writeFile } from 'node:fs/promises';

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

test('mobile action menu stays scrollable between the compact header and floating dock', async ({
  page,
}, testInfo) => {
  const measurements: Array<Record<string, unknown>> = [];

  for (const viewport of [
    { width: 320, height: 568, label: '320x568' },
    { width: 360, height: 800, label: '360x800' },
    { width: 390, height: 844, label: '390x844' },
    { width: 844, height: 390, label: '844x390' },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(editorPath);

    const topbar = page.locator('.production-topbar');
    const dock = page.getByRole('navigation', { name: '编辑与预览切换' });
    const trigger = page.getByRole('button', { name: '更多操作' });
    const headerBefore = await topbar.boundingBox();
    const triggerBounds = await trigger.boundingBox();
    expect(headerBefore).not.toBeNull();
    expect(triggerBounds?.width).toBeGreaterThanOrEqual(44);
    expect(triggerBounds?.height).toBeGreaterThanOrEqual(44);

    await trigger.click();
    const menu = page.getByRole('menu', { name: '更多操作' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveCount(9);

    const [headerOpen, menuBounds, dockBounds] = await Promise.all([
      topbar.boundingBox(),
      menu.boundingBox(),
      dock.boundingBox(),
    ]);
    expect(headerOpen).not.toBeNull();
    expect(menuBounds).not.toBeNull();
    expect(dockBounds).not.toBeNull();
    if (!headerBefore || !headerOpen || !menuBounds || !dockBounds) {
      throw new Error('The mobile header, menu, and dock must be measurable');
    }

    const menuScroll = await menu.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      maxHeight: getComputedStyle(element).maxHeight,
    }));
    const menuItemHeights = await menu
      .getByRole('menuitem')
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(menuItemHeights.every((height) => height >= 44)).toBe(true);
    const geometry = {
      viewport,
      headerHeightBefore: headerBefore.height,
      headerHeightOpen: headerOpen.height,
      moreTrigger: triggerBounds,
      moreTriggerText: await trigger.textContent(),
      menu: menuBounds,
      menuScroll,
      menuItemHeights,
      dock: dockBounds,
      documentWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    };
    measurements.push(geometry);

    const screenshotPath = testInfo.outputPath(`phase4c1-mobile-menu-${viewport.label}.png`);
    await page.screenshot({ path: screenshotPath, animations: 'disabled' });
    await testInfo.attach(`phase4c1-mobile-menu-${viewport.label}.png`, {
      path: screenshotPath,
      contentType: 'image/png',
    });

    expect(Math.abs(headerOpen.height - headerBefore.height)).toBeLessThanOrEqual(1);
    expect(menuBounds.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(viewport.width);
    expect(menuBounds.y).toBeGreaterThanOrEqual(headerOpen.y + headerOpen.height);
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(dockBounds.y - 8);
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 320) {
      expect(menuScroll.scrollHeight).toBeGreaterThan(menuScroll.clientHeight);
      for (let itemIndex = 0; itemIndex < 9; itemIndex += 1) {
        const menuItem = menu.getByRole('menuitem').nth(itemIndex);
        await expect(menuItem).toBeFocused();
        const itemBounds = await menuItem.boundingBox();
        expect(itemBounds).not.toBeNull();
        if (!itemBounds) throw new Error(`Menu item ${itemIndex + 1} must be measurable`);
        expect(itemBounds.y).toBeGreaterThanOrEqual(menuBounds.y);
        expect(itemBounds.y + itemBounds.height).toBeLessThanOrEqual(
          menuBounds.y + menuBounds.height,
        );
        if (itemIndex < 8) await page.keyboard.press('ArrowDown');
      }
      await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo(0, 120));
      await expect
        .poll(async () => {
          const bounds = await topbar.boundingBox();
          return Math.round(bounds?.y ?? -1);
        })
        .toBe(8);
      const [scrolledMenu, scrolledDock] = await Promise.all([
        menu.boundingBox(),
        dock.boundingBox(),
      ]);
      expect(scrolledMenu).not.toBeNull();
      expect(scrolledDock).not.toBeNull();
      if (!scrolledMenu || !scrolledDock) {
        throw new Error('The menu and dock must remain measurable after page scrolling');
      }
      expect(scrolledMenu.y + scrolledMenu.height).toBeLessThanOrEqual(scrolledDock.y - 8);
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    if (viewport.width === 390) {
      await trigger.click();
      await expect(menu).toBeVisible();
      await page.mouse.click(2, Math.floor(viewport.height / 2));
      await expect(menu).toBeHidden();
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editorPath);
  await expect(page.locator('.production-topbar')).toBeVisible();
  await expect(page.locator('.production-topbar__desktop-secondary')).toBeVisible();
  await expect(page.locator('.production-topbar__mobile-secondary')).toBeHidden();
  await expect(page.getByRole('button', { name: '导出工作区', exact: true })).toBeVisible();

  const geometryPath = testInfo.outputPath('phase4c1-mobile-menu-geometry.json');
  await writeFile(geometryPath, JSON.stringify(measurements, null, 2));
  await testInfo.attach('phase4c1-mobile-menu-geometry.json', {
    path: geometryPath,
    contentType: 'application/json',
  });
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
