import { readFile } from 'node:fs/promises';

import type { WorkspaceData } from '@entities/workspace';
import { expect, test } from '@playwright/test';

import {
  canonicalize,
  expectResumeSaved,
  exportWorkspaceFromUI,
  uploadJsonThroughUI,
} from './workspace';

test('canceling clear preserves the resume and Undo restores a confirmed clear', async ({
  page,
}) => {
  await page.goto('/');

  const logo = page.getByRole('img', { name: 'Inkless Cat 标志' });
  await expect(logo).toBeVisible();
  await expect
    .poll(() =>
      logo.evaluate((element) => element instanceof HTMLImageElement && element.naturalWidth > 0),
    )
    .toBe(true);
  const logoSource = await logo.evaluate((element) =>
    element instanceof HTMLImageElement ? element.currentSrc : '',
  );
  expect(logoSource).toContain('.webp');

  const fullName = page.getByRole('textbox', { name: '姓名' });
  await expect(fullName).not.toHaveValue('');
  const originalName = await fullName.inputValue();
  const clearButton = page.getByRole('button', { name: '清空' });
  const persistedBeforeCancel = await page.evaluate(() => [
    localStorage.getItem('inkless-cat/resume-store'),
    localStorage.getItem('inkless-cat/ui-store'),
  ]);

  let confirmationText = '';
  page.once('dialog', async (dialog) => {
    confirmationText = dialog.message();
    await dialog.dismiss();
  });
  await clearButton.click();
  await expect(fullName).toHaveValue(originalName);
  expect(confirmationText).toContain('12 秒');
  await expect
    .poll(() =>
      page.evaluate(() => [
        localStorage.getItem('inkless-cat/resume-store'),
        localStorage.getItem('inkless-cat/ui-store'),
      ]),
    )
    .toEqual(persistedBeforeCancel);

  page.once('dialog', async (dialog) => dialog.accept());
  await clearButton.click();
  await expect(fullName).toHaveValue('');

  await page.getByRole('button', { name: '撤销' }).click();
  await expect(fullName).toHaveValue(originalName);
});

test('an edit survives repeated browser refreshes', async ({ page }) => {
  await page.goto('/');
  const editedName = 'Refresh Regression Candidate';
  await page.getByRole('textbox', { name: '姓名' }).fill(editedName);

  await expectResumeSaved(page, editedName);
  await page.reload();
  await expectResumeSaved(page, editedName);
  await page.reload();
  await expectResumeSaved(page, editedName);
});

test('a confirmed clear can still be undone after a refresh inside its 12-second window', async ({
  page,
}) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Recoverable after refresh');
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空' }).click();
  await expect(fullName).toHaveValue('');

  await page.reload();
  await expect(fullName).toHaveValue('');
  await page.getByRole('button', { name: '撤销' }).click();
  await expectResumeSaved(page, 'Recoverable after refresh');
  await page.reload();
  await expectResumeSaved(page, 'Recoverable after refresh');
});

test('an accepted workspace import can be undone immediately', async ({ page }) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Resume before import');
  const workspace = await exportWorkspaceFromUI(page);
  workspace.resume.personal.fullName = 'Imported resume to undo';

  await uploadJsonThroughUI(page, 'undo-import.workspace.json', JSON.stringify(workspace));
  await expectResumeSaved(page, 'Imported resume to undo');
  await page.getByRole('button', { name: '撤销' }).click();
  await expectResumeSaved(page, 'Resume before import');
  await page.reload();
  await expectResumeSaved(page, 'Resume before import');
});

test('editing after clear makes Undo preserve the newer edit', async ({ page }) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Before clear');
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空' }).click();
  await fullName.fill('New edit after clear');

  await page.getByRole('button', { name: '撤销' }).click();

  await expect(fullName).toHaveValue('New edit after clear');
  await expect(page.getByRole('status')).toContainText('为保护新修改');
  await page.reload();
  await expectResumeSaved(page, 'New edit after clear');
  await expect(page.getByRole('button', { name: '撤销' })).toHaveCount(0);
});

