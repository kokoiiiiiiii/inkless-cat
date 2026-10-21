import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const endpoint = 'https://provider.example/v1/chat/completions';
const apiKey = 'test_key_do_not_persist_01';

const openSettings = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /AI 设置|AI settings/u }).click();
  return page.getByRole('dialog', { name: /AI 服务设置|AI provider settings/u });
};

const fillSettings = async (dialog: import('@playwright/test').Locator, apiKeyValue = apiKey) => {
  await dialog.getByLabel('API Base URL').fill('https://provider.example/v1/');
  await dialog.getByRole('textbox', { name: 'API Key' }).fill(apiKeyValue);
  await dialog.getByLabel(/模型 ID|Model ID/u).fill('MiXeD-Model');
};

const expectViewportLayout = async (
  page: import('@playwright/test').Page,
  dialog: import('@playwright/test').Locator,
  expectDark = false,
) => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a fixed viewport for layout assertions.');

  const layout = await dialog.evaluate((element) => {
    const overlay = element.parentElement;
    const rect = (node: Element) => {
      const bounds = node.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    };

    return {
      renderedDirectlyUnderBody: overlay?.parentElement === document.body,
      nestedUnderHeader: Boolean(element.closest('header')),
      overlayPosition: overlay ? getComputedStyle(overlay).position : null,
      overlay: overlay ? rect(overlay) : null,
      dialog: rect(element),
      dialogBackground: getComputedStyle(element).backgroundColor,
      bodyOverflow: document.body.style.overflow,
      documentWidth: document.documentElement.scrollWidth,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  expect(layout.renderedDirectlyUnderBody).toBe(true);
  expect(layout.nestedUnderHeader).toBe(false);
  expect(layout.overlayPosition).toBe('fixed');
  expect(layout.overlay).not.toBeNull();
  expect(layout.overlay?.x).toBe(0);
  expect(layout.overlay?.y).toBe(0);
  expect(layout.overlay?.width).toBe(viewport.width);
  expect(layout.overlay?.height).toBe(viewport.height);
  expect(Math.abs(layout.dialog.x + layout.dialog.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(layout.dialog.y + layout.dialog.height / 2 - viewport.height / 2)).toBeLessThan(
    2,
  );
  expect(layout.bodyOverflow).toBe('hidden');
  expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width);
  if (expectDark) expect(layout.dialogBackground).toBe('rgb(15, 23, 42)');

  return layout;
};

test('settings test one mocked request and never persist or export the API key', async ({
  page,
}) => {
  let requestBody: Record<string, unknown> | undefined;
  let requestAuthorization: string | undefined;
  await page.route(endpoint, async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    const requestHeaders = await route.request().allHeaders();
    requestAuthorization = requestHeaders.authorization;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
    });
  });

  await page.goto('/');
  const dialog = await openSettings(page);
  await fillSettings(dialog, `  ${apiKey}  `);
  const apiKeyInput = dialog.getByRole('textbox', { name: 'API Key' });
  await expect(apiKeyInput).toHaveAttribute('type', 'password');
  await dialog.getByRole('button', { name: '显示 API Key' }).click();
  await expect(apiKeyInput).toHaveAttribute('type', 'text');
  await expect(apiKeyInput).toHaveValue(`  ${apiKey}  `);
  await dialog.getByRole('button', { name: '隐藏 API Key' }).click();
  await expect(apiKeyInput).toHaveAttribute('type', 'password');
  await dialog.getByRole('button', { name: '显示 API Key' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
  const reopenedDialog = await openSettings(page);
  const reopenedApiKey = reopenedDialog.getByRole('textbox', { name: 'API Key' });
  await expect(reopenedApiKey).toHaveAttribute('type', 'password');
  await expect(reopenedApiKey).toHaveValue(`  ${apiKey}  `);

  await reopenedDialog.getByRole('button', { name: '保存到当前会话' }).click();
  await reopenedDialog.getByRole('button', { name: '测试连接' }).click();
  await expect(reopenedDialog.getByRole('status')).toContainText('连接测试成功');
  expect(requestAuthorization).toBe(`Bearer ${apiKey}`);
  expect(requestBody).toEqual({
    model: 'MiXeD-Model',
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    stream: false,
  });

  const browserStorage = await page.evaluate(async () => {
    const indexedDbValues: unknown[] = [];
    const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];

    for (const { name } of databases) {
      if (!name) continue;
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Unable to inspect browser storage.'));
      });

      for (const storeName of database.objectStoreNames) {
        const values = await new Promise<unknown[]>((resolve, reject) => {
          const request = database
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .getAll();
          request.onsuccess = () => resolve(request.result as unknown[]);
          request.onerror = () => reject(new Error('Unable to inspect browser storage.'));
        });
        indexedDbValues.push(...values);
      }
      database.close();
    }

    return JSON.stringify({
      localStorage: Object.entries(localStorage),
      sessionStorage: Object.entries(sessionStorage),
      cookies: document.cookie,
      indexedDB: indexedDbValues,
    });
  });
  expect(browserStorage).not.toContain(apiKey);

  await reopenedDialog.getByRole('button', { name: '关闭 AI 设置' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /导出工作区|Export Workspace/u }).click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const workspaceJson = await readFile(downloadPath, 'utf8');
  expect(workspaceJson).not.toContain(apiKey);

  await page.reload();
  const reopened = await openSettings(page);
  await expect(reopened.getByRole('textbox', { name: 'API Key' })).toHaveValue('');
});

