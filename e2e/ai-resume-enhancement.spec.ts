import { readFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

const endpoint = 'https://provider.example/v1/chat/completions';
const apiKey = 'test_only_resume_enhancement_key';

type RequestBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: false;
};

type PromptPayload = {
  field: string;
  mode: string;
  outputLanguage: string;
  content: { text?: string; items?: string[] };
};

const installResponseRoute = async (
  page: Page,
  createContent: (payload: PromptPayload) => string,
) => {
  const requests: RequestBody[] = [];
  await page.route(endpoint, async (route) => {
    const body = route.request().postDataJSON() as RequestBody;
    requests.push(body);
    const userMessage = body.messages.find((message) => message.role === 'user');
    const payload = JSON.parse(userMessage?.content ?? '{}') as PromptPayload;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: createContent(payload) } }],
      }),
    });
  });
  return requests;
};

const configureProvider = async (page: Page) => {
  await page.getByRole('button', { name: 'AI 设置' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 服务设置' });
  await dialog.getByLabel('API Base URL').fill('https://provider.example/v1');
  await dialog.getByRole('textbox', { name: 'API Key' }).fill(apiKey);
  await dialog.getByLabel('模型 ID').fill('resume-mock-model');
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
};

const openPersonalEnhancement = async (page: Page, label: string) => {
  const buttonName = label === 'Personal summary' ? 'AI polish' : 'AI 润色';
  const field = page.getByRole('textbox', { name: label });
  const action = field.locator('xpath=..').getByRole('button', { name: buttonName });
  await expect(action).toHaveAccessibleName(
    label === 'Personal summary' ? `Polish ${label} with AI` : `为${label}打开 AI 润色`,
  );
  await action.click();
  return page.getByRole('dialog', {
    name: label === 'Personal summary' ? 'AI resume enhancement' : 'AI 简历润色',
  });
};

const generateInDialog = async (dialog: import('@playwright/test').Locator, label: string) => {
  await dialog.getByRole('button', { name: label, exact: true }).click();
};

test('unconfigured provider is explained and cannot send a request', async ({ page }) => {
  let requestCount = 0;
  await page.route(endpoint, async (route) => {
    requestCount += 1;
    await route.abort();
  });
  await page.goto('/');

  const dialog = await openPersonalEnhancement(page, '个人简介');
  await expect(dialog.getByRole('status')).toContainText('请先在 AI 设置中配置模型服务');
  await expect(dialog.getByRole('button', { name: 'AI 润色', exact: true })).toBeDisabled();
  await expect(dialog.getByText(/所选内容会发送到你配置的第三方 AI 服务/u)).toBeVisible();
  expect(requestCount).toBe(0);
  await dialog.getByRole('button', { name: '保留原文' }).click();
  await expect(page.getByRole('textbox', { name: '个人简介' })).toHaveValue(
    /拥有 6 年全栈开发经验/u,
  );
});

test('over-budget source shows an accessible size message, sends no request, and can be retried after shortening', async ({
  page,
}) => {
  const requests = await installResponseRoute(page, () => 'Short suggestion.');
  await page.goto('/');
  await configureProvider(page);

  const summary = page.getByRole('textbox', { name: '个人简介' });
  await summary.fill('x'.repeat(12_001));
  let dialog = await openPersonalEnhancement(page, '个人简介');
  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByRole('alert')).toHaveText(
    '当前内容过长，超出单次 AI 润色的输入限制，请精简后重试。',
  );
  await expect(dialog.getByRole('status').filter({ hasText: '12001 / 12000' })).toContainText(
    '输入规模：12001 / 12000 个 UTF-16 字符单元。',
  );
  expect(requests).toHaveLength(0);
  await expect(summary).toHaveValue('x'.repeat(12_001));

  await dialog.getByRole('button', { name: '保留原文' }).click();
  await summary.fill('Shortened source');
  dialog = await openPersonalEnhancement(page, '个人简介');
  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue('Short suggestion.');
  expect(requests).toHaveLength(1);
});

test('summary supports professional and concise modes, comparison, cancel, apply, undo, and minimal request data', async ({
  page,
}) => {
  const requests = await installResponseRoute(page, (payload) =>
    payload.mode === 'professional' ? 'Professional suggestion.' : 'Concise suggestion.',
  );
  await page.goto('/');
  await configureProvider(page);

  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = await summary.inputValue();
  let dialog = await openPersonalEnhancement(page, '个人简介');
  await expect(dialog.getByText(original, { exact: true })).toBeVisible();
  await dialog.getByLabel('润色方式').selectOption('professional');
  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue('Professional suggestion.');
  await expect(dialog.getByText(original, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '保留原文' }).click();
  await expect(summary).toHaveValue(original);

  dialog = await openPersonalEnhancement(page, '个人简介');
  await dialog.getByLabel('润色方式').selectOption('concise');
  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue('Concise suggestion.');
  const request = requests[1];
  expect(request?.model).toBe('resume-mock-model');
  expect(request?.stream).toBe(false);
  expect(request?.messages.map((message) => message.role)).toEqual(['system', 'user']);
  const prompt = JSON.parse(request?.messages[1]?.content ?? '{}') as PromptPayload;
  expect(prompt).toMatchObject({
    field: 'personal.summary',
    mode: 'concise',
    outputLanguage: 'Simplified Chinese (zh-CN)',
    content: { text: original },
  });
  expect(Object.keys(prompt).sort()).toEqual(
    ['content', 'field', 'mode', 'modeGoal', 'outputLanguage'].sort(),
  );
  expect(JSON.stringify(request)).not.toContain('chenqing@example.com');
  expect(JSON.stringify(request)).not.toContain('test_only_resume_enhancement_key');
  expect(JSON.stringify(request)).not.toContain('Qing Chen');

  await dialog.getByRole('button', { name: '采用建议' }).click();
  await expect(summary).toHaveValue('Concise suggestion.');
  await page
    .getByRole('status')
    .filter({ hasText: '已采用 AI 建议' })
    .getByRole('button', { name: '撤销' })
    .click();
  await expect(summary).toHaveValue(original);
});

test('experience highlights preserve item count and project summary is scoped to its ID', async ({
  page,
}) => {
  const requests = await installResponseRoute(page, (payload) => {
    if (payload.field === 'experience.highlights') {
      return JSON.stringify({
        items: (payload.content.items ?? []).map((item) => `Polished: ${item}`),
      });
    }
    return 'Project summary suggestion.';
  });
  await page.goto('/');
  await configureProvider(page);

  const highlights = page.getByRole('textbox', { name: 'highlights' }).first();
  const highlightValue = await highlights.inputValue();
  const originalHighlights = highlightValue.split('\n');
  await highlights.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  let dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  const proposedItems = originalHighlights.map((item) => `Polished: ${item}`);
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue(proposedItems.join('\n'));
  const highlightsPrompt = JSON.parse(requests[0]?.messages[1]?.content ?? '{}') as PromptPayload;
  expect(highlightsPrompt.content.items).toEqual(originalHighlights);
  await dialog.getByRole('button', { name: '采用建议' }).click();
  await expect(highlights).toHaveValue(proposedItems.join('\n'));
  await page
    .getByRole('status')
    .filter({ hasText: '已采用 AI 建议' })
    .getByRole('button', { name: '撤销' })
    .click();
  await expect(highlights).toHaveValue(originalHighlights.join('\n'));

  const projectSummary = page.getByRole('textbox', { name: '概述' }).first();
  const originalProject = await projectSummary.inputValue();
  await projectSummary.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  const projectPrompt = JSON.parse(requests[1]?.messages[1]?.content ?? '{}') as PromptPayload;
  expect(projectPrompt.field).toBe('projects.summary');
  expect(projectPrompt.content.text).toBe(originalProject);
  await dialog.getByRole('button', { name: '采用建议' }).click();
  await expect(projectSummary).toHaveValue('Project summary suggestion.');
});

test('a changed source or deleted target blocks a pending response', async ({ page }) => {
  let release: (() => void) | undefined;
  let requestNumber = 0;
  await page.route(endpoint, async (route) => {
    requestNumber += 1;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: 'Stale suggestion.' } }] }),
      });
    } catch {
      // The UI may already have cancelled this mocked request.
    }
  });
  await page.goto('/');
  await configureProvider(page);

  const summary = page.getByRole('textbox', { name: '个人简介' });
  await summary.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  let dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  await expect.poll(() => requestNumber).toBe(1);
  await summary.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    const setTextareaValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )?.set?.bind(textarea);
    setTextareaValue?.('A newer user edit');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(dialog.getByRole('alert')).toContainText('原文已发生变化');
  expect(await summary.inputValue()).toBe('A newer user edit');
  release?.();
  await dialog.getByRole('button', { name: '关闭 AI 润色' }).click();

  const highlightsCount = await page.getByRole('textbox', { name: 'highlights' }).count();
  const highlights = page.getByRole('textbox', { name: 'highlights' }).first();
  await highlights.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  await expect.poll(() => requestNumber).toBe(2);
  const itemCard = highlights.locator('xpath=../../..');
  await itemCard
    .getByRole('button', { name: '删除' })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(dialog.getByRole('alert')).toContainText('目标字段已不存在');
  release?.();
  expect(await page.getByRole('textbox', { name: 'highlights' }).count()).toBe(highlightsCount - 1);
});

