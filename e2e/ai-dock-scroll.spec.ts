import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { createEmptyResume } from '@entities/resume';
import {
  createDefaultWorkspace,
  migrateWorkspace,
  RESUME_STORE_PERSIST_VERSION,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { expect, test } from '@playwright/test';
import { LOCALE_KEY } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

const viewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const screenshotsDir =
  process.env.PC_DOCK_SCREENSHOTS ??
  path.resolve('artifacts/pc-d3-slice2-dock-r1/screenshots');

const installFictionalWorkspace = async (page: import('@playwright/test').Page) => {
  const resume = createEmptyResume();
  resume.personal = {
    ...resume.personal,
    fullName: 'Fictional Review Tester',
    title: 'Product Designer · Test Studio',
    email: 'reviewer@example.test',
    phone: '+1 555 0100',
    location: 'Example City',
    summary: makeOriginal(),
  };
  const defaults = createDefaultWorkspace();
  const normalized = migrateWorkspace({ ...defaults, resume });
  if (!normalized.ok) throw new Error(normalized.error.message);

  await page.addInitScript(
    ({
      persistedResume,
      activeSections,
      resumeKey,
      resumeVersion,
      uiKey,
      uiVersion,
      persistedUI,
      localeKey,
    }) => {
      localStorage.setItem(
        resumeKey,
        JSON.stringify({
          state: { resume: persistedResume, activeSections },
          version: resumeVersion,
        }),
      );
      localStorage.setItem(uiKey, JSON.stringify({ state: persistedUI, version: uiVersion }));
      localStorage.setItem(localeKey, 'zh-CN');
    },
    {
      persistedResume: normalized.value.resume,
      activeSections: normalized.value.activeSections,
      resumeKey: RESUME_STORE_PERSIST_KEY,
      resumeVersion: RESUME_STORE_PERSIST_VERSION,
      uiKey: UI_STORE_PERSIST_KEY,
      uiVersion: UI_STORE_PERSIST_VERSION,
      persistedUI: {
        theme: normalized.value.theme,
        templateId: normalized.value.templateId,
        customTemplates: normalized.value.customTemplates,
      },
      localeKey: LOCALE_KEY,
    },
  );
};

const makeOriginal = () =>
  Array.from(
    { length: 4 },
    (_, index) =>
      `Source ${String(index + 1).padStart(2, '0')}: Draft wording for the fictional studio. 中文原文段落${index + 1}保留可核验事实。`,
  ).join('\n\n');

const makeSuggestion = () =>
  Array.from({ length: 12 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const opening =
      index < 4
        ? `Source ${number}: Refined wording for the fictional studio. 中文原文段落${index + 1}继续保留可核验事实，并清楚说明协作方式。`
        : `中文段落 ${number}：这是完全虚构的长文本审阅内容，包含多行编辑、清楚的过程说明与稳定的产品体验。`;
    const english =
      `English paragraph ${number}: This fictional review note describes a clear, reliable workflow for a small creative team. ` +
      `It includes no personal resume data, and it remains editable before the user makes a decision.`;
    return `${opening}\n${english}`;
  }).join('\n\n');

const configureLocalMockProvider = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: '配置 AI 服务' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 服务设置' });
  await dialog.getByLabel('API Base URL').fill('http://127.0.0.1:4173/mock-ai/v1');
  await dialog.getByRole('textbox', { name: 'API Key' }).fill('dock-scroll-test-key');
  await dialog.getByLabel('模型 ID').fill('dock-scroll-test-model');
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
};

