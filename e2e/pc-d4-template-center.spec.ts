import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createEmptyResume } from '@entities/resume';
import { templates } from '@entities/template';
import {
  createDefaultWorkspace,
  migrateWorkspace,
  RESUME_STORE_PERSIST_VERSION,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { expect, test } from '@playwright/test';
import { LOCALE_KEY } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

const pcStudioEnabled = process.env.VITE_ENABLE_PC_STUDIO === 'true';
const screenshotDirectory = path.resolve('artifacts/pc-d4-d1/screenshots');
const customTemplateId = 'pc-d4-d1-fictional-custom-template';
const currentTemplateId = templates[0]?.id ?? 'modern-blue';
const fictionalCustomTemplate = {
  id: customTemplateId,
  name: 'Fictional Product Designer Portfolio',
  description:
    'D1 fictional fixture search phrase. A compact layout for a product designer with a clear visual hierarchy and focused sections.',
  accentColor: '#2563eb',
  previewStyle: 'modern',
  sample: createEmptyResume(),
} as const;

const installFixture = async (
  page: import('@playwright/test').Page,
  options: { templateId?: string; customTemplates?: (typeof fictionalCustomTemplate)[] } = {},
) => {
  const defaults = createDefaultWorkspace();
  const emptyResume = createEmptyResume();
  const normalized = migrateWorkspace({
    ...defaults,
    resume: emptyResume,
    activeSections: [],
    customTemplates: options.customTemplates ?? [fictionalCustomTemplate],
  });
  if (!normalized.ok) throw new Error(normalized.error.message);

  await page.addInitScript(
    ({ resumeKey, uiKey, localeKey, resumeState, uiState }) => {
      localStorage.setItem(resumeKey, JSON.stringify(resumeState));
      localStorage.setItem(uiKey, JSON.stringify(uiState));
      localStorage.setItem(localeKey, 'en');

      const storage = globalThis.localStorage;
      const writes: string[] = [];
      const originalSetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')
        ?.value as Storage['setItem'] | undefined;
      if (!originalSetItem) throw new Error('Storage.prototype.setItem is unavailable.');
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (this === storage) writes.push(key);
        originalSetItem.call(this, key, value);
      };
      Object.defineProperty(globalThis, '__pcD4StorageWrites', {
        configurable: true,
        value: writes,
      });
    },
    {
      resumeKey: RESUME_STORE_PERSIST_KEY,
      uiKey: UI_STORE_PERSIST_KEY,
      localeKey: LOCALE_KEY,
      resumeState: {
        state: {
          resume: normalized.value.resume,
          activeSections: normalized.value.activeSections,
        },
        version: RESUME_STORE_PERSIST_VERSION,
      },
      uiState: {
        state: {
          theme: 'light',
          templateId: options.templateId ?? currentTemplateId,
          customTemplates: options.customTemplates ?? [fictionalCustomTemplate],
        },
        version: UI_STORE_PERSIST_VERSION,
      },
    },
  );
};

const readPersistedWorkspace = (page: import('@playwright/test').Page) =>
  page.evaluate(
    ({ resumeKey, uiKey }) => ({
      resume: JSON.parse(localStorage.getItem(resumeKey) ?? 'null') as {
        state: { resume: unknown; activeSections: unknown };
      } | null,
      ui: JSON.parse(localStorage.getItem(uiKey) ?? 'null') as {
        state: { templateId: string; customTemplates: unknown };
      } | null,
    }),
    { resumeKey: RESUME_STORE_PERSIST_KEY, uiKey: UI_STORE_PERSIST_KEY },
  );

const clearStorageWriteLog = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const writes = (globalThis as typeof globalThis & { __pcD4StorageWrites?: string[] })
      .__pcD4StorageWrites;
    if (writes) writes.length = 0;
  });

const readStorageWriteLog = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __pcD4StorageWrites?: string[] }).__pcD4StorageWrites ??
      [],
  );

const exportCanonicalWorkspace = async (page: import('@playwright/test').Page) => {
  await page.locator('.pc-export-menu summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Export Workspace' }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide a workspace download.');
  const migrated = migrateWorkspace(JSON.parse(await readFile(path, 'utf8')) as unknown);
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

const openStudio = async (page: import('@playwright/test').Page) => {
  await page.goto('/pc-studio');
  await expect(page.getByTestId('pc-studio')).toBeVisible();
  await expect(page.getByTestId('pc-save-status')).toHaveAttribute(
    'data-save-state',
    /^(ready|saved)$/u,
  );
};

const captureScreenshot = async (
  page: import('@playwright/test').Page,
  label: string,
  viewport: { width: number; height: number },
) => {
  const dismissFeedback = page.locator(
    'button[aria-label="Dismiss notification"], button[aria-label="关闭提示"]',
  );
  if ((await dismissFeedback.count()) > 0) await dismissFeedback.first().click();
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, `${label}-${viewport.width}x${viewport.height}.png`),
    fullPage: false,
  });
};