test('cancel stops an active request and an older delayed response cannot replace a newer one', async ({
  page,
}) => {
  let count = 0;
  let finishFirst: (() => void) | undefined;
  await page.route(endpoint, async (route) => {
    count += 1;
    if (count === 1) {
      await new Promise<void>((resolve) => {
        finishFirst = resolve;
      });
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ choices: [{ message: { content: 'Old suggestion.' } }] }),
        });
      } catch {
        // This first request is expected to have been cancelled.
      }
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: 'Newest suggestion.' } }] }),
    });
  });
  await page.goto('/');
  await configureProvider(page);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  await summary.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 简历润色' });

  await generateInDialog(dialog, 'AI 润色');
  await expect.poll(() => count).toBe(1);
  await dialog.getByRole('button', { name: '取消生成' }).click();
  await expect(dialog.getByText('请求已取消，简历内容未更改。', { exact: true })).toBeVisible();
  await generateInDialog(dialog, '重新生成');
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue('Newest suggestion.');
  finishFirst?.();
  await expect(dialog.getByLabel('AI 建议（可手动修改）')).toHaveValue('Newest suggestion.');
  expect(await summary.inputValue()).not.toBe('Newest suggestion.');
});

test('provider HTTP errors and browser network failures are safe and localized', async ({
  page,
}) => {
  let failure: '401' | '429' | 'network' = '401';
  await page.route(endpoint, async (route) => {
    if (failure === 'network') {
      await route.abort('failed');
      return;
    }
    const status = failure === '401' ? 401 : 429;
    await route.fulfill({ status, contentType: 'application/json', body: '{"error":"hidden"}' });
  });
  await page.goto('/');
  await configureProvider(page);
  await page
    .getByRole('textbox', { name: '个人简介' })
    .locator('xpath=..')
    .getByRole('button', { name: 'AI 润色' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'AI 简历润色' });

  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByRole('alert')).toContainText('认证失败');
  await expect(dialog.getByRole('alert')).not.toContainText(apiKey);
  failure = '429';
  await generateInDialog(dialog, '重新生成');
  await expect(dialog.getByRole('alert')).toContainText('额度不足');
  failure = 'network';
  await generateInDialog(dialog, '重新生成');
  await expect(dialog.getByRole('alert')).toContainText('CORS');
  await expect(page.getByRole('textbox', { name: '个人简介' })).toHaveValue(
    /拥有 6 年全栈开发经验/u,
  );
});

