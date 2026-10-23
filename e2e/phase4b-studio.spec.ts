import { expect, test } from '@playwright/test';

const studioPath = '/design/phase4b';

test('production editor does not request the isolated Phase 4B chunk', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '编辑器' })).toBeVisible();
  expect(requests.some((url) => /phase4b-studio|Phase4BStudioPage/u.test(url))).toBe(false);
});

test('Phase 4B stays readable at all requested widths in light and dark themes', async ({
  page,
}) => {
  await page.goto(studioPath);
  const widths = [1440, 1280, 1024, 900, 768, 390, 360, 320];

  await page.getByRole('button', { name: '切换到深色外观' }).click();
  for (const theme of ['dark', 'light'] as const) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('.studio-root')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('textbox', { name: '姓名' })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `horizontal overflow at ${width}px in ${theme} theme`,
      ).toBeLessThanOrEqual(width);

      const navigationLabel =
        width <= 768 ? '移动端工作区导航' : width <= 1000 ? '工作区快速导航' : '工作台导航';
      await expect(page.getByRole('navigation', { name: navigationLabel })).toBeVisible();

      if (width === 320) {
        expect(
          await page
            .getByRole('textbox', { name: '姓名' })
            .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        ).toBeGreaterThanOrEqual(16);
      }

      if (width === 1024) {
        await expect(page.getByRole('navigation', { name: '工作台导航' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: '工作区快速导航' })).toBeHidden();
      }

      if (width === 900) {
        await expect(page.getByRole('navigation', { name: '工作台导航' })).toBeHidden();
        await expect(page.getByRole('navigation', { name: '工作区快速导航' })).toBeVisible();
      }
    }

    const nextThemeLabel = theme === 'dark' ? '切换到浅色外观' : '切换到深色外观';
    await page.getByRole('button', { name: nextThemeLabel }).click();
  }
});

test('mobile preview switching preserves unsaved synthetic editing and touch targets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath);

  const name = page.getByRole('textbox', { name: '姓名' });
  await name.fill('未提交的演示姓名');
  const previewButton = page.getByRole('button', { name: '预览', exact: true });
  const previewBounds = await previewButton.boundingBox();
  expect(previewBounds?.width).toBeGreaterThanOrEqual(44);
  expect(previewBounds?.height).toBeGreaterThanOrEqual(44);

  await previewButton.click();
  await expect(page.getByRole('region', { name: '简历实时预览' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '未提交的演示姓名' })).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('未提交的演示姓名');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('module controls support keyboard access, ordering, visibility and live feedback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studioPath);
  await page.getByRole('button', { name: '模块管理', exact: true }).click();

  const moveDown = page.getByRole('button', { name: '下移工作经历' });
  const moveBounds = await moveDown.boundingBox();
  expect(moveBounds?.width).toBeGreaterThanOrEqual(44);
  expect(moveBounds?.height).toBeGreaterThanOrEqual(44);
  await moveDown.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.studio-module-list li').first()).toContainText('项目经验');
  await expect(page.getByText('已将工作经历向下移动；预览已更新。')).toBeVisible();

  await page.getByRole('switch', { name: '隐藏工作经历' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('switch', { name: '显示工作经历' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(
    page.getByRole('region', { name: '简历实时预览' }).getByRole('heading', { name: '工作经历' }),
  ).toHaveCount(0);
});

test('templates use a keyboard-operable radio group and update the synthetic preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studioPath);
  await page.getByRole('button', { name: '模板选择', exact: true }).click();

  const options = page.getByRole('radio');
  await expect(options).toHaveCount(3);
  await options.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(options.nth(1)).toBeChecked();
  await expect(page.locator('.studio-paper')).toHaveClass(/studio-paper--folio/u);
});

test('dialog traps focus, closes with Escape and restores focus to its trigger', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath);
  const trigger = page.getByRole('button', { name: '演示说明' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Phase 4B 设计演示' });
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!dialogBounds || !viewport) throw new Error('Dialog and viewport must be measurable');
  expect(
    Math.abs(dialogBounds.x + dialogBounds.width / 2 - viewport.width / 2),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(dialogBounds.y + dialogBounds.height / 2 - viewport.height / 2),
  ).toBeLessThanOrEqual(2);
  const closeButton = dialog.getByRole('button', { name: '关闭弹窗' });
  const confirmButton = dialog.getByRole('button', { name: '明白了' });
  await expect(confirmButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(confirmButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await confirmButton.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Tab order and reduced-motion preferences keep focus feedback predictable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studioPath);

  const brand = page.getByRole('link', { name: 'Inkless Cat Studio 首页' });
  const help = page.getByRole('button', { name: '演示说明' });
  await brand.focus();
  await expect(brand).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(help).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(brand).toBeFocused();
  expect(
    await brand.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Tab');
  await expect(help).toBeFocused();
  expect(
    await help.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await help.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThan(0.001);
});

test('mobile switcher hides while the visual viewport is occupied by an onscreen keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    let viewportHeight = globalThis.innerHeight;
    const viewport = new EventTarget() as EventTarget & {
      height: number;
      setTestHeight: (height: number) => void;
    };
    Object.defineProperty(viewport, 'height', { get: () => viewportHeight });
    viewport.setTestHeight = (height) => {
      viewportHeight = height;
      viewport.dispatchEvent(new Event('resize'));
    };
    Object.defineProperty(globalThis, 'visualViewport', { configurable: true, value: viewport });
  });
  await page.goto(studioPath);

  const mobileNavigation = page.locator('.studio-mobile-nav');
  const biography = page.getByRole('textbox', { name: '个人简介' });
  await biography.scrollIntoViewIfNeeded();
  const biographyBounds = await biography.boundingBox();
  const navigationBounds = await mobileNavigation.boundingBox();
  expect(biographyBounds).not.toBeNull();
  expect(navigationBounds).not.toBeNull();
  if (!biographyBounds || !navigationBounds) throw new Error('Mobile controls must be measurable');
  expect(biographyBounds.y + biographyBounds.height).toBeLessThanOrEqual(navigationBounds.y);

  await biography.focus();
  await page.evaluate(() => {
    (
      globalThis.visualViewport as VisualViewport & { setTestHeight: (height: number) => void }
    ).setTestHeight(420);
  });
  await expect(page.locator('.studio-root')).toHaveAttribute('data-keyboard-open', 'true');
  await expect(mobileNavigation).toHaveCSS('visibility', 'hidden');

  await page.evaluate(() => {
    (
      globalThis.visualViewport as VisualViewport & { setTestHeight: (height: number) => void }
    ).setTestHeight(844);
  });
  await expect(mobileNavigation).toHaveCSS('visibility', 'visible');
});

test('mobile More menu supports arrow navigation and opens the selected demo panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    type GlobalWithMenuActivations = typeof globalThis & { menuActivationCount: number };
    (globalThis as GlobalWithMenuActivations).menuActivationCount = 0;
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) {
        (globalThis as GlobalWithMenuActivations).menuActivationCount += 1;
      }
    });
  });
  await page.goto(studioPath);
  const moreButton = page.getByRole('button', { name: '更多' });
  await moreButton.focus();
  await page.keyboard.press('Enter');
  await expect(moreButton).toHaveAttribute('aria-expanded', 'true');

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const firstItem = page.getByRole('menuitem', { name: '模块管理' });
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const interviewItem = page.getByRole('menuitem', { name: 'AI 功能演示' });
  await expect(interviewItem).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: '设置入口' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(interviewItem).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'AI 功能演示' })).toBeVisible();
  await expect(page.getByText('演示界面 · 不调用模型')).toBeVisible();
  await expect(menu).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  await expect(moreButton).toBeFocused();
  expect(
    await page.evaluate(
      () => (globalThis as typeof globalThis & { menuActivationCount: number }).menuActivationCount,
    ),
  ).toBe(1);

  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  await expect(moreButton).toBeFocused();
});

