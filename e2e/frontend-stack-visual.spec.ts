import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

const evidenceRoot = process.env.MODERNIZATION_VISUAL_EVIDENCE;
const appUrl = process.env.MODERNIZATION_PREVIEW_URL ?? '/';
const viewports = [
  { width: 1440, height: 900, name: 'desktop-1440' },
  { width: 1024, height: 900, name: 'desktop-1024' },
  { width: 768, height: 1024, name: 'tablet-768' },
  { width: 390, height: 844, name: 'mobile-390' },
  { width: 320, height: 844, name: 'mobile-320' },
] as const;
const themes = ['light', 'dark'] as const;

const capture = async (page: Page, name: string, fullPage = false) => {
  if (!evidenceRoot) return;
  const file = path.join(evidenceRoot, name + '.png');
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage, animations: 'disabled' });
};

const setTheme = async (page: Page, theme: (typeof themes)[number]) => {
  const current = await page.locator('html').getAttribute('data-theme');
  if (current !== theme) {
    await page.getByRole('button', { name: current === 'dark' ? '日间模式' : '夜间模式' }).click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
};

const preparePage = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(appUrl);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('陈情');
};

test('visual: editor and preview stay responsive at fixed viewports in both themes @visual', async ({
  page,
}) => {
  for (const theme of themes) {
    for (const viewport of viewports) {
      await preparePage(page, viewport.width, viewport.height);
      await setTheme(page, theme);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        viewport.name + ' ' + theme + ' should not overflow horizontally',
      ).toBe(true);
      await expect(page.getByRole('heading', { name: '编辑器' })).toBeVisible();
      await capture(page, 'editor/' + viewport.name + '-' + theme);

      const previewTab = page.getByRole('button', { name: '实时预览' });
      if (viewport.width <= 390 && (await previewTab.count()) > 0) {
        await previewTab.click();
        await expect(page.getByRole('heading', { name: '实时预览' })).toBeVisible();
        await capture(page, 'preview/' + viewport.name + '-' + theme);
      }
    }
  }
});

test('visual: template, AI settings, and interview screens remain readable on desktop and mobile @visual', async ({
  page,
}) => {
  for (const theme of themes) {
    for (const viewport of [
      { width: 1440, height: 900, name: 'desktop-1440' },
      { width: 390, height: 844, name: 'mobile-390' },
    ]) {
      await preparePage(page, viewport.width, viewport.height);
      await setTheme(page, theme);

      await page.getByRole('button', { name: /展开模板|Expand Templates/u }).click();
      await expect(
        page.getByRole('group', { name: /选择一个简历模板|Choose one resume template/u }),
      ).toBeVisible();
      await capture(page, 'templates/' + viewport.name + '-' + theme);

      await preparePage(page, viewport.width, viewport.height);
      await setTheme(page, theme);
      await page.getByRole('button', { name: 'AI 设置' }).click();
      const settings = page.getByRole('dialog', { name: 'AI 服务设置' });
      await expect(settings).toBeVisible();
      await capture(page, 'ai-settings/' + viewport.name + '-' + theme);

      await preparePage(page, viewport.width, viewport.height);
      await setTheme(page, theme);
      await page.getByRole('button', { name: 'AI 创建简历' }).click();
      const interview = page.getByRole('dialog', { name: 'AI 智能简历访谈' });
      await interview.getByRole('button', { name: '使用基础问题开始' }).click();
      await expect(interview.getByRole('textbox', { name: '你的回答' })).toBeVisible();
      await capture(page, 'ai-interview/' + viewport.name + '-' + theme);
    }
  }
});

test('visual: fact review, generated draft, and replacement confirmation retain their hierarchy @visual', async ({
  page,
}) => {
  for (const theme of themes) {
    await preparePage(page, 1440, 960);
    await setTheme(page, theme);
    await page.getByRole('button', { name: 'AI 创建简历' }).click();
    const dialog = page.getByRole('dialog', { name: 'AI 智能简历访谈' });
    await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
    await dialog.getByRole('textbox', { name: '你的回答' }).fill('资深前端工程师');
    await dialog.getByRole('button', { name: '发送回答' }).click();

    const summary = dialog.getByRole('complementary');
    const facts = summary.getByRole('region', { name: '事实核实' });
    await facts.getByRole('button', { name: '手动整理事实' }).click();
    await facts.getByLabel('事实类型').selectOption({ label: '目标岗位' });
    await facts.getByLabel('来源回答').first().selectOption({
      label: '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。',
    });
    await facts.getByRole('textbox', { name: '目标岗位', exact: true }).fill('资深前端工程师');
    await facts.getByRole('button', { name: '添加待核实事实' }).click();
    const fact = facts.locator('article').filter({ hasText: '资深前端工程师' });
    await expect(fact).toHaveCount(1);
    await capture(page, 'facts/fact-review-' + theme);

    await fact.getByRole('button', { name: '我已核对这些字段' }).click();
    await expect(fact.getByText('字段含义已由你确认', { exact: true })).toBeVisible();
    await capture(page, 'facts/fact-confirmed-' + theme);

    await summary.getByRole('button', { name: '构建草稿' }).click();
    await expect(summary.getByText('独立草稿预览')).toBeVisible();
    await capture(page, 'resume-generation/draft-' + theme);

    await summary.getByRole('button', { name: '检查并替换当前简历' }).click();
    await expect(
      summary.getByRole('checkbox', { name: /理解这会替换当前正式简历/u }),
    ).toBeVisible();
    await capture(page, 'resume-generation/replacement-confirmation-' + theme);
  }
});

test('visual: A4 print styles remain visible and hide editor chrome @visual', async ({ page }) => {
  await preparePage(page, 1440, 900);
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await expect(page.locator('.resume-preview').first()).toBeVisible();
  await capture(page, 'print/a4-print-view', true);
  if (evidenceRoot) {
    const pdfFile = path.join(evidenceRoot, 'print', 'a4-print-view.pdf');
    await mkdir(path.dirname(pdfFile), { recursive: true });
    await page.pdf({ path: pdfFile, format: 'A4', printBackground: true, preferCSSPageSize: true });
  }
});
