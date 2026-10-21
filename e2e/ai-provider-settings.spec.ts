import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const endpoint = 'https://provider.example/v1/chat/completions';
const apiKey = 'test_key_do_not_persist_01';

const openSettings = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /AI 设置|AI settings/u }).click();
  return page.getByRole('dialog', { name: /AI 服务设置|AI provider settings/u });
};

const fillSettings = async (dialog: import('@playwright/test').Locator) => {
  await dialog.getByLabel('API Base URL').fill('https://provider.example/v1/');
  await dialog.getByRole('textbox', { name: 'API Key' }).fill(apiKey);
  await dialog.getByLabel(/模型 ID|Model ID/u).fill('MiXeD-Model');
};

test('settings test one mocked request and never persist or export the API key', async ({
  page,
}) => {
  let requestBody: Record<string, unknown> | undefined;
  await page.route(endpoint, async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
    });
  });

  await page.goto('/');
  const dialog = await openSettings(page);
  await fillSettings(dialog);
  const apiKeyInput = dialog.getByRole('textbox', { name: 'API Key' });
  await expect(apiKeyInput).toHaveAttribute('type', 'password');
  await dialog.getByRole('button', { name: '显示 API Key' }).click();
  await expect(apiKeyInput).toHaveAttribute('type', 'text');
  await expect(apiKeyInput).toHaveValue(apiKey);
  await dialog.getByRole('button', { name: '隐藏 API Key' }).click();
  await expect(apiKeyInput).toHaveAttribute('type', 'password');
  await dialog.getByRole('button', { name: '显示 API Key' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
  const reopenedDialog = await openSettings(page);
  const reopenedApiKey = reopenedDialog.getByRole('textbox', { name: 'API Key' });
  await expect(reopenedApiKey).toHaveAttribute('type', 'password');
  await expect(reopenedApiKey).toHaveValue(apiKey);

  await reopenedDialog.getByRole('button', { name: '保存到当前会话' }).click();
  await reopenedDialog.getByRole('button', { name: '测试连接' }).click();
  await expect(reopenedDialog.getByRole('status')).toContainText('连接测试成功');
  expect(requestBody).toEqual({
    model: 'MiXeD-Model',
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    stream: false,
  });

  const browserStorage = await page.evaluate(() =>
    [localStorage, sessionStorage].flatMap((storage) => Object.entries(storage).flat()).join('\n'),
  );
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
