import { writeFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { exportWorkspaceFromUI } from './workspace';

type PopoverTraceEntry = {
  type: string;
  target?: string | null;
  relatedTarget?: string | null;
  activeElement?: string | null;
  expanded?: string | null;
  previousValue?: string | null;
};

type BrowserGlobal = typeof globalThis & {
  __popoverTrace?: PopoverTraceEntry[];
  __undoTrace?: Array<{
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    defaultPrevented: boolean;
    target: string | null;
  }>;
};

const observePopoverEvents = async (page: Page) => {
  await page.evaluate(() => {
    const describeElement = (element: Element | null) => {
      if (!element) return null;
      const semanticElement = element.closest('button[aria-label], [role="menuitem"]') ?? element;
      const tag = semanticElement.tagName.toLowerCase();
      const label = semanticElement.getAttribute('aria-label');
      const menuitem =
        semanticElement.getAttribute('role') === 'menuitem'
          ? semanticElement.textContent?.trim()
          : null;
      return [tag, label, menuitem].filter(Boolean).join(':');
    };
    const trace: PopoverTraceEntry[] = [];
    const browserGlobal = globalThis as BrowserGlobal;
    browserGlobal.__popoverTrace = trace;
    const trigger = document.querySelector<HTMLButtonElement>('.production-topbar__more-trigger');
    const menu = document.querySelector<HTMLElement>('.production-topbar__more [role="menu"]');
    const record = (entry: PopoverTraceEntry) => trace.push(entry);
    for (const type of ['pointerdown', 'blur', 'focusout', 'focusin', 'click']) {
      document.addEventListener(
        type,
        (event) => {
          const focusEvent = event as FocusEvent;
          record({
            type,
            target: describeElement(event.target instanceof Element ? event.target : null),
            relatedTarget: describeElement(
              focusEvent.relatedTarget instanceof Element ? focusEvent.relatedTarget : null,
            ),
            activeElement: describeElement(document.activeElement),
            expanded: trigger?.getAttribute('aria-expanded'),
          });
        },
        true,
      );
    }
    if (trigger) {
      new MutationObserver((records) => {
        const mutations = [...records];
        for (const [index, mutation] of mutations.entries()) {
          record({
            type: 'aria-expanded',
            target: describeElement(trigger),
            previousValue: mutation.oldValue,
            expanded: mutations[index + 1]?.oldValue ?? trigger.getAttribute('aria-expanded'),
            activeElement: describeElement(document.activeElement),
          });
        }
      }).observe(trigger, {
        attributes: true,
        attributeFilter: ['aria-expanded'],
        attributeOldValue: true,
      });
    }
    if (!menu) throw new Error('The production more-actions menu must be mounted before tracing.');
  });
};

const collectBrowserErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
};

test('production more-actions popover closes on its second real click after menu focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  await observePopoverEvents(page);

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();

  await trigger.click();
  const trace = await page.evaluate(() => (globalThis as BrowserGlobal).__popoverTrace ?? []);
  const tracePath = testInfo.outputPath('phase4c1-popover-after-fix.json');
  await writeFile(tracePath, JSON.stringify(trace, null, 2));
  await testInfo.attach('popover-after-fix-event-trace.json', {
    path: tracePath,
    contentType: 'application/json',
  });
  expect(trace).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'focusout' })]));
  const focusoutIndex = trace.findIndex(
    (event) => event.type === 'focusout' && event.relatedTarget?.includes('更多操作'),
  );
  const triggerClickIndex = trace.findLastIndex(
    (event) => event.type === 'click' && event.target?.includes('更多操作'),
  );
  expect(focusoutIndex).toBeGreaterThanOrEqual(0);
  expect(triggerClickIndex).toBeGreaterThan(focusoutIndex);
  expect(
    trace
      .filter((event) => event.type === 'aria-expanded')
      .map(({ previousValue, expanded }) => ({ previousValue, expanded })),
  ).toEqual([
    { previousValue: 'false', expanded: 'true' },
    { previousValue: 'true', expanded: 'false' },
  ]);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();
  expect(browserErrors).toEqual([]);
});

const popoverViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
];

const captureInitialPopover = async (
  page: Page,
  testInfo: import('@playwright/test').TestInfo,
  viewport: (typeof popoverViewports)[number],
  headerBefore: { x: number; y: number; width: number; height: number } | null,
) => {
  const topbar = page.locator('.production-topbar');
  const menu = page.getByRole('menu', { name: '更多操作' });
  const [headerOpen, menuBounds] = await Promise.all([topbar.boundingBox(), menu.boundingBox()]);
  expect(headerOpen).not.toBeNull();
  expect(menuBounds).not.toBeNull();
  if (!headerBefore || !headerOpen || !menuBounds) {
    throw new Error('The header and open popover must be measurable');
  }
  expect(Math.abs(headerOpen.height - headerBefore.height)).toBeLessThanOrEqual(1);
  expect(menuBounds.x).toBeGreaterThanOrEqual(0);
  expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(viewport.width);

  const dock = page.getByRole('navigation', { name: '编辑与预览切换' });
  await (viewport.width <= 1023 ? expect(dock).toBeVisible() : expect(dock).toHaveCount(0));
  const dockBounds = viewport.width <= 1023 ? await dock.boundingBox() : null;
  if (dockBounds) {
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(dockBounds.y - 8);
  }

  const screenshotPath = testInfo.outputPath(
    `phase4c1-popover-open-${viewport.width}x${viewport.height}.png`,
  );
  await page.screenshot({ path: screenshotPath, animations: 'disabled' });
  await testInfo.attach(`popover-open-${viewport.width}x${viewport.height}.png`, {
    path: screenshotPath,
    contentType: 'image/png',
  });
};

test('production popover toggles four times without changing topbar or overlapping the dock', async ({
  page,
}, testInfo) => {
  const browserErrors = collectBrowserErrors(page);
  for (const viewport of popoverViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const topbar = page.locator('.production-topbar');
    const trigger = page.getByRole('button', { name: '更多操作' });
    const menu = page.getByRole('menu', { name: '更多操作' });
    const headerBefore = await topbar.boundingBox();
    expect(headerBefore).not.toBeNull();

    for (let click = 0; click < 4; click += 1) {
      await trigger.click();
      const shouldBeOpen = click % 2 === 0;
      await expect(trigger).toHaveAttribute('aria-expanded', String(shouldBeOpen));
      if (!shouldBeOpen) {
        await expect(menu).toBeHidden();
        continue;
      }
      await expect(menu).toBeVisible();
      if (click === 0) await captureInitialPopover(page, testInfo, viewport, headerBefore);
    }

    await trigger.click({ clickCount: 4, delay: 10 });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  }
  expect(browserErrors).toEqual([]);
});

test('desktop 1440px keeps its standard actions because the compact popover is not offered', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.getByRole('button', { name: '更多操作' })).toBeHidden();
  await expect(page.locator('.production-topbar__desktop-secondary')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出工作区', exact: true })).toBeVisible();

  const screenshotPath = testInfo.outputPath('phase4c1-desktop-actions-1440x900.png');
  await page.screenshot({ path: screenshotPath, animations: 'disabled' });
  await testInfo.attach('desktop-actions-1440x900.png', {
    path: screenshotPath,
    contentType: 'image/png',
  });
});

