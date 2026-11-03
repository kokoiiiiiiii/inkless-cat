import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ResumeData } from '@entities/resume';
import { resumeSchema } from '@entities/resume';
import { RESUME_STORE_PERSIST_VERSION, UI_STORE_PERSIST_VERSION } from '@entities/workspace';
import { expect, type Page, test, type TestInfo } from '@playwright/test';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

const activeSections = [
  'socials',
  'experience',
  'projects',
  'education',
  'skills',
  'languages',
  'interests',
  'awards',
  'custom:d1-notes',
] as const;

const syntheticResume: ResumeData = resumeSchema.parse({
  schemaVersion: 1,
  personal: {
    fullName: 'D1 Synthetic Candidate',
    title: 'Baseline Product Engineer',
    email: 'before@example.test',
    emailLabel: 'Work email',
    phone: '+1 202-555-0143',
    phoneLabel: 'Mobile',
    location: 'Example City',
    locationLabel: 'Location',
    photo:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNw6TjzHwAFRAKYH64YhwAAAABJRU5ErkJggg==',
    summary: 'Synthetic baseline summary for isolated browser verification.',
    extras: [{ id: 'd1-extra-1', label: 'Portfolio', value: 'https://portfolio.example.test' }],
  },
  socials: [{ id: 'd1-social-1', label: 'Profile', url: 'https://social.example.test/d1' }],
  experience: [
    {
      id: 'd1-experience-1',
      company: 'Synthetic Systems Lab',
      role: 'Staff Engineer',
      location: 'Example City',
      startDate: '2022-01',
      endDate: '2025-01',
      highlights: ['Preserved experience data during M01 edits.'],
    },
  ],
  projects: [
    {
      id: 'd1-project-1',
      name: 'Synthetic Project',
      role: 'Maintainer',
      summary: 'A non-sensitive fixture project.',
      link: 'https://project.example.test',
      highlights: ['Project highlight remains unchanged.'],
    },
  ],
  education: [
    {
      id: 'd1-education-1',
      school: 'Example Institute',
      degree: 'Bachelor of Engineering',
      startDate: '2017',
      endDate: '2021',
      details: 'Synthetic education details.',
    },
  ],
  skills: [{ id: 'd1-skill-1', title: 'Engineering', items: ['TypeScript', 'Testing'] }],
  languages: [{ id: 'd1-language-1', name: 'English', level: 'Fluent' }],
  interests: [{ id: 'd1-interest-1', name: 'Synthetic interest' }],
  awards: [{ id: 'd1-award-1', name: 'Fixture Award', issuer: 'Example Group', year: '2024' }],
  customSections: [
    {
      id: 'd1-notes',
      title: 'Fixture Notes',
      mode: 'list',
      items: ['Keep this custom section.'],
      fields: [],
      text: '',
    },
  ],
  settings: { personal: { showPhoto: true, photoSize: 120, photoPosition: 'right' } },
});

const uiState = {
  theme: 'dark',
  templateId: 'creative-pastel',
  customTemplates: [],
};

const updateValues = {
  fullName: 'D1 Updated Synthetic Candidate',
  title: 'D1 Updated Systems Engineer',
  email: 'd1.updated@example.test',
  phone: '+1 202-555-0109',
  location: 'QA City / Remote',
  summary: 'Updated synthetic profile summary from the M01 browser test.',
} as const;

const fieldPatterns = {
  fullName: /姓名|Full Name/u,
  title: /头衔|Headline/u,
  email: /邮箱|Email/u,
  phone: /电话|Phone/u,
  location: /所在地|Location/u,
  summary: /个人简介|Summary/u,
} as const;

const seedIsolatedPage = async (page: Page, failResumeWrites = false) => {
  await page.addInitScript(
    ({
      resumeKey,
      uiKey,
      resumeVersion,
      uiVersion,
      resume,
      sections,
      ui,
      shouldFailResumeWrites,
    }) => {
      const alreadySeeded = sessionStorage.getItem('__d1_m01_synthetic_seeded') === 'yes';
      if (!alreadySeeded) {
        localStorage.setItem(
          resumeKey,
          JSON.stringify({ state: { resume, activeSections: sections }, version: resumeVersion }),
        );
        localStorage.setItem(uiKey, JSON.stringify({ state: ui, version: uiVersion }));
        sessionStorage.setItem('__d1_m01_synthetic_seeded', 'yes');
      }

      if (shouldFailResumeWrites) {
        const originalSetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')
          ?.value as ((this: Storage, key: string, value: string) => void) | undefined;
        if (!originalSetItem) throw new Error('Storage.setItem is unavailable for this test.');

        Storage.prototype.setItem = function setItem(this: Storage, key: string, value: string) {
          if (key === resumeKey) {
            throw new DOMException('Synthetic D1 storage write failure', 'QuotaExceededError');
          }
          return Reflect.apply(originalSetItem, this, [key, value]);
        };
      }
    },
    {
      resumeKey: RESUME_STORE_PERSIST_KEY,
      uiKey: UI_STORE_PERSIST_KEY,
      resumeVersion: RESUME_STORE_PERSIST_VERSION,
      uiVersion: UI_STORE_PERSIST_VERSION,
      resume: syntheticResume,
      sections: activeSections,
      ui: uiState,
      shouldFailResumeWrites: failResumeWrites,
    },
  );
};

