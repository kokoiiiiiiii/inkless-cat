import { expect, test } from '@playwright/test';

test('Firefox supports editor startup, basic editing, dark mode, and mobile switching', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const name = page.getByRole('textbox', { name: '姓名' });
  await expect(name).toHaveValue('陈情');
  await name.fill('Firefox 验收');
  await expect(page.getByRole('heading', { name: 'Firefox 验收' })).toBeVisible();

  await page.getByRole('button', { name: '夜间模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(2, 6, 23)');

  await page.setViewportSize({ width: 390, height: 844 });
  const previewToggle = page.getByRole('button', { name: '实时预览' });
  await expect(previewToggle).toBeVisible();
  await previewToggle.click();
  await expect(previewToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '实时预览' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Firefox keeps the A4 preview and print styles available', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.emulateMedia({ media: 'print' });

  const preview = page.locator('.resume-preview').first();
  await expect(preview).toBeVisible();
  await expect(preview).toHaveCSS('min-height', '0px');
  await expect(page.getByRole('heading', { name: '编辑器' })).toBeHidden();
});

test('Firefox supports the AI interview without a configured provider', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'AI 创建简历' }).click();

  const interview = page.getByRole('dialog', { name: 'AI 智能简历访谈' });
  await expect(interview).toBeVisible();
  await expect(interview.getByText(/尚未配置|未配置/u)).toBeVisible();
  await interview.getByRole('button', { name: '使用基础问题开始' }).click();
  await expect(interview.getByRole('textbox', { name: '你的回答' })).toBeVisible();
});
