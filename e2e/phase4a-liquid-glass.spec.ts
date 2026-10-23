import { expect, test } from '@playwright/test';

test('Liquid Glass prototype keeps editing and module controls local @phase4a', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design/phase4a');

  await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible();
  await expect(page.getByText('演示副本')).toBeVisible();

  await page.getByRole('textbox', { name: '姓名' }).fill('许清禾');
  await expect(page.locator('.studio-paper-heading h2')).toHaveText('许清禾');

  await page.getByRole('button', { name: '模块管理' }).click();
  await page.getByRole('switch', { name: '隐藏工作经历' }).click();
  await expect(page.getByRole('switch', { name: '显示工作经历' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.locator('.studio-paper-section h3', { hasText: '工作经历' })).toHaveCount(0);
});

test('Liquid Glass prototype supports themes, directions, templates and AI demo boundaries @phase4a', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design/phase4a');

  await page.getByRole('combobox', { name: '工作区视觉方案' }).selectOption('aurora');
  await expect(page.locator('.liquid-studio')).toHaveAttribute('data-direction', 'aurora');
  await page.getByRole('button', { name: '切换到深色外观' }).click();
  await expect(page.locator('.liquid-studio')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: '模板样式' }).click();
  await page.getByRole('radio').nth(1).check();
  await expect(page.locator('.studio-template-footnote')).toContainText('编辑感');

  await page.getByRole('button', { name: 'AI 服务设置' }).click();
  const settings = page.getByRole('dialog', { name: 'AI 服务设置' });
  await expect(settings).toBeVisible();
  await expect(settings.getByText('不会读取、保存或发送任何凭证。')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
  await expect(page.getByRole('button', { name: 'AI 服务设置' })).toBeFocused();

  await page.getByRole('button', { name: 'AI 创建' }).click();
  await expect(page.getByRole('heading', { name: 'AI 简历访谈' })).toBeVisible();
  await page.locator('.studio-answer-field textarea').fill('我负责重整团队的项目交接流程。');
  await page.getByRole('button', { name: '继续' }).click();
  await expect(
    page.getByText('最近一次让你感到自豪的工作成果是什么？你具体负责了哪些部分？'),
  ).toHaveCount(0);
  await expect(
    page.getByText('这个成果带来了什么可观察的变化？可以分享一个数字或具体例子吗？'),
  ).toBeVisible();

  await page.getByRole('button', { name: '导入 / 导出' }).click();
  await page.getByRole('menuitem', { name: '导出 JSON' }).click();
  await expect(page.getByRole('status')).toContainText('示例 JSON 未导出');
});

test('Liquid Glass review captures are independent at desktop, tablet and mobile sizes @phase4a', async ({
  page,
}, testInfo) => {
  const attachCapture = async (name: string) => {
    await testInfo.attach(name, {
      body: await page.screenshot({ animations: 'disabled', fullPage: true }),
      contentType: 'image/png',
    });
  };
  const expectNoHorizontalOverflow = async (width: number) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design/phase4a');
  await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible();
  await attachCapture('liquid-glass-desktop-light');
  await page.getByRole('button', { name: '切换到深色外观' }).click();
  await attachCapture('liquid-glass-desktop-dark');

  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow(768);
  await attachCapture('liquid-glass-tablet-dark');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '切换到浅色外观' }).click();
  await expectNoHorizontalOverflow(390);
  await attachCapture('liquid-glass-mobile-light-editor');
  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.getByRole('region', { name: '简历实时预览' })).toBeVisible();
  await attachCapture('liquid-glass-mobile-light-preview');
  await page.getByRole('button', { name: '编辑' }).click();
  await page.getByRole('button', { name: '更多' }).click();
  await page.getByRole('button', { name: 'AI 服务设置' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '更多' })).toBeFocused();
  await page.getByRole('button', { name: '更多' }).click();
  await page.getByRole('button', { name: '重置演示草稿' }).click();
  const resetConfirmation = page.getByRole('dialog', { name: '重置演示草稿？' });
  await expect(resetConfirmation).toBeVisible();
  await resetConfirmation.getByRole('button', { name: '保留当前内容' }).click();
  await expect(resetConfirmation).toBeHidden();
  await expect(page.getByRole('button', { name: '更多' })).toBeFocused();

  await page.setViewportSize({ width: 320, height: 780 });
  await expectNoHorizontalOverflow(320);
  await attachCapture('liquid-glass-mobile-320');
});
