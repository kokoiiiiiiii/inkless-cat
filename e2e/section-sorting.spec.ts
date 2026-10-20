import { type Browser, type CDPSession, expect, type Page, test } from '@playwright/test';

const getOrder = async (page: Page) =>
  page
    .getByTestId('section-sort-list')
    .locator('[data-section-key]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.sectionKey ?? ''),
    );

const getPreviewOrder = async (page: Page) =>
  page
    .locator('.resume-preview > section h3')
    .evaluateAll((elements) => elements.map((element) => element.textContent?.trim() ?? ''));

const collectBrowserErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
};

const openModuleManager = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();
};

const undoShortcut = process.platform === 'darwin' ? 'Meta+z' : 'Control+z';

const withMobileContext = async (
  browser: Browser,
  baseURL: string,
  run: (page: Page, touch: CDPSession) => Promise<void>,
) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  let touch: CDPSession | undefined;

  try {
    const page = await context.newPage();
    touch = await context.newCDPSession(page);
    await run(page, touch);
  } finally {
    try {
      if (touch) await touch.detach();
    } finally {
      await context.close();
    }
  }
};

test('keyboard sorting, focus, preview sync, Undo, and Restore remain consistent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const browserErrors = collectBrowserErrors(page);
  await openModuleManager(page);

  const initialOrder = await getOrder(page);
  const initialPreviewOrder = await getPreviewOrder(page);
  expect(initialOrder[0]).toBe('socials');
  expect(initialOrder[1]).toBe('experience');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const transitionProperty = await page
    .locator('[data-section-key="socials"]')
    .evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(transitionProperty).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.getByRole('button', { name: '夜间模式' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/u);
  await page.getByRole('button', { name: '日间模式' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/u);

  await page.getByRole('button', { name: '将社交与链接下移' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将工作经历上移');

  const experienceUp = page.getByRole('button', { name: '将工作经历上移' });
  const defaultBackground = await experienceUp.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await experienceUp.hover();
  const hoverBackground = await experienceUp.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(hoverBackground).not.toBe(defaultBackground);
  await experienceUp.focus();
  await page.keyboard.press('Enter');
  const movedOrder = [initialOrder[1], initialOrder[0], ...initialOrder.slice(2)];
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将工作经历下移');
  await expect(page.getByRole('status')).toContainText('已将工作经历移动到第 1 项');
  await expect
    .poll(() => getPreviewOrder(page))
    .toEqual([initialPreviewOrder[1], initialPreviewOrder[0], ...initialPreviewOrder.slice(2)]);
  await expect(experienceUp).toBeDisabled();

  const experienceDown = page.getByRole('button', { name: '将工作经历下移' });
  await experienceDown.focus();
  await page.keyboard.press('Space');
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将工作经历下移');

  await experienceUp.click();
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  const undo = page.getByRole('button', { name: '撤销', exact: true });
  await undo.focus();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);
  await expect(page.getByRole('status')).toContainText('已撤销上一次模块排序');
  await expect(undo).toBeDisabled();
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将社交与链接下移');
  await expect(page.locator(':focus')).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将工作经历上移');
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);

  await experienceUp.click();
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'native-undo-input';
    input.setAttribute('aria-label', 'Native undo input');
    document.body.append(input);
  });
  const nativeUndoInput = page.getByRole('textbox', { name: 'Native undo input' });
  await nativeUndoInput.focus();
  await page.keyboard.type('native');
  await expect(nativeUndoInput).toHaveValue('native');
  await page.keyboard.press(undoShortcut);
  await expect(nativeUndoInput).not.toHaveValue('native');
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  await expect(undo).toBeEnabled();
  await nativeUndoInput.evaluate((element) => element.remove());

  const restore = page.getByRole('button', { name: '复原', exact: true });
  await restore.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);
  await expect(page.getByRole('status')).toContainText('已恢复模块原始顺序');
  await expect(restore).toBeDisabled();
  await expect(undo).toBeEnabled();
  await expect(undo).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将社交与链接下移');
  await undo.focus();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  await expect(restore).toBeEnabled();
  await expect(undo).toBeDisabled();
  await expect(restore).toBeFocused();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getOrder(page)).toEqual(movedOrder);
  await restore.click();
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);

  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: '仅切换语言' }).click();
  const englishExperienceUp = page.getByRole('button', { name: 'Move Work Experience up' });
  await expect(englishExperienceUp).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Move Work Experience down' })).toBeEnabled();
  await englishExperienceUp.click();
  await expect(page.getByRole('status')).toContainText('Moved Work Experience to position 1 of 8.');
  const englishUndo = page.getByRole('button', { name: 'Undo', exact: true });
  await englishUndo.focus();
  await page.keyboard.press(undoShortcut);
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);
  await expect(page.getByRole('status')).toContainText('Undid the last module reorder.');
  await expect(englishUndo).toBeDisabled();
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Move Social & Links down');
  await expect(page.locator(':focus')).toBeEnabled();

  await englishExperienceUp.click();
  const englishReset = page.getByRole('button', { name: 'Reset', exact: true });
  await englishReset.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => getOrder(page)).toEqual(initialOrder);
  await expect(page.getByRole('status')).toContainText('Restored the original module order.');
  await expect(englishReset).toBeDisabled();
  await expect(englishUndo).toBeEnabled();
  await expect(englishUndo).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test('mouse dragging reorders modules and announces the committed position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const browserErrors = collectBrowserErrors(page);
  await openModuleManager(page);

  const orderBefore = await getOrder(page);
  const experienceHandle = page
    .locator('[data-section-key="experience"]')
    .getByTestId('section-drag-handle');
  const socialsRow = page.locator('[data-section-key="socials"]');
  const from = await experienceHandle.boundingBox();
  const target = await socialsRow.boundingBox();
  expect(from).not.toBeNull();
  expect(target).not.toBeNull();
  if (!from || !target) throw new Error('Sorting rows were not visible for mouse drag.');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 40, target.y + 2, { steps: 8 });
  await page.mouse.up();

  await expect
    .poll(() => getOrder(page))
    .toEqual([orderBefore[1], orderBefore[0], ...orderBefore.slice(2)]);
  await expect(page.getByRole('status')).toContainText('已将工作经历移动到第 1 项');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

  const orderBeforeCancel = await getOrder(page);
  const cancelHandle = page
    .locator(`[data-section-key="${orderBeforeCancel[0]}"]`)
    .getByTestId('section-drag-handle');
  const cancelBox = await cancelHandle.boundingBox();
  expect(cancelBox).not.toBeNull();
  if (!cancelBox) throw new Error('Sorting handle was not visible for drag cancellation.');
  await page.evaluate(() => {
    globalThis.addEventListener(
      'pointerdown',
      (event) => {
        document.documentElement.dataset.sectionSortPointerId = String(event.pointerId);
      },
      { once: true },
    );
  });
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + cancelBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    cancelBox.x + cancelBox.width / 2 + 10,
    cancelBox.y + cancelBox.height / 2 + 10,
  );
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  const pointerId = await page.evaluate(() => {
    const id = document.documentElement.dataset.sectionSortPointerId;
    return id === undefined ? undefined : Number(id);
  });
  expect(pointerId).toBeDefined();
  await page.evaluate((id) => {
    globalThis.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, bubbles: true }));
  }, pointerId);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect.poll(() => getOrder(page)).toEqual(orderBeforeCancel);
  await expect(page.getByRole('status')).toContainText('已将工作经历移动到第 1 项');
  expect(browserErrors).toEqual([]);
});

