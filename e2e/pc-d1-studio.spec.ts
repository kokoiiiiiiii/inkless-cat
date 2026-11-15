import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createDefaultWorkspace,
  migrateWorkspace,
  RESUME_STORE_PERSIST_VERSION,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { expect, test } from '@playwright/test';
import { LOCALE_KEY } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

import { penpotGeometryResume, productScreenshotResume } from './fixtures/pc-d1';

const screenshotsDir = path.resolve(
  process.env.PC_D1_R1_SCREENSHOTS_DIR ?? 'artifacts/pc-d1-r1/screenshots',
);

const installResumeFixture = async (
  page: import('@playwright/test').Page,
  resume: ReturnType<typeof penpotGeometryResume>,
  locale: 'zh-CN' | 'en' = 'zh-CN',
) => {
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
      currentLocale,
    }) => {
      if (!localStorage.getItem(resumeKey)) {
        localStorage.setItem(
          resumeKey,
          JSON.stringify({
            state: { resume: persistedResume, activeSections },
            version: resumeVersion,
          }),
        );
        localStorage.setItem(uiKey, JSON.stringify({ state: persistedUI, version: uiVersion }));
        localStorage.setItem(localeKey, currentLocale);
      }
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
      currentLocale: locale,
    },
  );
};

const openStudio = async (page: import('@playwright/test').Page, width = 1440, height = 900) => {
  await page.setViewportSize({ width, height });
  await page.goto('/pc-studio');
  await expect(page.getByTestId('pc-studio')).toBeVisible();
  if (width > 1199) {
    await expect(page.locator('.pc-preview-paper .resume-preview')).toBeVisible();
  }
  await expect(page.getByTestId('pc-save-status')).toHaveAttribute(
    'data-save-state',
    /^(ready|saved)$/u,
  );
};

const exportWorkspaceFromStudio = async (page: import('@playwright/test').Page) => {
  await page.locator('.pc-export-menu summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: /导出工作区|Export Workspace/u }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide a workspace download.');
  const migrated = migrateWorkspace(JSON.parse(await readFile(path, 'utf8')) as unknown);
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

const configureMockProvider = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: '配置 AI 服务' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 服务设置' });
  await dialog.getByLabel('API Base URL').fill('http://127.0.0.1:5173/mock-ai/v1');
  await dialog.getByRole('textbox', { name: 'API Key' }).fill('pc-d1-test-session-key');
  await dialog.getByLabel('模型 ID').fill('test-model');
  await dialog.getByRole('button', { name: '保存到当前会话' }).click();
  await dialog.getByRole('button', { name: '关闭 AI 设置' }).click();
};

test('PC-D1 opens through the isolated experimental route', async ({ page }) => {
  await openStudio(page);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '简历模块' })).toBeVisible();
  await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
  await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
  await expect(page.getByRole('button', { name: /撤销.*当前版本暂不支持/u })).toBeDisabled();
  const zoom = page.getByTestId('pc-preview-zoom-value');
  await page.getByTestId('pc-preview-zoom-100').click();
  await expect(zoom).toHaveText('100%');
  await page.getByRole('button', { name: '放大' }).click();
  await expect(zoom).toHaveText('105%');
  await page.getByRole('button', { name: '缩小' }).click();
  await expect(zoom).toHaveText('100%');
  await page.getByTestId('pc-preview-fit-width').click();
  await expect(page.getByTestId('pc-preview-fit-width')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pc-preview-pane')).toHaveAttribute('data-zoom-mode', 'FIT_WIDTH');
});

test('Focus Preview returns focus, selection, and scroll to the editor', async ({ page }) => {
  await installResumeFixture(page, productScreenshotResume());
  await openStudio(page, 1440, 900);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  await summary.focus();
  await summary.evaluate((element: HTMLTextAreaElement) => {
    element.setSelectionRange(3, 18, 'backward');
  });
  const editorScroll = page.locator('.pc-editor-scroll');
  await editorScroll.evaluate((element) => {
    element.scrollTop = 120;
  });

  await page.getByTestId('pc-preview-focus').click();
  await expect(summary).toBeHidden();
  await page.keyboard.press('Escape');

  await expect(summary).toBeFocused();
  await expect
    .poll(() =>
      summary.evaluate((element: HTMLTextAreaElement) => ({
        start: element.selectionStart,
        end: element.selectionEnd,
        direction: element.selectionDirection,
      })),
    )
    .toEqual({ start: 3, end: 18, direction: 'backward' });
  await expect.poll(() => editorScroll.evaluate((element) => element.scrollTop)).toBe(120);
});

