import { expect, type Page, test } from '@playwright/test';

import { exportWorkspaceFromUI } from './workspace';

const getSectionOrder = (page: Page) =>
  page
    .getByTestId('section-sort-list')
    .locator('[data-section-key]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.sectionKey ?? ''),
    );

const openSectionSorting = async (page: Page) => {
  await page.getByRole('button', { name: '展开模块管理' }).click();
  await expect(page.getByTestId('section-sort-list')).toBeVisible();
};

const openTemplatePanel = async (page: Page) => {
  await page.getByRole('button', { name: /^(展开模板|Expand Templates)$/u }).click();
  await expect(
    page.getByRole('group', { name: /选择一个简历模板|Choose one resume template/u }),
  ).toBeVisible();
};

const mainPreview = (page: Page) => page.locator('.production-preview-pane .resume-preview');

test('section order and template changes preserve fictional resume data together', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '姓名' }).fill('Fictional Integration Candidate');
  await page.getByRole('textbox', { name: '个人简介' }).fill('Synthetic integration data only.');
  await openSectionSorting(page);

  page.once('dialog', async (dialog) => dialog.accept('Integration Notes'));
  await page.getByRole('button', { name: '新增模块' }).click();
  await page.getByRole('textbox', { name: '模块名称' }).fill('Integration Notes');
  await page
    .getByRole('textbox', { name: '内容条目' })
    .fill('Fictional achievement one\nFictional achievement two');
  await expect(mainPreview(page)).toContainText('Fictional achievement one');

  const customRow = page.locator('[data-section-key^="custom:"]').filter({
    hasText: 'Integration Notes',
  });
  await expect(customRow).toHaveCount(1);
  const customSectionKey = await customRow.getAttribute('data-section-key');
  expect(customSectionKey).toBeTruthy();

  const initialOrder = await getSectionOrder(page);
  expect(initialOrder[0]).toBe('socials');
  expect(initialOrder[1]).toBe('experience');
  expect(initialOrder.at(-1)).toBe(customSectionKey);

  const experienceUp = page.getByRole('button', { name: '将工作经历上移' });
  await experienceUp.focus();
  await page.keyboard.press('Enter');
  const afterKeyboardSort = [initialOrder[1]!, initialOrder[0]!, ...initialOrder.slice(2)];
  await expect.poll(() => getSectionOrder(page)).toEqual(afterKeyboardSort);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', '将工作经历下移');

  const customUp = page.getByRole('button', { name: /将.*Integration Notes.*上移/u });
  await customUp.click();
  const customIndex = afterKeyboardSort.indexOf(customSectionKey!);
  const sortedOrder = [...afterKeyboardSort];
  [sortedOrder[customIndex - 1], sortedOrder[customIndex]] = [
    sortedOrder[customIndex]!,
    sortedOrder[customIndex - 1]!,
  ];
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);

  const beforeStyle = await exportWorkspaceFromUI(page);
  expect(beforeStyle.resume.personal.fullName).toBe('Fictional Integration Candidate');
  expect(beforeStyle.activeSections).toEqual(sortedOrder);
  expect(beforeStyle.resume.customSections).toMatchObject([
    {
      id: customSectionKey!.slice('custom:'.length),
      title: 'Integration Notes',
      mode: 'list',
      items: ['Fictional achievement one', 'Fictional achievement two'],
    },
  ]);

  await openTemplatePanel(page);
  const modernRadio = page.getByRole('radio', { name: '现代蓝', exact: true });
  const darkRadio = page.getByRole('radio', { name: '暗黑质感', exact: true });
  await modernRadio.focus();
  await page.keyboard.press('ArrowRight');
  await expect(darkRadio).toBeChecked();
  await expect(darkRadio).toBeFocused();
  await page.keyboard.press('Space');
  await expect(darkRadio).toBeChecked();
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);
  await expect(mainPreview(page)).toHaveClass(/bg-slate-950/u);

  const afterStyle = await exportWorkspaceFromUI(page);
  expect(afterStyle.resume).toEqual(beforeStyle.resume);
  expect(afterStyle.activeSections).toEqual(sortedOrder);
  expect(afterStyle.templateId).toBe('dark-contrast');

  await page.locator('form').getByRole('textbox', { name: '模板名称' }).fill('Fictional Portfolio');
  await page.getByRole('button', { name: '保存当前简历为模板' }).click();
  const customRadio = page.getByRole('radio', { name: 'Fictional Portfolio', exact: true });
  await expect(customRadio).toBeChecked();
  const customCard = page
    .locator('article[data-template-id^="custom-"]')
    .filter({ has: customRadio });
  const customTemplateId = await customCard.getAttribute('data-template-id');
  expect(customTemplateId).toBeTruthy();
  const stableCustomCard = page.locator(`[data-template-id="${customTemplateId}"]`);
  await customCard.getByRole('combobox', { name: '风格' }).selectOption('custom');
  await customCard.getByLabel('背景', { exact: true }).fill('#fffaf0');
  await expect(mainPreview(page)).toHaveCSS('background-color', 'rgb(255, 250, 240)');

  const customNameInput = stableCustomCard.getByRole('textbox', { name: '模板名称' });
  await customNameInput.fill('Fictional Portfolio Updated');
  await customNameInput.press('Enter');
  await expect(customNameInput).not.toBeFocused();
  const renamedCustomRadio = page.getByRole('radio', {
    name: 'Fictional Portfolio Updated',
    exact: true,
  });
  await expect(renamedCustomRadio).toBeChecked();
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);

  const afterCustomStyle = await exportWorkspaceFromUI(page);
  expect(afterCustomStyle.resume).toEqual(beforeStyle.resume);
  expect(afterCustomStyle.activeSections).toEqual(sortedOrder);
  expect(afterCustomStyle.customTemplates).toHaveLength(1);
  expect(afterCustomStyle.templateId).toBe(afterCustomStyle.customTemplates[0]?.id);
  expect(afterCustomStyle.customTemplates[0]?.sample).toEqual(beforeStyle.resume);

  await page.reload();
  await openSectionSorting(page);
  await openTemplatePanel(page);
  await expect(
    page.getByRole('radio', { name: 'Fictional Portfolio Updated', exact: true }),
  ).toBeChecked();
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);
  const afterReload = await exportWorkspaceFromUI(page);
  expect(afterReload.resume).toEqual(beforeStyle.resume);
  expect(afterReload.activeSections).toEqual(sortedOrder);
  expect(afterReload.templateId).toBe(afterCustomStyle.templateId);

  page.once('dialog', async (dialog) => dialog.dismiss());
  await page
    .locator('[data-template-id="modern-blue"]')
    .getByRole('button', { name: '填充示例' })
    .click();
  const afterCancelledSample = await exportWorkspaceFromUI(page);
  expect(afterCancelledSample.resume).toEqual(afterReload.resume);
  expect(afterCancelledSample.activeSections).toEqual(sortedOrder);
  expect(afterCancelledSample.templateId).toBe(afterReload.templateId);

  let confirmation = '';
  page.once('dialog', async (dialog) => {
    confirmation = dialog.message();
    await dialog.accept();
  });
  await page
    .locator('[data-template-id="modern-blue"]')
    .getByRole('button', { name: '填充示例' })
    .click();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('陈情');
  expect(confirmation).toContain('覆盖当前内容');
  const afterConfirmedSample = await exportWorkspaceFromUI(page);
  expect(afterConfirmedSample.templateId).toBe('modern-blue');
  expect(afterConfirmedSample.resume).not.toEqual(afterReload.resume);

  const undoButtons = await page.getByRole('button', { name: '撤销', exact: true }).all();
  const enabledUndoButtons = [];
  for (const button of undoButtons) {
    if (await button.isEnabled()) enabledUndoButtons.push(button);
  }
  expect(enabledUndoButtons).toHaveLength(1);
  await enabledUndoButtons[0]!.click();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(
    'Fictional Integration Candidate',
  );
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);
  const afterUndo = await exportWorkspaceFromUI(page);
  expect(afterUndo.resume).toEqual(afterReload.resume);
  expect(afterUndo.activeSections).toEqual(sortedOrder);
  expect(afterUndo.templateId).toBe(afterReload.templateId);

  await page.evaluate(() => {
    const key = 'inkless-cat/ui-store';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('The isolated UI store was not persisted.');
    const persisted = JSON.parse(raw) as { state: { templateId: string } };
    persisted.state.templateId = 'deleted-template-id';
    localStorage.setItem(key, JSON.stringify(persisted));
  });
  await page.reload();
  await openSectionSorting(page);
  await openTemplatePanel(page);
  await expect(page.getByRole('radio', { name: '现代蓝', exact: true })).toBeChecked();
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(
    'Fictional Integration Candidate',
  );
  await expect.poll(() => getSectionOrder(page)).toEqual(sortedOrder);
});
