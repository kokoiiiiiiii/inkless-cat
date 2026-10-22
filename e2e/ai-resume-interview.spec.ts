import { createServer, type Server, type ServerResponse } from 'node:http';

import { expect, type Page, test } from '@playwright/test';

const apiKey = 'test_only_interview_key_never_persist';
const activeServers = new Set<Server>();

type RequestBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: true;
};

const readRequestBody = (request: import('node:http').IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    request.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });

const setCorsHeaders = (response: ServerResponse, origin: string | undefined) => {
  response.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  response.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('X-Accel-Buffering', 'no');
};

const startSSE = (response: ServerResponse) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
  });
  response.flushHeaders();
};

const writeDelta = (response: ServerResponse, content: string) => {
  if (!response.destroyed) {
    response.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
  }
};

const endSSE = (response: ServerResponse) => {
  if (response.destroyed) return;
  response.write('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n');
  response.write('data: [DONE]\n\n');
  response.end();
};

const writeSSEContent = async (response: ServerResponse, content: string) => {
  startSSE(response);
  const characters = [...content];
  for (let index = 0; index < characters.length; index += 8) {
    if (response.destroyed) return;
    writeDelta(response, characters.slice(index, index + 8).join(''));
    await new Promise((resolve) => setTimeout(resolve, 4));
  }
  endSSE(response);
};

const startSSEMock = async (
  handleRequest: (
    body: RequestBody,
    response: ServerResponse,
    requestIndex: number,
  ) => void | Promise<void>,
) => {
  const requests: RequestBody[] = [];
  const server = createServer(async (request, response) => {
    setCorsHeaders(response, request.headers.origin);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const body = JSON.parse(await readRequestBody(request)) as RequestBody;
      const requestIndex = requests.push(body) - 1;
      await handleRequest(body, response, requestIndex);
    } catch {
      if (!response.destroyed) response.destroy();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  activeServers.add(server);
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Interview mock server did not start.');
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  return { requests, server, baseUrl };
};

const configureProvider = async (page: Page, baseUrl: string) => {
  await page.getByRole('button', { name: 'AI 设置' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 服务设置' });
  await dialog.getByLabel('API Base URL').fill(baseUrl);
  await dialog.getByRole('textbox', { name: 'API Key' }).fill(apiKey);
  await dialog.getByLabel('模型 ID').fill('interview-mock-model');
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
};

const openInterview = async (page: Page, english = false) => {
  await page
    .getByRole('button', { name: english ? 'Create Resume with AI' : 'AI 创建简历' })
    .click();
  return page.getByRole('dialog', { name: english ? 'AI resume interview' : 'AI 智能简历访谈' });
};

const answer = async (dialog: import('@playwright/test').Locator, text: string) => {
  await dialog.getByRole('textbox', { name: '你的回答' }).fill(text);
  await dialog.getByRole('button', { name: '发送回答' }).click();
};

test.afterEach(async () => {
  const servers = [...activeServers];
  activeServers.clear();
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        }),
    ),
  );
});

test('opens from the editor, supports guide questions without AI, and never changes the formal resume', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/chat/completions', async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.goto('/');
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);

  await expect(dialog.getByText('尚未配置 AI 服务。你仍可按基础问题完成访谈。')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '使用 AI 动态追问' })).toBeDisabled();
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await expect(dialog.getByRole('heading', { name: /你希望应聘什么岗位/u })).toBeVisible();
  const answerBox = dialog.getByRole('textbox', { name: '你的回答' });
  await answerBox.fill('Backend engineer');
  await answerBox.dispatchEvent('compositionstart');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await answerBox.press('Enter');
  await expect(dialog.getByRole('heading', { name: /你希望应聘什么岗位/u })).toBeVisible();
  await answerBox.dispatchEvent('compositionend');
  await answerBox.fill('Backend engineer');
  await answerBox.press('Shift+Enter');
  await answerBox.type('with API experience');
  await expect(answerBox).toHaveValue('Backend engineer\nwith API experience');
  await answerBox.fill('Backend engineer');
  await answerBox.press('Enter');
  await expect(dialog.getByRole('heading', { name: /你希望下一份工作用到/u })).toBeVisible();
  await expect(dialog.getByRole('complementary').getByText('Backend engineer')).toBeVisible();
  expect(requests).toBe(0);

  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
  const after = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  expect(after).toBe(before);
});