test('sorting and module toggles persist without changing resume content', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const browserErrors = collectBrowserErrors(page);
  await openModuleManager(page);

  const initialOrder = await getOrder(page);
  const initialPreviewOrder = await getPreviewOrder(page);
  const previewTitleBySection = new Map(
    initialOrder.map((sectionKey, index) => [sectionKey, initialPreviewOrder[index] ?? '']),
  );
  const experienceUp = page.getByRole('button', { name: '将工作经历上移' });
  await experienceUp.click();
  const sortedOrder = await getOrder(page);
  expect(sortedOrder[0]).toBe('experience');
  const undo = page.getByRole('button', { name: '撤销', exact: true });
  await expect(undo).toBeEnabled();

  await page.getByRole('button', { name: /工作经历 已启用/u }).click();
  await expect
    .poll(() => getOrder(page))
    .toEqual(sortedOrder.filter((key) => key !== 'experience'));
  await expect(undo).toBeDisabled();
  await expect(page.locator('.resume-preview')).not.toContainText('工作经历');
  await page.getByRole('button', { name: /工作经历 未启用/u }).click();
  await expect.poll(() => getOrder(page)).toEqual(sortedOrder);
  await expect(page.locator('.resume-preview')).toContainText('工作经历');
  await expect(page.locator('.resume-preview')).toContainText('某某科技公司');

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('inkless-cat/resume-store');
    return raw
      ? (JSON.parse(raw) as { state?: { activeSections?: string[] } }).state?.activeSections
      : null;
  });
  expect(persisted).toEqual(sortedOrder);

  await page.reload();
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect.poll(() => getOrder(page)).toEqual(sortedOrder);
  await expect
    .poll(() => getPreviewOrder(page))
    .toEqual(sortedOrder.map((sectionKey) => previewTitleBySection.get(sectionKey) ?? ''));
  expect(browserErrors).toEqual([]);
});