const installLocalSuggestion = async (
  page: import('@playwright/test').Page,
  suggestion: string,
) => {
  await page.route('**/mock-ai/v1/chat/completions', async (route) => {
    const response = `data: ${JSON.stringify({ choices: [{ delta: { content: suggestion } }] })}\n\ndata: [DONE]\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      headers: { 'cache-control': 'no-cache' },
      body: response,
    });
  });
};

const wheelBodyToEnd = async (
  page: import('@playwright/test').Page,
  body: import('@playwright/test').Locator,
) => {
  await body.evaluate((element) => {
    element.scrollTop = 0;
  });
  const bodyBox = await body.boundingBox();
  if (!bodyBox) throw new Error('AI Dock content region has no layout box.');
  await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + 24);

  let metrics = await body.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.mouse.wheel(0, 500);
    metrics = await body.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    if (metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 1) break;
  }
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.scrollTop + metrics.clientHeight).toBeGreaterThanOrEqual(metrics.scrollHeight - 1);
  return metrics;
};

const wheelNestedContentToEnd = async (
  page: import('@playwright/test').Page,
  content: import('@playwright/test').Locator,
) => {
  await content.scrollIntoViewIfNeeded();
  await content.evaluate((element) => {
    element.scrollTop = 0;
  });
  const box = await content.boundingBox();
  if (!box) throw new Error('AI review content has no layout box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  let metrics = await content.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.mouse.wheel(0, 400);
    metrics = await content.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    if (metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 1) break;
  }
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.scrollTop + metrics.clientHeight).toBeGreaterThanOrEqual(metrics.scrollHeight - 1);
  return metrics;
};

const assertButtonInViewport = async (
  page: import('@playwright/test').Page,
  button: import('@playwright/test').Locator,
  width: number,
  height: number,
) => {
  const bounds = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
  expect(await button.isEnabled()).toBe(true);

  const receivesPointer = await page.evaluate(
    ({ x, y, selector }) => {
      const buttonElement = document.querySelector(selector);
      const elementAtPoint = document.elementFromPoint(x, y);
      return Boolean(buttonElement && elementAtPoint && buttonElement.contains(elementAtPoint));
    },
    {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      selector: `[data-testid="${await button.getAttribute('data-testid')}"]`,
    },
  );
  expect(receivesPointer).toBe(true);
  return bounds;
};

const mouseClickAtCenter = async (
  page: import('@playwright/test').Page,
  bounds: { x: number; y: number; width: number; height: number },
) => {
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
};

test('AI Dock wheel scroll reaches edited Accept and Reject actions across desktop viewports', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await mkdir(screenshotsDir, { recursive: true });
  await page.setViewportSize(viewports[2]!);
  await installFictionalWorkspace(page);
  await page.goto('/pc-studio');
  await expect(page.getByTestId('pc-studio')).toBeVisible();

  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = makeOriginal();
  const suggestion = makeSuggestion();
  await summary.fill(original);
  await summary.focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dock = page.getByTestId('pc-ai-dock');
  await expect(dock).toBeVisible();
  await configureLocalMockProvider(page);
  const requestButton = dock.getByRole('button', { name: '比较 AI 建议' });
  await requestButton.click();
  await installLocalSuggestion(page, suggestion);

  const inlinePanel = page.getByTestId('pc-ai-inline-panel');
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  const candidate = page.getByTestId('pc-ai-inline-candidate');
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'SUGGESTION_READY');
  await expect(candidate).toHaveValue(suggestion);
  await expect(page.getByTestId('pc-ai-inline-source')).toContainText(original);
  const diff = page.getByTestId('pc-ai-inline-diff');
  expect(await diff.locator('ins').count()).toBeGreaterThan(1);
  expect(await diff.locator('del').count()).toBeGreaterThan(1);
  await expect(summary).toHaveValue(original);

  const editedSuggestion = `${suggestion}\n\nEdited by reviewer: 已完成多行建议编辑。`;
  await candidate.fill(editedSuggestion);
  await expect(candidate).toHaveValue(editedSuggestion);

  const body = dock.locator('.pc-ai-dock-body');
  const candidateScroll = await wheelNestedContentToEnd(page, candidate);
  const diffScroll = await wheelNestedContentToEnd(page, diff);
  const accept = page.getByTestId('pc-ai-inline-apply');
  const reject = page.getByTestId('pc-ai-inline-reject');
  const evidence: Array<Record<string, unknown>> = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(dock).toBeVisible();
    const metrics = await wheelBodyToEnd(page, body);
    const acceptBounds = await assertButtonInViewport(
      page,
      accept,
      viewport.width,
      viewport.height,
    );
    const rejectBounds = await assertButtonInViewport(
      page,
      reject,
      viewport.width,
      viewport.height,
    );
    const dockMetrics = await dock.evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
    }));
    const bodyMetrics = await body.evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    const pageMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dockMetrics.scrollWidth).toBeLessThanOrEqual(dockMetrics.clientWidth + 1);
    expect(bodyMetrics.scrollWidth).toBeLessThanOrEqual(bodyMetrics.clientWidth + 1);
    expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(pageMetrics.clientWidth + 1);
    evidence.push({
      viewport,
      dock: dockMetrics,
      content: bodyMetrics,
      page: pageMetrics,
      acceptBounds,
      rejectBounds,
    });
    await page.screenshot({
      path: path.join(screenshotsDir, `ai-dock-scroll-${viewport.width}x${viewport.height}.png`),
      fullPage: false,
    });
    console.log(
      `[AI Dock scroll] ${JSON.stringify({ viewport, dock: dockMetrics, content: metrics, nested: { candidate: candidateScroll, diff: diffScroll }, page: pageMetrics, acceptBounds, rejectBounds })}`,
    );
  }

  await page.setViewportSize(viewports[0]!);
  await wheelBodyToEnd(page, body);
  const rejectBounds = await assertButtonInViewport(page, reject, 1024, 768);
  await mouseClickAtCenter(page, rejectBounds);
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'REJECTED');
  await expect(summary).toHaveValue(original);
  await inlinePanel.getByTestId('pc-ai-inline-done').click();
  await expect(inlinePanel).toHaveCount(0);

  await requestButton.click();
  const acceptedPanel = page.getByTestId('pc-ai-inline-panel');
  await acceptedPanel.getByTestId('pc-ai-inline-generate').click();
  const acceptedCandidate = page.getByTestId('pc-ai-inline-candidate');
  await expect(acceptedCandidate).toHaveValue(suggestion);
  await acceptedCandidate.fill(editedSuggestion);
  await wheelBodyToEnd(page, body);
  const acceptBounds = await assertButtonInViewport(page, accept, 1024, 768);
  await mouseClickAtCenter(page, acceptBounds);
  await expect(acceptedPanel).toHaveAttribute('data-ai-state', 'ACCEPTED');
  await expect(summary).toHaveValue(editedSuggestion);
  expect(evidence).toHaveLength(viewports.length);

  await acceptedPanel.getByTestId('pc-ai-inline-done').click();
  await dock.getByRole('button', { name: '关闭' }).click();
  await expect(dock).toBeHidden();
  await expect(summary).toBeVisible();
  await expect(summary).toHaveValue(editedSuggestion);
});

test('AI Dock scroll region is keyboard reachable and keeps review actions in tab order', async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]!);
  await installFictionalWorkspace(page);
  await page.goto('/pc-studio');
  await expect(page.getByTestId('pc-studio')).toBeVisible();
  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = makeOriginal();
  await summary.fill(original);
  await summary.focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dock = page.getByTestId('pc-ai-dock');
  await expect(dock).toBeVisible();
  await configureLocalMockProvider(page);
  await dock.getByRole('button', { name: '比较 AI 建议' }).click();
  const suggestion = makeSuggestion();
  await installLocalSuggestion(page, suggestion);
  const inlinePanel = page.getByTestId('pc-ai-inline-panel');
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'SUGGESTION_READY');

  const body = dock.locator('.pc-ai-dock-body');
  await expect(body).toHaveAttribute('role', 'region');
  await expect(body).toHaveAttribute('tabindex', '0');
  await dock.getByRole('button', { name: '关闭' }).focus();
  await page.keyboard.press('Tab');
  await expect(body).toBeFocused();
  expect(
    await body.evaluate((element) => ({
      matchesFocusVisible: element.matches(':focus-visible'),
      outlineStyle: getComputedStyle(element).outlineStyle,
      outlineWidth: getComputedStyle(element).outlineWidth,
    })),
  ).toEqual({ matchesFocusVisible: true, outlineStyle: 'solid', outlineWidth: '2px' });

  const beforePageDown = await body.evaluate((element) => element.scrollTop);
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => body.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(beforePageDown);

  const requestButton = dock.getByRole('button', { name: '比较 AI 建议' });
  await page.keyboard.press('Tab');
  await expect(requestButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dock.getByRole('button', { name: 'AI 设置' })).toBeFocused();
  const candidate = page.getByTestId('pc-ai-inline-candidate');
  await page.keyboard.press('Tab');
  await expect(candidate).toBeFocused();
  const generated = await candidate.inputValue();
  await candidate.fill(`${generated}\n\nKeyboard review edit.`);

  await page.keyboard.press('Tab');
  const diff = page.getByTestId('pc-ai-inline-diff');
  const generate = inlinePanel.getByTestId('pc-ai-inline-generate');
  if (!(await generate.evaluate((element) => element === document.activeElement))) {
    await expect(diff).toBeFocused();
    await page.keyboard.press('Tab');
  }
  await expect(generate).toBeFocused();
  await page.keyboard.press('Tab');
  const reject = page.getByTestId('pc-ai-inline-reject');
  await expect(reject).toBeFocused();
  const rejectBounds = await reject.boundingBox();
  expect(rejectBounds).not.toBeNull();
  expect(rejectBounds!.y).toBeGreaterThanOrEqual(0);
  expect(rejectBounds!.y + rejectBounds!.height).toBeLessThanOrEqual(900);
  await page.keyboard.press('Enter');
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'REJECTED');
  await expect(summary).toHaveValue(original);

  await inlinePanel.getByTestId('pc-ai-inline-done').focus();
  await page.keyboard.press('Enter');
  await expect(inlinePanel).toHaveCount(0);
  await dock.getByRole('button', { name: '返回预览' }).focus();
  await page.keyboard.press('Enter');
  await expect(dock).toBeHidden();
  await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
});