if (pcStudioEnabled) {
  test('Gallery browsing preserves persisted resume, sections, templateId and custom templates', async ({
    page,
  }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page);

    const before = await readPersistedWorkspace(page);
    const canonicalBefore = await exportCanonicalWorkspace(page);
    const fixtureDirectory = path.resolve('artifacts/pc-d4-d1/fixtures');
    await mkdir(fixtureDirectory, { recursive: true });
    await writeFile(
      path.join(fixtureDirectory, 'fictional-review-workspace.json'),
      `${JSON.stringify(canonicalBefore, null, 2)}\n`,
    );

    const monitorProbeKey = '__pcD4StorageMonitorProbe';
    await page.evaluate((key) => localStorage.setItem(key, 'monitor-probe'), monitorProbeKey);
    expect(await readStorageWriteLog(page)).toContain(monitorProbeKey);
    await page.evaluate((key) => localStorage.removeItem(key), monitorProbeKey);
    await clearStorageWriteLog(page);
    expect(await readStorageWriteLog(page)).toEqual([]);

    const headerTemplateButton = page.getByRole('button', { name: 'Template Center' });
    await headerTemplateButton.focus();
    await page.keyboard.press('Enter');
    const center = page.getByTestId('pc-template-center');
    await expect(center).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeFocused();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toContainText(
      'Current',
    );
    await expect(center.locator(`[data-template-id="${customTemplateId}"]`)).toBeVisible();

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(center).toBeVisible();
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth - window.innerWidth,
        studio:
          (document.querySelector('.pc-studio') as HTMLElement).scrollWidth -
          (document.querySelector('.pc-studio') as HTMLElement).clientWidth,
        gallery:
          (document.querySelector('[data-testid="pc-template-center"]') as HTMLElement)
            .scrollWidth -
          (document.querySelector('[data-testid="pc-template-center"]') as HTMLElement).clientWidth,
      }));
      expect(
        overflow.document,
        `document overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      expect(
        overflow.studio,
        `Studio overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      expect(
        overflow.gallery,
        `Gallery overflow at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(0);
      await captureScreenshot(page, 'gallery', viewport);
    }

    const search = page.getByTestId('pc-template-search');
    await search.fill('D1 fictional fixture search phrase');
    await expect(center.locator(`[data-template-id="${customTemplateId}"]`)).toBeVisible();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toHaveCount(0);
    await search.fill('no-matching-template-result');
    await expect(center.getByRole('status')).toContainText(/no templates|no results/i);
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(search).toHaveValue('');

    await page.getByRole('button', { name: /^Custom$/i }).click();
    const customCard = center.locator(`[data-template-id="${customTemplateId}"]`);
    await customCard.getByRole('button', { name: /view details/i }).click();
    await expect(center.getByRole('heading', { name: fictionalCustomTemplate.name })).toBeVisible();
    await expect(center).toContainText('D1 fictional fixture search phrase');
    await expect(center).toContainText(/illustrative thumbnail/i);
    const detailThumbnailViewport = center.locator('.pc-template-detail__thumbnail');
    const detailThumbnailLabel = center.locator('[data-testid="template-thumbnail"] > span').last();
    const [thumbnailViewportBox, thumbnailLabelBox] = await Promise.all([
      detailThumbnailViewport.boundingBox(),
      detailThumbnailLabel.boundingBox(),
    ]);
    expect(thumbnailViewportBox).not.toBeNull();
    expect(thumbnailLabelBox).not.toBeNull();
    expect(thumbnailLabelBox!.y + thumbnailLabelBox!.height).toBeLessThanOrEqual(
      thumbnailViewportBox!.y + thumbnailViewportBox!.height + 1,
    );
    await captureScreenshot(page, 'details', { width: 1024, height: 768 });
    await center.getByRole('button', { name: /back to gallery/i }).click();
    await expect(customCard.getByRole('button', { name: /view details/i })).toBeFocused();

    await page.getByRole('button', { name: /^Built-in$/i }).click();
    await expect(center.locator(`[data-template-id="${currentTemplateId}"]`)).toBeVisible();
    await center.getByRole('button', { name: /back to workspace/i }).click();
    await expect(page.getByTestId('pc-editor-stage')).toBeVisible();
    await expect(headerTemplateButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(center).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /manage templates/i })).toBeFocused();

    const keyboardDetailButton = center.getByRole('button', { name: /view details/i }).first();
    await keyboardDetailButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Template Details' })).toBeFocused();
    const keyboardBackToGallery = center.getByRole('button', { name: /back to gallery/i });
    await keyboardBackToGallery.focus();
    await page.keyboard.press('Space');
    await expect(keyboardDetailButton).toBeFocused();

    await page.getByRole('button', { name: /back to workspace/i }).focus();
    await page.keyboard.press('Enter');
    await expect(headerTemplateButton).toBeFocused();

    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(before.ui?.state.templateId);
    expect(after.ui?.state.customTemplates).toEqual(before.ui?.state.customTemplates);
    const writes = await readStorageWriteLog(page);
    expect(writes).not.toContain(RESUME_STORE_PERSIST_KEY);
    expect(writes).not.toContain(UI_STORE_PERSIST_KEY);

    const canonicalAfter = await exportCanonicalWorkspace(page);
    expect(canonicalAfter.resume).toEqual(canonicalBefore.resume);
    expect(canonicalAfter.activeSections).toEqual(canonicalBefore.activeSections);
    expect(canonicalAfter.templateId).toBe(canonicalBefore.templateId);
    expect(canonicalAfter.customTemplates).toEqual(canonicalBefore.customTemplates);
  });

  test('a missing persisted template is never relabeled as Current or silently repaired', async ({
    page,
  }) => {
    const missingTemplateId = 'pc-d4-d1-missing-template-fixture';
    await installFixture(page, { templateId: missingTemplateId, customTemplates: [] });
    await page.setViewportSize({ width: 1280, height: 800 });
    await openStudio(page);
    const before = await readPersistedWorkspace(page);
    await clearStorageWriteLog(page);

    await page.getByRole('button', { name: 'Template Center' }).click();
    const center = page.getByTestId('pc-template-center');
    await expect(center.getByText(/Missing Template/i)).toBeVisible();
    await expect(center).toContainText(missingTemplateId);
    const cardText = await center.locator('[data-template-id]').allTextContents();
    expect(cardText.every((text) => !text.includes('Current'))).toBe(true);
    await expect(center).toContainText(/fallback/i);

    const beforeClose = await readPersistedWorkspace(page);
    expect(beforeClose.ui?.state.templateId).toBe(missingTemplateId);
    await page.getByRole('button', { name: /back to workspace/i }).click();
    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(missingTemplateId);
    expect(await readStorageWriteLog(page)).not.toContain(RESUME_STORE_PERSIST_KEY);
    expect(await readStorageWriteLog(page)).not.toContain(UI_STORE_PERSIST_KEY);
  });

  test('legacy template management remains an explicit separate flow with sample confirmation', async ({
    page,
  }) => {
    await installFixture(page);
    await openStudio(page);
    const before = await readPersistedWorkspace(page);

    await page.getByRole('button', { name: 'Template Center' }).click();
    const center = page.getByTestId('pc-template-center');
    await expect(center.getByRole('button', { name: /load sample/i })).toHaveCount(0);
    await expect(center.getByRole('button', { name: /apply/i })).toHaveCount(0);
    await page.getByRole('button', { name: /manage templates/i }).click();

    const manager = page.getByRole('dialog', { name: 'Choose a resume template' });
    await expect(manager).toBeVisible();
    await expect(manager.getByRole('button', { name: /load sample/i }).first()).toBeVisible();

    let confirmation = '';
    page.once('dialog', async (dialog) => {
      confirmation = dialog.message();
      await dialog.dismiss();
    });
    await manager
      .getByRole('button', { name: /load sample/i })
      .first()
      .click();
    expect(confirmation).toMatch(/replace your current resume/i);

    const after = await readPersistedWorkspace(page);
    expect(after.resume?.state.resume).toEqual(before.resume?.state.resume);
    expect(after.resume?.state.activeSections).toEqual(before.resume?.state.activeSections);
    expect(after.ui?.state.templateId).toBe(before.ui?.state.templateId);
  });
} else {
  test('PC Studio remains unavailable while the feature gate is off', async ({ page }) => {
    await page.goto('/pc-studio');
    await expect(page.getByTestId('pc-studio')).toHaveCount(0);
    await expect(page.getByTestId('pc-template-center')).toHaveCount(0);
  });
}