test('mobile layout keeps page scrolling available outside the drag handle', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Playwright Test baseURL is required for mobile navigation.');
  await withMobileContext(browser, baseURL, async (mobilePage, touch) => {
    const browserErrors = collectBrowserErrors(mobilePage);
    await openModuleManager(mobilePage);

    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

    const handle = mobilePage.locator(
      '[data-section-key="socials"] [data-testid="section-drag-handle"]',
    );
    const row = mobilePage.locator('[data-section-key="socials"]');
    await expect(handle).toBeVisible();
    const rowTouchAction = await row.evaluate((element) => getComputedStyle(element).touchAction);
    const handleTouchAction = await handle.evaluate(
      (element) => getComputedStyle(element).touchAction,
    );
    expect(rowTouchAction).not.toBe('none');
    expect(handleTouchAction).toBe('none');
    await expect(mobilePage.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(mobilePage.getByRole('button', { name: '将社交与链接下移' })).toBeVisible();

    const horizontalOverflow = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);

    const beforeScroll = await mobilePage.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
    const titleBox = await row.locator('span.font-medium').boundingBox();
    expect(titleBox).not.toBeNull();
    if (!titleBox) throw new Error('Module title was not visible for touch scroll.');
    expect(titleBox.y).toBeGreaterThanOrEqual(0);
    expect(titleBox.y).toBeLessThan(844);

    await touch.send('Input.synthesizeScrollGesture', {
      x: titleBox.x + titleBox.width / 2,
      y: titleBox.y + titleBox.height / 2,
      xDistance: 0,
      yDistance: -240,
      speed: 600,
      gestureSourceType: 'touch',
    });
    await expect
      .poll(async () => {
        return mobilePage.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
      })
      .toBeGreaterThan(beforeScroll);
    await expect(mobilePage.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await mobilePage.getByRole('button', { name: '实时预览' }).click();
    await expect(mobilePage.locator('.resume-preview')).toBeVisible();
    await mobilePage.getByRole('button', { name: '编辑器' }).click();
    await expect(mobilePage.getByTestId('section-sort-list')).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
});

test('mobile touch handle reorders and releases the scroll lock', async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error('Playwright Test baseURL is required for mobile navigation.');
  await withMobileContext(browser, baseURL, async (mobilePage, touch) => {
    const browserErrors = collectBrowserErrors(mobilePage);
    await openModuleManager(mobilePage);
    const orderBefore = await getOrder(mobilePage);
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

    const handle = mobilePage.locator(
      '[data-section-key="socials"] [data-testid="section-drag-handle"]',
    );
    const targetRow = mobilePage.locator('[data-section-key="experience"]');
    const handleBox = await handle.boundingBox();
    const targetBox = await targetRow.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    if (!handleBox || !targetBox) throw new Error('Mobile drag targets were not visible.');

    const startPoint = {
      id: 1,
      x: handleBox.x + handleBox.width / 2,
      y: handleBox.y + handleBox.height / 2,
    };
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [startPoint] });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...startPoint, y: targetBox.y + targetBox.height - 2 }],
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect
      .poll(() => getOrder(mobilePage))
      .toEqual([orderBefore[1], orderBefore[0], ...orderBefore.slice(2)]);
    await expect(mobilePage.getByRole('button', { name: '撤销', exact: true })).toBeEnabled();
    await expect(mobilePage.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(mobilePage.getByRole('status')).toContainText('已将社交与链接移动到第 2 项');
    expect(browserErrors).toEqual([]);
  });
});
