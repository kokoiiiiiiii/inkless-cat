import type { WorkspaceData } from '@entities/workspace';
import { expect, test } from '@playwright/test';

import { clickSecondaryTopbarAction } from './topbar-actions';
import { exportWorkspaceFromUI, uploadJsonThroughUI } from './workspace';

const openTemplatePanel = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /^(展开模板|Expand Templates)$/u }).click();
  await expect(
    page.getByRole('group', { name: /选择一个简历模板|Choose one resume template/u }),
  ).toBeVisible();
};

const mainPreview = (page: import('@playwright/test').Page) =>
  page.locator('.production-preview-pane .resume-preview');

test('style selection preserves resume data, custom sections, locale changes and persistence', async ({
  page,
}) => {
  await page.goto('/');
  const workspace = await exportWorkspaceFromUI(page);
  const safeWorkspace: WorkspaceData = {
    ...workspace,
    resume: {
      ...workspace.resume,
      personal: {
        ...workspace.resume.personal,
        fullName: 'Template Safety Candidate',
        summary: 'This content must stay unchanged when styles change.',
      },
      customSections: [
        {
          id: 'template-selector-safety',
          title: 'Custom Portfolio Notes',
          mode: 'text',
          items: [],
          fields: [],
          text: 'Keep this custom module intact.',
        },
      ],
    },
    activeSections: [...workspace.activeSections, 'custom:template-selector-safety'],
  };
  await uploadJsonThroughUI(page, 'template-safety.workspace.json', JSON.stringify(safeWorkspace));
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(
    'Template Safety Candidate',
  );

  const before = await exportWorkspaceFromUI(page);
  await openTemplatePanel(page);
  const darkRadio = page.getByRole('radio', { name: '暗黑质感' });
  await darkRadio.click();
  await expect(darkRadio).toBeChecked();
  await expect(mainPreview(page)).toHaveClass(/bg-slate-950/u);

  const afterStyle = await exportWorkspaceFromUI(page);
  expect(afterStyle.resume).toEqual(before.resume);
  expect(afterStyle.templateId).toBe('dark-contrast');
  expect(afterStyle.resume.customSections[0]?.text).toBe('Keep this custom module intact.');

  await clickSecondaryTopbarAction(page, '夜间模式');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: '现代蓝' }).click();
  await expect(mainPreview(page)).toHaveClass(/bg-white\/90/u);
  await expect
    .poll(() =>
      page
        .locator('.resume-preview h1')
        .first()
        .evaluate((heading) => getComputedStyle(heading).color),
    )
    .toBe('rgb(15, 23, 42)');
  await expect
    .poll(() =>
      page
        .locator('.resume-preview')
        .getByText('Keep this custom module intact.')
        .evaluate((copy) => getComputedStyle(copy).color),
    )
    .toBe('rgb(100, 116, 139)');
  await darkRadio.click();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '仅切换语言' }).click();
  await expect(page.getByRole('radio', { name: 'Dark Contrast' })).toBeChecked();

  const afterLocale = await exportWorkspaceFromUI(page);
  expect(afterLocale.resume).toEqual(before.resume);

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Full Name' })).toHaveValue(
    'Template Safety Candidate',
  );
  await openTemplatePanel(page);
  await expect(page.getByRole('radio', { name: 'Dark Contrast' })).toBeChecked();
  const afterReload = await exportWorkspaceFromUI(page);
  expect(afterReload.resume).toEqual(before.resume);
});

test('sample fill remains a separate confirmed action', async ({ page }) => {
  await page.goto('/');
  const nameInput = page.getByRole('textbox', { name: '姓名' });
  await nameInput.fill('Keep This Resume');
  await openTemplatePanel(page);

  const darkRadio = page.getByRole('radio', { name: '暗黑质感' });
  await darkRadio.click();
  let confirmation = '';
  page.once('dialog', async (dialog) => {
    confirmation = dialog.message();
    await dialog.dismiss();
  });
  await page
    .locator('[data-template-id="modern-blue"]')
    .getByRole('button', { name: '填充示例' })
    .click();

  await expect(nameInput).toHaveValue('Keep This Resume');
  await expect(darkRadio).toBeChecked();
  expect(confirmation).toContain('覆盖当前内容');

  page.once('dialog', async (dialog) => dialog.accept());
  await page
    .locator('[data-template-id="modern-blue"]')
    .getByRole('button', { name: '填充示例' })
    .click();
  await expect(nameInput).toHaveValue('陈情');
  await expect(page.getByRole('radio', { name: '现代蓝' })).toBeChecked();
});