test('mobile More menu closes on Tab, Shift+Tab, and outside clicks without trapping or stealing focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioPath);
  await page.evaluate(() => {
    const nextControl = document.createElement('button');
    nextControl.id = 'phase4b-after-mobile-navigation';
    nextControl.textContent = 'Next control';
    document.querySelector('.studio-mobile-nav')?.after(nextControl);
  });

  const moreButton = page.getByRole('button', { name: '更多' });
  const menu = page.getByRole('menu');
  const afterNavigation = page.getByRole('button', { name: 'Next control' });

  await moreButton.click();
  const firstItem = page.getByRole('menuitem', { name: '模块管理' });
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(afterNavigation).toBeFocused();
  await expect(menu).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');

  await moreButton.focus();
  await page.keyboard.press('Enter');
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(moreButton).toBeFocused();
  await expect(menu).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Enter');
  await expect(firstItem).toBeFocused();
  await afterNavigation.click();
  await expect(menu).toBeHidden();
  await expect(afterNavigation).toBeFocused();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
});

test('captures independent Phase 4B visual review screenshots', async ({ page }, testInfo) => {
  const capture = async (name: string) => {
    await expect(page.locator('.studio-root')).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }),
    );
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ fullPage: true, path });
    await testInfo.attach(name, { contentType: 'image/png', path });
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studioPath);
  await capture('phase4b-desktop-light');
  await page.getByRole('button', { name: '切换到深色外观' }).click();
  await capture('phase4b-desktop-dark');
  await page.getByRole('button', { name: '切换到浅色外观' }).click();

  await page.setViewportSize({ width: 1024, height: 900 });
  await capture('phase4b-workbench-1024');
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture('phase4b-tablet-768');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('phase4b-mobile-390');
  await page.setViewportSize({ width: 320, height: 844 });
  await capture('phase4b-mobile-320');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '模块管理', exact: true }).click();
  await capture('phase4b-module-management');
  await page.getByRole('button', { name: '模板选择', exact: true }).click();
  await capture('phase4b-template-selection');
  await page.getByRole('button', { name: '演示说明' }).click();
  await capture('phase4b-dialog');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '更多' }).click();
  await capture('phase4b-popover-expanded');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await capture('phase4b-a4-preview-mobile');
});
