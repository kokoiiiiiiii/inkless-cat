import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

type MenuScenario = {
  height: number;
  name: string;
  scrollToBottom?: boolean;
  theme: 'dark' | 'light';
  width: number;
};

const visualScenarios: MenuScenario[] = [
  { width: 320, height: 568, theme: 'light', name: '320x568-light' },
  { width: 320, height: 568, theme: 'dark', name: '320x568-dark' },
  { width: 360, height: 800, theme: 'light', name: '360x800-light' },
  { width: 390, height: 844, theme: 'light', name: '390x844-light' },
  { width: 390, height: 844, theme: 'dark', name: '390x844-dark' },
  {
    width: 390,
    height: 844,
    theme: 'light',
    name: '390x844-light-bottom',
    scrollToBottom: true,
  },
  { width: 1024, height: 768, theme: 'light', name: '1024x768-light' },
  { width: 1440, height: 900, theme: 'light', name: '1440x900-light-desktop' },
];

const capture = async (
  page: import('@playwright/test').Page,
  testInfo: import('@playwright/test').TestInfo,
  name: string,
) => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { contentType: 'image/png', path });
};

const setTheme = async (page: import('@playwright/test').Page, theme: MenuScenario['theme']) => {
  const root = page.locator('.production-studio-root');
  const currentTheme = await root.getAttribute('data-theme');
  if (currentTheme === theme) return;

  const trigger = page.getByRole('button', { name: '更多操作' });
  if (await trigger.isVisible()) {
    await trigger.click();
    const menu = page.getByRole('menu', { name: '更多操作' });
    await menu.getByRole('menuitem', { name: /夜间模式|日间模式/u }).click();
  } else {
    await page.getByRole('button', { name: /夜间模式|日间模式/u }).click();
  }
  await expect(root).toHaveAttribute('data-theme', theme);
};

const parseColor = (value: string) => {
  const components = [...value.matchAll(/[\d.]+/gu)].map((match) => Number(match[0]));
  return {
    rgb: components.slice(0, 3),
    alpha: components[3] ?? 1,
  };
};

const luminance = (rgb: number[]) => {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 4.045e-2 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const contrastRatio = (first: number[], second: number[]) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  const [brighter = 0, darker = 0] = values;
  return (brighter + 0.05) / (darker + 0.05);
};

const composite = (foreground: number[], background: number[], alpha: number) =>
  foreground.map((channel, index) => channel * alpha + (background[index] ?? 0) * (1 - alpha));