test('production popover toggles with real touchscreen taps', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Playwright must provide a base URL');
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  try {
    const page = await context.newPage();
    const browserErrors = collectBrowserErrors(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: '更多操作' });
    const menu = page.getByRole('menu', { name: '更多操作' });

    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(browserErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('outside clicks and repeat clicks after scrolling the menu close without trapping focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  await trigger.click();
  const menuItems = menu.getByRole('menuitem');
  await expect(menuItems.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menuItems.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(menuItems.first()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(menuItems.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(menuItems.last()).toBeFocused();
  await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  await trigger.click();
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  await expect
    .poll(() =>
      page
        .locator('.production-topbar__more')
        .evaluate((anchor) => !anchor.contains(document.activeElement)),
    )
    .toBe(true);

  await trigger.click();
  await page.keyboard.press('Shift+Tab');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  const dock = page.getByRole('navigation', { name: '编辑与预览切换' });
  await dock.getByRole('button', { name: '实时预览' }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(dock.getByRole('button', { name: '实时预览' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

const getSectionOrder = async (page: Page) =>
  page
    .getByTestId('section-sort-list')
    .locator('[data-section-key]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.sectionKey ?? ''),
    );

const undoShortcut = process.platform === 'darwin' ? 'Meta+z' : 'Control+z';

test('hidden module history ignores global undo and remains available after reopening', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();

  const initialOrder = await getSectionOrder(page);
  await page.getByRole('button', { name: '将工作经历上移' }).click();
  const reordered = await getSectionOrder(page);
  expect(reordered).not.toEqual(initialOrder);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeEnabled();

  await page.getByRole('button', { name: '收起模块管理' }).click();
  const editorNavigation = page
    .getByRole('navigation', { name: '工作区导航' })
    .getByRole('button', { name: '简历编辑' });
  await editorNavigation.click();
  await expect(page.locator('#production-personal-section')).toBeFocused();
  await page.evaluate(() => {
    const browserGlobal = globalThis as BrowserGlobal;
    browserGlobal.__undoTrace = [];
    browserGlobal.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        browserGlobal.__undoTrace?.push({
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          defaultPrevented: event.defaultPrevented,
          target:
            event.target instanceof HTMLElement
              ? event.target.id || event.target.tagName.toLowerCase()
              : null,
        });
      }
    });
  });
  await page.keyboard.press(undoShortcut);

  const trace = await page.evaluate(() => (globalThis as BrowserGlobal).__undoTrace ?? []);
  const tracePath = testInfo.outputPath('phase4c1-hidden-undo-after-fix.json');
  await writeFile(tracePath, JSON.stringify(trace, null, 2));
  await testInfo.attach('hidden-module-undo-after-fix-trace.json', {
    path: tracePath,
    contentType: 'application/json',
  });
  expect(trace).toEqual(
    expect.arrayContaining([expect.objectContaining({ defaultPrevented: false })]),
  );
  await expect.poll(() => getSectionOrder(page)).toEqual(reordered);
  await page.getByRole('button', { name: '展开模块管理' }).click();
  const undo = page.getByRole('button', { name: '撤销', exact: true });
  await expect(undo).toBeEnabled();
  await undo.focus();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getSectionOrder(page)).toEqual(initialOrder);
  await expect(undo).toBeDisabled();
});

test('hidden module history survives while the template panel is open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();

  const initialOrder = await getSectionOrder(page);
  await page.getByRole('button', { name: '将工作经历上移' }).click();
  const reordered = await getSectionOrder(page);
  expect(reordered).not.toEqual(initialOrder);
  await page.getByRole('button', { name: '收起模块管理' }).click();

  const nav = page.getByRole('navigation', { name: '工作区导航' });
  await nav.getByRole('button', { name: '模板选择' }).click();
  const templatePanel = page.locator('#production-template-panel');
  await expect(templatePanel).toBeVisible();
  await expect(templatePanel).toBeFocused();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getSectionOrder(page)).toEqual(reordered);

  await nav.getByRole('button', { name: '模块管理' }).click();
  await expect(page.locator('#production-modules-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => getSectionOrder(page)).toEqual(initialOrder);
});

test('native text input and textarea undo remain available beside module history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await page.getByRole('button', { name: '将工作经历上移' }).click();
  const reordered = await getSectionOrder(page);

  const fullName = page.getByRole('textbox', { name: '姓名' });
  const originalName = await fullName.inputValue();
  await fullName.click();
  await page.keyboard.press('End');
  await page.keyboard.type('x');
  await page.keyboard.press(undoShortcut);
  await expect(fullName).toHaveValue(originalName);
  await expect.poll(() => getSectionOrder(page)).toEqual(reordered);

  const summary = page.getByRole('textbox', { name: '个人简介' });
  const originalSummary = await summary.inputValue();
  await summary.click();
  await page.keyboard.press('End');
  await page.keyboard.type('x');
  await page.keyboard.press(undoShortcut);
  await expect(summary).toHaveValue(originalSummary);
  await expect.poll(() => getSectionOrder(page)).toEqual(reordered);
});

test('language and AI dialogs from the popover receive and restore focus correctly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  await trigger.click();
  await menu.getByRole('menuitem', { name: 'English', exact: true }).click();

  const localeDialog = page.getByRole('dialog');
  await expect(localeDialog).toBeVisible();
  await expect(localeDialog.getByRole('button', { name: '仅切换语言' })).toBeFocused();
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(localeDialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await menu.getByRole('menuitem', { name: 'English', exact: true }).click();
  const languageSwitchDialog = page.getByRole('dialog');
  await expect(languageSwitchDialog).toBeVisible();
  await languageSwitchDialog.getByRole('button', { name: '仅切换语言' }).click();

  const englishTrigger = page.getByRole('button', { name: 'More actions' });
  const englishMenu = page.getByRole('menu', { name: 'More actions' });
  await expect(languageSwitchDialog).toBeHidden();
  await expect(englishTrigger).toBeFocused();
  await englishTrigger.click();
  await expect(englishMenu.getByRole('menuitem', { name: '中文', exact: true })).toBeVisible();

  await englishMenu.getByRole('menuitem', { name: 'AI settings', exact: true }).click();
  const aiDialog = page.getByRole('dialog');
  await expect(aiDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null))
    .toBe(true);
  await expect(englishMenu).toBeHidden();
  await expect(englishTrigger).toHaveAttribute('aria-expanded', 'false');
  await aiDialog.getByRole('button').first().click();
  await expect(aiDialog).toBeHidden();
  await expect(englishTrigger).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test('a focused AI dialog cannot consume hidden module history or prevent its later Undo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();

  const initialOrder = await getSectionOrder(page);
  await page.getByRole('button', { name: '将工作经历上移' }).click();
  const reordered = await getSectionOrder(page);
  await page.getByRole('button', { name: '收起模块管理' }).click();

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  await trigger.click();
  await menu.getByRole('menuitem', { name: 'AI 设置', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogClose = dialog.getByRole('button').first();
  await dialogClose.focus();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getSectionOrder(page)).toEqual(reordered);

  await dialogClose.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: '展开模块管理' }).click();
  const undo = page.getByRole('button', { name: '撤销', exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(() => getSectionOrder(page)).toEqual(initialOrder);
});

test('more-actions Import opens the real file chooser and imports its selected workspace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: '姓名' }).fill('Before popover import');
  const workspace = await exportWorkspaceFromUI(page);
  workspace.resume.personal.fullName = 'Imported through the popover';

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  const chooserPromise = page.waitForEvent('filechooser');
  page.once('dialog', async (dialog) => dialog.accept());
  await trigger.click();
  await menu.getByRole('menuitem', { name: '导入', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'popover-import.workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(workspace), 'utf8'),
  });

  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(
    'Imported through the popover',
  );
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(browserErrors).toEqual([]);
});

test('more-actions Clear still runs its confirmation once and closes the menu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Clear confirmation fixture');

  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  let confirmationCount = 0;
  page.on('dialog', async (dialog) => {
    confirmationCount += 1;
    await dialog.accept();
  });
  await trigger.click();
  await menu.getByRole('menuitem', { name: '清空', exact: true }).click();

  await expect(fullName).toHaveValue('');
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(confirmationCount).toBe(1);
  expect(browserErrors).toEqual([]);
});
