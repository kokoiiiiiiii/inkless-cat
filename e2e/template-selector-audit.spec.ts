import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { createEmptyResume } from '@entities/resume';
import type { WorkspaceData } from '@entities/workspace';
import { expect, test } from '@playwright/test';

import { exportWorkspaceFromUI, uploadJsonThroughUI } from './workspace';

const UI_STORE_KEY = 'inkless-cat/ui-store';
const TEMPLATE_NAME_LIMIT = 120;

type StoredTemplate = {
  id: string;
  name: string;
  sample: unknown;
  previewStyle?: string;
  accentColor?: string;
  theme?: Record<string, string>;
};

type PersistedUIStore = {
  state: {
    templateId: string;
    customTemplates: StoredTemplate[];
  };
  version: number;
};

const openTemplatePanel = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /^(展开模板|Expand Templates)$/u }).click();
  await expect(
    page.getByRole('group', { name: /选择一个简历模板|Choose one resume template/u }),
  ).toBeVisible();
};

const createCustomTemplate = async (page: import('@playwright/test').Page, name: string) => {
  await page.locator('form').getByRole('textbox', { name: '模板名称' }).fill(name);
  await page.getByRole('button', { name: '保存当前简历为模板' }).click();
  const radio = page.getByRole('radio', { name, exact: true });
  await expect(radio).toBeChecked();
  const templateId = await radio
    .locator('xpath=ancestor::article')
    .getAttribute('data-template-id');
  expect(templateId, 'The custom template id was rendered').toBeTruthy();
  return templateId as string;
};

const readPersistedUIStore = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('inkless-cat/ui-store');
    if (!raw) throw new Error('The UI store was not persisted.');
    return JSON.parse(raw) as PersistedUIStore;
  });

const captureEvidence = async (
  page: import('@playwright/test').Page,
  filename: string,
  target?: import('@playwright/test').Locator,
) => {
  const directory = process.env.TEMPLATE_SELECTOR_EVIDENCE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await (target
    ? target.screenshot({ path: path.join(directory, filename) })
    : page.screenshot({ path: path.join(directory, filename) }));
};

const dismissNotices = async (page: import('@playwright/test').Page) => {
  const dismissButton = page.getByRole('button', { name: /关闭提示|Dismiss notification/u });
  while (await dismissButton.count()) await dismissButton.first().click();
};

const prepareSyntheticResume = async (page: import('@playwright/test').Page) => {
  const workspace = await exportWorkspaceFromUI(page);
  const resume = createEmptyResume();
  resume.personal = {
    ...resume.personal,
    fullName: 'Fictional Alex Morgan',
    title: 'Product Designer',
    email: 'alex.morgan@example.test',
    phone: '555-0100',
    location: 'Seattle, WA',
    summary: 'A fictional resume used only for isolated template testing.',
  };
  resume.experience = [
    {
      id: 'audit-experience',
      company: 'Northstar Studio',
      role: 'Product Designer',
      location: 'Seattle, WA',
      startDate: '2022',
      endDate: 'Now',
      highlights: ['Built useful, consistent products.'],
    },
  ];
  resume.education = [
    {
      id: 'audit-education',
      school: 'City University',
      degree: 'Design',
      startDate: '2018',
      endDate: '2022',
      details: '',
    },
  ];
  resume.skills = [
    { id: 'audit-skills', title: 'Skills', items: ['Research', 'Systems', 'Prototyping'] },
  ];
  resume.settings = {
    ...resume.settings,
    personal: { showPhoto: false, photoSize: 120, photoPosition: 'right' },
  };

  const syntheticWorkspace: WorkspaceData = { ...workspace, resume };
  await uploadJsonThroughUI(
    page,
    'synthetic-template-audit.workspace.json',
    JSON.stringify(syntheticWorkspace),
  );
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('Fictional Alex Morgan');
  await dismissNotices(page);
};

