import { mkdir } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const artifactRoot = 'test-results/mobile-compact-studio-m0';

test('Firefox M0 smoke covers editing, preview, templates, Action Sheet, and mobile widths', async ({
  page,
  browserName,
}) => {
  await mkdir(artifactRoot, { recursive: true });
  const screenshotPrefix = `m0-smoke-${browserName}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/design/mobile-compact?lab=1');
  await expect(page).toHaveURL(/\/design\/mobile-compact\?lab=1$/);

  const nameField = page.getByLabel('姓名');
  await expect(nameField).toBeVisible();
  await expect(nameField).toBeEditable();
  await nameField.fill('Firefox M0 smoke');
  await page.screenshot({
    path: `${artifactRoot}/${screenshotPrefix}-390-editor.png`,
    fullPage: false,
    animations: 'disabled',
  });

  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.m0-preview-content h1')).toHaveText('Firefox M0 smoke');
  await page.screenshot({
    path: `${artifactRoot}/${screenshotPrefix}-390-preview.png`,
    fullPage: false,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(nameField).toHaveValue('Firefox M0 smoke');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBe(0);
    await expect(nameField).toBeVisible();
    await expect(nameField).toBeEditable();
  }
  await page.screenshot({
    path: `${artifactRoot}/${screenshotPrefix}-320-editor.png`,
    fullPage: false,
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const moreButton = page.getByRole('button', { name: '更多操作' });
  await moreButton.click();
  const actionSheet = page.getByRole('dialog', { name: '更多操作' });
  await expect(actionSheet).toBeVisible();
  await page.screenshot({
    path: `${artifactRoot}/${screenshotPrefix}-390-action-sheet.png`,
    fullPage: false,
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await expect(actionSheet).toBeHidden();
  await expect(moreButton).toBeFocused();

  await page.locator('.m0-entry-card').first().click();
  await page.getByRole('radio', { name: '暗黑质感' }).check();
  await expect(page.getByRole('radio', { name: '暗黑质感' })).toBeChecked();
  await page.getByRole('button', { name: /返回编辑/ }).click();
  await expect(page.locator('.m0-entry-card').first()).toContainText('暗黑质感');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.m0-preview-content .resume-preview')).toHaveClass(/bg-slate-950/);
});

test('Firefox M0 Lab is an independent screen with usable 200% controls', async ({
  page,
  browserName,
}) => {
  await mkdir(artifactRoot, { recursive: true });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/design/mobile-compact?lab=1');
  await page.getByLabel('姓名').fill('Firefox Lab content stays local');
  await page.locator('.m0-lab-trigger').click();
  await expect(page.locator('.m0-lab-screen')).toBeVisible();
  await expect(page.locator('.m0-dock')).toBeHidden();
  await expect(page.getByLabel('字体缩放')).toBeVisible();
  await page.getByLabel('字体缩放').selectOption('2');
  await expect(page.locator('.m0-app')).toHaveAttribute('data-font-scale', '2');

  const main = page.locator('.m0-main');
  await main.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => main.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByLabel('界面语言')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(
    0,
  );
  await page.screenshot({
    path: `${artifactRoot}/m0-smoke-${browserName}-320-lab-200.png`,
    fullPage: false,
    animations: 'disabled',
  });

  await page.locator('.m0-lab-close').click();
  await expect(page.getByLabel('姓名')).toHaveValue('Firefox Lab content stays local');
  await expect(page.locator('.m0-lab-screen')).toBeHidden();
});