test('Fit Width recalculates after the preview container resizes', async ({ page }) => {
  await openStudio(page, 1280, 800);
  const pane = page.getByTestId('pc-preview-pane');
  await page.getByTestId('pc-preview-fit-width').click();
  const initialWidth = Number(await pane.getAttribute('data-container-width'));

  await page.setViewportSize({ width: 1920, height: 1080 });

  await expect
    .poll(async () => Number(await pane.getAttribute('data-container-width')))
    .toBeGreaterThan(initialWidth);
  await expect(pane).toHaveAttribute('data-zoom-mode', 'FIT_WIDTH');
});

test('local save status reports a blocked canonical storage write', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = globalThis.localStorage.setItem.bind(globalThis.localStorage);
    Storage.prototype.setItem = (key, value) => {
      if (key === 'inkless-cat/resume-store') {
        throw new DOMException('Simulated quota failure', 'QuotaExceededError');
      }
      originalSetItem(key, value);
    };
  });

  await openStudio(page);
  await page.getByRole('textbox', { name: '姓名' }).fill('Unsaved Storage Candidate');
  await expect(page.getByTestId('pc-save-status')).toHaveAttribute('data-save-state', 'error');
});

test('canonical personal editing updates the real preview and survives reload', async ({
  page,
}) => {
  await openStudio(page);
  const initial = await exportWorkspaceFromStudio(page);
  const name = 'PC-D1 Canonical Candidate';
  const email = 'pc-d1@example.test';
  const summary = Array.from(
    { length: 12 },
    (_, index) =>
      `Led product and engineering teams through accessible, reliable releases with measurable customer outcomes (${index + 1}).`,
  ).join('\n');

  const nameInput = page.getByRole('textbox', { name: '姓名' });
  const titleInput = page.getByRole('textbox', { name: '目标职位' });
  const summaryInput = page.getByRole('textbox', { name: '个人简介' });
  const emailInput = page.locator('[data-studio-field-id="personal.email"]');
  const phoneInput = page.locator('[data-studio-field-id="personal.phone"]');
  const phoneBefore = await phoneInput.inputValue();

  await nameInput.fill(name);
  await titleInput.fill('Product Engineer');
  await emailInput.fill('invalid-email');
  await expect(page.getByTestId('pc-email-error')).toBeVisible();
  await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  await emailInput.fill(email);
  await summaryInput.fill(summary);
  expect(
    await summaryInput.evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);

  const preview = page.locator('.pc-preview-paper .resume-preview');
  await expect(preview.getByRole('heading', { name })).toBeVisible();
  await expect(preview).toContainText(email);
  await expect(preview).toContainText(summary);
  await expect(page.getByTestId('pc-save-status')).toHaveAttribute('data-save-state', 'saved');

  const updated = await exportWorkspaceFromStudio(page);
  expect(updated.resume).toEqual({
    ...initial.resume,
    personal: {
      ...initial.resume.personal,
      fullName: name,
      title: 'Product Engineer',
      email,
      summary,
    },
  });
  expect(updated.activeSections).toEqual(initial.activeSections);
  expect(updated.templateId).toBe(initial.templateId);

  await page.reload();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(name);
  await expect(page.getByRole('textbox', { name: '目标职位' })).toHaveValue('Product Engineer');
  await expect(page.getByRole('textbox', { name: '个人简介' })).toHaveValue(summary);
  await expect(page.locator('[data-studio-field-id="personal.email"]')).toHaveValue(email);
  await expect(page.locator('.pc-preview-paper .resume-preview')).toContainText(summary);
  await expect(page.locator('[data-studio-field-id="personal.phone"]')).toHaveValue(phoneBefore);
});