test('custom-name drafts validate before persistence and keep the radio named', async ({
  page,
}) => {
  await page.goto('/');
  await prepareSyntheticResume(page);
  await openTemplatePanel(page);

  const firstId = await createCustomTemplate(page, 'Persistent Template');
  const secondId = await createCustomTemplate(page, 'Unaffected Template');
  const firstCard = page.locator(`article[data-template-id="${firstId}"]`);
  const firstRadio = firstCard.locator('input[type="radio"]');

  await firstCard.getByRole('combobox', { name: '风格' }).selectOption('custom');
  await firstCard.getByLabel('背景', { exact: true }).fill('#fffaf0');
  const beforeInvalidEdits = await readPersistedUIStore(page);
  const original = beforeInvalidEdits.state.customTemplates.find((item) => item.id === firstId);
  const unaffectedBefore = beforeInvalidEdits.state.customTemplates.find(
    (item) => item.id === secondId,
  );
  expect(original).toBeTruthy();
  expect(unaffectedBefore).toBeTruthy();

  const nameInput = firstCard.getByRole('textbox', { name: '模板名称' });
  await nameInput.fill('');
  await expect(nameInput).toHaveValue('');
  await expect(firstRadio).toHaveAccessibleName('Persistent Template');
  for (const radio of await page.getByRole('radio').all()) {
    await expect(radio).toHaveAccessibleName(/\S/u);
  }
  const radioRelations = await page.locator('fieldset input[type="radio"]').evaluateAll((radios) =>
    radios.map((radio) => {
      const labelledBy = radio.getAttribute('aria-labelledby')?.split(/\s+/u) ?? [];
      const describedBy = radio.getAttribute('aria-describedby')?.split(/\s+/u) ?? [];
      return {
        id: radio.id,
        labelsResolve:
          labelledBy.length > 0 &&
          labelledBy.every((id) => Boolean(document.querySelector(`#${CSS.escape(id)}`))),
        descriptionsResolve: describedBy.every((id) =>
          Boolean(document.querySelector(`#${CSS.escape(id)}`)),
        ),
      };
    }),
  );
  expect(new Set(radioRelations.map(({ id }) => id)).size).toBe(radioRelations.length);
  expect(
    radioRelations.every(
      ({ labelsResolve, descriptionsResolve }) => labelsResolve && descriptionsResolve,
    ),
  ).toBe(true);
  await captureEvidence(page, 'desktop-empty-name-draft.png', firstCard);

  const persistedDuringDraft = await readPersistedUIStore(page);
  expect(persistedDuringDraft.state.customTemplates.find((item) => item.id === firstId)?.name).toBe(
    'Persistent Template',
  );

  await page.reload();
  await openTemplatePanel(page);

  const restoredCard = page.locator(`article[data-template-id="${firstId}"]`);
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard.getByRole('textbox', { name: '模板名称' })).toHaveValue(
    'Persistent Template',
  );
  await expect(page.getByRole('radio', { name: 'Unaffected Template', exact: true })).toBeVisible();
  expect(await readPersistedUIStore(page)).toMatchObject({
    state: {
      customTemplates: [
        expect.objectContaining({
          id: firstId,
          name: 'Persistent Template',
          previewStyle: 'custom',
          accentColor: original?.accentColor,
          theme: original?.theme,
          sample: original?.sample,
        }),
        expect.objectContaining({
          id: secondId,
          name: 'Unaffected Template',
          sample: unaffectedBefore?.sample,
        }),
      ],
    },
  });

  const restoredNameInput = restoredCard.getByRole('textbox', { name: '模板名称' });
  await restoredNameInput.fill('   ');
  await restoredNameInput.press('Tab');
  await expect(restoredNameInput).toHaveValue('Persistent Template');
  await expect(page.getByRole('alert')).toContainText('模板名称不能为空');
  await expect(restoredCard.locator('input[type="radio"]')).toHaveAccessibleName(
    'Persistent Template',
  );
  await captureEvidence(page, 'desktop-empty-name-validation.png', restoredCard);

  await restoredNameInput.focus();
  await restoredNameInput.fill('Discarded draft');
  await restoredNameInput.press('Escape');
  await expect(restoredNameInput).toHaveValue('Persistent Template');

  await restoredNameInput.fill('x'.repeat(TEMPLATE_NAME_LIMIT + 1));
  await restoredNameInput.press('Enter');
  await expect(restoredNameInput).toHaveValue('Persistent Template');
  await expect(page.getByRole('alert')).toContainText('120 个字符');

  await restoredNameInput.fill('  Updated Persistent Template  ');
  await restoredNameInput.press('Enter');
  await expect(restoredCard.locator('input[type="radio"]')).toHaveAccessibleName(
    'Updated Persistent Template',
  );

  const afterValidEdit = await readPersistedUIStore(page);
  const updated = afterValidEdit.state.customTemplates.find((item) => item.id === firstId);
  const unaffectedAfter = afterValidEdit.state.customTemplates.find((item) => item.id === secondId);
  expect(updated).toMatchObject({
    id: firstId,
    name: 'Updated Persistent Template',
    previewStyle: 'custom',
    accentColor: original?.accentColor,
    theme: original?.theme,
    sample: original?.sample,
  });
  expect(unaffectedAfter).toEqual(unaffectedBefore);
  await captureEvidence(page, 'desktop-updated-custom-name.png', restoredCard);

  await page.reload();
  await openTemplatePanel(page);
  await expect(page.getByRole('radio', { name: 'Updated Persistent Template' })).toBeVisible();
});

