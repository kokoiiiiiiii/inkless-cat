import { createServer, type Server, type ServerResponse } from 'node:http';

import { expect, type Locator, type Page, test } from '@playwright/test';

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

const addAndConfirmManualFact = async (
  panel: Locator,
  sourceLabel: string,
  kindLabel: string,
  fields: Array<[label: string, value: string]>,
  uniqueMarker: string,
) => {
  await panel.getByRole('button', { name: '手动整理事实' }).click();
  await panel.getByLabel('事实类型').selectOption({ label: kindLabel });
  await panel.getByLabel('来源回答').selectOption({ label: sourceLabel });
  for (const [label, value] of fields) await panel.getByLabel(label).fill(value);
  await panel.getByRole('button', { name: '添加待核实事实' }).click();
  const factCard = panel.locator('article').filter({ hasText: uniqueMarker });
  await expect(factCard).toHaveCount(1);
  await factCard.getByRole('button', { name: '我已核对这些字段' }).click();
  await expect(factCard.getByText('字段含义已由你确认', { exact: true })).toBeVisible();
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

test('requires current-draft confirmation and keeps undo after rebuilding without AI', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/chat/completions', async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);

  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(dialog, 'Backend engineer');
  const summary = dialog.getByRole('complementary');
  await expect(summary.getByTestId('resume-generation-panel')).toBeVisible();
  await summary.getByRole('button', { name: '手动整理事实' }).click();
  await summary.getByLabel('来源回答').selectOption({
    label: '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。',
  });
  await summary.getByRole('textbox', { name: '目标岗位' }).fill('Backend engineer');
  await summary.getByRole('button', { name: '添加待核实事实' }).click();
  await summary.getByRole('button', { name: '我已核对这些字段' }).click();

  await summary.getByRole('button', { name: '构建草稿' }).click();
  await expect(summary.getByText('独立草稿预览')).toBeVisible();
  await expect(summary.getByText('Backend engineer').last()).toBeVisible();
  await expect(summary.getByText(/缺失字段/u)).toBeVisible();
  await summary.getByText('编辑候选简历', { exact: true }).click();
  await summary.getByLabel('目标岗位/头衔').fill('Senior backend engineer');

  await summary.getByRole('button', { name: '检查并替换当前简历' }).click();
  const acknowledgement = summary.getByRole('checkbox', { name: /理解这会替换当前正式简历/u });
  await acknowledgement.check();
  await summary.getByLabel('目标岗位/头衔').fill('Principal backend engineer');
  await expect(summary.getByRole('button', { name: '确认替换正式简历' })).toHaveCount(0);
  await expect(summary.getByText(/旧确认和勾选已清除/u)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(before);

  await summary.getByRole('button', { name: '检查并替换当前简历' }).click();
  await expect(
    summary.getByRole('checkbox', { name: /理解这会替换当前正式简历/u }),
  ).not.toBeChecked();
  await summary.getByRole('checkbox', { name: /理解这会替换当前正式简历/u }).check();
  await summary.getByRole('button', { name: '确认替换正式简历' }).click();
  const afterApply = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  expect(afterApply).not.toBe(before);

  await summary.getByRole('button', { name: '按最新事实重建' }).click();
  await expect(summary.getByRole('button', { name: '撤销并恢复原简历' })).toBeVisible();
  await summary.getByRole('button', { name: '撤销并恢复原简历' }).click();
  const afterUndo = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  expect(afterUndo).toBe(before);
  expect(requests).toBe(0);
});

test('aggregates confirmed facts for one experience while keeping responsibility ownership and provenance', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/chat/completions', async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(dialog, 'Backend Engineer');
  const summary = dialog.getByRole('complementary');
  const facts = summary.getByRole('region', { name: '事实核实' });
  const source = '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。';

  await addAndConfirmManualFact(
    facts,
    source,
    '工作经历',
    [
      ['雇主/任职公司（非客户公司）', 'BrightWorks'],
      ['岗位或职责', 'Backend Engineer'],
      ['开始时间', '2022'],
    ],
    '2022',
  );
  await addAndConfirmManualFact(
    facts,
    source,
    '工作经历',
    [
      ['雇主/任职公司（非客户公司）', 'BrightWorks'],
      ['岗位或职责', 'Backend Engineer'],
      ['个人独立负责', '独立设计并开发设备采集服务'],
    ],
    '独立设计并开发设备采集服务',
  );
  await addAndConfirmManualFact(
    facts,
    source,
    '工作经历',
    [
      ['雇主/任职公司（非客户公司）', 'BrightWorks'],
      ['岗位或职责', 'Backend Engineer'],
      ['与团队协作', '与团队协作完成 MES 集成'],
    ],
    '与团队协作完成 MES 集成',
  );

  await summary.getByRole('button', { name: '构建草稿' }).click();
  const draft = summary.getByTestId('generated-resume-draft');
  await expect(draft.locator('fieldset')).toHaveCount(1);
  const sources = JSON.parse((await draft.getAttribute('data-source-fact-ids')) ?? '[]') as Array<{
    factIds: string[];
  }>;
  expect(sources).toHaveLength(1);
  expect(sources[0]?.factIds).toHaveLength(3);

  await draft.getByText('编辑候选简历', { exact: true }).click();
  const highlights = await draft.getByLabel('职责与成果').inputValue();
  expect(highlights).toContain('个人负责：独立设计并开发设备采集服务');
  expect(highlights).toContain('与团队协作：与团队协作完成 MES 集成');
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(before);
  expect(requests).toBe(0);

  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
});