test('PC personal secondary fields remain editable through the native disclosure', async ({
  page,
}) => {
  await installResumeFixture(page, penpotGeometryResume());
  await openStudio(page);
  const disclosure = page.getByTestId('pc-personal-more');
  const extraValue = page.locator('[data-studio-field-id="personal.extras.extra-linkedin.value"]');

  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(extraValue).toHaveValue('linkedin.com/in/yue-lin');
  await extraValue.fill('linkedin.com/in/yue-lin-updated');

  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(extraValue).toHaveValue('linkedin.com/in/yue-lin-updated');

  const updated = await exportWorkspaceFromStudio(page);
  expect(updated.resume.personal.extras).toEqual([
    { id: 'extra-portfolio', label: '个人网站', value: 'yuelin.work / strategy-notes' },
    { id: 'extra-linkedin', label: 'LinkedIn', value: 'linkedin.com/in/yue-lin-updated' },
  ]);
});

test('PC AI context uses stable field identity across labels, modules, and Dock toggles', async ({
  page,
}) => {
  await installResumeFixture(page, penpotGeometryResume(), 'en');
  await openStudio(page);

  const openAI = async () => {
    await page.getByRole('button', { name: 'AI Assistant' }).click();
    await expect(page.getByTestId('pc-ai-dock')).toBeVisible();
  };
  const fieldContext = page.getByTestId('pc-ai-field-context');
  const title = page.locator('[data-studio-field-id="personal.title"]');
  await title.focus();
  await openAI();
  await expect(fieldContext).toHaveAttribute('data-field-id', 'personal.title');
  await expect(fieldContext).toHaveAttribute('data-write-target', '');
  await expect(fieldContext).toHaveText('Target role');
  await expect(page.getByRole('button', { name: 'Compare AI suggestion' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  const summary = page.locator('[data-studio-field-id="personal.summary"]');
  await summary.focus();
  await openAI();
  await expect(fieldContext).toHaveAttribute('data-field-id', 'personal.summary');
  await expect(fieldContext).toHaveAttribute('data-write-target', 'personal.summary');
  await expect(fieldContext).toHaveText('Summary');
  await page.getByRole('button', { name: 'Close' }).click();
  await openAI();
  await expect(fieldContext).toHaveAttribute('data-field-id', 'personal.summary');

  await page.evaluate(({ localeKey }) => localStorage.setItem(localeKey, 'zh-CN'), {
    localeKey: LOCALE_KEY,
  });
  await page.reload();
  await expect(page.getByTestId('pc-studio')).toBeVisible();
  await page.locator('[data-studio-field-id="personal.summary"]').focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute(
    'data-field-id',
    'personal.summary',
  );
  await expect(page.getByTestId('pc-ai-field-context')).toHaveText('个人简介');
  await page.getByRole('button', { name: '关闭' }).click();

  await page.locator('[data-module-key="experience"]').click();
  await page.locator('[data-studio-field-id="experience.experience-northstar.highlights"]').focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute(
    'data-field-id',
    'experience.experience-northstar.highlights',
  );
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute(
    'data-write-target',
    'experience.experience-northstar.highlights',
  );

  await page.locator('[data-studio-field-id="experience.experience-northstar.company"]').focus();
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute(
    'data-field-id',
    'experience.experience-northstar.company',
  );
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute('data-write-target', '');

  await page.locator('[data-module-key="projects"]').click();
  await page.locator('[data-studio-field-id="projects.project-collaboration.summary"]').focus();
  await expect(page.getByTestId('pc-ai-field-context')).toHaveAttribute(
    'data-write-target',
    'projects.project-collaboration.summary',
  );
});

test('module switching preserves canonical data and template style updates the formal preview', async ({
  page,
}) => {
  await openStudio(page);
  const initial = await exportWorkspaceFromStudio(page);
  const name = 'Module Switch Candidate';
  await page.getByRole('textbox', { name: '姓名' }).fill(name);

  await page.locator('[data-module-key="experience"]').click();
  await expect(page.locator('.pc-focused-module')).toHaveAttribute('data-module', 'experience');
  await expect(
    page.getByTestId('pc-editor-stage').getByRole('heading', { name: '工作经历' }),
  ).toBeVisible();
  await page.locator('[data-module-key="education"]').click();
  await expect(page.locator('.pc-focused-module')).toHaveAttribute('data-module', 'education');
  await expect(
    page.getByTestId('pc-editor-stage').getByRole('heading', { name: '教育背景' }),
  ).toBeVisible();
  await page.locator('[data-module-key="personal"]').click();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(name);

  await page.getByRole('button', { name: '模板中心' }).click();
  const templateCenter = page.getByTestId('pc-template-center');
  await expect(templateCenter).toBeVisible();
  await templateCenter.getByRole('button', { name: /管理模板|Manage templates/u }).click();
  const templateDialog = page.getByRole('dialog', { name: '选择简历模板' });
  const darkTemplate = templateDialog.getByRole('radio', { name: '暗黑质感' });
  await darkTemplate.click();
  await expect(templateDialog).toBeHidden();
  await expect(page.locator('.pc-preview-paper .resume-preview')).toHaveClass(/bg-slate-950/u);

  const updated = await exportWorkspaceFromStudio(page);
  expect(updated.templateId).toBe('dark-contrast');
  expect(updated.resume.personal.fullName).toBe(name);
  expect(updated.resume).toEqual({
    ...initial.resume,
    personal: { ...initial.resume.personal, fullName: name },
  });
  await page.reload();
  await expect(page.locator('.pc-preview-paper .resume-preview')).toHaveClass(/bg-slate-950/u);
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(name);
});

test('AI Dock runs the official inline controller with a local test SSE endpoint', async ({
  page,
}) => {
  await openStudio(page);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = await summary.inputValue();
  await summary.focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dock = page.getByTestId('pc-ai-dock');
  await expect(dock).toBeVisible();
  await expect(dock.locator('[data-module-context]')).toContainText('当前上下文');
  await expect(dock).toContainText('个人简介');

  await page.route('**/mock-ai/v1/chat/completions', async (route) => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 60));
    const body = [
      'data: {"choices":[{"delta":{"content":"A clearer, outcome-focused professional summary."}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'cache-control': 'no-cache' },
      body,
    });
  });

  await configureMockProvider(page);
  const requestButton = dock.getByRole('button', { name: '比较 AI 建议' });
  await requestButton.click();
  let inlinePanel = page.getByTestId('pc-ai-inline-panel');
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'GENERATING');
  const candidate = page.getByTestId('pc-ai-inline-candidate');
  await expect(candidate).toHaveText('A clearer, outcome-focused professional summary.');
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'SUGGESTION_READY');
  await expect(summary).toHaveValue(original);
  await inlinePanel.getByTestId('pc-ai-inline-reject').click();
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'REJECTED');
  await expect(summary).toHaveValue(original);
  await inlinePanel.getByTestId('pc-ai-inline-done').click();
  await expect(inlinePanel).toBeHidden();

  await requestButton.click();
  inlinePanel = page.getByTestId('pc-ai-inline-panel');
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  await expect(page.getByTestId('pc-ai-inline-candidate')).toHaveText(
    'A clearer, outcome-focused professional summary.',
  );
  await summary.fill('A user edit made while reviewing the first suggestion.');
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'STALE');
  await expect(page.getByTestId('pc-ai-inline-apply')).toBeDisabled();
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'GENERATING');
  await expect(page.getByTestId('pc-ai-inline-candidate')).toHaveText(
    'A clearer, outcome-focused professional summary.',
  );
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'SUGGESTION_READY');
  await inlinePanel.getByTestId('pc-ai-inline-apply').click();
  await expect(summary).toHaveValue('A clearer, outcome-focused professional summary.');
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'ACCEPTED');
  await inlinePanel.getByTestId('pc-ai-inline-done').click();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
  await expect(page.locator('.pc-preview-paper .resume-preview')).toContainText(
    'A clearer, outcome-focused professional summary.',
  );
});