test('workspace export, clear, import and refresh preserve resume and workspace settings', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '姓名' }).fill('Before Workspace Round Trip');
  await page.getByRole('button', { name: '夜间模式' }).click();

  const initial = await exportWorkspaceFromUI(page);
  const workspace: WorkspaceData = {
    ...initial,
    resume: {
      ...initial.resume,
      personal: {
        ...initial.resume.personal,
        fullName: 'Workspace Round Trip Candidate',
        summary: 'Workspace round trip summary',
      },
      customSections: [
        {
          id: 'round-trip-custom',
          title: 'Round Trip Custom',
          mode: 'text',
          items: [],
          fields: [],
          text: 'Custom data survives import',
        },
      ],
    },
    activeSections: ['projects', 'custom:round-trip-custom', 'experience'],
    theme: 'dark',
    templateId: 'round-trip-template',
    customTemplates: [
      {
        id: 'round-trip-template',
        name: 'Round Trip Template',
        sample: initial.resume,
      },
    ],
  };
  await uploadJsonThroughUI(page, 'round-trip.workspace.json', JSON.stringify(workspace));
  await expectResumeSaved(page, 'Workspace Round Trip Candidate');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const expected = await exportWorkspaceFromUI(page);
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空' }).click();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('');
  await uploadJsonThroughUI(page, 'round-trip.workspace.json', JSON.stringify(expected));
  await expectResumeSaved(page, 'Workspace Round Trip Candidate');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expectResumeSaved(page, 'Workspace Round Trip Candidate');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const restored = await exportWorkspaceFromUI(page);
  expect(canonicalize(restored)).toEqual(canonicalize(expected));
  expect(restored.activeSections).toEqual(['projects', 'custom:round-trip-custom', 'experience']);
  expect(restored.customTemplates[0]?.name).toBe('Round Trip Template');
});

test('all modules stay disabled after workspace round trip and refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await page.getByRole('button', { name: '全部关闭' }).click();
  await expect(page.getByText('暂无启用的模块')).toBeVisible();
  const workspace = await exportWorkspaceFromUI(page);
  expect(workspace.activeSections).toEqual([]);

  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空' }).click();
  await uploadJsonThroughUI(page, 'empty-sections.workspace.json', JSON.stringify(workspace));
  await page.reload();
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect(page.getByText('暂无启用的模块')).toBeVisible();
  const restoredWorkspace = await exportWorkspaceFromUI(page);
  expect(restoredWorkspace.activeSections).toEqual([]);
});

test('switching UI language preserves resume body and updates preview copy', async ({ page }) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('UI locale does not translate resume text');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: '仅切换语言' }).click();

  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  await expectResumeSaved(page, 'UI locale does not translate resume text');
  await expect(page.getByRole('heading', { name: 'Live Preview' })).toBeVisible();

  await page.getByRole('button', { name: '中文' }).click();
  await page.getByRole('button', { name: 'Switch language only' }).click();
  await expect(page.getByRole('button', { name: '清空' })).toBeVisible();
  await expectResumeSaved(page, 'UI locale does not translate resume text');
});

test('module ordering remains the same after refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '展开模块管理' }).click();
  const getOrder = () =>
    page
      .locator('[data-section-key]')
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.sectionKey ?? ''));
  const before = await getOrder();
  const first = page.locator('[data-section-key]').first();
  await first.getByRole('button').nth(1).click();
  const after = await getOrder();
  expect(after[0]).toBe(before[1]);
  expect(after[1]).toBe(before[0]);

  await page.reload();
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect.poll(getOrder).toEqual(after);
});

test('invalid JSON import leaves the current resume unchanged', async ({ page }) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Keep this resume after invalid import');
  let confirmationCount = 0;
  page.on('dialog', async (dialog) => {
    confirmationCount += 1;
    await dialog.dismiss();
  });
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid JSON', 'utf8'),
  });

  await expect(page.getByRole('alert').filter({ hasText: '文件不是合法的 JSON' })).toBeVisible();
  await expect(fullName).toHaveValue('Keep this resume after invalid import');
  expect(confirmationCount).toBe(0);
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: 'invalid-workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, resume: null, customTemplates: [] }), 'utf8'),
  });
  await expect(page.getByRole('alert').filter({ hasText: '工作区数据结构不合法' })).toBeVisible();
  await expect(fullName).toHaveValue('Keep this resume after invalid import');
  expect(confirmationCount).toBe(0);
  await page.reload();
  await expectResumeSaved(page, 'Keep this resume after invalid import');
});