test('rejects high-risk Chinese polish and labels accepted semantic changes for human review', async ({
  page,
}) => {
  const { requests, baseUrl } = await startSSEMock(async (body, response, requestIndex) => {
    const userMessage = body.messages.find((message) => message.role === 'user');
    const payload = JSON.parse(userMessage?.content ?? '{}') as {
      items: Array<{ id: string; text: string }>;
    };
    await writeSSEContent(
      response,
      JSON.stringify({
        suggestions: payload.items.map(({ id }) => ({
          id,
          text:
            requestIndex === 0 ? '独立负责整个系统架构设计' : '参与系统后端开发，完成服务开发。',
        })),
      }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(dialog, 'Backend engineer');
  const summary = dialog.getByRole('complementary');
  const facts = summary.getByRole('region', { name: '事实核实' });
  const source = '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。';
  await addAndConfirmManualFact(
    facts,
    source,
    '个人信息',
    [['简介', '参与系统后端开发']],
    '参与系统后端开发',
  );
  await summary.getByRole('button', { name: '构建草稿' }).click();
  const draft = summary.getByTestId('generated-resume-draft');

  await draft.getByRole('button', { name: '检查即将发送的文字' }).click();
  await draft.getByRole('button', { name: '发送叙述文字并获取建议' }).click();
  await expect(draft.getByRole('alert')).toContainText('建议改变了职责归属或工作范围');
  await expect(draft.getByRole('button', { name: '在草稿中采用' })).toHaveCount(0);
  expect(requests).toHaveLength(1);

  await draft.getByRole('button', { name: '检查即将发送的文字' }).click();
  await draft.getByRole('button', { name: '发送叙述文字并获取建议' }).click();
  await expect(draft.getByText(/需要人工核对：措辞内容变化/u)).toBeVisible();
  await expect(draft.getByText('参与系统后端开发，完成服务开发。', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(before);

  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
});

test('sends only reviewed prose for optional wording suggestions and keeps them separate until accepted', async ({
  page,
}) => {
  const { requests, baseUrl } = await startSSEMock(async (body, response) => {
    const userMessage = body.messages.find((message) => message.role === 'user');
    const payload = JSON.parse(userMessage?.content ?? '{}') as {
      items: Array<{ id: string; text: string }>;
    };
    await writeSSEContent(
      response,
      JSON.stringify({
        suggestions: payload.items.map(({ id, text }) => ({
          id,
          text: text.replace('I built reliable services', 'I developed reliable services'),
        })),
      }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const before = await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'));
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(dialog, 'I built reliable services using TypeScript.');
  const summary = dialog.getByRole('complementary');
  await summary.getByRole('button', { name: '手动整理事实' }).click();
  await summary.getByLabel('事实类型').selectOption({ label: '个人信息' });
  await summary.getByLabel('来源回答').selectOption({
    label: '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。',
  });
  await summary.getByLabel('简介').fill('I built reliable services using TypeScript.');
  await summary.getByRole('button', { name: '添加待核实事实' }).click();
  await summary.getByRole('button', { name: '我已核对这些字段' }).click();

  await summary.getByRole('button', { name: '构建草稿' }).click();
  const draft = summary.getByTestId('generated-resume-draft');
  const summaryText = 'I built reliable services using TypeScript.';
  const previewSummary = draft.getByRole('paragraph').filter({ hasText: summaryText });
  await expect(previewSummary).toHaveText(summaryText);
  expect(requests).toHaveLength(0);
  await draft.getByRole('button', { name: '检查即将发送的文字' }).click();
  await expect(draft.getByText(/以下 1 项叙述文字会直接发送/u)).toBeVisible();
  await expect(draft.getByRole('listitem').filter({ hasText: summaryText })).toBeVisible();
  expect(requests).toHaveLength(0);

  await draft.getByRole('button', { name: '发送叙述文字并获取建议' }).click();
  await expect.poll(() => requests.length).toBe(1);
  const payload = JSON.parse(
    requests[0]?.messages.find(({ role }) => role === 'user')?.content ?? '{}',
  ) as { items: Array<{ id: string; text: string }> };
  expect(Object.keys(payload).sort()).toEqual(['items']);
  expect(payload.items).toEqual([
    { id: 'personal-summary', text: 'I built reliable services using TypeScript.' },
  ]);
  await expect(
    draft.getByText('I developed reliable services using TypeScript.', { exact: true }),
  ).toBeVisible();

  await draft.getByText('编辑候选简历', { exact: true }).click();
  const candidateSummary = draft.getByLabel('简介');
  await expect(candidateSummary).toHaveValue('I built reliable services using TypeScript.');
  await draft.getByRole('button', { name: '在草稿中采用' }).click();
  await expect(candidateSummary).toHaveValue('I developed reliable services using TypeScript.');
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(before);
  expect(requests).toHaveLength(1);

  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(before);
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

test('reviews the exact answers before fact extraction and rejects ungrounded model output', async ({
  page,
}) => {
  const { requests, baseUrl } = await startSSEMock(async (body, response, requestIndex) => {
    const userMessage = body.messages.find((message) => message.role === 'user');
    const payload = JSON.parse(userMessage?.content ?? '{}') as {
      answers?: Array<{ questionId: string; answerId: string; answer: string }>;
    };
    const source = payload.answers?.[0];
    const content =
      requestIndex === 0
        ? JSON.stringify({
            facts: source
              ? [
                  {
                    kind: 'targetRole',
                    sourceQuestionId: source.questionId,
                    sourceAnswerId: source.answerId,
                    value: 'Backend engineer',
                  },
                ]
              : [],
          })
        : JSON.stringify({
            facts: source
              ? [
                  {
                    kind: 'experience',
                    sourceQuestionId: source.questionId,
                    sourceAnswerId: source.answerId,
                    value: {
                      company: 'Fictional Systems',
                      achievements: ['Increased revenue by 70%'],
                    },
                  },
                ]
              : [],
          });
    await writeSSEContent(response, content);
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(dialog, 'Backend engineer');
  const facts = dialog.getByRole('complementary').getByRole('region', { name: '事实核实' });

  await facts.getByRole('button', { name: 'AI 提取事实' }).click();
  await expect(facts.getByText(/以下 1 条回答/u)).toBeVisible();
  await expect(facts.getByText('Backend engineer', { exact: true })).toBeVisible();
  await expect(facts.getByText(baseUrl)).toBeVisible();
  expect(requests).toHaveLength(0);
  await facts.getByRole('button', { name: '发送这些回答并提取' }).click();
  await expect(facts.getByText('字段含义待你核对', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(JSON.stringify(requests[0]?.messages)).not.toContain(apiKey);
  expect(JSON.stringify(requests[0]?.messages)).not.toContain('Qing Chen');
  await facts.getByRole('button', { name: '我已核对这些字段' }).click();
  await expect(facts.getByText('字段含义已由你确认', { exact: true })).toBeVisible();
  await expect(facts.getByText('已确认事实汇总（1）')).toBeVisible();

  await facts.getByRole('button', { name: 'AI 提取事实' }).click();
  await facts.getByRole('button', { name: '发送这些回答并提取' }).click();
  await expect(facts.getByRole('alert')).toContainText('模型返回内容未通过结构和来源校验');
  expect(requests).toHaveLength(2);
  await expect(facts.getByText('Fictional Systems')).toHaveCount(0);
  await expect(facts.getByText('已确认事实汇总（1）')).toBeVisible();

  await dialog.getByRole('button', { name: '取消访谈' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '丢弃回答' }).click();
});

test('keeps source traceability separate from employer and responsibility field review', async ({
  page,
}) => {
  const { requests, baseUrl } = await startSSEMock(async (body, response) => {
    const userMessage = body.messages.find((message) => message.role === 'user');
    const payload = JSON.parse(userMessage?.content ?? '{}') as {
      answers?: Array<{ questionId: string; answerId: string }>;
    };
    const source = payload.answers?.[0];
    await writeSSEContent(
      response,
      JSON.stringify({
        facts: source
          ? [
              {
                kind: 'experience',
                sourceQuestionId: source.questionId,
                sourceAnswerId: source.answerId,
                value: {
                  company: 'Northwind Health',
                  role: 'engineer',
                  location: 'Seattle',
                  individualResponsibilities: ['the whole team launched the migration'],
                  teamResponsibilities: ['I personally wrote the import tool'],
                },
              },
            ]
          : [],
      }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await configureProvider(page, baseUrl);
  const dialog = await openInterview(page);
  await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
  await answer(
    dialog,
    'Backend engineer. I work for BrightWorks as an engineer in Seattle. BrightWorks built billing software for Northwind Health, our customer. I personally wrote the import tool, while the whole team launched the migration.',
  );
  const facts = dialog.getByRole('complementary').getByRole('region', { name: '事实核实' });
  const resumeStoreBefore = await page.evaluate(() =>
    localStorage.getItem('inkless-cat/resume-store'),
  );

  await facts.getByRole('button', { name: 'AI 提取事实' }).click();
  await facts.getByRole('button', { name: '发送这些回答并提取' }).click();
  await expect(facts.getByText('Northwind Health', { exact: true })).toBeVisible();
  await expect(facts.getByText('字段含义待你核对', { exact: true })).toBeVisible();
  await expect(facts.getByText(/已关联来源回答/u)).toBeVisible();
  await expect(facts.getByText('雇主/任职公司（非客户公司）:', { exact: true })).toBeVisible();
  await expect(facts.getByText('个人独立负责:', { exact: true })).toBeVisible();
  await expect(facts.getByText('与团队协作:', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);

  await facts.getByRole('button', { name: '编辑' }).click();
  await facts.getByLabel('雇主/任职公司（非客户公司）').fill('BrightWorks');
  await facts.getByLabel('个人独立负责').fill('I personally wrote the import tool');
  await facts.getByLabel('与团队协作').fill('the whole team launched the migration');
  await facts.getByRole('button', { name: '保存修改并重新核实' }).click();
  await facts.getByText('查看来源回答').click();
  await expect(
    facts.getByText(/BrightWorks built billing software for Northwind Health/u),
  ).toBeVisible();
  await facts.getByRole('button', { name: '我已核对这些字段' }).click();
  await expect(facts.getByText('字段含义已由你确认', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('inkless-cat/resume-store'))).toBe(
    resumeStoreBefore,
  );

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
  await answer(dialog, 'Backend engineer');
  const summaryTab = dialog.getByRole('button', { name: '摘要' });
  await summaryTab.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('heading', { name: '访谈摘要' })).toBeVisible();
  const facts = dialog.getByRole('complementary').getByRole('region', { name: '事实核实' });
  await expect(facts).toBeVisible();
  const manualEntry = facts.getByRole('button', { name: '手动整理事实' });
  await manualEntry.focus();
  await page.keyboard.press('Enter');
  await expect(facts.getByRole('heading', { name: '添加一条事实' })).toBeVisible();
  await dialog.getByRole('button', { name: '访谈', exact: true }).click();
  for (let index = 0; index < 6; index += 1) {
    await dialog.getByRole('button', { name: '跳过本阶段' }).click();
  }
  await expect(dialog.getByRole('heading', { name: '访谈摘要' }).last()).toBeVisible();
  await dialog.getByRole('button', { name: '结束访谈' }).click();
  await expect(dialog.getByRole('heading', { name: '访谈已完成' })).toBeVisible();
  await dialog.getByRole('button', { name: '暂停访谈并关闭' }).click();
});