test('legacy blank names recover with an accessible fallback and preserve original data', async ({
  page,
}) => {
  await page.goto('/');
  await prepareSyntheticResume(page);
  await openTemplatePanel(page);

  const blankId = await createCustomTemplate(page, 'Legacy Blank Name');
  const validId = await createCustomTemplate(page, 'Unaffected Legacy Template');
  const beforeMigration = await readPersistedUIStore(page);
  const original = beforeMigration.state.customTemplates.find((item) => item.id === blankId);
  const raw = await page.evaluate(
    ({ key, templateId }) => {
      const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as PersistedUIStore;
      const target = parsed.state.customTemplates.find((item) => item.id === templateId);
      if (!target) throw new Error('Template missing before migration.');
      target.name = '';
      const serialized = JSON.stringify(parsed);
      localStorage.setItem(key, serialized);
      return serialized;
    },
    { key: UI_STORE_KEY, templateId: blankId },
  );

  await page.reload();
  await openTemplatePanel(page);

  const restoredCard = page.locator(`article[data-template-id="${blankId}"]`);
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard.locator('input[type="radio"]')).toHaveAccessibleName('未命名模板');
  await expect(page.getByRole('radio', { name: 'Unaffected Legacy Template' })).toBeVisible();
  const recovery = await page.evaluate(
    (key) => localStorage.getItem(`${key}/recovery`),
    UI_STORE_KEY,
  );
  expect(recovery).toBe(raw);

  const recovered = await readPersistedUIStore(page);
  expect(recovered.state.customTemplates.find((item) => item.id === blankId)).toMatchObject({
    id: blankId,
    name: '未命名模板',
    sample: original?.sample,
  });
  expect(recovered.state.customTemplates.find((item) => item.id === validId)?.name).toBe(
    'Unaffected Legacy Template',
  );
});

test('deletion keeps focus predictable for selected and non-selected templates', async ({
  page,
}) => {
  await page.goto('/');
  await prepareSyntheticResume(page);
  await openTemplatePanel(page);
  const firstId = await createCustomTemplate(page, 'First custom');
  const middleId = await createCustomTemplate(page, 'Middle custom');
  const lastId = await createCustomTemplate(page, 'Last custom');
  const modernRadio = page.getByRole('radio', { name: '现代蓝' });
  await modernRadio.click();

  const middleCard = page.locator(`article[data-template-id="${middleId}"]`);
  const middleDelete = middleCard.getByRole('button', { name: '删除' });
  page.once('dialog', async (dialog) => dialog.dismiss());
  await middleDelete.click();
  await expect(middleDelete).toBeFocused();
  await expect(middleCard).toBeVisible();

  page.once('dialog', async (dialog) => dialog.accept());
  await middleDelete.click();
  await expect(middleCard).toHaveCount(0);
  await expect(
    page.locator(`article[data-template-id="${lastId}"]`).getByRole('button', { name: '删除' }),
  ).toBeFocused();
  await expect(modernRadio).toBeChecked();

  page.once('dialog', async (dialog) => dialog.accept());
  await page
    .locator(`article[data-template-id="${firstId}"]`)
    .getByRole('button', { name: '删除' })
    .click();
  await expect(page.locator(`article[data-template-id="${firstId}"]`)).toHaveCount(0);
  await expect(
    page.locator(`article[data-template-id="${lastId}"]`).getByRole('button', { name: '删除' }),
  ).toBeFocused();

  page.once('dialog', async (dialog) => dialog.accept());
  await page
    .locator(`article[data-template-id="${lastId}"]`)
    .getByRole('button', { name: '删除' })
    .click();
  await expect(page.locator(`article[data-template-id="${lastId}"]`)).toHaveCount(0);
  const createNameInput = page.locator('form').getByRole('textbox', { name: '模板名称' });
  await expect(createNameInput).toBeFocused();
  await expect(modernRadio).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.locator('form').getByRole('combobox', { name: '风格' })).toBeFocused();

  await modernRadio.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '暗黑质感' })).toBeChecked();
});