test('storage quota failure during workspace import warns and keeps the last saved workspace', async ({
  page,
}) => {
  await page.goto('/');
  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Last saved version');
  await page.getByRole('button', { name: '夜间模式' }).click();
  const workspace = await exportWorkspaceFromUI(page);
  workspace.resume.personal.fullName = 'Import not saved because of quota';
  workspace.theme = 'light';
  const storedBeforeFailure = await page.evaluate(() => ({
    resume: localStorage.getItem('inkless-cat/resume-store'),
    ui: localStorage.getItem('inkless-cat/ui-store'),
  }));
  expect(storedBeforeFailure.resume).not.toBeNull();
  expect(storedBeforeFailure.ui).not.toBeNull();

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem.bind(globalThis.localStorage);
    Storage.prototype.setItem = (key: string, value: string) => {
      if (key.startsWith('inkless-cat/')) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    };
  });
  await uploadJsonThroughUI(page, 'quota-failed.workspace.json', JSON.stringify(workspace));

  const storageWarnings = page.getByRole('alert').filter({ hasText: '最新修改未能保存到本地' });
  await expect(storageWarnings).toHaveCount(1);
  await expectResumeSaved(page, 'Last saved version');
  expect(
    await page.evaluate(() => ({
      resume: localStorage.getItem('inkless-cat/resume-store'),
      ui: localStorage.getItem('inkless-cat/ui-store'),
    })),
  ).toEqual(storedBeforeFailure);
  await page.reload();
  await expectResumeSaved(page, 'Last saved version');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: '撤销' })).toHaveCount(0);
});

test('workspace import rolls back if Resume saves but the UI store write fails', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '姓名' }).fill('Before partial persistence failure');
  await page.getByRole('button', { name: '夜间模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const storedBefore = await page.evaluate(() => ({
    resume: localStorage.getItem('inkless-cat/resume-store'),
    ui: localStorage.getItem('inkless-cat/ui-store'),
  }));
  const workspace = await exportWorkspaceFromUI(page);
  workspace.resume.personal.fullName = 'Must roll back partial import';
  workspace.theme = 'light';

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem.bind(globalThis.localStorage);
    Storage.prototype.setItem = (key: string, value: string) => {
      if (key === 'inkless-cat/ui-store' && value.includes('"theme":"light"')) {
        throw new DOMException('simulated UI store quota failure', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    };
  });
  await uploadJsonThroughUI(page, 'partial-persistence.workspace.json', JSON.stringify(workspace));

  await expect(page.getByRole('alert').filter({ hasText: '导入失败' })).toBeVisible();
  await expectResumeSaved(page, 'Before partial persistence failure');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() =>
      page.evaluate(() => ({
        resume: localStorage.getItem('inkless-cat/resume-store'),
        ui: localStorage.getItem('inkless-cat/ui-store'),
      })),
    )
    .toEqual(storedBefore);
  await page.reload();
  await expectResumeSaved(page, 'Before partial persistence failure');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('unavailable localStorage shows a recovery warning while the editor remains usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('storage access denied', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert').first()).toContainText('浏览器存储不可用');

  const fullName = page.getByRole('textbox', { name: '姓名' });
  await fullName.fill('Export this session-only edit');
  await expect(fullName).toHaveValue('Export this session-only edit');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出', exact: true }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide the resume export.');
  expect(await readFile(path, 'utf8')).toContain('Export this session-only edit');
});

test('Markdown download includes summary, project highlights and custom content in section order', async ({
  page,
}) => {
  await page.goto('/');
  const base = await exportWorkspaceFromUI(page);
  const workspace: WorkspaceData = {
    ...base,
    resume: {
      ...base.resume,
      personal: {
        ...base.resume.personal,
        fullName: 'Markdown Order Candidate',
        summary: 'Summary marker content',
      },
      projects: [
        {
          id: 'markdown-project',
          name: 'Project **Marker**',
          role: 'Owner',
          summary: 'Project summary marker',
          link: 'https://example.com/project',
          highlights: ['Project highlight marker'],
        },
      ],
      customSections: [
        {
          id: 'markdown-custom',
          title: 'Custom Marker',
          mode: 'text',
          items: [],
          fields: [],
          text: 'Custom section marker content',
        },
      ],
      experience: [
        {
          id: 'markdown-experience',
          company: 'Experience Marker',
          role: 'Engineer',
          location: '',
          startDate: '',
          endDate: '',
          highlights: ['Experience marker content'],
        },
      ],
    },
    activeSections: ['projects', 'custom:markdown-custom', 'experience'],
  };
  await uploadJsonThroughUI(page, 'markdown-fixture.workspace.json', JSON.stringify(workspace));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出 Markdown' }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide the Markdown download.');
  const markdown = await readFile(path, 'utf8');

  expect(markdown).toContain('Summary marker content');
  expect(markdown).toContain('Project highlight marker');
  expect(markdown).toContain('Custom section marker content');
  expect(markdown).toContain(String.raw`Project \*\*Marker\*\*`);
  expect(markdown.indexOf('Project highlight marker')).toBeLessThan(
    markdown.indexOf('Custom section marker content'),
  );
  expect(markdown.indexOf('Custom section marker content')).toBeLessThan(
    markdown.indexOf('Experience marker content'),
  );
});
