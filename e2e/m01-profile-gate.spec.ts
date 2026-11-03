import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

test('default entry stays on the existing editor and URL parameters do not enable M01', async ({
  page,
}, testInfo) => {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  page.on('console', (message) =>
    consoleMessages.push({ type: message.type(), text: message.text() }),
  );
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?m01=1');

  await expect(page.getByTestId('m01-profile-slice')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /编辑器|Editor/u })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /姓名|Full Name/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /^导出$|^Export$/u })).toBeVisible();
  expect(pageErrors).toEqual([]);

  const evidence = {
    gate: 'default-off',
    path: '/?m01=1',
    existingEditorVisible: true,
    experimentVisible: false,
    pageErrors,
    consoleMessages,
  };
  const evidenceDirectory = path.resolve('test-results/d1-browser');
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    path.join(evidenceDirectory, 'default-gate.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await testInfo.attach('m01-default-gate.json', {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: 'application/json',
  });
});
