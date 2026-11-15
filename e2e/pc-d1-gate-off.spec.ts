import { expect, test } from '@playwright/test';

test('PC Studio route remains the standard editor when the experimental flag is absent', async ({
  page,
}) => {
  test.skip(
    process.env.VITE_ENABLE_PC_STUDIO === 'true',
    'Run this gate check without the PC Studio flag.',
  );
  await page.goto('/pc-studio');
  await expect(page.locator('.pc-studio')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '编辑器' })).toBeVisible();
  await expect(page.locator('[data-studio-field-id]')).toHaveCount(0);
});
