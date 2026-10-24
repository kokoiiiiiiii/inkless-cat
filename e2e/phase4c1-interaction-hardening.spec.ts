import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

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

const observePopoverEvents = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    const describeElement = (element: Element | null) => {
      if (!element) return null;
      const tag = element.tagName.toLowerCase();
      const label = element.getAttribute('aria-label');
      const menuitem =
        element.getAttribute('role') === 'menuitem' ? element.textContent?.trim() : null;
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
        for (const mutation of records) {
          record({
            type: 'aria-expanded',
            target: describeElement(trigger),
            previousValue: mutation.oldValue,
            expanded: trigger.getAttribute('aria-expanded'),
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

test('production more-actions popover closes on its second real click after menu focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
  const tracePath = testInfo.outputPath('phase4c1-popover-before-fix.json');
  await writeFile(tracePath, JSON.stringify(trace, null, 2));
  await testInfo.attach('popover-second-click-event-trace.json', {
    path: tracePath,
    contentType: 'application/json',
  });
  expect(trace).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'focusout' })]));
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
});

const getSectionOrder = async (page: import('@playwright/test').Page) =>
  page
    .getByTestId('section-sort-list')
    .locator('[data-section-key]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.sectionKey ?? ''),
    );

const undoShortcut = process.platform === 'darwin' ? 'Meta+z' : 'Control+z';

test('baseline allows hidden module history to consume the global undo shortcut', async ({
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
  const tracePath = testInfo.outputPath('phase4c1-hidden-undo-before-fix.json');
  await writeFile(tracePath, JSON.stringify(trace, null, 2));
  await testInfo.attach('hidden-module-undo-event-trace.json', {
    path: tracePath,
    contentType: 'application/json',
  });
  expect(trace).toEqual(
    expect.arrayContaining([expect.objectContaining({ defaultPrevented: true })]),
  );
  await expect.poll(() => getSectionOrder(page)).toEqual(initialOrder);
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
});