test('custom template create, edit, persist, cancel and delete keep fallback and focus', async ({
  page,
}) => {
  await page.goto('/');
  await openTemplatePanel(page);

  await page.getByRole('textbox', { name: '模板名称' }).fill('QA Portfolio');
  await page.getByRole('textbox', { name: '模板描述（可选）' }).fill('Custom template regression');
  await page.getByRole('button', { name: '保存当前简历为模板' }).click();

  const customRadio = page.getByRole('radio', { name: 'QA Portfolio' });
  await expect(customRadio).toBeChecked();
  const customCard = page.locator('article[data-template-id^="custom-"]');
  await customCard.getByRole('combobox', { name: '风格' }).selectOption('custom');
  const customBackground = customCard.getByLabel('背景', { exact: true });
  await customBackground.fill('#fffaf0');
  await expect(customBackground).toHaveValue('#fffaf0');
  await expect(mainPreview(page)).toHaveCSS('background-color', 'rgb(255, 250, 240)');
  await customCard.getByRole('textbox', { name: '模板名称' }).fill('QA Portfolio Updated');
  await customCard
    .getByRole('textbox', { name: '模板描述（可选）' })
    .fill('Updated custom template regression');
  await expect(page.getByRole('radio', { name: 'QA Portfolio Updated' })).toBeChecked();

  const beforeSampleUpdate = await exportWorkspaceFromUI(page);
  page.once('dialog', async (dialog) => dialog.dismiss());
  await customCard.getByRole('button', { name: '更新示例' }).click();
  await expect(page.getByRole('radio', { name: 'QA Portfolio Updated' })).toBeChecked();
  const afterCancelledSampleUpdate = await exportWorkspaceFromUI(page);
  expect(afterCancelledSampleUpdate.resume).toEqual(beforeSampleUpdate.resume);

  await page.reload();
  await openTemplatePanel(page);
  const persistedRadio = page.getByRole('radio', { name: 'QA Portfolio Updated' });
  await expect(persistedRadio).toBeChecked();
  const persisted = await exportWorkspaceFromUI(page);
  expect(persisted.customTemplates).toHaveLength(1);
  expect(persisted.customTemplates[0]?.description).toBe('Updated custom template regression');
  await expect(
    page.locator('article[data-template-id^="custom-"]').getByRole('combobox', { name: '风格' }),
  ).toHaveValue('custom');
  await expect(
    page.locator('article[data-template-id^="custom-"]').getByLabel('背景', { exact: true }),
  ).toHaveValue('#fffaf0');

  const persistedCard = page.locator('article[data-template-id^="custom-"]');
  page.once('dialog', async (dialog) => dialog.dismiss());
  await persistedCard.getByRole('button', { name: '删除' }).click();
  await expect(persistedRadio).toBeChecked();
  const afterCancelledDelete = await exportWorkspaceFromUI(page);
  expect(afterCancelledDelete.customTemplates).toHaveLength(1);

  page.once('dialog', async (dialog) => dialog.accept());
  await persistedCard.getByRole('button', { name: '删除' }).click();
  const fallbackRadio = page.getByRole('radio', { name: '现代蓝' });
  await expect(fallbackRadio).toBeChecked();
  await expect(fallbackRadio).toBeFocused();
  const afterConfirmedDelete = await exportWorkspaceFromUI(page);
  expect(afterConfirmedDelete.customTemplates).toHaveLength(0);
});

test('template selection supports keyboard and stays usable at desktop, tablet and mobile widths', async ({
  page,
}) => {
  await page.goto('/');
  await openTemplatePanel(page);

  const modernRadio = page.getByRole('radio', { name: '现代蓝' });
  const darkRadio = page.getByRole('radio', { name: '暗黑质感' });
  await page.keyboard.press('Tab');
  await expect(modernRadio).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(darkRadio).toBeChecked();
  await expect(darkRadio).toBeFocused();
  await page.keyboard.press('Space');
  await expect(darkRadio).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(
    page.locator('[data-template-id="dark-contrast"]').getByRole('button', { name: '填充示例' }),
  ).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cardTransition = await modernRadio.evaluate(
    (radio) => getComputedStyle(radio.closest('article')!).transitionProperty,
  );
  expect(cardTransition).toBe('none');

  await clickSecondaryTopbarAction(page, '夜间模式');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(darkRadio).toBeChecked();
  await page.getByRole('radio', { name: '现代蓝' }).click();
  await expect(mainPreview(page)).toHaveClass(/bg-white\/90/u);
  await expect
    .poll(() =>
      page
        .locator('.resume-preview h1')
        .first()
        .evaluate((heading) => getComputedStyle(heading).color),
    )
    .toBe('rgb(15, 23, 42)');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(darkRadio).toBeVisible();
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(viewport.width);
  }

  await page.getByRole('button', { name: '预览' }).click();
  await expect(mainPreview(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '预览' })).toHaveAttribute('aria-pressed', 'true');
});
