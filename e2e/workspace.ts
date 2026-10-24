import { readFile } from 'node:fs/promises';

import { migrateWorkspace, type WorkspaceData } from '@entities/workspace';
import { expect, type Page } from '@playwright/test';

import { clickSecondaryTopbarAction } from './topbar-actions';

export const exportWorkspaceFromUI = async (page: Page): Promise<WorkspaceData> => {
  const downloadEvent = page.waitForEvent('download');
  await clickSecondaryTopbarAction(page, /导出工作区|Export Workspace/u);
  const download = await downloadEvent;
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide a downloaded workspace file.');
  const migrated = migrateWorkspace(JSON.parse(await readFile(path, 'utf8')) as unknown);
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

export const uploadJsonThroughUI = async (page: Page, filename: string, content: string) => {
  page.once('dialog', async (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(content, 'utf8'),
  });
};

export const expectResumeSaved = async (page: Page, name: string) => {
  await expect(page.getByRole('textbox', { name: /姓名|Full Name/u })).toHaveValue(name);
  await expect(page.locator('.resume-preview')).toContainText(name);
};

export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};
