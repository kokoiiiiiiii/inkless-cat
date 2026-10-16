import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { migrateWorkspace, type WorkspaceData } from '@entities/workspace';
import { expect, test } from '@playwright/test';

import { exportWorkspaceFromUI, uploadJsonThroughUI } from './workspace';

const outputDirectory = path.resolve(process.cwd(), 'output/pdf');

const createLongExperience = () =>
  Array.from({ length: 7 }, (_, index) => ({
    id: `print-experience-${index + 1}`,
    company: `Print QA Company ${index + 1}`,
    role: 'Senior Product Engineer',
    location: 'Remote',
    startDate: `20${18 + index}-01`,
    endDate: `20${19 + index}-12`,
    highlights: Array.from(
      { length: 3 },
      (_, highlightIndex) =>
        `Delivered cross-functional product improvements ${index + 1}.${highlightIndex + 1}, ` +
        'reduced operational friction, documented measurable outcomes, and partnered with design ' +
        'and engineering teams to ship accessible features for a broad customer base.',
    ),
  }));

const makeFixture = (
  source: WorkspaceData,
  kind: 'single' | 'long' | 'complex',
  photoDataUrl: string,
): WorkspaceData => {
  const base = source;
  const resume = {
    ...base.resume,
    personal: {
      ...base.resume.personal,
      fullName: `Print QA ${kind}`,
      title: 'Principal Frontend Engineer',
      summary:
        kind === 'single'
          ? 'Single-page print fixture. Product-focused engineer with clear, concise experience.'
          : 'Print QA fixture for validating A4 pagination, typography, and content boundaries. '.repeat(
              kind === 'long' ? 5 : 2,
            ),
      ...(kind === 'complex' ? { photo: photoDataUrl } : { photo: '' }),
    },
    experience: kind === 'long' ? createLongExperience() : [],
    projects:
      kind === 'complex'
        ? [
            {
              id: 'print-project',
              name: 'Project Highlights Print Check',
              role: 'Lead Engineer',
              summary:
                'A project summary that should remain associated with its heading and highlights.',
              link: 'https://example.com/print-project',
              highlights: [
                'Designed resilient workflows and shipped measurable improvements for customers.',
                'Improved rendering consistency and kept the project details easy to scan.',
                'Worked with design and product partners to validate the final user experience.',
              ],
            },
          ]
        : [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
    awards: [],
    customSections:
      kind === 'complex'
        ? [
            {
              id: 'print-custom',
              title: 'Custom Module Print Check',
              mode: 'text' as const,
              items: [],
              fields: [],
              text: 'Custom module content should print without clipping or heading separation.',
            },
          ]
        : [],
    settings: {
      ...base.resume.settings,
      personal: {
        ...base.resume.settings?.personal,
        showPhoto: kind === 'complex',
        photoSize: 128,
        photoPosition: 'right' as const,
      },
    },
  };

  const activeSections =
    kind === 'long'
      ? ['experience']
      : kind === 'complex'
        ? ['projects', 'custom:print-custom']
        : [];

  const migrated = migrateWorkspace({
    ...base,
    resume,
    activeSections,
    customTemplates: [],
  });
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

test('Chromium prints one-page, long, and image/custom-section A4 fixtures', async ({ page }) => {
  test.setTimeout(90_000);
  await mkdir(outputDirectory, { recursive: true });
  await page.goto('/');

  const source = await exportWorkspaceFromUI(page);
  const photo = await readFile(path.resolve(process.cwd(), 'src/assets/inkless-cat-256.png'));
  const photoDataUrl = `data:image/png;base64,${photo.toString('base64')}`;
  const fixtures = [
    ['single', makeFixture(source, 'single', photoDataUrl)],
    ['long', makeFixture(source, 'long', photoDataUrl)],
    ['complex', makeFixture(source, 'complex', photoDataUrl)],
  ] as const;

  for (const [name, workspace] of fixtures) {
    await uploadJsonThroughUI(page, `${name}.workspace.json`, JSON.stringify(workspace));
    await expect(page.locator('.resume-preview')).toContainText(`Print QA ${name}`);
    if (name === 'complex') {
      const image = page.locator('.resume-preview img');
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => element instanceof HTMLImageElement && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }

    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    const feedback = page.locator('[role="alert"], [role="status"]').first();
    if (await feedback.count()) await expect(feedback).toBeHidden();
    const pdfPath = path.resolve(outputDirectory, `inkless-cat-${name}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: 'screen' });
    const contents = await readFile(pdfPath);
    expect(contents.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(contents.byteLength).toBeGreaterThan(10_000);
  }
});