const readPersistedState = async (page: Page) =>
  page.evaluate(
    ({ resumeKey, uiKey }) => ({
      resumeEnvelope: JSON.parse(localStorage.getItem(resumeKey) ?? 'null') as {
        state: { resume: ResumeData; activeSections: string[] };
        version: number;
      } | null,
      uiEnvelope: JSON.parse(localStorage.getItem(uiKey) ?? 'null') as {
        state: { theme: string; templateId: string; customTemplates: unknown[] };
        version: number;
      } | null,
      pocKey: localStorage.getItem('inkless-cat-v3-m01-local-demo'),
    }),
    { resumeKey: RESUME_STORE_PERSIST_KEY, uiKey: UI_STORE_PERSIST_KEY },
  );

const attachDiagnostics = (page: Page, testInfo: TestInfo, name: string) => {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  page.on('console', (message) =>
    consoleMessages.push({ type: message.type(), text: message.text() }),
  );
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return {
    consoleMessages,
    pageErrors,
    save: () =>
      testInfo.attach(name, {
        body: Buffer.from(JSON.stringify({ consoleMessages, pageErrors }, null, 2)),
        contentType: 'application/json',
      }),
  };
};

const field = (page: Page, key: keyof typeof fieldPatterns) =>
  page.getByRole('textbox', { name: fieldPatterns[key] });

const currentEvidenceDirectory = path.resolve('test-results/d1-browser');

test.beforeAll(async () => {
  await mkdir(path.join(currentEvidenceDirectory, 'screenshots'), { recursive: true });
  await writeFile(
    path.join(currentEvidenceDirectory, 'synthetic-fixture.json'),
    `${JSON.stringify({ resume: syntheticResume, activeSections, uiState }, null, 2)}\n`,
  );
});