test('uses mocked SSE for contextual follow-ups, editing, and skip controls', async ({ page }) => {
  const { requests, baseUrl } = await startSSEMock(async (body, response, requestIndex) => {
    const userMessage = body.messages.find((message) => message.role === 'user');
    const context = JSON.parse(userMessage?.content ?? '{}') as {
      recentAnswers: Array<{ answer: string }>;
    };
    const content =
      requestIndex === 0
        ? '你在工作中具体负责哪些部分？'
        : context.recentAnswers.some(({ answer: text }) => text.includes('MES'))
          ? 'MES 团队协作中，你个人负责了哪部分？'
          : 'How did you work with the MES team?';
    await writeSSEContent(response, content);
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const persistedStorage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(persistedStorage).not.toContain(apiKey);
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用 AI 动态追问' }).click();
  await answer(dialog, 'Backend engineer');
  await expect(dialog.getByText(/浏览器直接发送|go directly from this browser/u)).toBeVisible();
  await expect(dialog.getByText(/该服务可能按自身政策处理这些内容/u)).toBeVisible();
  await expect(dialog.getByText(/不会通过自建后端或代理接收、转发数据/u)).toBeVisible();
  await expect(dialog.getByText(/API Key 仅保存在当前页面会话内存中/u)).toBeVisible();
  await expect(dialog.getByText(/不会发送示例简历/u)).toBeVisible();
  expect(requests).toHaveLength(0);
  await dialog.getByRole('button', { name: '发送这条回答并使用 AI' }).click();
  await expect(dialog.getByRole('heading', { name: '你在工作中具体负责哪些部分？' })).toBeVisible();
  expect(requests).toHaveLength(1);
  const payload = JSON.parse(
    requests[0]?.messages.find(({ role }) => role === 'user')?.content ?? '{}',
  ) as Record<string, unknown>;
  expect(Object.keys(payload).sort()).toEqual(
    ['currentPhase', 'currentQuestion', 'recentAnswers', 'targetRole'].sort(),
  );
  expect(JSON.stringify(payload)).not.toContain(apiKey);

  await answer(dialog, '我独立实现了工业物联网后端，MES 是参与团队开发。');
  await expect(
    dialog.getByRole('heading', { name: 'MES 团队协作中，你个人负责了哪部分？' }),
  ).toBeVisible();
  const summary = dialog.getByRole('complementary');
  const firstEditButton = summary.getByRole('button', { name: '修改回答' }).first();
  await firstEditButton.click();
  const editConfirmation = page.getByRole('alertdialog', {
    name: '返回修改并重新开始后续访谈？',
  });
  await expect(editConfirmation).toContainText('2 个问题和 1 条已回答内容');
  await editConfirmation.getByRole('button', { name: '保留当前访谈' }).click();
  await expect(summary.getByText('Backend engineer')).toBeVisible();
  await expect(summary.getByText('我独立实现了工业物联网后端，MES 是参与团队开发。')).toBeVisible();

  await firstEditButton.click();
  await page
    .getByRole('alertdialog', { name: '返回修改并重新开始后续访谈？' })
    .getByRole('button', { name: '确认返回修改' })
    .click();
  const answerBox = dialog.getByRole('textbox', { name: '你的回答' });
  await expect(answerBox).toHaveValue('Backend engineer');
  await dialog.getByRole('button', { name: '恢复修改前的访谈' }).click();
  await expect(summary.getByText('Backend engineer')).toBeVisible();
  await expect(summary.getByText('我独立实现了工业物联网后端，MES 是参与团队开发。')).toBeVisible();

  await firstEditButton.click();
  await page
    .getByRole('alertdialog', { name: '返回修改并重新开始后续访谈？' })
    .getByRole('button', { name: '确认返回修改' })
    .click();
  await expect(answerBox).toHaveValue('Backend engineer');
  await answerBox.fill('Senior backend engineer');
  await dialog.getByRole('button', { name: '发送回答' }).click();
  await expect(dialog.getByRole('button', { name: '跳过当前问题' })).toBeVisible();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests).toHaveLength(3);
  expect(JSON.stringify(requests[2]?.messages)).toContain('Senior backend engineer');
  expect(JSON.stringify(requests[2]?.messages)).not.toContain('MES 是参与团队开发');

  await dialog.getByRole('button', { name: '跳过当前问题' }).click();
  await dialog.getByRole('button', { name: '跳过本阶段' }).click();
  await expect(dialog.getByText('基本信息', { exact: true }).first()).toBeVisible();
  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
  await expect(dialog.getByText('访谈回答已从当前标签页内存中清除')).toBeVisible();

  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  const after = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  expect(after).toBe(before);
});

test('cancels an in-flight SSE question and keeps the user answer available', async ({ page }) => {
  let releaseStream: (() => void) | undefined;
  let streamStartedResolve: (() => void) | undefined;
  const streamStarted = new Promise<void>((resolve) => {
    streamStartedResolve = resolve;
  });
  const { baseUrl } = await startSSEMock(async (_body, response, requestIndex) => {
    if (requestIndex !== 0) {
      await writeSSEContent(response, 'What did you personally deliver?');
      return;
    }
    startSSE(response);
    writeDelta(response, 'Which parts did you own');
    streamStartedResolve?.();
    await new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    endSSE(response);
  });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用 AI 动态追问' }).click();
  await answer(dialog, 'Backend engineer');
  await dialog.getByRole('button', { name: '发送这条回答并使用 AI' }).click();
  await streamStarted;
  await expect(dialog.getByText('Which parts did you own', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '取消问题生成' }).click();
  await expect(dialog.getByRole('alert')).toContainText('已取消生成');
  expect(await dialog.getByText('Backend engineer').count()).toBeGreaterThan(0);
  releaseStream?.();
  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
  await expect(dialog.getByText('访谈已取消')).toBeVisible();
});

test('shows a request failure and waits for a user-initiated retry', async ({ page }) => {
  const { requests, baseUrl } = await startSSEMock(async (_body, response, requestIndex) => {
    if (requestIndex === 0) {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end('{"error":"mock unavailable"}');
      return;
    }
    await writeSSEContent(response, 'Which project result can you describe?');
  });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用 AI 动态追问' }).click();
  await answer(dialog, 'Backend engineer');
  await dialog.getByRole('button', { name: '发送这条回答并使用 AI' }).click();
  await expect(dialog.getByRole('alert')).toContainText('AI 请求失败');
  expect(requests).toHaveLength(1);
  await dialog.getByRole('button', { name: '重试生成 AI 问题' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Which project result can you describe?' }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
});

test('keeps keyboard focus inside the cancel confirmation and restores the right target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await dialog.getByRole('button', { name: '取消访谈' }).click();

  const alertdialog = page.getByRole('alertdialog', { name: '要丢弃本次访谈吗？' });
  const keepInterview = alertdialog.getByRole('button', { name: '继续访谈' });
  const discardAnswers = alertdialog.getByRole('button', { name: '丢弃回答' });
  await expect(alertdialog).toHaveAttribute('aria-modal', 'true');
  await expect(keepInterview).toBeFocused();
  await expect(keepInterview).toHaveCSS('transition-property', 'none');
  await page.keyboard.press('Tab');
  await expect(discardAnswers).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(keepInterview).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(discardAnswers).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(alertdialog).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '取消访谈' })).toBeFocused();
  await expect(dialog.getByRole('button', { name: '跳过当前问题' })).toBeVisible();

  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
  await expect(dialog.getByRole('heading', { name: '访谈已取消' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
});

test('shows and enforces the answer context budget without changing the draft', async ({
  page,
}) => {
  const { requests, baseUrl } = await startSSEMock(async (_body, response, requestIndex) => {
    const content =
      requestIndex === 0
        ? 'Which part did you personally own?'
        : 'How did you coordinate the shared work?';
    await writeSSEContent(response, content);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '夜间模式' }).click();
  await configureProvider(page, baseUrl);
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用 AI 动态追问' }).click();
  await answer(dialog, 'Backend engineer');
  await dialog.getByRole('button', { name: '发送这条回答并使用 AI' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Which part did you personally own?' }),
  ).toBeVisible();

  const answerBox = dialog.getByRole('textbox', { name: '你的回答' });
  const overBudgetDraft = `${'x'.repeat(490)}；我负责数据库迁移和发布回滚。`;
  await answerBox.fill(overBudgetDraft);
  await expect(answerBox).toHaveValue(overBudgetDraft);
  await expect(
    dialog.getByText('这条回答超过 AI 的 500 字符上限。草稿仍完整保留，请自行精简后再发送。'),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: '发送回答' })).toBeDisabled();
  expect(requests).toHaveLength(1);

  const approvedAnswer = '我独立负责 API 稳定性；MES 集成由团队共同完成。';
  await answerBox.fill(approvedAnswer);
  await expect(dialog.getByRole('button', { name: '发送回答' })).toBeEnabled();
  await dialog.getByRole('button', { name: '发送回答' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'How did you coordinate the shared work?' }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  const context = JSON.parse(
    requests[1]?.messages.find(({ role }) => role === 'user')?.content ?? '{}',
  ) as { recentAnswers: Array<{ answer: string }> };
  expect(context.recentAnswers.at(-1)?.answer).toBe(approvedAnswer);
  expect(JSON.stringify(requests[1]?.messages)).not.toContain(overBudgetDraft);

  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
});

test('supports English and Chinese layouts at desktop, tablet, and mobile sizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '夜间模式' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await page
    .getByRole('dialog', { name: '切换语言' })
    .getByRole('button', { name: '仅切换语言' })
    .click();
  let dialog = await openInterview(page, true);
  await expect(dialog.getByText('Start from scratch')).toBeVisible();
  await dialog.getByRole('button', { name: 'Start with guide questions' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Your answer' })).toBeVisible();
  expect(
    await dialog.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Pause interview and close' }).click();

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByRole('button', { name: /Light Mode/u }).click();
  await page.getByRole('button', { name: '中文' }).click();
  await page
    .getByRole('dialog', { name: 'Switch language' })
    .getByRole('button', { name: 'Language only' })
    .click();
  dialog = await openInterview(page);
  await expect(dialog.getByRole('heading', { name: /你希望应聘/u })).toBeVisible();
  expect(
    await dialog.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
  await dialog.getByRole('button', { name: '重新开始访谈' }).click();
  await expect(dialog.getByRole('heading', { name: /你希望应聘/u })).toBeVisible();
  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '夜间模式' }).click();
  dialog = await openInterview(page);
  await expect(dialog.getByRole('button', { name: '访谈', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /你希望应聘/u })).toBeVisible();
  expect(
    await dialog.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: '摘要' }).click();
  await expect(dialog.getByRole('heading', { name: '访谈摘要' })).toBeVisible();
  await dialog.getByRole('button', { name: '访谈', exact: true }).click();
  for (let index = 0; index < 6; index += 1) {
    await dialog.getByRole('button', { name: '跳过本阶段' }).click();
  }
  await expect(dialog.getByRole('heading', { name: '访谈摘要' }).last()).toBeVisible();
  await dialog.getByRole('button', { name: '结束访谈' }).click();
  await expect(dialog.getByRole('heading', { name: '访谈已完成' })).toBeVisible();
  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
});