test('authentication and browser network failures provide safe localized guidance', async ({
  page,
}) => {
  let mode: 'unauthorized' | 'network' | 'success' = 'unauthorized';
  await page.route(endpoint, async (route) => {
    if (mode === 'network') {
      await route.abort('failed');
      return;
    }
    if (mode === 'unauthorized') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"error":"hidden"}',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
    });
  });

  await page.goto('/');
  const dialog = await openSettings(page);
  await fillSettings(dialog);
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '测试连接' }).click();
  await expect(dialog.getByRole('status')).toContainText('认证失败');
  await expect(dialog.getByRole('status')).not.toContainText(apiKey);

  mode = 'network';
  await dialog.getByRole('button', { name: '测试连接' }).click();
  await expect(dialog.getByRole('status')).toContainText('浏览器无法读取响应');
  await expect(dialog.getByRole('status')).toContainText('CORS');
});

test('cancels an in-flight request, clears settings, and supports locale, dark mode, keyboard, and mobile', async ({
  page,
}) => {
  let pendingMode = false;
  await page.route(endpoint, async (route) => {
    if (pendingMode) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
      });
    } catch {
      // The browser has already cancelled this mocked request.
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  let dialog = await openSettings(page);
  await page.screenshot({ path: 'test-results/ai-provider-desktop.png' });
  await fillSettings(dialog);
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  pendingMode = true;
  await dialog.getByRole('button', { name: '测试连接' }).click();
  await expect(dialog.getByRole('button', { name: '取消测试' })).toBeVisible();
  await dialog.getByRole('button', { name: '取消测试' }).click();
  await expect(dialog.getByRole('status')).toContainText('已取消连接测试');
  await dialog.getByRole('button', { name: '清除配置' }).click();
  await expect(dialog.getByRole('textbox', { name: 'API Key' })).toHaveValue('');
  await expect(dialog.getByRole('status')).toContainText('尚未配置');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: /AI 服务设置|AI provider settings/u }),
  ).toBeHidden();

  await page.getByRole('button', { name: 'English' }).click();
  await page
    .getByRole('dialog', { name: '切换语言' })
    .getByRole('button', { name: '仅切换语言' })
    .click();
  await page.setViewportSize({ width: 768, height: 1024 });
  dialog = await openSettings(page);
  await page.screenshot({ path: 'test-results/ai-provider-tablet.png' });
  await expect(dialog.getByRole('heading', { name: 'AI provider settings' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close AI settings' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Clear settings' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close AI settings' })).toBeFocused();
  await page.getByRole('button', { name: 'Close AI settings' }).click();

  await page.getByRole('button', { name: 'Dark Mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  dialog = await openSettings(page);
  await page.screenshot({ path: 'test-results/ai-provider-mobile-dark.png' });
  await expect(dialog.getByLabel('API Base URL')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Test connection' })).toBeInViewport();
  const mobileDocumentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(mobileDocumentWidth).toBeLessThanOrEqual(390);
});

test('keeps the dialog viewport-aligned across desktop, tablet, and mobile and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'AI 设置' });

  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['tablet', { width: 768, height: 1024 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    const enableDarkMode =
      name === 'mobile'
        ? page.getByRole('button', { name: '夜间模式' }).click()
        : Promise.resolve();
    await enableDarkMode;

    for (let cycle = 0; cycle < 2; cycle += 1) {
      const dialog = await openSettings(page);
      await expect(dialog.getByLabel('API Base URL')).toBeFocused();
      await expectViewportLayout(page, dialog, name === 'mobile');
      await page.screenshot({ path: `test-results/ai-provider-${name}-${cycle}.png` });

      await (cycle === 0
        ? dialog.getByRole('button', { name: /关闭 AI 设置|Close AI settings/u }).click()
        : page.keyboard.press('Escape'));
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('');
    }
  }
});

test('does not close for synthetic IME Escape and preserves Chinese field drafts', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openSettings(page);
  const baseUrl = dialog.getByLabel('API Base URL');
  const model = dialog.getByLabel(/模型 ID|Model ID/u);

  await baseUrl.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
  );
  await baseUrl.fill('https://provider.example/v1/模型');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(baseUrl).toHaveValue('https://provider.example/v1/模型');
  await baseUrl.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })),
  );

  await model.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
  );
  await model.fill('混合模型');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(model).toHaveValue('混合模型');
  await model.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, keyCode: 229 }),
    );
  });
  await expect(dialog).toBeVisible();
  await expect(model).toBeFocused();
  await model.evaluate((element) =>
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })),
  );

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'AI 设置' })).toBeFocused();

  const reopenedDialog = await openSettings(page);
  await expect(reopenedDialog.getByLabel('API Base URL')).toHaveValue(
    'https://provider.example/v1/模型',
  );
  await expect(reopenedDialog.getByLabel(/模型 ID|Model ID/u)).toHaveValue('混合模型');
  await page.keyboard.press('Escape');
});

test('closing the dialog cancels a pending connection request', async ({ page }) => {
  await page.route(endpoint, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
      });
    } catch {
      // The dialog close should cancel this mocked request.
    }
  });

  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'AI 设置' });
  const dialog = await openSettings(page);
  await fillSettings(dialog);
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '测试连接' }).click();
  await expect(dialog.getByRole('button', { name: '取消测试' })).toBeVisible();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
  await expect(trigger).toBeFocused();

  const reopenedDialog = await openSettings(page);
  await expect(reopenedDialog.getByRole('status')).toContainText('已取消连接测试');
  await expect(reopenedDialog.getByRole('button', { name: '测试连接' })).toBeEnabled();
  await page.keyboard.press('Escape');
});