test('real M01 edits reach the canonical preview, persisted keys and a fresh rehydration', async ({
  page,
}, testInfo) => {
  const diagnostics = attachDiagnostics(page, testInfo, 'm01-browser-diagnostics.json');
  await seedIsolatedPage(page);
  await page.goto('/');
  await expect(page.getByTestId('m01-profile-slice')).toBeVisible();
  await expect(page.getByTestId('m01-profile-slice')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('heading', { name: /个人信息|Personal Information/u, level: 1 }),
  ).toBeVisible();

  const s0 = await readPersistedState(page);
  expect(s0.resumeEnvelope?.state.resume).toEqual(syntheticResume);
  expect(s0.resumeEnvelope?.state.activeSections).toEqual(activeSections);
  expect(s0.uiEnvelope?.state).toEqual(uiState);

  for (const key of Object.keys(updateValues) as Array<keyof typeof updateValues>) {
    await field(page, key).fill(updateValues[key]);
    await expect(field(page, key)).toHaveValue(updateValues[key]);
  }

  const preview = page.locator('.resume-preview');
  await expect(preview.locator('h1')).toHaveText(updateValues.fullName);
  for (const value of Object.values(updateValues)) {
    await expect(preview).toContainText(value);
  }

  const expectedResume: ResumeData = {
    ...syntheticResume,
    personal: { ...syntheticResume.personal, ...updateValues },
  };
  const s2 = await readPersistedState(page);
  expect(resumeSchema.safeParse(s2.resumeEnvelope?.state.resume).success).toBe(true);
  expect(s2.resumeEnvelope?.state.resume).toEqual(expectedResume);
  expect(s2.resumeEnvelope?.state.activeSections).toEqual(activeSections);
  expect(s2.uiEnvelope?.state).toEqual(uiState);
  expect(s2.pocKey).toBeNull();

  await page.reload();
  await expect(page.getByTestId('m01-profile-slice')).toBeVisible();
  for (const key of Object.keys(updateValues) as Array<keyof typeof updateValues>) {
    await expect(field(page, key)).toHaveValue(updateValues[key]);
  }
  await expect(page.locator('.resume-preview h1')).toHaveText(updateValues.fullName);

  const s3 = await readPersistedState(page);
  expect(s3.resumeEnvelope?.state.resume).toEqual(s2.resumeEnvelope?.state.resume);
  expect(s3.resumeEnvelope?.state.activeSections).toEqual(s0.resumeEnvelope?.state.activeSections);
  expect(s3.uiEnvelope?.state).toEqual(s0.uiEnvelope?.state);
  expect(s3.pocKey).toBeNull();

  const pathDiff = Object.entries(updateValues).map(([key, value]) => ({
    path: `personal.${key}`,
    before: syntheticResume.personal[key as keyof typeof updateValues],
    after: value,
  }));
  await writeFile(
    path.join(currentEvidenceDirectory, 'browser-data-flow.json'),
    `${JSON.stringify(
      {
        source: 'synthetic fixture; isolated Playwright context',
        S0: {
          resume: s0.resumeEnvelope?.state.resume,
          activeSections: s0.resumeEnvelope?.state.activeSections,
          uiState: s0.uiEnvelope?.state,
        },
        S1: { formValues: updateValues, previewHeading: updateValues.fullName },
        S2: {
          resume: s2.resumeEnvelope?.state.resume,
          activeSections: s2.resumeEnvelope?.state.activeSections,
          uiState: s2.uiEnvelope?.state,
        },
        S3: {
          resume: s3.resumeEnvelope?.state.resume,
          activeSections: s3.resumeEnvelope?.state.activeSections,
          uiState: s3.uiEnvelope?.state,
        },
        diff: pathDiff,
        pocKey: s3.pocKey,
      },
      null,
      2,
    )}\n`,
  );

  await page.screenshot({
    path: path.join(currentEvidenceDirectory, 'screenshots', 'm01-opt-in-1280x720.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(diagnostics.pageErrors).toEqual([]);
  await diagnostics.save();
});

test('official text length limit rejects oversized input and reports the existing error', async ({
  page,
}) => {
  await seedIsolatedPage(page);
  await page.goto('/');
  const baseline = syntheticResume.personal.fullName ?? '';

  await field(page, 'fullName').fill('x'.repeat(30_001));

  await expect(field(page, 'fullName')).toHaveValue(baseline);
  await expect(page.getByRole('alert')).toBeVisible();
  const persisted = await readPersistedState(page);
  expect(persisted.resumeEnvelope?.state.resume.personal.fullName).toBe(baseline);
});

test('failed local persistence is announced, does not claim success, and reload restores the durable baseline', async ({
  page,
}) => {
  await seedIsolatedPage(page, true);
  await page.goto('/');
  const oldValue = syntheticResume.personal.fullName ?? '';
  const rawBaseline = await page.evaluate(
    (key) => localStorage.getItem(key),
    RESUME_STORE_PERSIST_KEY,
  );

  await field(page, 'fullName').fill('D1 In-Memory Only Candidate');

  await expect(field(page, 'fullName')).toHaveValue('D1 In-Memory Only Candidate');
  await expect(page.locator('.resume-preview h1')).toHaveText('D1 In-Memory Only Candidate');
  await expect(page.getByRole('alert')).toContainText(
    /最新修改未能保存|latest edits could not be saved/u,
  );
  await expect(page.getByText(/保存成功|saved successfully/u)).toHaveCount(0);
  const failedWriteState = await readPersistedState(page);
  expect(failedWriteState.resumeEnvelope?.state.resume.personal.fullName).toBe(oldValue);
  expect(await page.evaluate((key) => localStorage.getItem(key), RESUME_STORE_PERSIST_KEY)).toBe(
    rawBaseline,
  );

  await page.reload();
  await expect(field(page, 'fullName')).toHaveValue(oldValue);
  await expect(page.locator('.resume-preview h1')).toHaveText(oldValue);
});

test('mobile widths remain scrollable and keyboard focus stays visible with reduced motion enabled', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedIsolatedPage(page);
  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('m01-profile-slice')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `horizontal overflow at ${viewport.width}×${viewport.height}`,
    ).toBe(true);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );

    const nameField = field(page, 'fullName');
    const motion = await nameField.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      };
    });
    expect(Number.parseFloat(motion.transitionDuration) * 1000).toBeLessThanOrEqual(0.01);
    expect(Number.parseFloat(motion.animationDuration) * 1000).toBeLessThanOrEqual(0.01);

    const titleField = field(page, 'title');
    await nameField.focus();
    await page.keyboard.press('Tab');
    await expect(titleField).toBeFocused();
    expect(await titleField.evaluate((element) => element.matches(':focus-visible'))).toBe(true);

    const targetSize = await nameField.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(targetSize).toBeGreaterThanOrEqual(44);
    await page.locator('.resume-preview').scrollIntoViewIfNeeded();
    await expect(page.locator('.resume-preview')).toBeInViewport();

    await page.screenshot({
      path: path.join(
        currentEvidenceDirectory,
        'screenshots',
        `m01-opt-in-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
      animations: 'disabled',
    });
  }

  await testInfo.attach('m01-mobile-viewport-results.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          viewports,
          checks: [
            'no horizontal overflow',
            'focus-visible Tab order',
            '44px target height',
            'preview scroll reachability',
            'reduced motion media active',
          ],
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
});