test('captures production menu before and after across required viewport and theme matrix', async ({
  page,
}, testInfo) => {
  const measurements: Array<Record<string, unknown>> = [];

  for (const scenario of visualScenarios) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto('/');
    await setTheme(page, scenario.theme);

    const topbar = page.locator('.production-topbar');
    const trigger = page.getByRole('button', { name: '更多操作' });
    const menu = page.getByRole('menu', { name: '更多操作' });
    const topbarClosed = await topbar.boundingBox();
    expect(topbarClosed).not.toBeNull();

    await expect(menu).toBeHidden();
    if (scenario.width === 1440) {
      await expect(trigger).toBeHidden();
      await expect(page.locator('.production-topbar__desktop-secondary')).toBeVisible();
    } else {
      await expect(trigger).toBeVisible();
    }
    await capture(page, testInfo, `phase4c1-menu-closed-${scenario.name}`);

    if (scenario.width === 1440) {
      measurements.push({
        scenario: scenario.name,
        viewport: { width: scenario.width, height: scenario.height },
        topbarHeight: topbarClosed?.height,
        menuClosed: true,
        documentWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      });
      continue;
    }

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    if (scenario.scrollToBottom) {
      await menu.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    }

    const geometry = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.production-studio-root');
      const topbarElement = document.querySelector<HTMLElement>('.production-topbar');
      const menuElement = document.querySelector<HTMLElement>(
        '.production-topbar__more .studio-popover',
      );
      const dockElement = document.querySelector<HTMLElement>(
        '.production-mobile-switcher, .studio-mobile-nav',
      );
      if (!root || !topbarElement || !menuElement) {
        throw new Error('Production menu geometry requires the editor, topbar and menu');
      }

      const menuStyle = getComputedStyle(menuElement);
      const menuBounds = menuElement.getBoundingClientRect();
      const dockBounds = dockElement?.getBoundingClientRect();
      const rgba = menuStyle.backgroundColor.match(/rgba?\(([^)]+)\)/u)?.[1];
      const components = rgba?.split(/[,/ ]+/u).filter(Boolean) ?? [];
      const backgroundAlpha = components.length > 3 ? Number(components[3]) : 1;
      const backdropFilter = menuStyle.backdropFilter;
      const stack = [];
      for (
        let node = menuElement.parentElement;
        node && stack.length < 8;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        const createsStackingContext =
          (style.position !== 'static' && style.zIndex !== 'auto') ||
          style.transform !== 'none' ||
          style.filter !== 'none' ||
          style.backdropFilter !== 'none' ||
          style.opacity !== '1' ||
          style.isolation === 'isolate';
        if (createsStackingContext) {
          stack.push({
            selector: `${node.tagName.toLowerCase()}.${String(node.className).replaceAll(' ', '.')}`,
            position: style.position,
            zIndex: style.zIndex,
            backdropFilter: style.backdropFilter,
            opacity: style.opacity,
            isolation: style.isolation,
          });
        }
      }

      return {
        viewport: { width: innerWidth, height: innerHeight },
        theme: root.dataset.theme,
        topbar: {
          height: topbarElement.getBoundingClientRect().height,
        },
        menu: {
          rect: {
            x: menuBounds.x,
            y: menuBounds.y,
            width: menuBounds.width,
            height: menuBounds.height,
          },
          maxHeight: menuStyle.maxHeight,
          clientHeight: menuElement.clientHeight,
          scrollHeight: menuElement.scrollHeight,
          scrollTop: menuElement.scrollTop,
          backgroundColor: menuStyle.backgroundColor,
          backgroundAlpha,
          backdropFilter,
          opacity: menuStyle.opacity,
          zIndex: menuStyle.zIndex,
          border: menuStyle.border,
          boxShadow: menuStyle.boxShadow,
          textColor: getComputedStyle(menuElement.querySelector<HTMLElement>('[role="menuitem"]')!)
            .color,
        },
        dock: dockBounds
          ? {
              x: dockBounds.x,
              y: dockBounds.y,
              width: dockBounds.width,
              height: dockBounds.height,
            }
          : null,
        menuDockGap: dockBounds ? dockBounds.y - menuBounds.bottom : null,
        documentWidth: document.documentElement.scrollWidth,
        stackingContexts: stack,
      };
    });

    const menuGeometry = geometry.menu as {
      backgroundAlpha: number;
      clientHeight: number;
      maxHeight: string;
      rect: { x: number; y: number; width: number; height: number };
      scrollHeight: number;
      scrollTop: number;
    };
    const dockGeometry = geometry.dock as { y: number } | null;
    const topbarOpen = await topbar.boundingBox();
    expect(topbarOpen).not.toBeNull();
    expect(Math.abs((topbarOpen?.height ?? 0) - (topbarClosed?.height ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(menuGeometry.backgroundAlpha).toBeGreaterThanOrEqual(0.995);
    expect(menuGeometry.rect.x).toBeGreaterThanOrEqual(0);
    expect(menuGeometry.rect.x + menuGeometry.rect.width).toBeLessThanOrEqual(scenario.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      scenario.width,
    );

    if (scenario.width <= 1023) {
      expect(dockGeometry).not.toBeNull();
      expect((geometry.menuDockGap as number) ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(
        8,
      );
    } else {
      expect(dockGeometry).toBeNull();
    }
    if (scenario.scrollToBottom) {
      expect(menuGeometry.scrollHeight).toBeGreaterThan(menuGeometry.clientHeight);
      expect(menuGeometry.scrollTop).toBeGreaterThan(0);
    }

    await capture(
      page,
      testInfo,
      scenario.scrollToBottom
        ? `phase4c1-menu-open-${scenario.name}-scrolled`
        : `phase4c1-menu-open-${scenario.name}`,
    );
    measurements.push({ scenario: scenario.name, ...geometry });

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  }

  const geometryPath = testInfo.outputPath('phase4c1-menu-surface-geometry.json');
  await writeFile(geometryPath, JSON.stringify(measurements, null, 2));
  await testInfo.attach('phase4c1-menu-surface-geometry.json', {
    contentType: 'application/json',
    path: geometryPath,
  });
});

test('menu text, hover, focus and active states meet contrast targets in both themes', async ({
  page,
}, testInfo) => {
  const results: Array<Record<string, unknown>> = [];

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    const trigger = page.getByRole('button', { name: '更多操作' });
    const menu = page.getByRole('menu', { name: '更多操作' });

    await trigger.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    const items = menu.getByRole('menuitem');
    const first = items.first();
    const second = items.nth(1);
    await expect(first).toBeFocused();

    const base = await page.evaluate(() => {
      const menuElement = document.querySelector<HTMLElement>(
        '.production-topbar__more .studio-popover',
      );
      const item = menuElement?.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];
      if (!menuElement || !item)
        throw new Error('The production menu must be open for contrast checks');
      const menuStyle = getComputedStyle(menuElement);
      const itemStyle = getComputedStyle(item);
      return {
        surface: menuStyle.backgroundColor,
        foreground: itemStyle.color,
        alpha: Number(menuStyle.backgroundColor.match(/,\s*([\d.]+)\)$/u)?.[1] ?? 1),
      };
    });

    await first.hover();
    const hover = await first.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        foreground: style.color,
        background: style.backgroundColor,
        border: style.borderTopColor,
      };
    });

    await page.keyboard.press('ArrowDown');
    await expect(second).toBeFocused();
    const focus = await second.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        foreground: style.color,
        background: style.backgroundColor,
        outline: style.outlineColor,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        focusVisible: element.matches(':focus-visible'),
      };
    });
    expect(focus.focusVisible).toBe(true);
    expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);

    const resetExample = menu.getByRole('menuitem', { name: '载入示例' });
    const resetBounds = await resetExample.boundingBox();
    expect(resetBounds).not.toBeNull();
    if (!resetBounds)
      throw new Error('Menu item geometry is required for active-state measurement');
    await page.mouse.move(
      resetBounds.x + resetBounds.width / 2,
      resetBounds.y + resetBounds.height / 2,
    );
    await page.mouse.down();
    const active = await resetExample.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        foreground: style.color,
        background: style.backgroundColor,
        border: style.borderTopColor,
      };
    });
    await page.mouse.up();
    await expect(menu).toBeHidden();

    const surface = parseColor(base.surface);
    const textContrast = contrastRatio(parseColor(base.foreground).rgb, surface.rgb);
    const hoverContrast = contrastRatio(
      parseColor(hover.foreground).rgb,
      parseColor(hover.background).rgb,
    );
    const focusContrast = contrastRatio(
      parseColor(focus.foreground).rgb,
      parseColor(focus.background).rgb,
    );
    const activeContrast = contrastRatio(
      parseColor(active.foreground).rgb,
      parseColor(active.background).rgb,
    );
    const hoverBorderContrast = contrastRatio(parseColor(hover.border).rgb, surface.rgb);
    const activeBorderContrast = contrastRatio(parseColor(active.border).rgb, surface.rgb);
    const focusIndicatorContrast = contrastRatio(parseColor(focus.outline).rgb, surface.rgb);
    const ghostBackdropContrast = contrastRatio(
      composite(surface.rgb, [0, 0, 0], surface.alpha),
      composite(surface.rgb, [255, 255, 255], surface.alpha),
    );

    expect(textContrast).toBeGreaterThanOrEqual(4.5);
    expect(hoverContrast).toBeGreaterThanOrEqual(4.5);
    expect(focusContrast, JSON.stringify({ base, hover, focus })).toBeGreaterThanOrEqual(4.5);
    expect(activeContrast).toBeGreaterThanOrEqual(4.5);
    expect(hoverBorderContrast).toBeGreaterThanOrEqual(3);
    expect(activeBorderContrast).toBeGreaterThanOrEqual(3);
    expect(focusIndicatorContrast).toBeGreaterThanOrEqual(3);
    expect(ghostBackdropContrast).toBeLessThanOrEqual(1.1);

    results.push({
      theme,
      surface: base.surface,
      backgroundAlpha: base.alpha,
      menuTextColor: base.foreground,
      textContrast,
      hover,
      hoverContrast,
      hoverBorderContrast,
      focus,
      focusContrast,
      focusIndicatorContrast,
      active,
      activeContrast,
      activeBorderContrast,
      worstCaseBackdropGhostContrast: ghostBackdropContrast,
    });
  }

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const trigger = page.getByRole('button', { name: '更多操作' });
  const menu = page.getByRole('menu', { name: '更多操作' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  const forcedColors = await menu
    .getByRole('menuitem')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        transitionDuration: style.transitionDuration,
        surface: getComputedStyle(element.closest('.studio-popover')!).backgroundColor,
      };
    });
  expect(Number.parseFloat(forcedColors.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(forcedColors.outlineStyle).not.toBe('none');
  const reducedMotionSeconds = Number.parseFloat(forcedColors.transitionDuration);
  const reducedMotionMilliseconds = forcedColors.transitionDuration.endsWith('ms')
    ? reducedMotionSeconds
    : reducedMotionSeconds * 1000;
  expect(reducedMotionMilliseconds).toBeLessThan(1);
  const forcedColorsOutline = parseColor(forcedColors.outlineColor);
  const forcedColorsSurface = parseColor(forcedColors.surface);
  const forcedColorsIndicatorContrast = contrastRatio(
    composite(forcedColorsOutline.rgb, forcedColorsSurface.rgb, forcedColorsOutline.alpha),
    forcedColorsSurface.rgb,
  );
  expect(forcedColorsIndicatorContrast).toBeGreaterThanOrEqual(3);

  const forcedScreenshotPath = testInfo.outputPath(
    'phase4c1-menu-forced-colors-reduced-motion.png',
  );
  await page.screenshot({ path: forcedScreenshotPath, animations: 'disabled' });
  await testInfo.attach('phase4c1-menu-forced-colors-reduced-motion.png', {
    contentType: 'image/png',
    path: forcedScreenshotPath,
  });

  const transparencyFallback = await page.evaluate(() => {
    type FallbackRule = {
      condition: string;
      selector: string;
      background: string;
      backdropFilter: string;
      webkitBackdropFilter: string;
    };
    const reducedTransparencyRules: FallbackRule[] = [];
    const unsupportedFilterRules: FallbackRule[] = [];
    const inspect = (rules: CSSRuleList, condition = '') => {
      for (const rule of rules) {
        const currentCondition =
          rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule
            ? rule.conditionText
            : condition;
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes('.production-topbar__more .studio-popover')
        ) {
          const result = {
            condition: currentCondition,
            selector: rule.selectorText,
            background: rule.style.getPropertyValue('background').trim(),
            backdropFilter: rule.style.getPropertyValue('backdrop-filter').trim(),
            webkitBackdropFilter: rule.style.getPropertyValue('-webkit-backdrop-filter').trim(),
          };
          if (currentCondition.includes('prefers-reduced-transparency')) {
            reducedTransparencyRules.push(result);
          }
          if (currentCondition.includes('backdrop-filter')) unsupportedFilterRules.push(result);
        }
        if ('cssRules' in rule) inspect((rule as CSSGroupingRule).cssRules, currentCondition);
      }
    };

    for (const sheet of document.styleSheets) {
      try {
        inspect(sheet.cssRules);
      } catch {
        // Cross-origin stylesheets are not inspectable; local Vite stylesheets remain available.
      }
    }
    const root = document.querySelector<HTMLElement>('.production-studio-root');
    if (!root) throw new Error('Production editor root must be present for fallback checks');
    return {
      prefersReducedTransparencyMatches: matchMedia('(prefers-reduced-transparency: reduce)')
        .matches,
      opaqueSurfaceToken: getComputedStyle(root)
        .getPropertyValue('--production-studio-menu-surface-opaque')
        .trim(),
      reducedTransparencyRules,
      unsupportedFilterRules,
    };
  });
  expect(transparencyFallback.opaqueSurfaceToken).toMatch(/^#[\da-f]{6}$/iu);
  expect(transparencyFallback.reducedTransparencyRules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        background: 'var(--production-studio-menu-surface-opaque)',
        backdropFilter: 'none',
      }),
    ]),
  );
  expect(transparencyFallback.unsupportedFilterRules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        background: 'var(--production-studio-menu-surface-opaque)',
        backdropFilter: 'none',
      }),
    ]),
  );

  const contrastPath = testInfo.outputPath('phase4c1-menu-surface-contrast.json');
  await writeFile(
    contrastPath,
    JSON.stringify(
      { themes: results, forcedColors, forcedColorsIndicatorContrast, transparencyFallback },
      null,
      2,
    ),
  );
  await testInfo.attach('phase4c1-menu-surface-contrast.json', {
    contentType: 'application/json',
    path: contrastPath,
  });
});