test('inline provider failure stays visible and does not update the canonical field', async ({
  page,
}) => {
  await openStudio(page);
  const summary = page.getByRole('textbox', { name: '个人简介' });
  const original = await summary.inputValue();
  await summary.focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dock = page.getByTestId('pc-ai-dock');
  await page.route('**/mock-ai/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'test_provider_failure' } }),
    });
  });
  await configureMockProvider(page);
  await dock.getByRole('button', { name: '比较 AI 建议' }).click();
  const inlinePanel = page.getByTestId('pc-ai-inline-panel');
  await inlinePanel.getByTestId('pc-ai-inline-generate').click();
  await expect(inlinePanel).toHaveAttribute('data-ai-state', 'FAILED');
  await expect(inlinePanel.getByRole('alert')).toBeVisible();
  await expect(summary).toHaveValue(original);
  await expect(inlinePanel.getByTestId('pc-ai-inline-apply')).toHaveCount(0);
});

test('responsive workspace switches editor and preview without clipping content', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [1920, 1080],
  ] as const) {
    await openStudio(page, width, height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `horizontal overflow at ${width}px`,
    ).toBeLessThanOrEqual(width);

    if (width <= 1199) {
      await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
      await expect(page.getByTestId('pc-preview-pane')).toBeHidden();
      await page.getByRole('button', { name: '预览' }).click();
      await expect(page.getByTestId('pc-editor-stage')).toBeHidden();
      await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
      await page.getByRole('button', { name: '继续编辑' }).click();
      await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
    } else {
      await expect(page.locator('.pc-workspace-sidebar')).toBeVisible();
      await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
      await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
    }
  }
});