test('provider timeout is reported without a retry or a writeback', async ({ page }) => {
  test.setTimeout(30_000);
  await page.route(endpoint, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 22_000));
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: 'Late response.' } }] }),
      });
    } catch {
      // The provider timeout cancels this route before it responds.
    }
  });
  await page.goto('/');
  await configureProvider(page);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = await summary.inputValue();
  await summary.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  await expect(dialog.getByRole('alert')).toContainText('请求超时', { timeout: 25_000 });
  await expect(summary).toHaveValue(original);
});

test('workspace export contains accepted fields only, while the dialog adapts to English, dark theme, and mobile', async ({
  page,
}) => {
  await installResponseRoute(page, () => 'Temporary suggestion for this session.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await configureProvider(page);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = await summary.inputValue();
  await summary.locator('xpath=..').getByRole('button', { name: 'AI 润色' }).click();
  let dialog = page.getByRole('dialog', { name: 'AI 简历润色' });
  await generateInDialog(dialog, 'AI 润色');
  await dialog.getByRole('button', { name: '保留原文' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出工作区' }).click(),
  ]);
  const exportPath = await download.path();
  expect(exportPath).not.toBeNull();
  const unacceptedWorkspace = await readFile(exportPath, 'utf8');
  expect(unacceptedWorkspace).not.toContain('Temporary suggestion for this session.');
  expect(unacceptedWorkspace).toContain(original);

  await page.getByRole('button', { name: '夜间模式' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await page
    .getByRole('dialog', { name: '切换语言' })
    .getByRole('button', { name: '仅切换语言' })
    .click();
  await page
    .getByRole('textbox', { name: 'Summary' })
    .first()
    .locator('xpath=..')
    .getByRole('button', { name: 'Polish Personal summary with AI' })
    .click();
  dialog = page.getByRole('dialog', { name: 'AI resume enhancement' });
  await expect(dialog.getByLabel('Enhancement mode')).toBeVisible();
  await expect(
    dialog.getByText(/selected content is sent to the third-party AI service/u),
  ).toBeVisible();
  const desktop = await dialog.boundingBox();
  expect(desktop?.width).toBeLessThanOrEqual(1440);
  expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    'rgb(15, 23, 42)',
  );
  await dialog.getByRole('button', { name: 'Close AI enhancement' }).click();

  await page.setViewportSize({ width: 768, height: 1024 });
  await page
    .getByRole('textbox', { name: 'Summary' })
    .first()
    .locator('xpath=..')
    .getByRole('button', { name: 'Polish Personal summary with AI' })
    .click();
  dialog = page.getByRole('dialog', { name: 'AI resume enhancement' });
  expect(
    await dialog.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Close AI enhancement' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('textbox', { name: 'Summary' })
    .first()
    .locator('xpath=..')
    .getByRole('button', { name: 'Polish Personal summary with AI' })
    .click();
  dialog = page.getByRole('dialog', { name: 'AI resume enhancement' });
  expect(
    await dialog.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const mobileDialog = await dialog.boundingBox();
  expect(mobileDialog?.width).toBeLessThanOrEqual(390);
  const generateButton = dialog.getByRole('button', { name: 'Polish with AI' });
  const generateBox = await generateButton.boundingBox();
  expect(generateBox?.y).toBeGreaterThanOrEqual(mobileDialog?.y ?? 0);
  expect((generateBox?.y ?? 0) + (generateBox?.height ?? 0)).toBeLessThanOrEqual(
    (mobileDialog?.y ?? 0) + (mobileDialog?.height ?? 0),
  );

  const closeButton = dialog.getByRole('button', { name: 'Close AI enhancement' });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(generateButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(closeButton).toBeFocused();
  await page.evaluate(() =>
    document.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.evaluate(() =>
    document.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })),
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole('textbox', { name: 'Summary' })
      .first()
      .locator('xpath=..')
      .getByRole('button', { name: 'Polish Personal summary with AI' }),
  ).toBeFocused();
});