test('browser export menu triggers supported JSON, workspace JSON, Markdown and print actions', async ({
  page,
}) => {
  await openStudio(page);
  const expectDownload = async (label: RegExp) => {
    await page.locator('.pc-export-menu summary').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: label }).click(),
    ]);
    expect(await download.path()).not.toBeNull();
  };

  await expectDownload(/^JSON$/u);
  await expectDownload(/导出工作区|Export Workspace/u);
  await expectDownload(/Markdown/u);

  await page.addInitScript(() => {
    const printHost = globalThis as typeof globalThis & { __pcStudioPrintCalled?: boolean };
    const originalPrint = globalThis.print.bind(globalThis);
    Object.defineProperty(printHost, '__pcStudioPrintCalled', { value: false, writable: true });
    globalThis.print = () => {
      Object.defineProperty(printHost, '__pcStudioPrintCalled', { value: true, writable: true });
      originalPrint();
    };
  });
  await page.reload();
  await page.locator('.pc-export-menu summary').click();
  await page.getByRole('menuitem', { name: '打印 / PDF' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as typeof globalThis & { __pcStudioPrintCalled?: boolean })
            .__pcStudioPrintCalled,
      ),
    )
    .toBe(true);
});

test('Chromium review screenshots capture desktop, compact, AI Dock and preview states', async ({
  page,
}) => {
  await installResumeFixture(page, penpotGeometryResume());
  await mkdir(screenshotsDir, { recursive: true });

  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [1920, 1080],
  ] as const) {
    await openStudio(page, width, height);
    await page.screenshot({
      path: path.resolve(screenshotsDir, `penpot-fixture-react-${width}x${height}-edit.png`),
      animations: 'disabled',
    });
    if (width === 1024) {
      await page.getByRole('button', { name: '预览' }).click();
      await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
      await page.screenshot({
        path: path.resolve(screenshotsDir, 'penpot-fixture-react-1024x768-preview.png'),
        animations: 'disabled',
      });
    }
  }

  await openStudio(page, 1440, 900);
  await page.locator('[data-studio-field-id="personal.summary"]').focus();
  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByTestId('pc-ai-dock')).toBeVisible();
  await page.screenshot({
    path: path.resolve(screenshotsDir, 'penpot-fixture-react-ai-dock-1440x900.png'),
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'AI 助手' }).click();
  await expect(page.getByTestId('pc-preview-pane')).toBeVisible();
  await page.screenshot({
    path: path.resolve(screenshotsDir, 'penpot-fixture-react-a4-preview-1440x900.png'),
    animations: 'disabled',
  });

  await page.getByTestId('pc-preview-focus').click();
  await expect(page.getByTestId('pc-editor-stage')).toBeHidden();
  await page.screenshot({
    path: path.resolve(screenshotsDir, 'penpot-fixture-react-focus-preview-1440x900.png'),
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
});

test('formal product screenshot uses the canonical editor and ResumePreview with isolated data', async ({
  page,
}) => {
  await installResumeFixture(page, productScreenshotResume(), 'en');
  await openStudio(page, 1440, 900);
  await expect(page.getByTestId('pc-personal-identity')).toContainText('Mina Chen');
  await expect(page.locator('.pc-preview-paper .resume-preview')).toContainText('Mina Chen');
  await mkdir(screenshotsDir, { recursive: true });
  await page.screenshot({
    path: path.resolve(screenshotsDir, 'canonical-product-react-1440x900.png'),
    animations: 'disabled',
  });
});
